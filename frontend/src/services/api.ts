export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: any;
  timestamp?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  userId: number;
  email: string;
  fullName: string;
  role: string;
  /** Mã lớp học (nullable) — dùng cho leaderboard theo lớp. */
  classCode: string | null;
  twoFactorRequired?: boolean;
  twoFactorEnabled?: boolean;
}

export interface UserProfileResponse {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  classCode: string | null;
  createdAt: string;
}

/**
 * Base URL của backend API.
 * - Dev local: để trống -> dùng Vite proxy (vite.config.ts -> http://localhost:8080).
 * - Staging/Production (Vercel): set VITE_API_BASE_URL = https://<render-service>.onrender.com/api/v1
 */
const API_BASE =
  import.meta.env.PROD && import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')
    : '/api/v1';

/** Base URL của backend — dùng cho các tài nguyên không đi qua `apiRequest` (ví dụ audio TTS). */
export const API_BASE_URL = API_BASE;

// Enabled for same-site production after the backend cookie transport has been deployed.
const COOKIE_AUTH = import.meta.env.VITE_AUTH_COOKIE === 'true';
let memoryAccessToken: string | null = null;
let sessionEpoch = 0;
let legacyRefreshToken: string | null = COOKIE_AUTH ? localStorage.getItem('heyganba_refresh_token') : null;
if (COOKIE_AUTH) {
  localStorage.removeItem('heyganba_access_token');
  localStorage.removeItem('heyganba_refresh_token');
}

export const getAccessToken = (): string | null => {
  return COOKIE_AUTH ? memoryAccessToken : localStorage.getItem('heyganba_access_token');
};

export const getRefreshToken = (): string | null => {
  return COOKIE_AUTH ? legacyRefreshToken : localStorage.getItem('heyganba_refresh_token');
};

export const saveTokens = (accessToken: string, refreshToken: string | null) => {
  sessionEpoch++;
  if (COOKIE_AUTH) { memoryAccessToken = accessToken; legacyRefreshToken = null; return; }
  localStorage.setItem('heyganba_access_token', accessToken);
  if (refreshToken) localStorage.setItem('heyganba_refresh_token', refreshToken);
};

export const clearTokens = () => {
  sessionEpoch++;
  memoryAccessToken = null;
  legacyRefreshToken = null;
  localStorage.removeItem('heyganba_access_token');
  localStorage.removeItem('heyganba_refresh_token');
  localStorage.removeItem('heyganba_user');
};

/**
 * Gửi yêu cầu đăng xuất tới backend để đưa access token và refresh token vào danh sách revoked_tokens.
 * Trả về true nếu backend xác nhận thành công.
 */
export const logoutApi = async (): Promise<boolean> => {
  // Finish a pending rotation so logout revokes the latest cookie, not the previous token.
  if (refreshInFlight) await refreshInFlight;
  const token = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!COOKIE_AUTH && !token && !refreshToken) {
    return true;
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (COOKIE_AUTH) headers.set('X-Auth-Transport', 'cookie');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers,
      credentials: COOKIE_AUTH ? 'include' : 'same-origin',
      body: JSON.stringify({ refreshToken: refreshToken || undefined }),
    });

    if (response.ok) {
      const data: ApiResponse<void> = await response.json();
      return Boolean(data.success);
    }
    return false;
  } catch {
    return false;
  }
};

export const getSavedUser = (): AuthResponse | null => {
  const saved = localStorage.getItem('heyganba_user');
  if (saved) {
    try {
      const user = JSON.parse(saved) as AuthResponse;
      saveUser(user); // Remove token copies saved by older clients.
      return { ...user, accessToken: '', refreshToken: null };
    } catch {
      return null;
    }
  }
  return null;
};

export const saveUser = (user: AuthResponse) => {
  const { accessToken: _access, refreshToken: _refresh, ...profile } = user;
  localStorage.setItem('heyganba_user', JSON.stringify(profile));
};

/**
 * Cập nhật mã lớp học của user đang đăng nhập (text tự do, gửi chuỗi rỗng để xoá lớp).
 * Trả về profile mới để nơi gọi đồng bộ lại localStorage.
 */
export const updateClassCode = async (classCode: string): Promise<UserProfileResponse | null> => {
  const res = await apiRequest<UserProfileResponse>('/users/me/class-code', {
    method: 'PUT',
    body: JSON.stringify({ classCode }),
  });
  return res.success && res.data ? res.data : null;
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (COOKIE_AUTH && endpoint.includes('/auth/')) headers.set('X-Auth-Transport', 'cookie');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: COOKIE_AUTH ? 'include' : 'same-origin',
    });

    // Check if unauthorized and try refresh
    if (response.status === 401 && (COOKIE_AUTH || getRefreshToken()) && !endpoint.includes('/auth/')) {
      const refreshed = await attemptRefreshToken();
      if (refreshed) {
        // Retry original request once
        headers.set('Authorization', `Bearer ${getAccessToken()}`);
        const retryResponse = await fetch(url, {
          ...options,
          headers,
          credentials: COOKIE_AUTH ? 'include' : 'same-origin',
        });
        return await readApiResponse<T>(retryResponse);
      }
    }

    const data = await readApiResponse<T>(response);
    return data;
  } catch (error: any) {
    return {
      success: false,
      data: null as any,
      message: 'Chưa kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại.',
      error: error,
    };
  }
}

async function attemptRefreshToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = refreshTokenOnce().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshTokenOnce(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  const epoch = sessionEpoch;
  if (!COOKIE_AUTH && !refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(COOKIE_AUTH ? { 'X-Auth-Transport': 'cookie' } : {}) },
      credentials: COOKIE_AUTH ? 'include' : 'same-origin',
      body: JSON.stringify({ refreshToken }),
    });

    if (res.ok) {
      const json: ApiResponse<AuthResponse> = await res.json();
      if (json.success && json.data) {
        // A pending refresh must never restore a session that the user already logged out of.
        if (sessionEpoch !== epoch || getRefreshToken() !== refreshToken) return false;
        saveTokens(json.data.accessToken, json.data.refreshToken);
        return true;
      }
    }
    if (![400, 401, 403].includes(res.status)) return false;
  } catch {
    return false; // A transient network error must not discard a valid session.
  }

  if (sessionEpoch === epoch && getRefreshToken() === refreshToken) {
    clearTokens();
    window.dispatchEvent(new Event('heyganba:session-expired'));
  }
  return false;
}

async function readApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (response.headers.get('content-type')?.includes('application/json')) return response.json();
  return { success: false, data: null as T, message: response.status >= 500
    ? 'Máy chủ đang bận. Vui lòng thử lại sau.'
    : 'Chưa thực hiện được yêu cầu. Vui lòng tải lại trang rồi thử lại.' };
}

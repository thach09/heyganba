export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: any;
  timestamp?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
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

export const getAccessToken = (): string | null => {
  return localStorage.getItem('heyganba_access_token');
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('heyganba_refresh_token');
};

export const saveTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('heyganba_access_token', accessToken);
  localStorage.setItem('heyganba_refresh_token', refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem('heyganba_access_token');
  localStorage.removeItem('heyganba_refresh_token');
  localStorage.removeItem('heyganba_user');
};

/**
 * Gửi yêu cầu đăng xuất tới backend để đưa access token và refresh token vào danh sách revoked_tokens.
 * Trả về true nếu backend xác nhận thành công.
 */
export const logoutApi = async (): Promise<boolean> => {
  const token = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!token && !refreshToken) {
    return true;
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ refreshToken: refreshToken || undefined }),
    });

    if (response.ok) {
      const data: ApiResponse<void> = await response.json();
      return Boolean(data.success);
    }
    return false;
  } catch (error) {
    console.error('Logout request failed:', error);
    return false;
  }
};

export const getSavedUser = (): AuthResponse | null => {
  const saved = localStorage.getItem('heyganba_user');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
};

export const saveUser = (user: AuthResponse) => {
  localStorage.setItem('heyganba_user', JSON.stringify(user));
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

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Check if unauthorized and try refresh
    if (response.status === 401 && getRefreshToken() && !endpoint.includes('/auth/')) {
      const refreshed = await attemptRefreshToken();
      if (refreshed) {
        // Retry original request once
        headers.set('Authorization', `Bearer ${getAccessToken()}`);
        const retryResponse = await fetch(url, {
          ...options,
          headers,
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
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (res.ok) {
      const json: ApiResponse<AuthResponse> = await res.json();
      if (json.success && json.data) {
        // A pending refresh must never restore a session that the user already logged out of.
        if (getRefreshToken() !== refreshToken) return false;
        saveTokens(json.data.accessToken, json.data.refreshToken);
        return true;
      }
    }
  } catch (e) {
    console.error('Refresh token failed:', e);
  }

  if (getRefreshToken() === refreshToken) {
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

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
const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || '/api/v1';

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
        return await retryResponse.json();
      }
    }

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      data: null as any,
      message: error.message || 'Network request failed',
      error: error,
    };
  }
}

async function attemptRefreshToken(): Promise<boolean> {
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
        saveTokens(json.data.accessToken, json.data.refreshToken);
        return true;
      }
    }
  } catch (e) {
    console.error('Refresh token failed:', e);
  }

  clearTokens();
  return false;
}

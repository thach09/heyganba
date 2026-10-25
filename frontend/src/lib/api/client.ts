import { ApiError } from './types';
import type { ApiResponse, AuthResponse } from './types';
import { COOKIE_AUTH, clearTokens, getAccessToken, getRefreshToken, getSavedUser, getSessionEpoch, saveTokens, saveUser } from './session';

export const API_BASE_URL = import.meta.env.PROD && import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '') : '/api/v1';
const credentials = COOKIE_AUTH ? 'include' : 'same-origin';
export const API_TIMEOUT_MS = 15_000;
let refreshInFlight: Promise<boolean> | null = null;

// A deadline covers the response body too. Dispose timers/listeners when work settles;
// do not require AbortSignal.any/timeout on otherwise supported browsers.
function requestDeadline(parent?: AbortSignal | null) {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort(parent?.reason);
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, API_TIMEOUT_MS);
  if (parent?.aborted) cancel();
  else parent?.addEventListener('abort', cancel, { once: true });
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    dispose: () => { clearTimeout(timer); parent?.removeEventListener('abort', cancel); },
  };
}

export const isRequestCancelled = (error: unknown): boolean =>
  (error instanceof Error || error instanceof DOMException) && error.name === 'AbortError';

async function refreshTokenOnce(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  const epoch = getSessionEpoch();
  if (!COOKIE_AUTH && !refreshToken) return false;
  const deadline = requestDeadline();
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST', credentials,
      signal: deadline.signal,
      headers: { 'Content-Type': 'application/json', ...(COOKIE_AUTH ? { 'X-Auth-Transport': 'cookie' } : {}) },
      body: JSON.stringify({ refreshToken }),
    });
    if (response.ok) {
      const json: ApiResponse<AuthResponse> = await response.json();
      if (json.success && json.data) {
        if (getSessionEpoch() !== epoch || getRefreshToken() !== refreshToken) return false;
        saveTokens(json.data.accessToken, json.data.refreshToken);
        saveUser(json.data);
        return true;
      }
    }
    if (![400, 401, 403].includes(response.status)) return false;
  } catch { return false; }
  finally { deadline.dispose(); }
  if (getSessionEpoch() === epoch && getRefreshToken() === refreshToken) {
    clearTokens();
    window.dispatchEvent(new Event('heyganba:session-expired'));
  }
  return false;
}
function attemptRefreshToken() {
  if (!refreshInFlight) refreshInFlight = refreshTokenOnce().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}
/** Cancel only this consumer; shared token rotation must remain available to other callers. */
async function awaitRefresh(signal?: AbortSignal | null): Promise<boolean> {
  const shared = attemptRefreshToken();
  if (!signal) return shared;
  signal.throwIfAborted();
  let onAbort!: () => void;
  const cancelled = new Promise<never>((_, reject) => {
    onAbort = () => reject(new DOMException('Request cancelled', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
  });
  try { return await Promise.race([shared, cancelled]); }
  finally { signal.removeEventListener('abort', onAbort); }
}

async function request(endpoint: string, options: RequestInit = {}): Promise<Response> {
  options.signal?.throwIfAborted();
  const owner = getSavedUser()?.userId;
  const assertOwner = () => {
    if (!endpoint.startsWith('/auth/') && getSavedUser()?.userId !== owner) {
      throw new DOMException('Session identity changed', 'AbortError');
    }
  };
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (COOKIE_AUTH && endpoint.startsWith('/auth/')) headers.set('X-Auth-Transport', 'cookie');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, { ...options, headers, credentials });
  assertOwner();
  if (response.status === 401 && !endpoint.startsWith('/auth/') && (COOKIE_AUTH || getRefreshToken())) {
    // A delayed 401 from the previous token should reuse a completed rotation.
    const alreadyRotated = getAccessToken() !== token && Boolean(getAccessToken());
    if (alreadyRotated || await awaitRefresh(options.signal)) {
      options.signal?.throwIfAborted();
      assertOwner();
      headers.set('Authorization', `Bearer ${getAccessToken()}`);
      const retried = await fetch(url, { ...options, headers, credentials });
      assertOwner();
      return retried;
    }
  }
  assertOwner();
  return response;
}

function failure<T>(error: ApiError): ApiResponse<T> {
  return { success: false, data: null as T, message: error.message, error };
}
async function readApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const status = response.status;
  if (status >= 500) return failure(new ApiError('server', 'Máy chủ đang bận. Vui lòng thử lại sau.', status));
  if (!response.headers.get('content-type')?.includes('application/json')) {
    return failure(new ApiError('protocol', 'Chưa thực hiện được yêu cầu. Vui lòng tải lại trang rồi thử lại.', status));
  }
  const json = await response.json() as ApiResponse<T>;
  if (response.ok && json.success) return json;
  const kind = status === 401 || status === 403 ? 'authentication'
    : status === 400 || status === 422 ? 'validation' : 'http';
  return failure(new ApiError(kind, typeof json.message === 'string' ? json.message
    : 'Chưa thực hiện được yêu cầu. Vui lòng thử lại.', status));
}
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const deadline = requestDeadline(options.signal);
  try { return await readApiResponse<T>(await request(endpoint, { ...options, signal: deadline.signal })); }
  catch (error) {
    if (options.signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
    if (deadline.timedOut()) return failure(new ApiError('network', 'Chờ máy chủ quá lâu. Vui lòng thử lại.'));
    if (isRequestCancelled(error)) throw new DOMException('Request cancelled', 'AbortError');
    return failure(new ApiError('network', 'Chưa kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại.'));
  }
  finally { deadline.dispose(); }
}
export async function apiBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
  const deadline = requestDeadline(options.signal);
  try {
    const response = await request(endpoint, { ...options, signal: deadline.signal });
    if (!response.ok) throw new ApiError(response.status === 401 ? 'authentication' : 'server', 'Chưa phát được âm thanh.', response.status);
    return await response.blob();
  } catch (error) {
    if (options.signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
    if (deadline.timedOut()) throw new ApiError('network', 'Chờ máy chủ quá lâu. Vui lòng thử lại.');
    throw error;
  } finally { deadline.dispose(); }
}
export async function logoutApi(): Promise<boolean> {
  if (refreshInFlight) await refreshInFlight;
  const token = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!COOKIE_AUTH && !token && !refreshToken) return true;
  const response = await apiRequest<void>('/auth/logout', {
    method: 'POST', body: JSON.stringify({ refreshToken: refreshToken || undefined }),
  });
  return response.success;
}

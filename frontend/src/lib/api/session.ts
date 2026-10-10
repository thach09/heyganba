import type { AuthResponse } from './types';

export const COOKIE_AUTH = import.meta.env.VITE_AUTH_COOKIE === 'true';
let memoryAccessToken: string | null = null;
let sessionEpoch = 0;
let legacyRefreshToken: string | null = COOKIE_AUTH ? localStorage.getItem('heyganba_refresh_token') : null;
if (COOKIE_AUTH) {
  localStorage.removeItem('heyganba_access_token');
  localStorage.removeItem('heyganba_refresh_token');
}

export const getSessionEpoch = () => sessionEpoch;
export const getAccessToken = () => COOKIE_AUTH ? memoryAccessToken : localStorage.getItem('heyganba_access_token');
export const getRefreshToken = () => COOKIE_AUTH ? legacyRefreshToken : localStorage.getItem('heyganba_refresh_token');
export function saveTokens(accessToken: string, refreshToken: string | null) {
  sessionEpoch++;
  if (COOKIE_AUTH) { memoryAccessToken = accessToken; legacyRefreshToken = null; return; }
  localStorage.setItem('heyganba_access_token', accessToken);
  if (refreshToken) localStorage.setItem('heyganba_refresh_token', refreshToken);
}
export function clearTokens() {
  sessionEpoch++;
  memoryAccessToken = null;
  legacyRefreshToken = null;
  localStorage.removeItem('heyganba_access_token');
  localStorage.removeItem('heyganba_refresh_token');
  localStorage.removeItem('heyganba_user');
  window.dispatchEvent(new Event('heyganba:session-changed'));
}
/** Discard this tab's credential without deleting the session shared with other tabs. */
export function invalidateTabSession() {
  sessionEpoch++;
  memoryAccessToken = null;
  legacyRefreshToken = null;
}
export function saveUser(user: AuthResponse) {
  const { accessToken: _access, refreshToken: _refresh, ...profile } = user;
  localStorage.setItem('heyganba_user', JSON.stringify(profile));
  window.dispatchEvent(new Event('heyganba:session-changed'));
}
export function getSavedUser(): AuthResponse | null {
  try {
    const saved = localStorage.getItem('heyganba_user');
    if (!saved) return null;
    const user = JSON.parse(saved) as AuthResponse;
    if (!user || typeof user.userId !== 'number' || typeof user.role !== 'string') return null;
    if ('accessToken' in user || 'refreshToken' in user) {
      const { accessToken: _access, refreshToken: _refresh, ...profile } = user;
      localStorage.setItem('heyganba_user', JSON.stringify(profile));
    }
    return { ...user, accessToken: '', refreshToken: null };
  } catch { return null; }
}

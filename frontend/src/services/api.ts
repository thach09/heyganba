// Temporary compatibility facade while feature calls move in Phase 2.
export { apiRequest, logoutApi, API_BASE_URL } from '../lib/api/client';
export { getAccessToken, getRefreshToken, saveTokens, clearTokens, getSavedUser, saveUser } from '../lib/api/session';
export type { ApiResponse, AuthResponse, UserProfileResponse } from '../lib/api/types';
export { updateClassCode } from '../features/account/api';

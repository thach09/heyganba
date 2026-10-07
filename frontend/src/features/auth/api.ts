import { apiRequest } from '../../lib/api/client';
import type { AuthResponse } from '../../lib/api/types';

export const authApi = {
  login: (options: RequestInit = {}) => apiRequest<AuthResponse>('/auth/login', options),
  register: (options: RequestInit = {}) => apiRequest<AuthResponse>('/auth/register', options),
  password: (options: RequestInit = {}) => apiRequest<void>('/auth/password', options),
};

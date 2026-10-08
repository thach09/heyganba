import { apiRequest } from '../../lib/api/client';
import type { AdminStatusData, AuditLogItem, TwoFactorStatusResponse, VocabularyAdminItem, KanjiAdminItem, ExerciseAdminItem, ReviewQueueItem } from './types';
import type { UserProfileResponse } from '../../lib/api/types';

export const adminApi = {
  status: (options: RequestInit = {}) => apiRequest<AdminStatusData>('/admin/status', options),
  users: (options: RequestInit = {}) => apiRequest<UserProfileResponse[]>('/admin/users', options),
  logs: (options: RequestInit = {}) => apiRequest<AuditLogItem[]>('/admin/audit-logs', options),
  twoFactorStatus: (options: RequestInit = {}) => apiRequest<TwoFactorStatusResponse>('/admin/2fa/status', options),
  twoFactorSetup: (options: RequestInit = {}) => apiRequest<TwoFactorStatusResponse>('/admin/2fa/setup', options),
  twoFactorEnable: (options: RequestInit = {}) => apiRequest<void>('/admin/2fa/enable', options),
  twoFactorDisable: (options: RequestInit = {}) => apiRequest<void>('/admin/2fa/disable', options),
  reviewQueue: (onlyNeedsCheck: boolean, options: RequestInit = {}) => apiRequest<ReviewQueueItem[]>(`/admin/review-queue?limit=100&onlyNeedsCheck=${onlyNeedsCheck}`, options),
  vocabulary: (query: string, options: RequestInit = {}) => apiRequest<VocabularyAdminItem[]>(`/admin/vocabulary${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '?size=50'}`, options),
  kanji: (query: string, options: RequestInit = {}) => apiRequest<KanjiAdminItem[]>(`/admin/kanji${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '?size=50'}`, options),
  exercises: (query: string, options: RequestInit = {}) => apiRequest<ExerciseAdminItem[]>(`/admin/exercises${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '?size=50'}`, options),
  saveContent: (kind: 'vocabulary' | 'kanji' | 'exercises', id: number | null, options: RequestInit) => apiRequest<void>(`/admin/${kind}${id ? `/${id}` : ''}`, options),
  deleteContent: (kind: 'vocabulary' | 'kanji' | 'exercises', id: number, options: RequestInit) => apiRequest<void>(`/admin/${kind}/${id}`, options),
};

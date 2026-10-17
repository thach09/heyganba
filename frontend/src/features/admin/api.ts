import { apiRequest } from '../../lib/api/client';
import type { AdminStatusData, AuditLogItem, TwoFactorStatusResponse, VocabularyAdminItem, HanziAdminItem, ExerciseAdminItem, ReviewQueueItem } from './types';
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
  approveReviewItem: (contentType: string, id: number, note?: string, options: RequestInit = {}) =>
    apiRequest<void>(`/admin/review-queue/${contentType}/${id}/approve`, {
      ...options,
      method: 'POST',
      body: JSON.stringify({ note: note || '' }),
    }),
  rejectReviewItem: (contentType: string, id: number, note?: string, options: RequestInit = {}) =>
    apiRequest<void>(`/admin/review-queue/${contentType}/${id}/reject`, {
      ...options,
      method: 'POST',
      body: JSON.stringify({ note: note || '' }),
    }),
  approveAllReviewItems: (options: RequestInit = {}) =>
    apiRequest<{ approvedCount: number }>('/admin/review-queue/approve-all', {
      ...options,
      method: 'POST',
    }),
  vocabulary: (query: string, options: RequestInit = {}) => apiRequest<VocabularyAdminItem[]>(`/admin/vocabulary${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '?size=50'}`, options),
  hanzi: (query: string, options: RequestInit = {}) => apiRequest<HanziAdminItem[]>(`/admin/hanzi${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '?size=50'}`, options),
  exercises: (query: string, options: RequestInit = {}) => apiRequest<ExerciseAdminItem[]>(`/admin/exercises${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '?size=50'}`, options),
  saveContent: (kind: 'vocabulary' | 'hanzi' | 'exercises', id: number | null, options: RequestInit) => apiRequest<void>(`/admin/${kind}${id ? `/${id}` : ''}`, options),
  deleteContent: (kind: 'vocabulary' | 'hanzi' | 'exercises', id: number, options: RequestInit) => apiRequest<void>(`/admin/${kind}/${id}`, options),
};

import { apiRequest } from '../../lib/api/client';
import type { HeatmapDay } from './types';
import type { StreakDto } from '../exam/types';
import type { UserExp } from '../dashboard/types';

export const progressApi = {
  streak: (options: RequestInit = {}) => apiRequest<StreakDto>('/streak', options),
  heatmap: (days: number, options: RequestInit = {}) => apiRequest<HeatmapDay[]>(`/streak/heatmap?days=${days}`, options),
  exp: (options: RequestInit = {}) => apiRequest<UserExp>('/exp', options),
  health: (options: RequestInit = {}) => apiRequest<{ status: string }>('/health', options),
};

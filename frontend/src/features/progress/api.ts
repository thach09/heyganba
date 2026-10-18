import { apiRequest } from '../../lib/api/client';
import type { HeatmapDay } from './types';
import type { StreakDto } from '../exam/types';
import type { UserExp } from '../dashboard/types';

export interface PracticeProgressRequest {
  targetType: 'PINYIN' | 'HANZI' | 'VOCAB';
  targetKey: string;
  masteryScore?: number;
  expEarned?: number;
  scoreDelta?: number;
  isCorrect?: boolean;
}

export interface PracticeProgressResponse {
  targetType: string;
  targetKey: string;
  masteryScore: number;
  practiceCount: number;
  expAwarded: number;
  totalExp: number;
  level?: number;
  expIntoLevel?: number;
}

export interface CharacterMasteryDto {
  id: number;
  targetType: string;
  targetKey: string;
  masteryScore: number;
  practiceCount: number;
  updatedAt: string;
}

export const progressApi = {
  streak: (options: RequestInit = {}) => apiRequest<StreakDto>('/streak', options),
  heatmap: (days: number, options: RequestInit = {}) => apiRequest<HeatmapDay[]>(`/streak/heatmap?days=${days}`, options),
  exp: (options: RequestInit = {}) => apiRequest<UserExp>('/exp', options),
  health: (options: RequestInit = {}) => apiRequest<{ status: string }>('/health', options),
  practice: (data: PracticeProgressRequest, options: RequestInit = {}) =>
    apiRequest<PracticeProgressResponse>('/progress/practice', {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }),
  mastery: (targetType?: string, options: RequestInit = {}) =>
    apiRequest<CharacterMasteryDto[]>(`/progress/mastery${targetType ? `?targetType=${targetType}` : ''}`, options),
};

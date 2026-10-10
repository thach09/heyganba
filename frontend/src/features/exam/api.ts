import { apiRequest } from '../../lib/api/client';
import type { ExamDto, ExamHistoryDto, ExamResultDto, LeaderboardDto } from './types';

export const examApi = {
  get: (id: number, options: RequestInit = {}) => apiRequest<ExamDto>(`/exam/${id}`, options),
  result: (id: number, options: RequestInit = {}) => apiRequest<ExamResultDto>(`/exam/${id}/result`, options),
  history: (options: RequestInit = {}) => apiRequest<ExamHistoryDto[]>('/exam/history', options),
  generate: (options: RequestInit = {}) => apiRequest<ExamDto>('/exam/generate', options),
  submit: (id: number, options: RequestInit = {}) => apiRequest<ExamResultDto>(`/exam/${id}/submit`, options),
  leaderboard: (classCode: string | null, options: RequestInit = {}) => apiRequest<LeaderboardDto>(`/leaderboard?limit=10${classCode ? `&classCode=${encodeURIComponent(classCode)}` : ''}`, options),
};

import { apiRequest } from '../../lib/api/client';
import type { GrammarRuleDto, GrammarExerciseDto, GrammarCheckResult } from './types';

export const grammarApi = {
  rules: (query: string = '', options: RequestInit = {}) => apiRequest<GrammarRuleDto[]>(`/grammar/rules${query}`, options),
  rule: (id: string, options: RequestInit = {}) => apiRequest<GrammarRuleDto>(`/grammar/rules/${encodeURIComponent(id)}`, options),
  exercises: (query: string, options: RequestInit = {}) => apiRequest<GrammarExerciseDto[]>(`/grammar/exercises${query ? `?${query}` : ''}`, options),
  check: (id: number, options: RequestInit = {}) => apiRequest<GrammarCheckResult>(`/grammar/exercises/${id}/check`, options),
};

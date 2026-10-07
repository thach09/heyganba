import { apiRequest } from '../../lib/api/client';
import type { KanjiDto, RadicalDto, KanjiProgressResult } from './types';

export const kanjiApi = {
  list: (query: string, options: RequestInit = {}) => apiRequest<KanjiDto[]>(`/kanji${query ? `?${query}` : ''}`, options),
  radicals: (options: RequestInit = {}) => apiRequest<RadicalDto[]>('/radicals', options),
  progress: (id: number, options: RequestInit = {}) => apiRequest<KanjiProgressResult>(`/kanji/${id}/progress`, options),
};

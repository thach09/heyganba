import { apiRequest } from '../../lib/api/client';
import type { HanziDto, RadicalDto, KanjiProgressResult } from './types';

export const hanziApi = {
  list: (query: string, options: RequestInit = {}) =>
    apiRequest<HanziDto[]>(`/hanzi${query ? `?${query}` : ''}`, options),
  radicals: (options: RequestInit = {}) =>
    apiRequest<RadicalDto[]>('/radicals', options),
  progress: (id: number, options: RequestInit = {}) =>
    apiRequest<KanjiProgressResult>(`/kanji/${id}/progress`, options),
};

export const kanjiApi = hanziApi;

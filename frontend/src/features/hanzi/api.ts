import { apiRequest } from '../../lib/api/client';
import type { HanziDto, RadicalDto, HanziProgressResult } from './types';

export const hanziApi = {
  list: (query: string, options: RequestInit = {}) =>
    apiRequest<HanziDto[]>(`/hanzi${query ? `?${query}` : ''}`, options),
  radicals: (options: RequestInit = {}) =>
    apiRequest<RadicalDto[]>('/radicals', options),
  progress: (id: number, options: RequestInit = {}) =>
    apiRequest<HanziProgressResult>(`/hanzi/${id}/progress`, options),
};

import { apiRequest } from '../../lib/api/client';
import type { DictionarySearchResponse, VocabNotebook, PracticeResult } from './types';

export const dictionaryApi = {
  search: (query: string, page: number, options: RequestInit = {}) => apiRequest<DictionarySearchResponse>(`/dictionary/search?q=${encodeURIComponent(query)}&page=${page}`, options),
  notebooks: (options: RequestInit = {}) => apiRequest<VocabNotebook[]>('/notebooks', options),
  create: (options: RequestInit = {}) => apiRequest<VocabNotebook>('/notebooks', options),
  clone: (id: number, options: RequestInit = {}) => apiRequest<VocabNotebook>(`/notebooks/clone-sample/${id}`, options),
  addWord: (id: number, options: RequestInit = {}) => apiRequest<VocabNotebook>(`/notebooks/${id}/items`, options),
  removeWord: (id: number, wordId: number, options: RequestInit = {}) => apiRequest<void>(`/notebooks/${id}/items/${wordId}`, options),
  remove: (id: number, options: RequestInit = {}) => apiRequest<void>(`/notebooks/${id}`, options),
  practice: (id: number, options: RequestInit = {}) => apiRequest<PracticeResult>(`/notebooks/${id}/practice-result`, options),
};

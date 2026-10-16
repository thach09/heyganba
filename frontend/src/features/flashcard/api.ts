import { apiRequest } from '../../lib/api/client';
import type {
  FlashcardDueItem,
  FlashcardStats,
  FlashcardReviewResult,
  SrsRating,
  VocabularyLesson,
  VocabularyWord,
} from './types';
import type { VocabNotebook } from '../dictionary/types';

export const vocabularyApi = {
  lessons: (options: RequestInit = {}) =>
    apiRequest<VocabularyLesson[]>('/vocabulary/lessons', options),

  lessonWords: (slug: string, options: RequestInit = {}) =>
    apiRequest<VocabularyWord[]>(`/vocabulary/lessons/${slug}/words`, options),

  word: (id: number, options: RequestInit = {}) =>
    apiRequest<VocabularyWord>(`/vocabulary/${id}`, options),
};

export const flashcardApi = {
  stats: (options: RequestInit = {}) =>
    apiRequest<FlashcardStats>('/flashcard/stats', options),

  due: (options: RequestInit = {}) =>
    apiRequest<FlashcardDueItem[]>('/flashcard/due-today', options),

  review: (
    data: { vocabularyId: number; rating: SrsRating; attemptId: string },
    options: RequestInit = {}
  ) =>
    apiRequest<FlashcardReviewResult>('/flashcard/review', {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    }),
};

export const notebookApi = {
  list: (options: RequestInit = {}) =>
    apiRequest<VocabNotebook[]>('/notebooks', options),

  create: (data: { title: string; description?: string }, options: RequestInit = {}) =>
    apiRequest<VocabNotebook>('/notebooks', {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    }),

  addWord: (
    notebookId: number,
    data: { vocabularyId: number; customNote?: string },
    options: RequestInit = {}
  ) =>
    apiRequest<VocabNotebook>(`/notebooks/${notebookId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    }),
};

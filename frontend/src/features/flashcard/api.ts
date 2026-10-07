import { apiRequest } from '../../lib/api/client';
import type { FlashcardDueItem, FlashcardStats, FlashcardReviewResult } from './types';

export const flashcardApi = {
  stats: (options: RequestInit = {}) => apiRequest<FlashcardStats>('/flashcard/stats', options),
  due: (options: RequestInit = {}) => apiRequest<FlashcardDueItem[]>('/flashcard/due-today', options),
  review: (options: RequestInit = {}) => apiRequest<FlashcardReviewResult>('/flashcard/review', options),
};

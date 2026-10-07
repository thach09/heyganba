export interface FlashcardDueItem {
  vocabularyId: number;
  word: string;
  reading: string;
  meaning: string;
  sinoVietnamese: string | null;
  exampleSentence: string | null;
  exampleReading: string | null;
  exampleMeaning: string | null;
  lessonSlug: string | null;
  isNew: boolean;
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
  dueDate: string | null;
}

export interface FlashcardStats {
  learnedWords: number;
  dueToday: number;
  availableNewWords: number;
  currentStreak: number;
  longestStreak: number;
}

export interface FlashcardReviewResult {
  vocabularyId: number;
  rating: string;
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
  nextDueDate: string;
  lapse: boolean;
  currentStreak: number;
  longestStreak: number;
}

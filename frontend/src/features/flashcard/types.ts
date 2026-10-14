export interface FlashcardDueItem {
  vocabularyId: number;
  word: string;
  traditional?: string | null;
  pinyin?: string | null;
  pinyinNormalized?: string | null;
  hanViet?: string | null;
  partOfSpeech?: string | null;
  meaningVi?: string | null;
  hskLevel?: number;
  lessonNumber?: number;
  exampleZh?: string | null;
  examplePinyin?: string | null;
  exampleVi?: string | null;
  reading?: string;
  meaning?: string;
  sinoVietnamese?: string | null;
  exampleSentence?: string | null;
  exampleReading?: string | null;
  exampleMeaning?: string | null;
  lessonSlug?: string | null;
  isNew?: boolean;
  intervalDays?: number;
  repetitions?: number;
  easeFactor?: number;
  dueDate?: string | null;
  masteryScore?: number;
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

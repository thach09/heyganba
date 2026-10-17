export type VietnameseMeaningStatus = 'VERIFIED' | 'ASSISTED' | 'NONE';

export interface VocabularyItem {
  id: number;
  word: string;
  reading: string;
  meaning: string;
  vietnameseMeaning?: string;
  vietnameseStatus?: VietnameseMeaningStatus;
  sinoVietnamese?: string;
  exampleSentence?: string;
  exampleReading?: string;
  exampleMeaning?: string;
  source?: string;
  meaningLanguage?: string;
  hskLevel?: number;
  partOfSpeech?: string;
}

export interface KanjiItem {
  id: number;
  character: string;
  strokeCount: number;
  onyomi?: string;
  kunyomi?: string;
  sinoVietnamese?: string;
  meaning: string;
  mnemonic?: string;
}

export interface DictionarySearchResponse {
  query: string;
  totalMatches: number;
  vocabularies: VocabularyItem[];
  kanjis: KanjiItem[];
  page: number;
  hasMore: boolean;
}

export interface VocabNotebookItem {
  id: number;
  vocabularyId: number;
  word: string;
  reading: string;
  meaning: string;
  vietnameseMeaning?: string;
  vietnameseStatus?: VietnameseMeaningStatus;
  sinoVietnamese?: string;
  exampleSentence?: string;
  exampleReading?: string;
  exampleMeaning?: string;
  customNote?: string;
  practiceCount: number;
  correctCount: number;
  meaningLanguage?: string;
  hskLevel?: number;
  partOfSpeech?: string;
}

export interface ReadingPassageQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface ReadingPassageItem {
  hskLevel: number;
  id: number;
  title: string;
  passageText: string;
  passagePinyin: string;
  translationText: string;
  vocabularyNotes: string;
  questions: ReadingPassageQuestion[];
}

export interface VocabNotebook {
  id: number;
  title: string;
  description?: string;
  isPublicSample: boolean;
  itemCount: number;
  createdAt: string;
  items: VocabNotebookItem[];
}

export interface PracticeResult {
  notebookId: number;
  notebookTitle: string;
  correctCount: number;
  totalCount: number;
  expEarned: number;
  note: string;
}

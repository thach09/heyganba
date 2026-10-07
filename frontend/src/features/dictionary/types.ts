export interface VocabularyItem {
  id: number;
  word: string;
  reading: string;
  meaning: string;
  vietnameseMeaning?: string;
  sinoVietnamese?: string;
  exampleSentence?: string;
  exampleReading?: string;
  exampleMeaning?: string;
  source?: string;
  meaningLanguage?: string;
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
  sinoVietnamese?: string;
  exampleSentence?: string;
  exampleReading?: string;
  exampleMeaning?: string;
  customNote?: string;
  practiceCount: number;
  correctCount: number;
  meaningLanguage?: string;
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

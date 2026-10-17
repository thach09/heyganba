
export interface RadicalDto {
  id: number;
  radical: string;
  strokeCount: number;
  name: string;
  meaning: string;
}

export interface HanziDto {
  id: number;
  character: string;
  traditional?: string | null;
  pinyin?: string | null;
  hanViet?: string | null;
  sinoVietnamese?: string | null;
  meaning?: string | null;
  meaningVi?: string | null;
  radical?: string | null;
  strokeCount: number;
  hskLevel?: number | null;
  decomposition?: string | null;
  exampleWordsJson?: string | null;
  practiceCount: number;
  masteryScore?: number;
  onyomi?: string | null;
  kunyomi?: string | null;
  mnemonic?: string | null;
  lessonSlug?: string | null;
  lessonTitle?: string | null;
  radicals?: RadicalDto[];
  reviewStatus?: string | null;
  needsHumanCheck?: boolean | null;
}

export interface ExampleWordItem {
  word: string;
  pinyin: string;
  vi: string;
}

export type KanjiDto = HanziDto;

export interface KanjiProgressResult {
  kanjiId: number;
  character: string;
  practiceCount: number;
  lastPracticedAt: string;
}

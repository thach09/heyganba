export interface RadicalDto {
  id: number;
  radical: string;
  strokeCount: number;
  name: string;
  meaning: string;
}

export interface KanjiDto {
  id: number;
  character: string;
  strokeCount: number;
  onyomi: string | null;
  kunyomi: string | null;
  sinoVietnamese: string;
  meaning: string;
  mnemonic: string | null;
  lessonSlug: string | null;
  lessonTitle: string | null;
  radicals: RadicalDto[];
  practiceCount: number;
}

export interface KanjiProgressResult {
  kanjiId: number;
  character: string;
  practiceCount: number;
  lastPracticedAt: string;
}

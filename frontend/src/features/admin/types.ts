export interface AdminStatusData {
  authorizedAdmin: string;
  role: string;
  totalUsers: number;
}

export interface AuditLogItem {
  id: number;
  adminEmail: string | null;
  tableName: string;
  recordId: number | null;
  action: string;
  createdAt: string;
}

export interface TwoFactorStatusResponse {
  secret: string;
  otpAuthUrl: string | null;
  enabled: boolean;
}

export interface VocabularyAdminItem {
  id: number;
  word: string;
  reading: string;
  meaning: string;
  sinoVietnamese?: string;
  exampleSentence?: string;
  exampleReading?: string;
  exampleMeaning?: string;
  reviewStatus?: string;
}

export interface KanjiAdminItem {
  id: number;
  character: string;
  strokeCount: number;
  onyomi?: string;
  kunyomi?: string;
  sinoVietnamese?: string;
  meaning: string;
  mnemonic?: string;
}

export interface ExerciseAdminItem {
  id: number;
  questionText: string;
  optionsJson: string;
  correctAnswer: string;
  explanation?: string;
  isCommonMistake: boolean;
  mistakeCategory?: string;
}
export interface ReviewQueueItem {
  contentType: string;
  id: number;
  label: string;
  detail: string;
  needsHumanCheck: boolean;
  reviewStatus: string;
  sourceRef: string | null;
  reviewNote: string | null;
}

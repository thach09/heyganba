export interface ExamQuestion {
  index: number;
  type: string;
  questionText: string;
  options: string[];
  /**
    * Text read by the browser Web Speech API (TTS).
    * PLACEHOLDER: exam listening uses temporary TTS until recorded audio is available.
   */
  audioText?: string | null;
}

export interface ExamDto {
  examId: number;
  totalQuestions: number;
  durationMinutes: number;
  startedAt: string;
  expiresAt: string;
  status: string;
  questions: ExamQuestion[];
}

export interface ExamQuestionResult {
  index: number;
  type: string;
  questionText: string;
  submittedAnswer: string;
  correctAnswer: string;
  explanation: string | null;
  correct: boolean;
}

export interface ExamResultDto {
  examId: number;
  correctCount: number;
  totalCount: number;
  scorePercent: number;
  durationSeconds: number | null;
  currentStreak: number;
  details: ExamQuestionResult[];
}

export interface ExamHistoryDto {
  examId: number;
  correctCount: number;
  totalCount: number;
  scorePercent: number;
  durationMinutes: number;
  durationSeconds: number | null;
  submittedAt: string;
}

export interface StreakDto {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  activeDays: number;
  zone: string;
  todaySrsReviews: number;
  minSrsReviewsForStreak: number;
  todayQualified: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  fullName: string;
  learnedWords: number;
  longestStreak: number;
  bestExamScore: number;
  points: number;
}

export interface LeaderboardDto {
  scope: string;
  pointsFormula: string;
  entries: LeaderboardEntry[];
}

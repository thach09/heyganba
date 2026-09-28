/** DTO dùng chung cho các màn Ngữ pháp (danh sách, trang chi tiết, phiên luyện tập). */

export interface GrammarRuleDto {
  id: number;
  title: string;
  structure: string;
  explanation: string;
  notes: string | null;
  /** Số thứ tự LIÊN TỤC theo thứ tự dạy trong app (số gốc của tài liệu không hiển thị). */
  number: number;
  lessonSlug: string | null;
  lessonTitle: string | null;
  exerciseCount: number;
  /** PENDING_REVIEW khi nội dung còn là bản nháp chờ duyệt tiếng Nhật. */
  reviewStatus: string | null;
}

export interface GrammarExerciseDto {
  id: number;
  ruleId: number;
  ruleTitle: string;
  questionText: string;
  options: string[];
  isCommonMistake: boolean;
  mistakeCategory: string | null;
  reviewStatus: string | null;
}

export interface GrammarCheckResult {
  correct: boolean;
  exerciseId: number;
  ruleId: number;
  ruleTitle: string;
  questionText: string;
  submittedAnswer: string;
  correctAnswer: string;
  explanation: string | null;
  isCommonMistake: boolean;
  mistakeCategory: string | null;
}

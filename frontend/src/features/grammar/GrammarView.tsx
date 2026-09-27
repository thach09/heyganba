import React, { useCallback, useEffect, useState } from 'react';
import { SearchX, Sparkles, TriangleAlert } from 'lucide-react';
import confetti from 'canvas-confetti';
import { OnboardingTooltip } from '../../components/OnboardingTooltip';
import { FeedbackAlert } from '../../components/FeedbackAlert';
import type { FeedbackType } from '../../components/FeedbackAlert';
import { SubmitButton } from '../../components/SubmitButton';
import { apiRequest } from '../../services/api';
import type { AuthResponse } from '../../services/api';

interface GrammarRuleDto {
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

interface GrammarExerciseDto {
  id: number;
  ruleId: number;
  ruleTitle: string;
  questionText: string;
  options: string[];
  isCommonMistake: boolean;
  mistakeCategory: string | null;
  /** PENDING_REVIEW khi câu hỏi còn là bản nháp chờ duyệt tiếng Nhật. */
  reviewStatus: string | null;
}

interface GrammarCheckResult {
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

interface GrammarViewProps {
  user: AuthResponse | null;
  onRequireLogin: () => void;
}

const LESSON_OPTIONS = [
  { slug: 'jpd113-b1', label: 'Bài 1' },
  { slug: 'jpd113-b2', label: 'Bài 2' },
  { slug: 'jpd113-b3', label: 'Bài 3' },
  { slug: 'jpd123-b4', label: 'Bài 4' },
  { slug: 'jpd123-b5', label: 'Bài 5' },
  { slug: 'jpd123-b6', label: 'Bài 6' },
  { slug: 'jpd123-b7', label: 'Bài 7' },
];

export const GrammarView: React.FC<GrammarViewProps> = ({ user, onRequireLogin }) => {
  const [rules, setRules] = useState<GrammarRuleDto[]>([]);
  const [lesson, setLesson] = useState<string>('');
  const [mistakeOnly, setMistakeOnly] = useState(false);
  const [selectedRule, setSelectedRule] = useState<GrammarRuleDto | null>(null);
  const [exercises, setExercises] = useState<GrammarExerciseDto[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<GrammarCheckResult | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; title: string; message: string } | null>(null);
  // Số điểm ngữ pháp còn là bản nháp chờ duyệt tiếng Nhật (hiện cảnh báo để không bị nhầm là nội dung đã duyệt).
  const pendingReviewRules = rules.filter((rule) => rule.reviewStatus !== 'APPROVED').length;

  const loadRules = useCallback(async () => {
    if (!user) {
      return;
    }

    const query = lesson ? `?lesson=${lesson}` : '';
    const res = await apiRequest<GrammarRuleDto[]>(`/grammar/rules${query}`);

    if (res.success && res.data) {
      setRules(res.data);
      setError(null);
      setSelectedRule((current) => res.data?.find((rule) => rule.id === current?.id) ?? null);
    } else {
      setError(res.message || 'Không tải được danh sách điểm ngữ pháp.');
    }
  }, [user, lesson]);

  const loadExercises = useCallback(
    async (rule: GrammarRuleDto | null, onlyMistakes: boolean) => {
      if (!user) {
        return;
      }

      const params = new URLSearchParams();
      if (rule) {
        params.set('ruleId', String(rule.id));
      }
      if (onlyMistakes) {
        params.set('mistakeOnly', 'true');
      }

      const query = params.toString();
      const res = await apiRequest<GrammarExerciseDto[]>(`/grammar/exercises${query ? `?${query}` : ''}`);

      if (res.success && res.data) {
        setExercises(res.data);
        setIndex(0);
        setSelectedOption(null);
        setResult(null);
      } else {
        setError(res.message || 'Không tải được bài tập.');
      }
    },
    [user]
  );

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  useEffect(() => {
    void loadExercises(selectedRule, mistakeOnly);
  }, [selectedRule, mistakeOnly, loadExercises]);

  const current = exercises[index] ?? null;

  const submitAnswer = useCallback(
    async (answer: string) => {
      if (!current || result) {
        return;
      }

      setSelectedOption(answer);
      const res = await apiRequest<GrammarCheckResult>(`/grammar/exercises/${current.id}/check`, {
        method: 'POST',
        body: JSON.stringify({ userAnswer: answer }),
      });

      if (!res.success || !res.data) {
        setFeedback({
          type: 'error',
          title: 'Không chấm được bài tập',
          message: res.message || 'Vui lòng thử lại.',
        });
        setSelectedOption(null);
        return;
      }

      const checked = res.data;
      setResult(checked);
      setScore((previous) => ({
        correct: previous.correct + (checked.correct ? 1 : 0),
        total: previous.total + 1,
      }));

      if (checked.correct) {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.85 } });
      } else {
        setFeedback({
          type: 'error',
          title: `Chưa đúng: đáp án là ${checked.correctAnswer}`,
          message: checked.explanation || 'Xem giải thích rồi thử lại câu sau.',
        });
      }
    },
    [current, result]
  );

  const goNext = useCallback(() => {
    setSelectedOption(null);
    setResult(null);
    setIndex((previous) => previous + 1);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(event.key) && current) {
        const option = current.options[Number(event.key) - 1];
        if (option) {
          void submitAnswer(option);
        }
        return;
      }
      if (event.key === 'Enter' && result) {
        goNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [current, result, submitAnswer, goNext]);

  if (!user) {
    return (
      <div className="flashcard-shell">
        <div className="flashcard-login-required">
          <Sparkles size={26} color="var(--accent-purple)" />
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Đăng nhập để luyện trợ từ &amp; ngữ pháp</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '520px', textAlign: 'center' }}>
            Bài tập có chấm điểm phía server và thống kê theo tài khoản, cần đăng nhập để lưu tiến độ.
          </p>
          <SubmitButton onClick={onRequireLogin}>Đăng nhập / Đăng ký</SubmitButton>
        </div>
      </div>
    );
  }

  return (
    <div className="grammar-shell">
      <OnboardingTooltip
        storageKey="grammar"
        title="Hướng dẫn luyện Trợ từ & Ngữ pháp"
        description="Chọn bài học hoặc bật lọc 'Chỉ nhóm bẫy thường gặp'. Chọn đáp án bằng phím 1/2/3/4, Enter để sang câu tiếp theo."
      />

      <div className="kana-hero">
        <span className="kana-phase-badge">
          <Sparkles size={13} />
          <span>Phase 4</span>
        </span>
        <h2 className="kana-hero-title">Trợ Từ &amp; Ngữ Pháp (Bẫy Thường Gặp)</h2>
        <p className="kana-hero-desc">
          17 điểm ngữ pháp JPD113 + ngữ pháp JPD123 theo đúng thứ tự tài liệu gốc. Nhóm bẫy (は/へ/を, số đếm biến âm,
          tính từ, so sánh, thể て) được gắn cờ riêng để luyện tập trung.
        </p>
        <div className="kana-hero-stats">
          <span className="kana-stat">
            Điểm ngữ pháp: <strong>{rules.length}</strong>
          </span>
          <span className="kana-stat">
            Đúng <strong>{score.correct}</strong> / {score.total} câu
          </span>
          <span className="kana-stat">
            Câu đang luyện: <strong>{exercises.length}</strong>
          </span>
        </div>
      </div>

      <div className="kanji-filters">
        <div className="kana-tabs">
          <button type="button" className={`kana-tab ${lesson === '' ? 'active' : ''}`} onClick={() => setLesson('')}>
            Tất cả bài
          </button>
          {LESSON_OPTIONS.map((option) => (
            <button
              key={option.slug}
              type="button"
              className={`kana-tab ${lesson === option.slug ? 'active' : ''}`}
              onClick={() => setLesson(option.slug)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="kanji-filter-row">
          <button
            type="button"
            className={`chip ${mistakeOnly ? 'is-active' : ''}`}
            onClick={() => {
              setSelectedRule(null);
              setMistakeOnly((previous) => !previous);
            }}
          >
            <TriangleAlert size={14} />
            <span>Chỉ nhóm bẫy thường gặp</span>
          </button>
          <span className="kana-detail-meta">
            Đang luyện: {selectedRule ? selectedRule.title : mistakeOnly ? 'toàn bộ nhóm bẫy' : 'tất cả điểm ngữ pháp'}
          </span>
        </div>
      </div>

      {error && <div className="flashcard-note is-error">{error}</div>}

      {pendingReviewRules > 0 && (
        <div className="flashcard-note is-warn">
          <TriangleAlert size={14} />
          <span>
            Nội dung nháp: <strong>{pendingReviewRules}</strong>/{rules.length} điểm ngữ pháp đang{' '}
            <strong>chờ duyệt nội dung tiếng Nhật</strong> — bài tập bổ sung chỉ có ở staging, chưa dùng cho
            production. Khi nội dung được duyệt, backend trả `reviewStatus = APPROVED` và cảnh báo này tự ẩn.
          </span>
        </div>
      )}

      <div className="grammar-layout">
        <div className="grammar-rules">
          {rules.map((rule) => (
            <button
              key={rule.id}
              type="button"
              className={`grammar-rule-card ${selectedRule?.id === rule.id ? 'is-active' : ''}`}
              onClick={() => {
                setSelectedRule(rule);
                setMistakeOnly(false);
              }}
            >
              <div className="grammar-rule-head">
                {rule.number != null && <span className="grammar-rule-number">#{rule.number}</span>}
                <span className="grammar-rule-title">{rule.title}</span>
                {rule.reviewStatus !== 'APPROVED' && (
                  <span className="kana-badge is-warn" title="Chờ duyệt nội dung tiếng Nhật">
                    chờ duyệt
                  </span>
                )}
                <span className="grammar-rule-count">{rule.exerciseCount} câu</span>
              </div>
              <div className="grammar-rule-structure">{rule.structure}</div>
              <div className="grammar-rule-explanation">{rule.explanation}</div>
            </button>
          ))}
          {rules.length === 0 && !error && (
            <div className="empty-state">
              <span className="empty-state-icon">
                <SearchX size={20} />
              </span>
              <span className="empty-state-title">Chưa có điểm ngữ pháp nào cho bộ lọc này</span>
              <span className="empty-state-desc">
                Thử chọn bài học khác, hoặc tắt lọc “Chỉ nhóm bẫy thường gặp” để xem toàn bộ điểm ngữ pháp.
              </span>
            </div>
          )}
        </div>

        <aside className="grammar-practice">
          {!current && (
            <div className="empty-state">
              <span className="empty-state-icon">
                <Sparkles size={20} />
              </span>
              <span className="empty-state-title">Chọn một điểm ngữ pháp để bắt đầu</span>
              <span className="empty-state-desc">
                Danh sách điểm ngữ pháp nằm ở cột bên trái. Chọn đáp án bằng phím 1/2/3/4, Enter để sang câu tiếp theo.
              </span>
            </div>
          )}

          {current && (
            <>
              <div className="quiz-question-meta">
                <span
                  className="kana-count-badge"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
                >
                  {current.ruleTitle}
                </span>
                {current.isCommonMistake && (
                  <span className="kana-badge is-warn">
                    <TriangleAlert size={12} /> Nhóm bẫy
                  </span>
                )}
                <span className="quiz-hint">
                  Câu {index + 1}/{exercises.length}
                </span>
              </div>

              <div className="grammar-question">{current.questionText}</div>

              <div className="quiz-options">
                {current.options.map((option, optionIndex) => {
                  const classNames = ['quiz-option'];
                  if (result) {
                    if (option === result.correctAnswer) classNames.push('is-correct');
                    else if (option === selectedOption) classNames.push('is-wrong');
                  }
                  return (
                    <button
                      key={option}
                      type="button"
                      className={classNames.join(' ')}
                      disabled={Boolean(result)}
                      onClick={() => void submitAnswer(option)}
                    >
                      <kbd>{optionIndex + 1}</kbd>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>

              {result?.explanation && <div className="kana-inline-note">{result.explanation}</div>}

              <div className="grammar-actions">
                <SubmitButton onClick={goNext} disabled={!result} shortcutHint="Enter">
                  Câu tiếp theo
                </SubmitButton>
              </div>
            </>
          )}
        </aside>
      </div>

      {feedback && (
        <FeedbackAlert
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

    </div>
  );
};

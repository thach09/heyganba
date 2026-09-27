import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Flame, GraduationCap, Play, Sparkles, Trophy, Volume2, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import { OnboardingTooltip } from '../../components/OnboardingTooltip';
import { FeedbackAlert } from '../../components/FeedbackAlert';
import type { FeedbackType } from '../../components/FeedbackAlert';
import { SubmitButton } from '../../components/SubmitButton';
import { MascotBadge } from '../../components/MascotBadge';
import { apiRequest, saveUser, updateClassCode } from '../../services/api';
import type { AuthResponse } from '../../services/api';
import { isJapaneseSpeechSupported, speakJapanese } from '../../services/japaneseSpeech';

interface ExamQuestion {
  index: number;
  type: string;
  questionText: string;
  options: string[];
  /**
   * Text để đọc bằng Web Speech API (browser TTS).
   * ⚠️ PLACEHOLDER: phần "nghe" của đề dùng TTS tạm thời, chưa có file audio thu thật.
   */
  audioText?: string | null;
}

interface ExamDto {
  examId: number;
  totalQuestions: number;
  durationMinutes: number;
  startedAt: string;
  expiresAt: string;
  status: string;
  questions: ExamQuestion[];
}

interface ExamQuestionResult {
  index: number;
  type: string;
  questionText: string;
  submittedAnswer: string;
  correctAnswer: string;
  explanation: string | null;
  correct: boolean;
}

interface ExamResultDto {
  examId: number;
  correctCount: number;
  totalCount: number;
  scorePercent: number;
  durationSeconds: number | null;
  currentStreak: number;
  details: ExamQuestionResult[];
}

interface ExamHistoryDto {
  examId: number;
  correctCount: number;
  totalCount: number;
  scorePercent: number;
  durationMinutes: number;
  durationSeconds: number | null;
  submittedAt: string;
}

interface StreakDto {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  activeDays: number;
  zone: string;
  todaySrsReviews: number;
  minSrsReviewsForStreak: number;
  todayQualified: boolean;
}

interface HeatmapDay {
  date: string;
  itemCount: number;
  correctCount: number;
}

interface LeaderboardEntry {
  rank: number;
  userId: number;
  fullName: string;
  learnedWords: number;
  longestStreak: number;
  bestExamScore: number;
  points: number;
}

interface LeaderboardDto {
  scope: string;
  pointsFormula: string;
  entries: LeaderboardEntry[];
}

interface ExamViewProps {
  user: AuthResponse | null;
  onRequireLogin: () => void;
}

type Phase = 'IDLE' | 'TAKING' | 'RESULT';

const QUESTION_COUNT_OPTIONS = [10, 20, 30];
const DURATION_OPTIONS = [10, 20, 30];
const HEATMAP_DAYS = 91;

export const ExamView: React.FC<ExamViewProps> = ({ user, onRequireLogin }) => {
  const [phase, setPhase] = useState<Phase>('IDLE');
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [exam, setExam] = useState<ExamDto | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [result, setResult] = useState<ExamResultDto | null>(null);
  const [history, setHistory] = useState<ExamHistoryDto[]>([]);
  const [streak, setStreak] = useState<StreakDto | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardDto | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; title: string; message: string } | null>(null);
  // Leaderboard theo lớp: mã lớp lấy từ profile, có thể sửa ngay trong trạm này.
  const [classCodeInput, setClassCodeInput] = useState(user?.classCode ?? '');
  const [classFilterActive, setClassFilterActive] = useState(false);
  const [classSaving, setClassSaving] = useState(false);
  const [classMessage, setClassMessage] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    if (!user) {
      return;
    }

    const activeClassCode = classFilterActive && classCodeInput.trim() ? classCodeInput.trim() : null;
    const leaderboardEndpoint = activeClassCode
      ? `/leaderboard?limit=10&classCode=${encodeURIComponent(activeClassCode)}`
      : '/leaderboard?limit=10';

    const [historyRes, streakRes, heatmapRes, leaderboardRes] = await Promise.all([
      apiRequest<ExamHistoryDto[]>('/exam/history'),
      apiRequest<StreakDto>('/streak'),
      apiRequest<HeatmapDay[]>(`/streak/heatmap?days=${HEATMAP_DAYS}`),
      apiRequest<LeaderboardDto>(leaderboardEndpoint),
    ]);

    if (historyRes.success && historyRes.data) {
      setHistory(historyRes.data);
    }
    if (streakRes.success && streakRes.data) {
      setStreak(streakRes.data);
    }
    if (heatmapRes.success && heatmapRes.data) {
      setHeatmap(heatmapRes.data);
    }
    if (leaderboardRes.success && leaderboardRes.data) {
      setLeaderboard(leaderboardRes.data);
    }
    if (!historyRes.success) {
      setError(historyRes.message || 'Không tải được dữ liệu tiến độ.');
    }
  }, [user, classFilterActive, classCodeInput]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  /** Lưu mã lớp vào profile (text tự do, gửi rỗng để xoá lớp) rồi bật lọc bảng xếp hạng theo lớp. */
  const saveOwnClassCode = async () => {
    if (!user) {
      return;
    }

    setClassSaving(true);
    setClassMessage(null);

    const profile = await updateClassCode(classCodeInput.trim());

    setClassSaving(false);

    if (!profile) {
      setClassMessage('Không lưu được mã lớp, vui lòng thử lại.');
      return;
    }

    const updatedUser: AuthResponse = { ...user, classCode: profile.classCode };
    saveUser(updatedUser);
    setClassCodeInput(profile.classCode ?? '');
    setClassFilterActive(Boolean(profile.classCode));
    setClassMessage(profile.classCode ? `Đã lưu lớp ${profile.classCode}.` : 'Đã xoá mã lớp.');
    void loadProgress();
  };

  /** Phát câu hỏi bằng TTS trình duyệt — PLACEHOLDER cho phần nghe của đề (chưa có audio thu thật). */
  const playQuestionAudio = (question: ExamQuestion, event: React.MouseEvent) => {
    event.stopPropagation();
    const text = question.audioText ?? question.questionText;
    if (isJapaneseSpeechSupported()) {
      speakJapanese(text);
    } else {
      setClassMessage('Trình duyệt không hỗ trợ đọc tiếng Nhật (Web Speech API).');
    }
  };

  const startExam = async () => {
    setBusy(true);
    setError(null);

    const res = await apiRequest<ExamDto>('/exam/generate', {
      method: 'POST',
      body: JSON.stringify({ totalQuestions, durationMinutes }),
    });

    setBusy(false);

    if (!res.success || !res.data) {
      setError(res.message || 'Không sinh được đề thi thử.');
      return;
    }

    setExam(res.data);
    setAnswers({});
    setActiveIndex(0);
    setResult(null);
    setRemainingSeconds(res.data.durationMinutes * 60);
    setPhase('TAKING');
  };

  const submitExam = useCallback(async () => {
    if (!exam) {
      return;
    }

    setBusy(true);
    const payload = {
      answers: exam.questions.map((question) => ({
        index: question.index,
        answer: answers[question.index] ?? '',
      })),
    };

    const res = await apiRequest<ExamResultDto>(`/exam/${exam.examId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    setBusy(false);

    if (!res.success || !res.data) {
      setFeedback({
        type: 'error',
        title: 'Không nộp được bài',
        message: res.message || 'Vui lòng thử lại.',
      });
      return;
    }

    setResult(res.data);
    setPhase('RESULT');
    if (res.data.scorePercent >= 80) {
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.8 } });
    }
    void loadProgress();
  }, [exam, answers, loadProgress]);

  const submitRef = useRef(submitExam);
  submitRef.current = submitExam;

  useEffect(() => {
    if (phase !== 'TAKING' || !exam) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      const secondsLeft = Math.max(0, Math.floor((new Date(exam.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);

      // Hết giờ → tự nộp (server vẫn chấm lại, không tin dữ liệu client).
      if (secondsLeft === 0) {
        void submitRef.current();
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase, exam]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (phase !== 'TAKING' || !exam) {
        return;
      }

      const question = exam.questions[activeIndex];
      if (!question) {
        return;
      }

      if (['1', '2', '3', '4'].includes(event.key)) {
        const option = question.options[Number(event.key) - 1];
        if (option) {
          setAnswers((previous) => ({ ...previous, [question.index]: option }));
        }
        return;
      }

      if (event.key === 'Enter') {
        setActiveIndex((previous) => Math.min(previous + 1, exam.questions.length - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, exam, activeIndex]);

  const formatClock = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  };

  const heatLevel = (itemCount: number): number => {
    if (itemCount <= 0) {
      return 0;
    }
    if (itemCount <= 5) {
      return 1;
    }
    if (itemCount <= 15) {
      return 2;
    }
    if (itemCount <= 30) {
      return 3;
    }
    return 4;
  };

  if (!user) {
    return (
      <div className="flashcard-shell">
        <div className="flashcard-login-required">
          <GraduationCap size={26} color="#EC4899" />
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Đăng nhập để vào phòng thi thử</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '520px', textAlign: 'center' }}>
            Điểm thi, streak và thứ hạng được lưu theo tài khoản nên cần đăng nhập trước khi bắt đầu.
          </p>
          <SubmitButton onClick={onRequireLogin}>Đăng nhập / Đăng ký</SubmitButton>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-shell">
      <OnboardingTooltip
        storageKey="exam"
        title="Hướng dẫn phòng thi thử"
        description="Chọn số câu và thời gian rồi bắt đầu. Đề sinh từ nội dung bạn đã học (ngữ pháp, kana, từ vựng). Chọn đáp án bằng phím 1/2/3/4, Enter để sang câu tiếp theo."
      />

      <div className="kana-hero">
        <span className="kana-phase-badge">
          <Sparkles size={13} />
          <span>Phase 5</span>
        </span>
        <h2 className="kana-hero-title">Thi Thử, Streak Heatmap &amp; Bảng Xếp Hạng</h2>
        <p className="kana-hero-desc">
          Đề thi thử sinh tự động từ ngân hàng ngữ pháp, kana và từ vựng đã học — chấm điểm hoàn toàn ở server.
          Streak chỉ tính khi đạt ngưỡng trong ngày; phần nghe phát bằng giọng tiếng Nhật của trình duyệt (tạm thời).
        </p>
        <div className="kana-hero-stats">
          <span className="kana-stat">
            <Flame size={13} /> Streak hiện tại <strong>{streak?.currentStreak ?? 0}</strong> ngày
          </span>
          <span className="kana-stat">
            Streak dài nhất <strong>{streak?.longestStreak ?? 0}</strong> ngày
          </span>
          <span className="kana-stat">
            Số ngày đã học <strong>{streak?.activeDays ?? 0}</strong>
          </span>
          <span className="kana-stat">
            Hôm nay <strong>{streak?.todaySrsReviews ?? 0}</strong>/{streak?.minSrsReviewsForStreak ?? 10} lượt ôn SRS
            {streak?.todayQualified ? ' ✅ đã tính streak' : ' ⏳ chưa đủ ngưỡng'}
          </span>
          <span className="kana-stat">
            Số lượt thi <strong>{history.length}</strong>
          </span>
        </div>
      </div>

      {error && <div className="flashcard-note is-error">{error}</div>}

      {phase === 'IDLE' && (
        <>
          <div className="exam-config">
            <div className="exam-config-group">
              <span className="canvas-tool-label">Số câu</span>
              {QUESTION_COUNT_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`chip ${totalQuestions === option ? 'is-active' : ''}`}
                  onClick={() => setTotalQuestions(option)}
                >
                  {option} câu
                </button>
              ))}
            </div>

            <div className="exam-config-group">
              <span className="canvas-tool-label">Thời gian</span>
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`chip ${durationMinutes === option ? 'is-active' : ''}`}
                  onClick={() => setDurationMinutes(option)}
                >
                  {option} phút
                </button>
              ))}
            </div>

            <SubmitButton onClick={startExam} loading={busy}>
              <Play size={15} />
              <span>Bắt đầu thi thử</span>
            </SubmitButton>
          </div>

          <div className="exam-panels">
            <div className="exam-panel">
              <h3 className="exam-panel-title">
                <Flame size={16} color="var(--accent-gold)" />
                <span>Mascot &amp; điều kiện tính streak</span>
              </h3>
              {/* Mascot tạm: emoji tiến hoá theo streak — xem components/MascotBadge.tsx */}
              <MascotBadge longestStreak={streak?.longestStreak ?? 0} currentStreak={streak?.currentStreak ?? 0} />
              <p className="kana-detail-meta" style={{ marginTop: '10px' }}>
                Một ngày được tính streak khi: ôn ≥ {streak?.minSrsReviewsForStreak ?? 10} lượt SRS, hoặc hoàn thành 1 lượt
                thi thử, hoặc làm ≥ 10 câu bài tập ngữ pháp. Ôn 1 từ đơn lẻ không tính.
              </p>
            </div>

            <div className="exam-panel">
              <h3 className="exam-panel-title">
                <Flame size={16} color="var(--accent-gold)" />
                <span>Streak heatmap ({heatmap.length} ngày gần nhất)</span>
              </h3>
              <div className="heatmap-grid">
                {heatmap.map((day) => (
                  <span
                    key={day.date}
                    className={`heat-cell level-${heatLevel(day.itemCount)}`}
                    title={`${day.date}: ${day.itemCount} hoạt động, ${day.correctCount} câu đúng`}
                  />
                ))}
              </div>
              <div className="heat-legend">
                <span>Ít</span>
                <span className="heat-cell level-1" />
                <span className="heat-cell level-2" />
                <span className="heat-cell level-3" />
                <span className="heat-cell level-4" />
                <span>Nhiều</span>
                <span className="kana-detail-meta">Múi giờ tính streak: {streak?.zone ?? 'UTC'}</span>
              </div>
            </div>

            <div className="exam-panel">
              <h3 className="exam-panel-title">
                <Trophy size={16} color="var(--accent-gold)" />
                <span>Bảng xếp hạng ({leaderboard?.scope ?? 'ALL'})</span>
              </h3>
              <table className="exam-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Học viên</th>
                    <th>Từ đã thuộc</th>
                    <th>Streak</th>
                    <th>Điểm thi</th>
                    <th>Điểm xếp hạng</th>
                  </tr>
                </thead>
                <tbody>
                  {(leaderboard?.entries ?? []).map((entry) => (
                    <tr key={entry.userId}>
                      <td>{entry.rank}</td>
                      <td>{entry.fullName}</td>
                      <td>{entry.learnedWords}</td>
                      <td>{entry.longestStreak}</td>
                      <td>{entry.bestExamScore}%</td>
                      <td>{entry.points}</td>
                    </tr>
                  ))}
                  {(leaderboard?.entries ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Chưa có dữ liệu — hoàn thành 1 lượt thi để xuất hiện trên bảng.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {leaderboard && <p className="kana-detail-meta">{leaderboard.pointsFormula}</p>}

              <div className="exam-class-controls">
                <div style={{ position: 'relative', flex: '1 1 200px' }}>
                  <Users size={15} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    maxLength={50}
                    placeholder="Mã lớp của bạn (VD: JPD113-A)"
                    value={classCodeInput}
                    onChange={(event) => setClassCodeInput(event.target.value)}
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
                <SubmitButton variant="secondary" onClick={saveOwnClassCode} loading={classSaving}>
                  Lưu lớp
                </SubmitButton>
                <SubmitButton
                  variant="secondary"
                  onClick={() => setClassFilterActive((previous) => !previous)}
                  disabled={!classCodeInput.trim()}
                >
                  {classFilterActive ? 'Xem toàn bộ' : 'Chỉ lớp của tôi'}
                </SubmitButton>
              </div>
              <p className="kana-detail-meta">
                Mã lớp là text tự do, dùng để xếp hạng theo lớp. {classMessage ? classMessage : ''}
              </p>
            </div>
          </div>

          <div className="exam-panel">
            <h3 className="exam-panel-title">
              <GraduationCap size={16} color="#EC4899" />
              <span>Lịch sử thi thử</span>
            </h3>
            <table className="exam-table">
              <thead>
                <tr>
                  <th>Đề</th>
                  <th>Đúng</th>
                  <th>Điểm</th>
                  <th>Thời gian làm</th>
                  <th>Nộp lúc</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.examId}>
                    <td>#{item.examId}</td>
                    <td>
                      {item.correctCount}/{item.totalCount}
                    </td>
                    <td>{item.scorePercent}%</td>
                    <td>{item.durationSeconds != null ? formatClock(item.durationSeconds) : '—'}</td>
                    <td>{new Date(item.submittedAt).toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Chưa có lượt thi nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {phase === 'TAKING' && exam && (
        <>
          <div className="exam-timer-bar">
            <span>
              Câu <strong>{activeIndex + 1}</strong>/{exam.questions.length}
            </span>
            <span className="exam-timer">⏱ {formatClock(remainingSeconds)}</span>
            <span className="kana-detail-meta">Phần nghe dùng TTS trình duyệt (tạm thời)</span>
            <SubmitButton onClick={submitExam} loading={busy}>
              Nộp bài
            </SubmitButton>
          </div>

          <div className="exam-questions">
            {exam.questions.map((question, index) => (
              <div
                key={question.index}
                className={`exam-question-card ${index === activeIndex ? 'is-active' : ''}`}
                onClick={() => setActiveIndex(index)}
              >
                <div className="exam-question-head">
                  <span className="grammar-rule-number">Câu {index + 1}</span>
                  <span className="kana-detail-meta">{question.type}</span>
                  {/* Nghe câu hỏi: TTS trình duyệt — placeholder chờ audio thu thật. */}
                  <button
                    type="button"
                    className="exam-audio-btn"
                    onClick={(event) => playQuestionAudio(question, event)}
                    title="Nghe câu hỏi bằng giọng đọc trình duyệt (tạm thời)"
                  >
                    <Volume2 size={14} />
                    <span>Nghe</span>
                  </button>
                  {answers[question.index] && <span className="kana-badge is-warn">Đã chọn</span>}
                </div>
                <div className="grammar-question">{question.questionText}</div>
                <div className="quiz-options">
                  {question.options.map((option, optionIndex) => (
                    <button
                      key={option}
                      type="button"
                      className={`quiz-option ${answers[question.index] === option ? 'is-correct' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setAnswers((previous) => ({ ...previous, [question.index]: option }));
                      }}
                    >
                      <kbd>{optionIndex + 1}</kbd>
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {phase === 'RESULT' && result && (
        <div className="exam-panel">
          <h3 className="exam-panel-title">
            <Trophy size={16} color="var(--accent-gold)" />
            <span>
              Kết quả: {result.correctCount}/{result.totalCount} câu · {result.scorePercent}% · streak{' '}
              {result.currentStreak} ngày
            </span>
          </h3>

          <div className="exam-result-list">
            {result.details.map((detail) => (
              <div key={detail.index} className={`exam-result-item ${detail.correct ? 'is-correct' : 'is-wrong'}`}>
                <div className="exam-result-head">
                  <span className="grammar-rule-number">Câu {detail.index + 1}</span>
                  <span>{detail.correct ? 'Đúng' : 'Sai'}</span>
                  {!detail.correct && (
                    <span className="kana-detail-meta">
                      Bạn chọn: {detail.submittedAnswer || '—'} · Đáp án: {detail.correctAnswer}
                    </span>
                  )}
                </div>
                <div className="grammar-rule-structure">{detail.questionText}</div>
                {detail.explanation && <div className="kana-detail-meta">{detail.explanation}</div>}
              </div>
            ))}
          </div>

          <div className="grammar-actions">
            <SubmitButton variant="secondary" onClick={() => setPhase('IDLE')}>
              Về trang thi thử
            </SubmitButton>
            <SubmitButton onClick={startExam} loading={busy}>
              Thi lại đề mới
            </SubmitButton>
          </div>
        </div>
      )}

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

export default ExamView;

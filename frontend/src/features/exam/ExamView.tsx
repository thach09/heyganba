import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Users, Volume2, X } from 'lucide-react';
import confetti from 'canvas-confetti';
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
    * Text read by the browser Web Speech API (TTS).
    * PLACEHOLDER: exam listening uses temporary TTS until recorded audio is available.
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
/** Activity opacity levels shared with the dashboard heatmap (DESIGN.md). */
const HEAT_OPACITY = [0.06, 0.22, 0.44, 0.66, 0.9];

const labelClass = 'text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-38';
const sectionTitleClass = 'text-[13px] font-semibold text-fg';
const thClass = 'border-b border-rule pb-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fg-38';
const thNumClass = `${thClass} text-right`;
const tdClass = 'border-b border-rule py-2 text-fg-60';
const tdNumClass = `${tdClass} text-right tabular-nums`;

const chipClass = (active: boolean) =>
  `cursor-pointer border px-3 py-1.5 text-[11.5px] transition-colors ${
    active ? 'border-fg bg-fg text-bg' : 'border-rule-strong bg-transparent text-fg-60 hover:border-fg hover:text-fg'
  }`;

/** Rank 1 uses solid ink, ranks 2–3 use an ink outline, and remaining ranks are muted. */
const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  const tone = rank === 1 ? 'bg-fg text-bg' : rank <= 3 ? 'border border-fg text-fg' : 'text-fg-38';
  return (
    <span className={`inline-flex h-5 min-w-5 items-center justify-center px-1 text-[11px] tabular-nums ${tone}`}>
      {rank}
    </span>
  );
};

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
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; title: string; message: string } | null>(null);
  // Class leaderboard: load the class code from the profile and allow editing here.
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

  /** Save the free-text class code (empty clears it), then filter the leaderboard by that class. */
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

  /** Play the question through browser TTS — a placeholder until recorded exam audio exists. */
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
  useEffect(() => {
    submitRef.current = submitExam;
  }, [submitExam]);

  useEffect(() => {
    if (phase !== 'TAKING' || !exam) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      const secondsLeft = Math.max(0, Math.floor((new Date(exam.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);

      // Auto-submit at zero; the server still scores the exam and does not trust client results.
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

      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
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

  const currentUserId = user?.userId;

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col items-center pt-16 text-center">
        <span className="font-serif text-[34px] font-light leading-none text-fg">試験</span>
        <p className="mt-5 text-[13px] leading-[1.9] text-fg-60">
          Đăng nhập để vào phòng thi thử. Điểm thi, streak và thứ hạng được lưu theo tài khoản.
        </p>
        <div className="mt-7">
          <SubmitButton onClick={onRequireLogin}>Đăng nhập / Đăng ký</SubmitButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col">
      {/* Station header */}
      <div className="flex items-center justify-between gap-6">
        <div className={labelClass}>
          Exam <span className="ml-2 font-serif text-[12.5px] font-normal normal-case tracking-[0.06em]">試験</span>
        </div>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          aria-label="Hướng dẫn phòng thi thử"
          title="Hướng dẫn phòng thi thử"
          className="inline-flex h-6 w-6 cursor-pointer items-center justify-center border border-rule bg-transparent font-sans text-[11px] font-semibold text-fg-38 transition-colors hover:border-rule-strong hover:text-fg"
        >
          !
        </button>
      </div>

      <p className="mt-6 text-[11.5px] leading-[1.9] text-fg-38">
        Streak hiện tại <span className="text-fg-60">{streak?.currentStreak ?? 0}</span> ngày · dài nhất{' '}
        <span className="text-fg-60">{streak?.longestStreak ?? 0}</span> · đã học{' '}
        <span className="text-fg-60">{streak?.activeDays ?? 0}</span> ngày · hôm nay{' '}
        <span className="text-fg-60">{streak?.todaySrsReviews ?? 0}</span>/
        {streak?.minSrsReviewsForStreak ?? 10} lượt ôn SRS
        {streak?.todayQualified ? ' · đã tính streak' : ' · chưa đủ ngưỡng'} ·{' '}
        <span className="text-fg-60">{history.length}</span> lượt thi
      </p>

      {error && <p className="mt-4 text-[12.5px] text-red">{error}</p>}

      {phase === 'IDLE' && (
        <>
          {/* Setup đề */}
          <div className="mt-8 bg-card px-6 py-7">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={labelClass}>Số câu</span>
                {QUESTION_COUNT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={chipClass(totalQuestions === option)}
                    onClick={() => setTotalQuestions(option)}
                  >
                    {option} câu
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={labelClass}>Thời gian</span>
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={chipClass(durationMinutes === option)}
                    onClick={() => setDurationMinutes(option)}
                  >
                    {option} phút
                  </button>
                ))}
              </div>

              <div className="ml-auto">
                <SubmitButton onClick={startExam} loading={busy}>
                  <Play size={14} />
                  <span>Bắt đầu thi thử</span>
                </SubmitButton>
              </div>
            </div>
          </div>

          {/* Mascot + heatmap */}
          <div className="mt-10 grid gap-10 min-[1101px]:grid-cols-2">
            <section>
              <h3 className={sectionTitleClass}>Mascot &amp; điều kiện tính streak</h3>
              <div className="mt-4">
                <MascotBadge longestStreak={streak?.longestStreak ?? 0} currentStreak={streak?.currentStreak ?? 0} />
              </div>
              <p className="mt-3 text-[11.5px] leading-[1.8] text-fg-38">
                Một ngày được tính streak khi: ôn ≥ {streak?.minSrsReviewsForStreak ?? 10} lượt SRS, hoặc hoàn thành 1
                lượt thi thử, hoặc làm ≥ 10 câu bài tập ngữ pháp. Ôn 1 từ đơn lẻ không tính.
              </p>
            </section>

            <section>
              <h3 className={sectionTitleClass}>Streak heatmap ({heatmap.length} ngày gần nhất)</h3>
              <div className="mt-4 flex flex-wrap gap-[3px]">
                {heatmap.map((day) => (
                  <span
                    key={day.date}
                    className="h-[12px] w-[12px] bg-fg"
                    style={{ opacity: HEAT_OPACITY[heatLevel(day.itemCount)] }}
                    title={`${day.date}: ${day.itemCount} hoạt động, ${day.correctCount} câu đúng`}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-fg-38">
                <span>Ít</span>
                {HEAT_OPACITY.map((opacity) => (
                  <span key={opacity} className="h-[10px] w-[10px] bg-fg" style={{ opacity }} />
                ))}
                <span>Nhiều</span>
                <span className="ml-2">Múi giờ tính streak: {streak?.zone ?? 'UTC'}</span>
              </div>
            </section>
          </div>

          {/* Bảng xếp hạng */}
          <section className="mt-10 border-t border-rule pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className={sectionTitleClass}>Bảng xếp hạng ({leaderboard?.scope ?? 'ALL'})</h3>
              {leaderboard && <span className="text-[11px] text-fg-38">{leaderboard.pointsFormula}</span>}
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr>
                    <th className={thClass}>#</th>
                    <th className={thClass}>Học viên</th>
                    <th className={thNumClass}>Từ đã thuộc</th>
                    <th className={thNumClass}>Streak</th>
                    <th className={thNumClass}>Điểm thi</th>
                    <th className={thNumClass}>Điểm xếp hạng</th>
                  </tr>
                </thead>
                <tbody>
                  {(leaderboard?.entries ?? []).map((entry) => (
                    <tr key={entry.userId} className={entry.userId === currentUserId ? 'bg-tint' : undefined}>
                      <td className={tdClass}>
                        <RankBadge rank={entry.rank} />
                      </td>
                      <td className={`${tdClass} max-w-[220px] truncate`} title={entry.fullName}>
                        {entry.fullName}
                      </td>
                      <td className={tdNumClass}>{entry.learnedWords}</td>
                      <td className={tdNumClass}>{entry.longestStreak}</td>
                      <td className={tdNumClass}>{entry.bestExamScore}%</td>
                      <td className={tdNumClass}>{entry.points}</td>
                    </tr>
                  ))}
                  {(leaderboard?.entries ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[12.5px] text-fg-38">
                        Chưa có dữ liệu — hoàn thành 1 lượt thi để xuất hiện trên bảng.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Users size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-38" />
                <input
                  type="text"
                  maxLength={50}
                  placeholder="Mã lớp của bạn (VD: JPD113-A)"
                  value={classCodeInput}
                  onChange={(event) => setClassCodeInput(event.target.value)}
                  aria-label="Mã lớp của bạn"
                  className="h-10 w-full min-w-[240px] border border-rule-strong bg-transparent pl-9 pr-3 text-[12.5px] text-fg outline-none transition-colors placeholder:text-fg-38 focus:border-fg"
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
            <p className="mt-3 text-[11.5px] leading-[1.8] text-fg-38">
              Mã lớp là text tự do, dùng để xếp hạng theo lớp. {classMessage ?? ''}
            </p>
          </section>

          {/* Lịch sử thi */}
          <section className="mt-10 border-t border-rule pt-6">
            <h3 className={sectionTitleClass}>Lịch sử thi thử</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr>
                    <th className={thClass}>Đề</th>
                    <th className={thNumClass}>Đúng</th>
                    <th className={thNumClass}>Điểm</th>
                    <th className={thNumClass}>Thời gian làm</th>
                    <th className={thClass}>Nộp lúc</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.examId}>
                      <td className={tdClass}>#{item.examId}</td>
                      <td className={tdNumClass}>
                        {item.correctCount}/{item.totalCount}
                      </td>
                      <td className={tdNumClass}>{item.scorePercent}%</td>
                      <td className={tdNumClass}>
                        {item.durationSeconds != null ? formatClock(item.durationSeconds) : '—'}
                      </td>
                      <td className={tdClass}>{new Date(item.submittedAt).toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[12.5px] text-fg-38">
                        Chưa có lượt thi nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {phase === 'TAKING' && exam && (
        <>
          <div className="sticky top-0 z-10 mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-rule bg-bg py-3">
            <span className="text-[12.5px] text-fg-60">
              Câu <b className="font-serif text-sm font-semibold text-fg">{activeIndex + 1}</b>/
              {exam.questions.length}
            </span>
            <span className="font-serif text-[15px] tabular-nums text-fg">⏱ {formatClock(remainingSeconds)}</span>
            <span className="text-[11px] text-fg-38">Phần nghe dùng TTS trình duyệt (tạm thời)</span>
            <div className="ml-auto">
              <SubmitButton onClick={submitExam} loading={busy}>
                Nộp bài
              </SubmitButton>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {exam.questions.map((question, index) => {
              const selected = answers[question.index];
              const active = index === activeIndex;
              return (
                <div
                  key={question.index}
                  data-exam-question={index}
                  onClick={() => setActiveIndex(index)}
                  className={`cursor-pointer border px-5 py-5 transition-colors ${
                    active ? 'border-fg bg-card' : 'border-rule hover:border-rule-strong'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[11px] text-fg-38">Câu {index + 1}</span>
                    <span className="text-[11px] text-fg-38">{question.type}</span>
                    {/* Nghe câu hỏi: TTS trình duyệt — placeholder chờ audio thu thật. */}
                    <button
                      type="button"
                      onClick={(event) => playQuestionAudio(question, event)}
                      title="Nghe câu hỏi bằng giọng đọc trình duyệt (tạm thời)"
                      className="flex cursor-pointer items-center gap-1.5 border border-rule bg-transparent px-2 py-1 text-[11px] text-fg-60 transition-colors hover:border-rule-strong hover:text-fg"
                    >
                      <Volume2 size={12} />
                      <span>Nghe</span>
                    </button>
                    {selected && <span className="border border-rule px-2 py-0.5 text-[10.5px] text-fg-60">Đã chọn</span>}
                  </div>

                  <p className="mt-4 font-serif text-[20px] leading-[1.7] text-fg">{question.questionText}</p>

                  <div className="mt-4 flex flex-col gap-2">
                    {question.options.map((option, optionIndex) => (
                      <button
                        key={option}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setAnswers((previous) => ({ ...previous, [question.index]: option }));
                        }}
                        className={`flex cursor-pointer items-center gap-3 border px-4 py-2.5 text-left transition-colors ${
                          selected === option
                            ? 'border-fg text-fg'
                            : 'border-rule-strong text-fg-60 hover:border-fg hover:text-fg'
                        }`}
                      >
                        <kbd className="shrink-0 border border-current px-1.5 text-[10px] font-semibold leading-4 opacity-70">
                          {optionIndex + 1}
                        </kbd>
                        <span className="font-serif text-[15px]">{option}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {phase === 'RESULT' && result && (
        <div className="mt-8 bg-card px-6 py-7">
          <h3 className={sectionTitleClass}>
            Kết quả:{' '}
            <span className="font-serif text-[15px] text-fg">
              {result.correctCount}/{result.totalCount} câu · {result.scorePercent}%
            </span>{' '}
            · streak {result.currentStreak} ngày
          </h3>

          <div className="mt-5 flex flex-col gap-3">
            {result.details.map((detail) => (
              <div
                key={detail.index}
                className={`border-l-2 py-2 pl-4 ${detail.correct ? 'border-l-fg' : 'border-l-red'}`}
              >
                <div className="flex flex-wrap items-center gap-3 text-[11.5px]">
                  <span className="text-fg-38">Câu {detail.index + 1}</span>
                  <span className={detail.correct ? 'text-fg' : 'text-red'}>{detail.correct ? 'Đúng' : 'Sai'}</span>
                  {!detail.correct && (
                    <span className="text-fg-38">
                      Bạn chọn: <span className="font-serif text-fg-60">{detail.submittedAnswer || '—'}</span> · Đáp án:{' '}
                      <span className="font-serif text-fg-60">{detail.correctAnswer}</span>
                    </span>
                  )}
                </div>
                <p className="mt-2 font-serif text-[15px] leading-[1.7] text-fg">{detail.questionText}</p>
                {detail.explanation && <p className="mt-1 text-[12px] leading-[1.8] text-fg-60">{detail.explanation}</p>}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-2.5">
            <SubmitButton variant="secondary" onClick={() => setPhase('IDLE')}>
              Về trang thi thử
            </SubmitButton>
            <SubmitButton onClick={startExam} loading={busy}>
              Thi lại đề mới
            </SubmitButton>
          </div>
        </div>
      )}

      {/* Help panel */}
      {helpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-5"
          onClick={() => setHelpOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Hướng dẫn phòng thi thử"
            className="w-full max-w-[420px] bg-card px-7 py-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-[15px] font-semibold">Hướng dẫn phòng thi thử</h3>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                aria-label="Đóng hướng dẫn"
                title="Đóng hướng dẫn"
                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center border border-rule bg-transparent text-fg-60 transition-colors hover:border-rule-strong hover:text-fg"
              >
                <X size={15} />
              </button>
            </div>
            <p className="mt-4 text-[13px] leading-[1.9] text-fg-60">
              Chọn số câu và thời gian rồi bắt đầu. Đề sinh từ ngân hàng ngữ pháp, kana và từ vựng đã duyệt, chấm điểm
              hoàn toàn ở server — client không thấy đáp án trước khi nộp. Chọn đáp án bằng phím 1–4, Enter để sang câu
              tiếp theo; hết giờ thì bài tự nộp.
            </p>
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

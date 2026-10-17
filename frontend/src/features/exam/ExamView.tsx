import { useRequestScope } from '../../lib/hooks/useRequestScope';
import { progressApi } from '../progress/api';
import { examApi } from './api';
import { clearActiveAttempt, readActiveAttempt, saveActiveAttempt } from './activeAttempt';
import type { HeatmapDay } from '../progress/types';
import type { ExamQuestion, ExamDto, ExamResultDto, ExamHistoryDto, StreakDto, LeaderboardDto } from './types';
import { useAuth } from '../../app/useAuth';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Users, Volume2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { FeedbackAlert } from '../../components/FeedbackAlert';
import type { FeedbackType } from '../../components/FeedbackAlert';
import { SubmitButton } from '../../components/SubmitButton';
import { MascotBadge } from '../../components/MascotBadge';
import { RedSealStamp } from '../../components/RedSealStamp';
import { updateClassCode } from '../account/api';
import type { AuthResponse } from '../../lib/api/types';
import { isChineseSpeechSupported, speakChinese } from '../../services/chineseSpeech';
import { Modal } from '../../components/Modal';
import { learningKeyboardBlocked } from '../../lib/learningKeyboard';

type Phase = 'IDLE' | 'TAKING' | 'RESULT';

const QUESTION_COUNT_OPTIONS = [10, 20, 30];
const DURATION_OPTIONS = [15, 20, 35];
const HEATMAP_DAYS = 91;
const HEAT_OPACITY = [0.06, 0.22, 0.44, 0.66, 0.9];

const labelClass = 'text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-38';
const sectionTitleClass = 'text-[13px] font-semibold text-fg';
const thClass = 'border-b border-rule pb-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fg-38';
const thNumClass = `${thClass} text-right`;
const tdClass = 'border-b border-rule py-2 text-fg-60';
const tdNumClass = `${tdClass} text-right tabular-nums`;

const chipClass = (active: boolean) =>
  `cursor-pointer border px-3 py-1.5 text-[11.5px] transition-colors ${
    active ? 'border-fg bg-fg text-bg font-semibold' : 'border-rule-strong bg-transparent text-fg-60 hover:border-fg hover:text-fg'
  }`;

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  const tone = rank === 1 ? 'bg-fg text-bg' : rank <= 3 ? 'border border-fg text-fg' : 'text-fg-38';
  return (
    <span className={`inline-flex h-5 min-w-5 items-center justify-center px-1 text-[11px] tabular-nums ${tone}`}>
      {rank}
    </span>
  );
};

const formatClock = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const heatLevel = (count: number) => {
  if (count <= 0) return 0;
  if (count < 3) return 1;
  if (count < 8) return 2;
  if (count < 15) return 3;
  return 4;
};

export const ExamView: React.FC = () => {
  const { user, requireLogin: onRequireLogin, updateProfile } = useAuth();
  const userId = user?.userId;
  const navigate = useNavigate();
  const { run, cancel } = useRequestScope(user?.userId);
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
  const submissionInFlight = useRef(false);
  const deadlineAttempted = useRef(false);
  const [checkpoint] = useState(() => readActiveAttempt(userId));
  const [resumeState, setResumeState] = useState<'none' | 'loading' | 'failed'>(checkpoint ? 'loading' : 'none');
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpHeading = useRef<HTMLHeadingElement>(null);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; title: string; message: string } | null>(null);
  const [classCodeInput, setClassCodeInput] = useState(user?.classCode ?? '');
  const [classFilterActive, setClassFilterActive] = useState(false);
  const [classSaving, setClassSaving] = useState(false);
  const [classMessage, setClassMessage] = useState<string | null>(null);

  const checkpointAttempt = useCallback((attempt: ExamDto, selected: Record<number, string>, position: number) => {
    if (userId) setStorageWarning(!saveActiveAttempt(userId, { examId: attempt.examId, answers: selected, activeIndex: position }));
  }, [userId]);

  const loadProgress = useCallback(async () => {
    if (!userId) {
      return;
    }

    const activeClassCode = classFilterActive && classCodeInput.trim() ? classCodeInput.trim() : null;

    const loaded = await run('ExamView-load', (signal) =>
      Promise.all([
        examApi.history({ signal }),
        progressApi.streak({ signal }),
        progressApi.heatmap(HEATMAP_DAYS, { signal }),
        examApi.leaderboard(activeClassCode, { signal }),
      ])
    );

    if (!loaded) return;
    const [h, s, m, l] = loaded;
    if (h.success && h.data) setHistory(h.data);
    if (s.success && s.data) setStreak(s.data);
    if (m.success && m.data) setHeatmap(m.data);
    if (l.success && l.data) setLeaderboard(l.data);
  }, [userId, classFilterActive, classCodeInput, run]);

  useEffect(() => {
    if (!userId) {
      cancel('ExamView-load');
      setHistory([]);
      setStreak(null);
      setHeatmap([]);
      setLeaderboard(null);
      return;
    }

    void loadProgress();
  }, [userId, loadProgress, cancel]);

  const restoreAttempt = useCallback(async () => {
    if (!checkpoint || !userId) {
      setResumeState('none');
      return;
    }

    setResumeState('loading');
    setResumeError(null);

    const res = await run('examApi.resume', (signal) =>
      examApi.get(checkpoint.examId, { signal })
    );

    if (!res) return;

    if (!res.success || !res.data) {
      setResumeState('failed');
      setResumeError(res.message || 'Không khôi phục được bài thi.');
      return;
    }

    if (res.data.status === 'SUBMITTED') {
      clearActiveAttempt(userId);
      const scored = await run('examApi.result', (signal) =>
        examApi.result(checkpoint.examId, { signal })
      );
      if (scored && scored.success && scored.data) {
        setResult(scored.data);
      }
      setPhase('RESULT');
    } else {
      const validAnswers = Object.fromEntries(
        res.data.questions
          .filter((question) => question.options.includes(checkpoint.answers[question.index]))
          .map((question) => [question.index, checkpoint.answers[question.index]])
      );
      setExam(res.data);
      setAnswers(validAnswers);
      setActiveIndex(Math.max(0, Math.min(checkpoint.activeIndex, res.data.questions.length - 1)));
      checkpointAttempt(res.data, validAnswers, Math.max(0, Math.min(checkpoint.activeIndex, res.data.questions.length - 1)));
      setRemainingSeconds(Math.max(0, Math.floor((Date.parse(res.data.expiresAt) - Date.now()) / 1000)));
      setPhase('TAKING');
    }
    setResumeState('none');
  }, [checkpoint, userId, run, checkpointAttempt]);

  useEffect(() => {
    void restoreAttempt();
    return () => cancel('examApi.resume');
  }, [restoreAttempt, cancel]);

  useEffect(() => {
    if (phase !== 'TAKING') return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase]);

  const saveOwnClassCode = async () => {
    if (!user) {
      return;
    }

    setClassSaving(true);
    setClassMessage(null);

    const profile = await run('class-code', (signal) =>
      updateClassCode(classCodeInput.trim(), signal)
    );

    setClassSaving(false);

    if (!profile) {
      setClassMessage('Không lưu được mã lớp, vui lòng thử lại.');
      return;
    }

    const updatedUser: AuthResponse = { ...user, classCode: profile.classCode };
    updateProfile(updatedUser);
    setClassCodeInput(profile.classCode ?? '');
    setClassFilterActive(Boolean(profile.classCode));
    setClassMessage(profile.classCode ? `Đã lưu lớp ${profile.classCode}.` : 'Đã xoá mã lớp.');
    void loadProgress();
  };

  /** Play question audio via browser Mandarin TTS */
  const playQuestionAudio = (question: ExamQuestion, event: React.MouseEvent) => {
    event.stopPropagation();
    const text = question.audioText ?? question.questionText;
    if (isChineseSpeechSupported()) {
      speakChinese(text);
    } else {
      setClassMessage('Trình duyệt không hỗ trợ đọc Quan thoại tiếng Trung (Web Speech API).');
    }
  };

  const startExam = async () => {
    if (busy || resumeState !== 'none') return;
    setBusy(true);
    setError(null);

    const res = await run('examApi.generate', (signal) =>
      examApi.generate({
        signal,
        method: 'POST',
        body: JSON.stringify({ totalQuestions, durationMinutes }),
      })
    );
    if (!res) return;

    setBusy(false);

    if (!res.success || !res.data) {
      setError(res.message || 'Không sinh được đề thi thử.');
      return;
    }

    setExam(res.data);
    checkpointAttempt(res.data, {}, 0);
    deadlineAttempted.current = false;
    setAnswers({});
    setActiveIndex(0);
    setResult(null);
    setRemainingSeconds(res.data.durationMinutes * 60);
    setPhase('TAKING');
  };

  const submitExam = useCallback(async () => {
    if (!exam || phase !== 'TAKING' || submissionInFlight.current) {
      return;
    }

    submissionInFlight.current = true;
    setBusy(true);
    const payload = {
      answers: exam.questions.map((question) => ({
        index: question.index,
        answer: answers[question.index] ?? '',
      })),
    };

    const res = await run('examApi.submit', (signal) =>
      examApi.submit(exam.examId, {
        signal,
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );
    submissionInFlight.current = false;
    if (!res) return;

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
    if (userId) clearActiveAttempt(userId);
    setPhase('RESULT');
    if (res.data.scorePercent >= 60) {
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.8 } });
    }
    void loadProgress();
  }, [exam, phase, answers, userId, loadProgress, run]);

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

      if (secondsLeft === 0 && !deadlineAttempted.current) {
        deadlineAttempted.current = true;
        void submitRef.current();
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase, exam]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (phase !== 'TAKING' || !exam || busy || helpOpen || learningKeyboardBlocked(event)) {
        return;
      }

      const question = exam.questions[activeIndex];
      if (!question) {
        return;
      }

      if (['1', '2', '3', '4'].includes(event.key)) {
        const option = question.options[Number(event.key) - 1];
        if (option) {
          setAnswers((prev) => ({ ...prev, [question.index]: option }));
          checkpointAttempt(exam, { ...answers, [question.index]: option }, activeIndex);
        }
        return;
      }

      if (event.key === 'ArrowRight' && activeIndex < exam.questions.length - 1) {
        setActiveIndex((i) => i + 1);
        return;
      }
      if (event.key === 'ArrowLeft' && activeIndex > 0) {
        setActiveIndex((i) => i - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, exam, activeIndex, busy, helpOpen, answers, checkpointAttempt]);

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col items-center pt-16 text-center">
        <span className="font-serif text-[38px] font-bold leading-none text-fg">模拟考</span>
        <p className="mt-5 text-[13px] leading-[1.9] text-fg-60">
          Đăng nhập để thi thử đề chuẩn HSK 1–3, chấm điểm tự động và xếp hạng theo lớp. Đề thi được tạo ngẫu nhiên từ ngân hàng câu hỏi chính thức.
        </p>
        <div className="mt-7">
          <SubmitButton onClick={onRequireLogin}>Đăng nhập / Đăng ký</SubmitButton>
        </div>
      </div>
    );
  }

  const currentUserId = user?.userId;

  // Scaled HSK score on official 200-point scale
  const scaledHskScore = result ? Math.round((result.correctCount / Math.max(1, result.totalCount)) * 200) : 0;
  const isHskPassed = scaledHskScore >= 120;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col">
      {/* Station Header */}
      <div className="flex items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cinnabar">
            <span className="inline-block h-2 w-2 rounded-full bg-cinnabar" />
            Trạm 5 · 模拟考试 · Phòng Thi Thử HSK · [Hoạt động thật]
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-fg">
            Thi Thử HSK &amp; Đánh Giá Năng Lực
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-fg-60">
            Mô phỏng đề thi năng lực Hán ngữ HSK chuẩn (Phần Nghe 听力, Phần Đọc &amp; Điền từ 阅读), tính điểm theo thang 200 điểm chính thức và cấp dấu triện đạt chuẩn.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          aria-label="Hướng dẫn phòng thi thử"
          title="Hướng dẫn phòng thi thử"
          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center border border-rule bg-transparent font-sans text-[11px] font-semibold text-fg-38 transition-colors hover:border-rule-strong hover:text-fg"
        >
          !
        </button>
      </div>

      <p className="mt-6 text-[11.5px] text-fg-38">
        Hôm nay: <span className="text-fg-60">{streak?.todaySrsReviews ?? 0}</span> hoạt động
        {streak?.todayQualified ? ' · đã tính streak' : ' · chưa đủ ngưỡng'} ·{' '}
        <span className="text-fg-60">{history.length}</span> lượt thi
      </p>

      {error && <p className="mt-4 text-[12.5px] text-red">{error}</p>}
      {resumeState === 'loading' && <p role="status" className="mt-4 text-[12.5px] text-fg-60">Đang khôi phục bài thi...</p>}
      {resumeError && (
        <div role="alert" className="mt-4 text-[12.5px] text-red">
          <p>{resumeError}</p>
          {resumeState === 'failed' && (
            <SubmitButton variant="secondary" onClick={restoreAttempt}>
              Thử khôi phục lại
            </SubmitButton>
          )}
        </div>
      )}
      {phase === 'TAKING' && storageWarning && (
        <p role="alert" className="mt-4 text-[12.5px] text-red">
          Trình duyệt không lưu được bài thi để khôi phục. Hãy nộp bài trước khi tải lại hoặc đóng trang.
        </p>
      )}

      {phase === 'IDLE' && resumeState === 'none' && (
        <>
          {/* Exam Setup Card */}
          <div className="mt-8 rounded-xl border border-rule bg-card p-6 shadow-md">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-fg">
                    Đề Thi Thử HSK 1 Chuẩn (HSK 1 全真模拟卷)
                  </h3>
                  <p className="text-xs text-fg-60 mt-0.5">
                    Thang điểm HSK: <b>200 điểm</b> · Ngưỡng đạt chuẩn: <b>120 / 200 điểm (≥ 60%)</b>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-cinnabar/10 border border-cinnabar/30 px-2.5 py-1 text-xs font-semibold text-cinnabar">
                    HSK 1 Chuẩn Hán ngữ
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={labelClass}>Số lượng câu hỏi</span>
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
                  <span className={labelClass}>Thời gian làm bài</span>
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
          </div>

          {/* Mascot & Heatmap */}
          <div className="mt-10 grid gap-10 min-[1101px]:grid-cols-2">
            <section>
              <h3 className={sectionTitleClass}>Mascot &amp; điều kiện tính streak</h3>
              <div className="mt-4">
                <MascotBadge longestStreak={streak?.longestStreak ?? 0} currentStreak={streak?.currentStreak ?? 0} />
              </div>
              <p className="mt-3 text-[11.5px] leading-[1.8] text-fg-38">
                Một ngày được tính streak khi: hoàn thành 1 lượt thi thử HSK, ôn ≥ {streak?.minSrsReviewsForStreak ?? 10} lượt SRS, hoặc làm bài tập ngữ pháp.
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
                <span className="ml-2">Múi giờ tính streak: {streak?.zone ?? 'Asia/Ho_Chi_Minh'}</span>
              </div>
            </section>
          </div>

          {/* Leaderboard */}
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
                    <th className={thNumClass}>Điểm thi cao nhất</th>
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
                  placeholder="Mã lớp của bạn (VD: HSK1-K1)"
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
              Mã lớp dùng để lọc bảng xếp hạng theo nhóm học tập. {classMessage ?? ''}
            </p>
          </section>

          {/* Exam History */}
          <section className="mt-10 border-t border-rule pt-6">
            <h3 className={sectionTitleClass}>Lịch sử thi thử</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr>
                    <th className={thClass}>Đề thi</th>
                    <th className={thNumClass}>Số câu đúng</th>
                    <th className={thNumClass}>Điểm HSK quy đổi</th>
                    <th className={thNumClass}>Thời gian làm</th>
                    <th className={thClass}>Nộp lúc</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => {
                    const scaled = Math.round((item.scorePercent / 100) * 200);
                    return (
                      <tr key={item.examId}>
                        <td className={tdClass}>Đề #{item.examId}</td>
                        <td className={tdNumClass}>
                          {item.correctCount}/{item.totalCount}
                        </td>
                        <td className={tdNumClass}>
                          <span className={scaled >= 120 ? 'text-jade font-semibold' : 'text-fg-60'}>
                            {scaled}/200 ({item.scorePercent}%)
                          </span>
                        </td>
                        <td className={tdNumClass}>
                          {item.durationSeconds != null ? formatClock(item.durationSeconds) : '—'}
                        </td>
                        <td className={tdClass}>{new Date(item.submittedAt).toLocaleString('vi-VN')}</td>
                      </tr>
                    );
                  })}
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

      {/* Taking Exam Phase */}
      {phase === 'TAKING' && exam && (
        <>
          <div className="sticky top-0 z-10 mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-rule bg-card/95 px-4 py-3 backdrop-blur shadow-sm">
            <span className="text-[12.5px] text-fg-60">
              Câu <b className="font-serif text-sm font-semibold text-fg">{activeIndex + 1}</b>/{exam.questions.length}
            </span>
            <span className="font-serif text-[15px] font-bold tabular-nums text-cinnabar">
              ⏱ {formatClock(remainingSeconds)}
            </span>
            <span className="text-[11px] text-fg-38 hidden sm:inline">
              Phần nghe phát bằng TTS Quan thoại chuẩn
            </span>
            <div className="ml-auto">
              <SubmitButton onClick={submitExam} loading={busy}>
                Nộp bài
              </SubmitButton>
            </div>
          </div>

          {/* Question Palette Navigation */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5 p-3 rounded-lg border border-rule/60 bg-surface/40">
            <span className="text-[11px] font-semibold text-fg-60 mr-2">Bảng câu hỏi:</span>
            {exam.questions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.index]);
              const isCurrent = idx === activeIndex;
              return (
                <button
                  key={q.index}
                  type="button"
                  onClick={() => {
                    setActiveIndex(idx);
                    checkpointAttempt(exam, answers, idx);
                  }}
                  className={`h-7 w-7 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-cinnabar text-white ring-2 ring-cinnabar/40'
                      : isAnswered
                        ? 'border border-jade bg-jade/20 text-jade'
                        : 'border border-rule bg-card text-fg-60 hover:border-fg-60'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {exam.questions.map((question, index) => {
              const selected = answers[question.index];
              const active = index === activeIndex;
              const isListening = question.type === 'KANA' || question.type === 'VOCABULARY';

              return (
                <div
                  key={question.index}
                  data-exam-question={index}
                  onClick={() => {
                    setActiveIndex(index);
                    checkpointAttempt(exam, answers, index);
                  }}
                  className={`cursor-pointer rounded-xl border p-5 transition-all ${
                    active ? 'border-cinnabar bg-card ring-1 ring-cinnabar/30' : 'border-rule hover:border-rule-strong bg-card/60'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/50 pb-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-[11.5px] font-bold text-fg">Câu {index + 1}</span>
                      <span className="rounded bg-tint px-2 py-0.5 text-[10.5px] font-medium text-fg-60">
                        {isListening ? 'Phần 1: Nghe hiểu (听力)' : 'Phần 2: Đọc hiểu & Ngữ pháp (阅读)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => playQuestionAudio(question, event)}
                        title="Nghe câu hỏi bằng giọng Quan thoại"
                        className="flex cursor-pointer items-center gap-1.5 rounded border border-cinnabar/40 bg-cinnabar/10 px-2.5 py-1 text-[11px] font-semibold text-cinnabar hover:bg-cinnabar/20 transition-colors"
                      >
                        <Volume2 size={13} />
                        <span>Phát âm Quan thoại</span>
                      </button>
                      {selected && (
                        <span className="rounded bg-jade/10 border border-jade/30 px-2 py-0.5 text-[10.5px] font-medium text-jade">
                          Đã chọn
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-4 font-serif text-[20px] font-bold leading-[1.6] text-fg whitespace-pre-line">
                    {question.questionText}
                  </p>

                  <div className="mt-5 flex flex-col gap-2">
                    {question.options.map((option, optionIndex) => (
                      <button
                        key={option}
                        type="button"
                        disabled={busy}
                        onClick={(event) => {
                          event.stopPropagation();
                          setAnswers((previous) => ({ ...previous, [question.index]: option }));
                          checkpointAttempt(exam, { ...answers, [question.index]: option }, activeIndex);
                        }}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition-all ${
                          selected === option
                            ? 'border-cinnabar bg-cinnabar/10 text-cinnabar font-semibold shadow-sm'
                            : 'border-rule bg-surface text-fg-80 hover:border-fg-60'
                        }`}
                      >
                        <kbd className="shrink-0 rounded border border-current px-1.5 text-[10px] font-semibold leading-4 opacity-70">
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

      {/* Result Phase */}
      {phase === 'RESULT' && result && (
        <div className="mt-8 rounded-xl border border-rule bg-card p-8 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-rule pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cinnabar">
                Báo cáo Kết quả Kỳ thi HSK Chuẩn
              </div>
              <h3 className="mt-2 font-serif text-3xl font-bold text-fg">
                Kết quả: <span className="text-gold">{scaledHskScore}</span> / 200 điểm
              </h3>
              <p className="mt-1 text-sm text-fg-60">
                Đúng {result.correctCount}/{result.totalCount} câu ({result.scorePercent}%) · Chuỗi streak {result.currentStreak} ngày 🔥
              </p>
              <div className="mt-2">
                <span className={`text-sm font-bold ${isHskPassed ? 'text-jade' : 'text-rose-400'}`}>
                  {isHskPassed ? '「合格」 ĐẠT TIÊU CHUẨN NĂNG LỰC HSK (≥ 120 điểm)' : '「未合格」 CHƯA ĐẠT TIÊU CHUẨN (< 120 điểm)'}
                </span>
              </div>
            </div>

            {/* Red Seal Stamp */}
            <div className="shrink-0">
              <RedSealStamp
                text={isHskPassed ? '合格' : '未过'}
                subText={isHskPassed ? 'ĐẠT' : 'CHƯA ĐẠT'}
                size={76}
                animated
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3.5">
            <h4 className="text-sm font-bold text-fg uppercase tracking-wider">
              Phân tích chi tiết từng câu hỏi &amp; Chẩn đoán kiến thức:
            </h4>

            {result.details.map((detail) => (
              <div
                key={detail.index}
                className={`rounded-lg border p-4 transition-all ${
                  detail.correct
                    ? 'border-jade/30 bg-jade/5'
                    : 'border-rose-500/30 bg-rose-500/5'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 text-[11.5px]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-fg">Câu {detail.index + 1}</span>
                    <span
                      className={`rounded px-2 py-0.5 font-bold ${
                        detail.correct ? 'bg-jade/20 text-jade' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {detail.correct ? '✓ Đúng' : '✗ Sai'}
                    </span>
                  </div>

                  {!detail.correct && (
                    <button
                      type="button"
                      onClick={() => navigate('/grammar')}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-cinnabar hover:underline cursor-pointer"
                    >
                      <BookOpen size={12} /> Ôn tại Trạm Ngữ pháp →
                    </button>
                  )}
                </div>

                <p className="mt-2.5 font-serif text-[17px] font-semibold text-fg leading-relaxed">
                  {detail.questionText}
                </p>

                <div className="mt-2 text-xs text-fg-60">
                  {!detail.correct && (
                    <span className="mr-3">
                      Bạn chọn: <span className="font-serif font-bold text-rose-400">{detail.submittedAnswer || '—'}</span>
                    </span>
                  )}
                  <span>
                    Đáp án đúng: <span className="font-serif font-bold text-jade">{detail.correctAnswer}</span>
                  </span>
                </div>

                {detail.explanation && (
                  <p className="mt-2 rounded bg-surface/80 p-2.5 text-[11.5px] leading-relaxed text-fg-80 border border-rule/50">
                    💡 <b>Giải thích</b>: {detail.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3 pt-4 border-t border-rule">
            <SubmitButton variant="secondary" onClick={() => setPhase('IDLE')}>
              Về trang thi thử
            </SubmitButton>
            <SubmitButton onClick={startExam} loading={busy}>
              Thi lại đề mới
            </SubmitButton>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {helpOpen && (
        <Modal
          title="Hướng dẫn phòng thi thử HSK"
          onClose={() => setHelpOpen(false)}
          maxWidthClass="max-w-[460px]"
          initialFocus={helpHeading}
          containFocus
        >
          <h3 ref={helpHeading} tabIndex={-1} className="text-[15px] font-bold focus:outline-none">
            Hướng dẫn thi thử HSK Chuẩn
          </h3>
          <p className="mt-3 text-[13px] leading-[1.8] text-fg-60">
            Chọn số câu hỏi và thời gian để bắt đầu làm bài. Đề thi được sinh ngẫu nhiên từ ngân hàng câu hỏi ngữ pháp, pinyin và chữ Hán HSK đã kiểm duyệt. Chấm điểm hoàn toàn tự động ở máy chủ với thang chuẩn 200 điểm của Hanban/CTI (ngưỡng đạt: 120/200 điểm).
            <br /><br />
            Phím tắt: bấm phím 1–4 để chọn nhanh đáp án, mũi tên trái/phải để chuyển câu. Khi hết giờ, bài làm sẽ tự động được nộp.
          </p>
        </Modal>
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

import { useRequestScope } from '../../lib/hooks/useRequestScope';
import { grammarApi } from './api';
import { useAuth } from '../../app/useAuth';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, TriangleAlert, Volume2, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { FeedbackAlert } from '../../components/FeedbackAlert';
import type { FeedbackType } from '../../components/FeedbackAlert';
import { SubmitButton } from '../../components/SubmitButton';
import { OrientalCard } from '../../components/OrientalCard';
import { RedSealStamp } from '../../components/RedSealStamp';
import { useCompanion } from '../companion/useCompanionStore';
import { speakChinese } from '../../services/chineseSpeech';
import type { GrammarCheckResult, GrammarExerciseDto, GrammarRuleDto } from './types';
import { learningKeyboardBlocked } from '../../lib/learningKeyboard';

const HSK_LEVEL_OPTIONS = [
  { level: 'ALL', label: 'Tất cả' },
  { level: 'HSK 1', label: 'HSK 1' },
  { level: 'HSK 2', label: 'HSK 2' },
];

const LESSON_OPTIONS = [
  { slug: 'intro-greetings', label: 'Bài 1: Chào hỏi' },
  { slug: 'family-members', label: 'Bài 2: Gia đình' },
  { slug: 'time-calendar', label: 'Bài 3: Thời gian' },
  { slug: 'dining-shopping', label: 'Bài 4: Ăn uống' },
  { slug: 'school-work-places', label: 'Bài 5: Trường học' },
  { slug: 'weather-health-daily', label: 'Bài 6: Thời tiết' },
];

const STATION_TABS: { key: 'BROWSE' | 'PRACTICE'; label: string }[] = [
  { key: 'BROWSE', label: 'Tra cứu' },
  { key: 'PRACTICE', label: 'Luyện tập' },
];

const labelClass = 'text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-38';

const chipClass = (active: boolean) =>
  `cursor-pointer border px-3 py-1.5 text-[11.5px] transition-colors ${
    active ? 'border-fg bg-fg text-bg font-semibold' : 'border-rule-strong bg-transparent text-fg-60 hover:border-fg hover:text-fg'
  }`;

/** Strip Vietnamese diacritics so "phu dinh" also matches "phủ định" */
const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

interface ExampleItem {
  zh: string;
  pinyin: string;
  vi: string;
}

const parseExamples = (raw: string | undefined | null): ExampleItem[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item: any) => ({
          zh: String(item.zh || ''),
          pinyin: String(item.pinyin || ''),
          vi: String(item.vi || ''),
        }))
        .filter((item) => item.zh);
    }
  } catch {
    // Ignore JSON parse errors
  }
  return [];
};

export const GrammarView: React.FC = () => {
  const { user, requireLogin: onRequireLogin } = useAuth();
  const userId = user?.userId;
  const { run, cancel } = useRequestScope(user?.userId);
  const { triggerReaction, rewardBamboo } = useCompanion();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rules, setRules] = useState<GrammarRuleDto[]>([]);
  const [selectedHskLevel, setSelectedHskLevel] = useState<string>('ALL');
  const [lesson, setLesson] = useState<string>('');
  const [mistakeOnly, setMistakeOnly] = useState(false);
  const [selectedRule, setSelectedRule] = useState<GrammarRuleDto | null>(null);
  const [search, setSearch] = useState('');
  const [showPinyin, setShowPinyin] = useState(true);
  const [exercises, setExercises] = useState<GrammarExerciseDto[]>([]);
  const [exerciseState, setExerciseState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const checkState = useRef<'idle' | 'pending' | 'graded'>('idle');
  const answerAttempt = useRef<{ attemptId: string; exerciseId: number; userAnswer: string } | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<GrammarCheckResult | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [mode, setMode] = useState<'BROWSE' | 'PRACTICE'>('BROWSE');
  const [detailOpen, setDetailOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; title: string; message: string } | null>(null);

  // Count draft rules so users can distinguish pending content from approved content.
  const pendingReviewRules = rules.filter((rule) => rule.reviewStatus !== 'APPROVED').length;

  /** On narrow screens, render the detail as a popup instead of leaving hidden dialog markup in the DOM. */
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia('(max-width: 1100px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1100px)');
    const handleChange = (event: MediaQueryListEvent) => setIsNarrow(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const loadRules = useCallback(async () => {
    if (!userId) {
      return;
    }

    const query = lesson ? `?lesson=${lesson}` : '';
    const res = await run('grammarApi.rules', (signal) => grammarApi.rules(query, { signal }));
    if (!res) return;

    if (res.success && res.data) {
      setRules(res.data);
      setError(null);
      setSelectedRule((current) => res.data?.find((rule) => rule.id === current?.id) ?? null);
    } else {
      setError(res.message || 'Không tải được danh sách điểm ngữ pháp.');
    }
  }, [lesson, run, userId]);

  useEffect(() => {
    if (!userId) {
      cancel('grammarApi.rules');
      cancel('grammarApi.exercises');
      setRules([]);
      setSelectedRule(null);
      setExercises([]);
      setExerciseState('idle');
      return;
    }

    void loadRules();
  }, [userId, lesson, cancel, loadRules]);

  const loadExercises = useCallback(
    async (rule: GrammarRuleDto | null, commonMistakesOnly: boolean) => {
      if (!userId) {
        return;
      }

      setExerciseState('loading');
      setExerciseError(null);
      setResult(null);
      setSelectedOption(null);
      setIndex(0);

      const params = new URLSearchParams();
      if (rule) {
        params.set('ruleId', String(rule.id));
      }
      if (commonMistakesOnly) {
        params.set('mistakeOnly', 'true');
      }

      const res = await run('grammarApi.exercises', (signal) =>
        grammarApi.exercises(params.toString(), { signal })
      );
      if (!res) return;

      if (res.success && res.data) {
        setExercises(res.data);
        setExerciseState('loaded');
      } else {
        setExerciseError(res.message || 'Không tải được bài tập.');
        setExerciseState('error');
      }
    },
    [run, userId]
  );

  useEffect(() => {
    if (mode === 'PRACTICE' && userId) {
      void loadExercises(selectedRule, mistakeOnly);
    }
  }, [mode, selectedRule, mistakeOnly, userId, loadExercises]);

  const visibleRules = useMemo(() => {
    return rules.filter((rule) => {
      if (selectedHskLevel !== 'ALL') {
        const targetLevel = Number(selectedHskLevel.replace('HSK ', ''));
        if (rule.hskLevel && rule.hskLevel !== targetLevel) return false;
      }
      if (lesson && rule.lessonSlug !== lesson) {
        return false;
      }
      if (search.trim()) {
        const q = normalizeText(search.trim());
        const inTitle = normalizeText(rule.title).includes(q);
        const inStructure = normalizeText(rule.structure).includes(q);
        const inExplanation = normalizeText(rule.explanation).includes(q);
        const inNotes = rule.notes ? normalizeText(rule.notes).includes(q) : false;
        if (!inTitle && !inStructure && !inExplanation && !inNotes) {
          return false;
        }
      }
      return true;
    });
  }, [rules, selectedHskLevel, lesson, search]);

  const current = exercises[index];

  const submitAnswer = useCallback(
    async (option: string) => {
      if (!current || result) {
        return;
      }

      if (checkState.current === 'pending') {
        return;
      }

      if (
        answerAttempt.current &&
        answerAttempt.current.exerciseId === current.id &&
        answerAttempt.current.userAnswer === option
      ) {
        // reuse same attempt
      } else {
        answerAttempt.current = {
          attemptId: crypto.randomUUID(),
          exerciseId: current.id,
          userAnswer: option,
        };
      }

      const { attemptId, exerciseId, userAnswer } = answerAttempt.current;
      setSelectedOption(userAnswer);
      setChecking(true);
      checkState.current = 'pending';

      const res = await run('grammarApi.check', (signal) =>
        grammarApi.check(exerciseId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer: userAnswer, attemptId, userAnswer }),
          signal,
        })
      );

      setChecking(false);

      if (!res || !res.success || !res.data) {
        checkState.current = 'idle';
        setFeedback({
          type: 'error',
          title: 'Lỗi chấm bài',
          message: res?.message || 'Không gửi được bài chấm. Bạn có thể bấm Thử chấm lại.',
        });
        return;
      }

      const checked = res.data;
      checkState.current = 'graded';
      setResult(checked);
      setScore((previous) => ({
        correct: previous.correct + (checked.correct ? 1 : 0),
        total: previous.total + 1,
      }));

      if (checked.correct) {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
        rewardBamboo(2);
        triggerReaction('happy');
      } else {
        triggerReaction('mistake');
      }
    },
    [current, result, run, rewardBamboo, triggerReaction]
  );

  const goNext = useCallback(() => {
    if (checkState.current !== 'graded') return;
    checkState.current = 'idle';
    answerAttempt.current = null;
    setSelectedOption(null);
    setResult(null);
    setIndex((previous) => previous + 1);
  }, []);

  useEffect(() => {
    if (mode !== 'PRACTICE') {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (learningKeyboardBlocked(event)) return;

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
  }, [mode, current, result, submitAnswer, goNext]);

  // `/grammar?practice=<id>` from a rule page opens that rule in the practice tab, then clears the query.
  useEffect(() => {
    const practiceId = searchParams.get('practice');
    if (!practiceId || rules.length === 0) {
      return;
    }
    const rule = rules.find((item) => String(item.id) === practiceId);
    if (rule) {
      setSelectedRule(rule);
      setMistakeOnly(false);
      setMode('PRACTICE');
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, rules, setSearchParams]);

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col items-center pt-16 text-center">
        <span className="font-serif text-[38px] font-bold leading-none text-fg">语法</span>
        <p className="mt-5 text-[13px] leading-[1.9] text-fg-60">
          Đăng nhập để tra cứu hệ thống ngữ pháp HSK chuẩn và luyện bài tập phản xạ. Điểm số và kinh nghiệm được lưu trữ thực tế theo tài khoản.
        </p>
        <div className="mt-7">
          <SubmitButton onClick={onRequireLogin}>Đăng nhập / Đăng ký</SubmitButton>
        </div>
      </div>
    );
  }

  const scopeLabel = selectedRule
    ? selectedRule.structure
    : mistakeOnly
      ? 'toàn bộ nhóm bẫy'
      : 'tất cả điểm ngữ pháp';

  const selectedRuleExamples = selectedRule ? parseExamples(selectedRule.examplesJson) : [];

  /** Shared rule-detail content for desktop panel and narrow-screen popup. */
  const detailBody = selectedRule ? (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between text-[11px] text-fg-38 mb-1">
          <span className="font-semibold text-cinnabar uppercase tracking-wider">
            {selectedRule.lessonTitle || 'Giáo trình chuẩn HSK'}
          </span>
          <span className="font-mono text-fg-60">#{selectedRule.number}</span>
        </div>
        <h2 className="font-serif text-2xl font-bold text-fg leading-snug">
          {selectedRule.title}
        </h2>
        {selectedRule.reviewStatus && selectedRule.reviewStatus !== 'APPROVED' && (
          <span className="inline-block mt-1.5 rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10.5px] font-mono text-amber-300">
            Bản thảo chờ duyệt (PENDING_REVIEW)
          </span>
        )}
      </div>

      {/* Core Formula Box (Cấu trúc cốt lõi) */}
      <div className="rounded-lg border border-cinnabar/40 bg-cinnabar/10 p-3.5 shadow-inner">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-cinnabar/80 block mb-1">
          Cấu trúc cốt lõi (核心句型):
        </span>
        <div className="font-serif text-[17px] font-bold text-fg leading-relaxed">
          {selectedRule.structure}
        </div>
      </div>

      {/* Explanation */}
      <div>
        <span className={labelClass}>Ý nghĩa &amp; Cách dùng</span>
        <p className="mt-1 text-[12.5px] leading-[1.8] text-fg-80">{selectedRule.explanation}</p>
      </div>

      {/* Common Mistake Notes (Lưu ý góc nhìn người Việt) */}
      {selectedRule.notes && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300 mb-1">
            <TriangleAlert size={14} className="shrink-0" />
            Lưu ý lỗi thường gặp (Góc nhìn người Việt):
          </div>
          <p className="leading-relaxed text-amber-200/90 text-[11.5px]">{selectedRule.notes}</p>
        </div>
      )}

      {/* Bilingual Examples with Pinyin Toggle & Mandarin Audio */}
      {selectedRuleExamples.length > 0 && (
        <div className="border-t border-rule/50 pt-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className={labelClass}>Ví dụ ngữ cảnh thực tế</span>
            <button
              type="button"
              onClick={() => setShowPinyin((prev) => !prev)}
              className="cursor-pointer text-[11px] font-medium text-fg-60 hover:text-cinnabar transition-colors"
            >
              {showPinyin ? 'Ẩn Pinyin' : 'Hiện Pinyin'}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {selectedRuleExamples.map((ex, idx) => (
              <div key={idx} className="rounded border border-rule/60 bg-surface/60 p-2.5 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-serif text-[15px] font-semibold text-fg">{ex.zh}</span>
                  <button
                    type="button"
                    onClick={() => speakChinese(ex.zh)}
                    title="Nghe phát âm chuẩn Quan thoại"
                    className="cursor-pointer text-fg-38 hover:text-cinnabar transition-colors p-1"
                  >
                    <Volume2 size={13} />
                  </button>
                </div>
                {showPinyin && ex.pinyin && (
                  <div className="text-[11px] font-sans text-gold mt-0.5">{ex.pinyin}</div>
                )}
                {ex.vi && <div className="text-[11.5px] text-fg-60 mt-0.5">{ex.vi}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-rule/50 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setDetailOpen(false);
            navigate(`/grammar/${selectedRule.id}`);
          }}
          className="cursor-pointer border-0 bg-transparent p-0 text-[11.5px] text-fg-38 underline underline-offset-2 transition-colors hover:text-fg"
        >
          Xem chi tiết
        </button>

        <SubmitButton
          onClick={() => {
            setMistakeOnly(false);
            setMode('PRACTICE');
            setDetailOpen(false);
          }}
        >
          Luyện tập phần này ({selectedRule.exerciseCount} câu)
        </SubmitButton>
      </div>
    </div>
  ) : (
    <p className="text-[12.5px] leading-[1.8] text-fg-38">
      Chọn một điểm ngữ pháp bên danh sách để xem cấu trúc, ví dụ song ngữ và lỗi thường gặp.
    </p>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col">
      {/* Station header */}
      <div className="flex items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cinnabar">
            <span className="inline-block h-2 w-2 rounded-full bg-cinnabar" />
            Trạm 4 · 语法与句型 · Trạm Ngữ pháp HSK · [Hoạt động thật]
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-fg">
            Ngữ pháp HSK &amp; Luyện phản xạ
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-fg-60">
            Nắm vững các cấu trúc ngữ pháp tiếng Trung chuẩn HSK 1–3 qua phương pháp so sánh đối chiếu Việt - Trung, lưu ý lỗi người Việt thường mắc và bài tập phản xạ tương tác.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          aria-label="Hướng dẫn trợ từ & ngữ pháp"
          title="Hướng dẫn trợ từ & ngữ pháp"
          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center border border-rule bg-transparent font-sans text-[11px] font-semibold text-fg-38 transition-colors hover:border-rule-strong hover:text-fg"
        >
          !
        </button>
      </div>

      {/* Mode tabs */}
      <div className="mt-7 flex gap-6 border-b border-rule">
        {STATION_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            disabled={checking}
            onClick={() => setMode(tab.key)}
            className={`cursor-pointer border-0 border-b-2 bg-transparent px-0.5 pb-2 text-[12.5px] transition-colors ${
              mode === tab.key ? 'border-cinnabar font-semibold text-cinnabar' : 'border-transparent text-fg-38 hover:text-fg'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === 'BROWSE' && (
        <>
          {/* Level & Lesson filter */}
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-fg-60 mr-1">Cấp độ HSK:</span>
              {HSK_LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.level}
                  type="button"
                  className={chipClass(selectedHskLevel === opt.level)}
                  onClick={() => setSelectedHskLevel(opt.level)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-fg-60 mr-1">Chủ đề bài học:</span>
              <button type="button" className={chipClass(lesson === '')} onClick={() => setLesson('')}>
                Tất cả bài
              </button>
              {LESSON_OPTIONS.map((option) => (
                <button
                  key={option.slug}
                  type="button"
                  className={chipClass(lesson === option.slug)}
                  onClick={() => setLesson(option.slug)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-38" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo cấu trúc, ý nghĩa, lỗi thường gặp (gõ không dấu cũng được)..."
                aria-label="Tìm điểm ngữ pháp"
                className="h-10 w-full rounded border border-rule bg-surface pl-9 pr-9 text-[12.5px] text-fg outline-none transition-colors placeholder:text-fg-38 focus:border-cinnabar"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Xoá tìm kiếm"
                  title="Xoá tìm kiếm"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0 text-fg-38 transition-colors hover:text-fg"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <span className="text-[11.5px] text-fg-38">
              Hiển thị {visibleRules.length}/{rules.length} điểm ngữ pháp
            </span>
          </div>

          {error && <p className="mt-4 text-[12.5px] text-red">{error}</p>}

          {pendingReviewRules > 0 && (
            <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-[1.7] text-amber-300/90 rounded border border-amber-500/20 bg-amber-500/10 p-3">
              <TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-400" />
              <span>
                Nội dung học thuật: <strong className="text-amber-200">{pendingReviewRules}</strong>/{rules.length} điểm ngữ pháp
                đang ở trạng thái <b>PENDING_REVIEW</b> chờ hội đồng chuyên gia học thuật ký duyệt chính thức.
              </span>
            </p>
          )}

          <div className="mt-6 grid grid-cols-[minmax(0,1fr)_420px] items-start gap-8 max-[1100px]:grid-cols-1">
            {/* Rule list */}
            <div className="max-[1100px]:order-2">
              <div className="flex flex-col gap-2.5">
                {visibleRules.map((rule) => {
                  const active = selectedRule?.id === rule.id;
                  return (
                    <button
                      key={rule.id}
                      type="button"
                      data-grammar-rule={rule.id}
                      onClick={() => {
                        setSelectedRule(rule);
                        setDetailOpen(true);
                      }}
                      className={`flex cursor-pointer flex-col items-start gap-1 rounded border p-4 text-left transition-all ${
                        active
                          ? 'border-cinnabar bg-cinnabar/5 ring-1 ring-cinnabar/30'
                          : 'border-rule bg-card hover:border-fg-38 hover:bg-card/80'
                      }`}
                    >
                      <div className="flex w-full items-baseline justify-between gap-4">
                        <span className="font-serif text-[17px] font-bold text-fg leading-snug">
                          {rule.title}
                        </span>
                        <span className="shrink-0 text-[11px] font-medium text-cinnabar">
                          {rule.exerciseCount} câu
                        </span>
                      </div>
                      <div className="font-sans text-[12.5px] text-gold font-medium">
                        {rule.structure}
                      </div>
                      <p className="text-[12px] leading-relaxed text-fg-60 line-clamp-2 mt-0.5">
                        {rule.explanation}
                      </p>
                      <div className="mt-2 flex items-center justify-between w-full pt-2 border-t border-rule/40 text-[11px] text-fg-38">
                        <span>
                          #{rule.number}
                          {rule.lessonTitle ? ` · ${rule.lessonTitle}` : ''}
                        </span>
                        {rule.reviewStatus !== 'APPROVED' && (
                          <span className="font-mono text-amber-300">Chờ duyệt</span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {visibleRules.length === 0 && !error && (
                  <p className="border border-rule rounded bg-card px-4 py-10 text-center text-[12.5px] text-fg-38">
                    Không có điểm ngữ pháp nào khớp bộ lọc. Thử bỏ từ khoá tìm kiếm hoặc chọn cấp độ khác.
                  </p>
                )}
              </div>
            </div>

            {/* Rule detail (Desktop) */}
            <aside data-grammar-detail className="sticky top-10 hidden min-[1101px]:block">
              <OrientalCard tag={selectedRule ? `HSK ${selectedRule.hskLevel || 1}` : undefined} tagVariant="cinnabar">
                {detailBody}
              </OrientalCard>
            </aside>
          </div>

          {/* Narrow screen popup */}
          {isNarrow && detailOpen && selectedRule && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-5 min-[1101px]:hidden"
              onClick={() => setDetailOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`Chi tiết ${selectedRule.structure}`}
                className="max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-xl bg-card p-6 border border-rule shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 border-b border-rule pb-3">
                  <span className={labelClass}>Chi tiết Ngữ pháp HSK</span>
                  <button
                    type="button"
                    onClick={() => setDetailOpen(false)}
                    aria-label="Đóng chi tiết"
                    title="Đóng chi tiết"
                    className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border border-rule bg-transparent text-fg-60 transition-colors hover:border-rule-strong hover:text-fg"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="mt-4">{detailBody}</div>
              </div>
            </div>
          )}
        </>
      )}

      {mode === 'PRACTICE' && (
        <div className="mt-8 flex flex-col">
          {/* Practice scope */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              className={chipClass(!selectedRule && !mistakeOnly)}
              disabled={checking}
              onClick={() => {
                setSelectedRule(null);
                setMistakeOnly(false);
              }}
            >
              Tất cả điểm ngữ pháp
            </button>
            <button
              type="button"
              className={chipClass(mistakeOnly)}
              disabled={checking}
              onClick={() => {
                setSelectedRule(null);
                setMistakeOnly(true);
              }}
            >
              <TriangleAlert size={13} className="inline mr-1" />
              Chỉ nhóm bẫy
            </button>
            {selectedRule && (
              <span className="flex flex-wrap items-center gap-2 text-[11.5px] text-fg-38">
                Đang luyện: <span className="font-serif text-[13px] text-fg">{selectedRule.structure}</span>
                <button
                  type="button"
                  disabled={checking}
                  onClick={() => setSelectedRule(null)}
                  className="cursor-pointer border-0 bg-transparent p-0 text-fg-38 underline underline-offset-2 transition-colors hover:text-fg"
                >
                  Bỏ chọn
                </button>
              </span>
            )}
          </div>

          <p className="mt-4 text-[11.5px] text-fg-38">
            Đúng <span className="text-fg-60">{score.correct}</span>/{score.total} câu
            {exercises.length > 0 ? ` · câu ${index + 1}/${exercises.length}` : ''}
            {selectedRule ? '' : ` · ${scopeLabel}`}
          </p>

          {(exerciseState === 'idle' || exerciseState === 'loading') && (
            <p role="status" className="mt-8 text-[12.5px] text-fg-60">
              Đang tải bài tập...
            </p>
          )}
          {exerciseState === 'error' && (
            <div role="alert" className="mt-8 text-[12.5px] text-red">
              <p>{exerciseError}</p>
              <SubmitButton variant="secondary" onClick={() => void loadExercises(selectedRule, mistakeOnly)}>
                Thử tải lại
              </SubmitButton>
            </div>
          )}
          {exerciseState === 'loaded' && !current && (
            <div className="mt-8 border border-rule rounded bg-card px-6 py-12 text-center">
              <p className="text-[12.5px] leading-[1.8] text-fg-38">
                {exercises.length === 0
                  ? 'Chưa có câu bài tập nào đã duyệt cho phạm vi này. Thử chọn điểm ngữ pháp khác, hoặc bật "Chỉ nhóm bẫy".'
                  : 'Hết câu trong phiên này. Chọn "Tất cả điểm ngữ pháp" hoặc một điểm khác để luyện tiếp.'}
              </p>
            </div>
          )}

          {current && (
            <div className="mt-6 rounded-xl border border-rule bg-card p-6 shadow-md max-w-[620px]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3">
                <span className="font-serif text-[14px] font-semibold text-fg-80">{current.ruleTitle}</span>
                {current.isCommonMistake && (
                  <span className="flex items-center gap-1 rounded bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[11px] text-rose-400">
                    <TriangleAlert size={12} />
                    Nhóm bẫy người Việt
                  </span>
                )}
              </div>

              <p className="mt-5 font-serif text-[22px] font-bold leading-[1.6] text-fg">
                {current.questionText}
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                {current.options.map((option, optionIndex) => {
                  const isCorrectOption = result && option === result.correctAnswer;
                  const isChosenWrong = result && option === selectedOption && !result.correct;
                  const tone = isCorrectOption
                    ? 'border-jade bg-jade/10 text-jade font-semibold'
                    : isChosenWrong
                      ? 'border-rose-500 bg-rose-500/10 text-rose-400'
                      : result
                        ? 'border-rule text-fg-38'
                        : 'border-rule bg-surface hover:border-fg-60 text-fg';
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={checking || selectedOption !== null || Boolean(result)}
                      onClick={() => void submitAnswer(option)}
                      className={`flex items-center gap-3 rounded border px-4 py-3 text-left transition-all disabled:cursor-default ${
                        result ? 'cursor-default' : 'cursor-pointer'
                      } ${tone}`}
                    >
                      <kbd className="shrink-0 rounded border border-current px-1.5 text-[10px] font-semibold leading-4 opacity-70">
                        {optionIndex + 1}
                      </kbd>
                      <span className="font-serif text-[15px]">{option}</span>
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && !checking && !result && (
                <div className="mt-6 text-[12.5px] text-fg-60">
                  <p>
                    Giữ nguyên đáp án đã chọn: <span className="font-serif text-fg">{selectedOption}</span>
                  </p>
                  <SubmitButton variant="secondary" onClick={() => void submitAnswer(selectedOption)}>
                    Thử chấm lại
                  </SubmitButton>
                </div>
              )}

              {result && (
                <div className="mt-5 relative overflow-hidden rounded-lg border border-rule/80 bg-surface/80 p-4">
                  <div className="flex items-center justify-between">
                    <span className={labelClass}>{result.correct ? 'Chính xác' : 'Giải thích'}</span>
                    {result.correct && (
                      <RedSealStamp text="通" subText="ĐẠT" animated size={48} className="shrink-0" />
                    )}
                  </div>
                  <p className="mt-2 text-[12.5px] leading-[1.8] text-fg-80">
                    {result.explanation ?? `${result.submittedAnswer} — đáp án đúng là ${result.correctAnswer}.`}
                  </p>
                  {!result.correct && (
                    <p className="mt-2 text-[12.5px] text-fg-60">
                      Đáp án đúng: <span className="font-serif font-bold text-fg">{result.correctAnswer}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <SubmitButton onClick={goNext} disabled={!result} shortcutHint="Enter">
                  Câu tiếp theo
                </SubmitButton>
                {result?.correct && (
                  <span className="text-xs text-jade font-medium animate-pulse">
                    +2 🎋 Mầm trúc linh vật &amp; +EXP
                  </span>
                )}
              </div>
            </div>
          )}
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
            aria-label="Hướng dẫn trợ từ & ngữ pháp"
            className="w-full max-w-[440px] rounded-xl bg-card p-7 border border-rule shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-rule pb-3">
              <h3 className="text-[15px] font-bold">Hướng dẫn Trạm Ngữ pháp HSK</h3>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                aria-label="Đóng hướng dẫn"
                title="Đóng hướng dẫn"
                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-rule bg-transparent text-fg-60 transition-colors hover:border-rule-strong hover:text-fg"
              >
                <X size={15} />
              </button>
            </div>
            <p className="mt-4 text-[13px] leading-[1.9] text-fg-60">
              Tab <strong>Tra cứu</strong>: lọc theo cấp độ HSK, chủ đề bài học hoặc tìm kiếm theo cấu trúc / ý nghĩa / lưu ý (gõ không dấu vẫn tìm được), bấm một điểm ngữ pháp để xem cấu trúc cốt lõi, ví dụ song ngữ kèm phát âm Quan thoại và phân tích lỗi người Việt thường mắc.
              <br /><br />
              Tab <strong>Luyện tập</strong>: chọn đáp án bằng phím 1–4 hoặc click chuột, nhấn Enter để sang câu kế tiếp. Mỗi câu trả lời đúng được cộng EXP thật và thưởng mầm trúc 🎋 cho linh vật học tập.
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

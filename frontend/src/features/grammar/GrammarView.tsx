import { useAuth } from '../../app/useAuth';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, TriangleAlert, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { FeedbackAlert } from '../../components/FeedbackAlert';
import type { FeedbackType } from '../../components/FeedbackAlert';
import { SubmitButton } from '../../components/SubmitButton';
import { apiRequest } from '../../services/api';
import type { GrammarCheckResult, GrammarExerciseDto, GrammarRuleDto } from './types';

const LESSON_OPTIONS = [
  { slug: 'jpd113-b1', label: 'Bài 1' },
  { slug: 'jpd113-b2', label: 'Bài 2' },
  { slug: 'jpd113-b3', label: 'Bài 3' },
  { slug: 'jpd123-b4', label: 'Bài 4' },
  { slug: 'jpd123-b5', label: 'Bài 5' },
  { slug: 'jpd123-b6', label: 'Bài 6' },
  { slug: 'jpd123-b7', label: 'Bài 7' },
];

const STATION_TABS: { key: 'BROWSE' | 'PRACTICE'; label: string }[] = [
  { key: 'BROWSE', label: 'Tra cứu' },
  { key: 'PRACTICE', label: 'Luyện tập' },
];

const labelClass = 'text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-38';

const chipClass = (active: boolean) =>
  `cursor-pointer border px-3 py-1.5 text-[11.5px] transition-colors ${
    active ? 'border-fg bg-fg text-bg' : 'border-rule-strong bg-transparent text-fg-60 hover:border-fg hover:text-fg'
  }`;

/** Strip Vietnamese diacritics so "phu dinh" also matches "phủ định" (đ needs explicit replacement). */
const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const snippet = (text: string, max = 96) => (text.length <= max ? text : `${text.slice(0, max).trimEnd()}…`);

export const GrammarView: React.FC = () => {
  const { user, requireLogin: onRequireLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rules, setRules] = useState<GrammarRuleDto[]>([]);
  const [lesson, setLesson] = useState<string>('');
  const [mistakeOnly, setMistakeOnly] = useState(false);
  const [selectedRule, setSelectedRule] = useState<GrammarRuleDto | null>(null);
  const [search, setSearch] = useState('');
  const [exercises, setExercises] = useState<GrammarExerciseDto[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<GrammarCheckResult | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [mode, setMode] = useState<'BROWSE' | 'PRACTICE'>('BROWSE');
  const [detailOpen, setDetailOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; title: string; message: string } | null>(null);
  // Count draft rules so users can distinguish pending Japanese content from approved content.
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
    if (mode !== 'PRACTICE') {
      return;
    }
    void loadExercises(selectedRule, mistakeOnly);
  }, [mode, selectedRule, mistakeOnly, loadExercises]);

  const query = normalizeText(search.trim());  const visibleRules = useMemo(() => {
    if (!query) {
      return rules;
    }
    return rules.filter((rule) =>
      [rule.title, rule.structure, rule.explanation, rule.notes ?? ''].some((field) =>
        normalizeText(field).includes(query)
      )
    );
  }, [rules, query]);

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
    if (mode !== 'PRACTICE') {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

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
        <span className="font-serif text-[34px] font-light leading-none text-fg">文法</span>
        <p className="mt-5 text-[13px] leading-[1.9] text-fg-60">
          Đăng nhập để tra cứu trợ từ &amp; ngữ pháp và luyện bài tập. Bài tập được chấm ở server và lưu theo tài khoản.
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

  /** Shared rule-detail content for the desktop panel and narrow-screen popup. */
  const detailBody = selectedRule ? (
    <>
      <div className="font-serif text-[22px] leading-[1.5] text-fg">{selectedRule.structure}</div>
      <div className="mt-2 text-[11.5px] text-fg-38">
        #{selectedRule.number}
        {selectedRule.lessonTitle ? ` · ${selectedRule.lessonTitle}` : ''} · {selectedRule.exerciseCount} câu bài tập
      </div>

      <p className="mt-5 line-clamp-6 text-[13px] leading-[1.9] text-fg-60">{selectedRule.explanation}</p>

      <button
        type="button"
        onClick={() => {
          setDetailOpen(false);
          navigate(`/grammar/${selectedRule.id}`);
        }}
        className="mt-2 cursor-pointer border-0 bg-transparent p-0 text-[11.5px] text-fg-38 underline underline-offset-2 transition-colors hover:text-fg"
      >
        Xem chi tiết
      </button>

      {selectedRule.notes && (
        <div className="mt-4 bg-tint px-4 py-3">
          <span className={labelClass}>Lưu ý</span>
          <p className="mt-1 text-[12.5px] leading-[1.8] text-fg-60">{selectedRule.notes}</p>
        </div>
      )}

      <div className="mt-7">
        <SubmitButton
          onClick={() => {
            setMistakeOnly(false);
            setMode('PRACTICE');
            setDetailOpen(false);
          }}
        >
          Luyện tập phần này
        </SubmitButton>
      </div>
    </>
  ) : (
    <p className="text-[12.5px] leading-[1.8] text-fg-38">
      Chọn một điểm ngữ pháp để xem cấu trúc, cách dùng và lưu ý.
    </p>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col">
      {/* Station header */}
      <div className="flex items-center justify-between gap-6">
        <div className={labelClass}>
          Grammar <span className="ml-2 font-serif text-[12.5px] font-normal normal-case tracking-[0.06em]">文法</span>
        </div>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          aria-label="Hướng dẫn trợ từ & ngữ pháp"
          title="Hướng dẫn trợ từ & ngữ pháp"
          className="inline-flex h-6 w-6 cursor-pointer items-center justify-center border border-rule bg-transparent font-sans text-[11px] font-semibold text-fg-38 transition-colors hover:border-rule-strong hover:text-fg"
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
            onClick={() => setMode(tab.key)}
            className={`cursor-pointer border-0 border-b-2 bg-transparent px-0.5 pb-2 text-[12.5px] transition-colors ${
              mode === tab.key ? 'border-fg font-semibold text-fg' : 'border-transparent text-fg-38 hover:text-fg'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === 'BROWSE' && (
        <>
          {/* Lesson filter */}
          <div className="mt-7 flex flex-wrap items-center gap-2">
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

          {/* Search */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-38" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo cấu trúc, cách dùng, lưu ý (gõ không dấu cũng được)..."
                aria-label="Tìm điểm ngữ pháp"
                className="h-10 w-full min-w-[280px] border border-rule-strong bg-transparent pl-9 pr-9 text-[12.5px] text-fg outline-none transition-colors placeholder:text-fg-38 focus:border-fg"
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
              {visibleRules.length}/{rules.length} điểm ngữ pháp
            </span>
          </div>

          {error && <p className="mt-4 text-[12.5px] text-red">{error}</p>}

          {pendingReviewRules > 0 && (
            <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-[1.7] text-fg-60">
              <TriangleAlert size={14} className="mt-0.5 shrink-0 text-red" />
              <span>
                Nội dung nháp: <strong className="text-fg">{pendingReviewRules}</strong>/{rules.length} điểm ngữ pháp
                đang chờ duyệt nội dung tiếng Nhật — bài tập bổ sung chỉ có ở staging.
              </span>
            </p>
          )}

          <div className="mt-8 grid grid-cols-[minmax(0,1fr)_320px] items-start gap-16 max-[1100px]:grid-cols-1 max-[1100px]:gap-10">
            {/* Rule list */}
            <div className="max-[1100px]:order-2">
              <div className="flex flex-col">
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
                      className={`flex cursor-pointer flex-col items-start gap-1 border-0 border-b border-rule bg-transparent px-3 py-4 text-left transition-colors ${
                        active ? 'bg-tint' : 'hover:bg-tint'
                      }`}
                    >
                      <span className="flex w-full items-baseline justify-between gap-4">
                        <span className="font-serif text-[16px] text-fg">{rule.structure}</span>
                        <span className="shrink-0 text-[11px] text-fg-38">{rule.exerciseCount} câu</span>
                      </span>
                      <span className="text-[12px] leading-[1.7] text-fg-60">{snippet(rule.explanation)}</span>
                      <span className="text-[11px] text-fg-38">
                        #{rule.number}
                        {rule.lessonTitle ? ` · ${rule.lessonTitle}` : ''}
                        {rule.reviewStatus !== 'APPROVED' ? ' · chờ duyệt' : ''}
                      </span>
                    </button>
                  );
                })}
                {visibleRules.length === 0 && !error && (
                  <p className="border border-rule px-4 py-10 text-center text-[12.5px] text-fg-38">
                    Không có điểm ngữ pháp nào khớp bộ lọc. Thử bỏ từ khoá tìm kiếm hoặc chọn bài khác.
                  </p>
                )}
              </div>
            </div>

            {/* Rule detail */}
            <aside data-grammar-detail className="sticky top-10 hidden min-[1101px]:block">
              <div className="bg-card px-6 py-7">{detailBody}</div>
            </aside>
          </div>

          {/* Màn nhỏ: chi tiết mở dạng popup thay vì xếp dọc dưới/trên danh sách */}
          {isNarrow && detailOpen && selectedRule && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-5 min-[1101px]:hidden"
              onClick={() => setDetailOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`Chi tiết ${selectedRule.structure}`}
                className="max-h-[85vh] w-full max-w-[460px] overflow-y-auto bg-card px-6 py-7"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className={labelClass}>Điểm ngữ pháp</span>
                  <button
                    type="button"
                    onClick={() => setDetailOpen(false)}
                    aria-label="Đóng chi tiết"
                    title="Đóng chi tiết"
                    className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center border border-rule bg-transparent text-fg-60 transition-colors hover:border-rule-strong hover:text-fg"
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
              onClick={() => {
                setSelectedRule(null);
                setMistakeOnly(true);
              }}
            >
              <TriangleAlert size={13} />
              Chỉ nhóm bẫy
            </button>
            {selectedRule && (
              <span className="flex flex-wrap items-center gap-2 text-[11.5px] text-fg-38">
                Đang luyện: <span className="font-serif text-[13px] text-fg">{selectedRule.structure}</span>
                <button
                  type="button"
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

          {!current && (
            <div className="mt-8 border border-rule px-6 py-12 text-center">
              <p className="text-[12.5px] leading-[1.8] text-fg-38">
                {exercises.length === 0
                  ? 'Chưa có câu bài tập nào đã duyệt cho phạm vi này. Thử chọn điểm ngữ pháp khác, hoặc bật "Chỉ nhóm bẫy".'
                  : 'Hết câu trong phiên này. Chọn "Tất cả điểm ngữ pháp" hoặc một điểm khác để luyện tiếp.'}
              </p>
            </div>
          )}

          {current && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-serif text-[13px] text-fg-60">{current.ruleTitle}</span>
                {current.isCommonMistake && (
                  <span className="flex items-center gap-1 border border-rule px-2 py-0.5 text-[11px] text-red">
                    <TriangleAlert size={11} />
                    Nhóm bẫy
                  </span>
                )}
              </div>

              <p className="mt-5 font-serif text-[22px] leading-[1.7] text-fg">{current.questionText}</p>

              <div className="mt-7 flex max-w-[560px] flex-col gap-2">
                {current.options.map((option, optionIndex) => {
                  const isCorrectOption = result && option === result.correctAnswer;
                  const isChosenWrong = result && option === selectedOption && !result.correct;
                  const tone = isCorrectOption
                    ? 'border-fg text-fg'
                    : isChosenWrong
                      ? 'border-red text-red'
                      : result
                        ? 'border-rule text-fg-38'
                        : 'border-rule-strong text-fg hover:border-fg';
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={Boolean(result)}
                      onClick={() => void submitAnswer(option)}
                      className={`flex items-center gap-3 border px-4 py-3 text-left transition-colors disabled:cursor-default ${
                        result ? 'cursor-default' : 'cursor-pointer'
                      } ${tone}`}
                    >
                      <kbd className="shrink-0 border border-current px-1.5 text-[10px] font-semibold leading-4 opacity-70">
                        {optionIndex + 1}
                      </kbd>
                      <span className="font-serif text-[15px]">{option}</span>
                    </button>
                  );
                })}
              </div>

              {result && (
                <div className="mt-5 max-w-[560px] bg-tint px-4 py-3">
                  <span className={labelClass}>{result.correct ? 'Chính xác' : 'Giải thích'}</span>
                  <p className="mt-1 text-[12.5px] leading-[1.8] text-fg-60">
                    {result.explanation ?? `${result.submittedAnswer} — đáp án đúng là ${result.correctAnswer}.`}
                  </p>
                  {!result.correct && (
                    <p className="mt-1 text-[12.5px] text-fg-60">
                      Đáp án đúng: <span className="font-serif text-fg">{result.correctAnswer}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6">
                <SubmitButton onClick={goNext} disabled={!result} shortcutHint="Enter">
                  Câu tiếp theo
                </SubmitButton>
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
            className="w-full max-w-[420px] bg-card px-7 py-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-[15px] font-semibold">Hướng dẫn trợ từ &amp; ngữ pháp</h3>
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
              Tab <strong>Tra cứu</strong>: lọc theo bài hoặc tìm theo cấu trúc / cách dùng / lưu ý (gõ không dấu vẫn
              ra), bấm một điểm ngữ pháp để xem cấu trúc, giải thích và lưu ý. Tab <strong>Luyện tập</strong>: chọn đáp
              án bằng phím 1–4, Enter để sang câu tiếp theo; phạm vi là điểm đang chọn, cả nhóm bẫy, hoặc tất cả.
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

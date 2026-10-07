import { trackLearningStarted } from '../progress/productEvents';
import { useRequestScope } from '../../lib/hooks/useRequestScope';
import { flashcardApi } from './api';
import type { FlashcardDueItem, FlashcardStats } from './types';
import { useAuth } from '../../app/useAuth';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { X, Volume2 } from 'lucide-react';
import { FeedbackAlert } from '../../components/FeedbackAlert';
import type { FeedbackType } from '../../components/FeedbackAlert';
import { speakJapanese } from '../../services/japaneseSpeech';

type QuestionType = 'reading' | 'meaning';
type OptionState = 'idle' | 'correct' | 'wrong' | 'dim';

/**
 * Practice session uses multiple choice (Vietnamese meaning or kana reading) instead of self-rating.
 * Correct -> SRS `GOOD`, wrong -> SRS `FORGOT` (the word returns next session); distractors are the
 * other words of today's session, so no dedicated endpoint is needed yet.
 */
export const FlashcardView: React.FC = () => {
  const { user, requireLogin: onRequireLogin } = useAuth();
  const { run, cancel } = useRequestScope(user?.userId);
  const startKey = useRef(crypto.randomUUID());
  const [items, setItems] = useState<FlashcardDueItem[]>([]);
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<{ value: string; correct: boolean } | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; title: string; message: string } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const refreshStats = useCallback(async () => {
    const statsRes = await run('flashcardApi.stats', signal => flashcardApi.stats({ signal }));
    if (!statsRes) return;
    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    }
  }, [run]);

  const loadDeck = useCallback(async () => {
    if (!user) {
      return;
    }

    const loaded = await run('FlashcardView-load', signal => Promise.all([
      flashcardApi.due({ signal }),
      flashcardApi.stats({ signal }),
    ]));
    if (!loaded) return;
    const [dueRes, statsRes] = loaded;

    if (dueRes.success && dueRes.data) {
      if (dueRes.data.length) trackLearningStarted('SRS', startKey.current);
      setItems(dueRes.data);
      setIndex(0);
      setChoice(null);
      setReviewedCount(0);
      setError(null);
    } else {
      setError(dueRes.message || 'Không tải được danh sách từ cần ôn hôm nay.');
    }

    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    }
  }, [user, run]);

  useEffect(() => {
    void loadDeck();
    return () => cancel('FlashcardView-load');
  }, [loadDeck, cancel]);

  const current = items[index];

  /** Question type: kana-only words always ask for the meaning; others randomly ask meaning or reading. */
  const questionType: QuestionType = useMemo(() => {
    if (!current) {
      return 'meaning';
    }
    const hasKanji = current.word !== current.reading;
    return hasKanji && Math.random() < 0.5 ? 'reading' : 'meaning';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.vocabularyId]);

  const answerField = questionType === 'reading' ? 'reading' : 'meaning';
  const correctValue = current ? current[answerField] : '';

  const options = useMemo(() => {
    if (!current) {
      return [] as string[];
    }
    const seen = new Set<string>([correctValue]);
    const pool: string[] = [];
    for (const item of items) {
      if (item.vocabularyId === current.vocabularyId) {
        continue;
      }
      const value = item[answerField];
      if (!value || seen.has(value)) {
        continue;
      }
      seen.add(value);
      pool.push(value);
    }
    const distractors = pool.sort(() => Math.random() - 0.5).slice(0, 3);
    return [correctValue, ...distractors].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.vocabularyId, questionType, items]);

  const submitRating = useCallback(
    async (rating: string) => {
      const target = items[index];
      if (!target) {
        return;
      }

      const res = await run('flashcardApi.review', signal => flashcardApi.review({ signal,
        method: 'POST',
        body: JSON.stringify({ vocabularyId: target.vocabularyId, rating }),
      }));
    if (!res) return;

      if (!res.success || !res.data) {
        setFeedback({
          type: 'error',
          title: 'Không gửi được kết quả ôn tập',
          message: res.message || 'Vui lòng thử lại.',
        });
        return;
      }

      const result = res.data;
      setReviewedCount((previous) => previous + 1);

      if (result.lapse) {
        setFeedback({
          type: 'info',
          title: `Đã xếp lại từ ${target.word}`,
          message: 'Từ này sẽ quay lại trong phiên ôn ngày mai.',
        });
      } else if (result.repetitions >= 3) {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.85 } });
      }

      void refreshStats();
    },
    [items, index, refreshStats, run]
  );

  const chooseOption = useCallback(
    (value: string) => {
      if (choice || !current) {
        return;
      }
      const isCorrect = value === correctValue;
      setChoice({ value, correct: isCorrect });
      void submitRating(isCorrect ? 'GOOD' : 'FORGOT');
    },
    [choice, current, correctValue, submitRating]
  );

  const handleContinue = useCallback(() => {
    setChoice(null);
    setIndex((previous) => previous + 1);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDeck();
    setRefreshing(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (helpOpen) {
          setHelpOpen(false);
        } else if (choice) {
          handleContinue();
        }
        return;
      }

      if (event.code === 'Space' || event.key === 'Enter') {
        event.preventDefault();
        if (choice) {
          handleContinue();
        }
        return;
      }

      const num = Number(event.key);
      if (!choice && !helpOpen && num >= 1 && num <= options.length) {
        chooseOption(options[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [choice, options, chooseOption, handleContinue, helpOpen]);

  if (!user) {
    return (
      <div className="max-w-[560px]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-38">
          Phiên ôn{' '}
          <span className="ml-2 font-serif text-[12.5px] font-normal normal-case tracking-[0.06em]">単語</span>
        </div>
        <h2 className="mt-6 text-[22px] font-semibold">Đăng nhập để bắt đầu ôn tập</h2>
        <p className="mt-3 text-[13.5px] leading-[1.8] text-fg-60">
          Tiến độ ôn tập, lịch SRS và streak được lưu theo tài khoản để hệ thống tính đúng số từ cần ôn mỗi ngày.
        </p>
        <button
          type="button"
          onClick={onRequireLogin}
          className="mt-8 cursor-pointer border border-fg bg-fg px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-bg transition-opacity hover:opacity-85"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  const total = items.length;
  const isInitialLoading = stats === null && error === null;

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col">
      {/* Session header */}
      <div className="flex items-center justify-between gap-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-38">
          Phiên ôn{' '}
          <span className="ml-2 font-serif text-[12.5px] font-normal normal-case tracking-[0.06em]">単語</span>
        </div>
        <div className="flex items-center gap-3">
          {total > 0 && (
            <div className="text-[13px] tabular-nums text-fg-60">
              <b className="text-fg">{reviewedCount}</b> / {total}
            </div>
          )}
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label="Hướng dẫn ôn tập"
            title="Hướng dẫn ôn tập"
            className="inline-flex h-6 w-6 cursor-pointer items-center justify-center border border-rule bg-transparent font-sans text-[11px] font-semibold text-fg-38 transition-colors hover:border-rule-strong hover:text-fg"
          >
            !
          </button>
        </div>
      </div>

      {total > 0 && (
        <div className="relative mt-4 h-[2px] bg-rule">
          <i
            aria-hidden="true"
            className="absolute inset-y-0 left-0 bg-fg"
            style={{ width: `${Math.round((reviewedCount / total) * 100)}%` }}
          />
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-[11.5px] text-fg-38">
        <span>
          {total === 0 ? 'Không còn từ nào đến hạn hôm nay.' : `Hôm nay có ${total} từ cần ôn.`} Đã thuộc{' '}
          <b className="font-semibold text-fg-60">{stats?.learnedWords ?? 0}</b> · Từ mới còn{' '}
          <b className="font-semibold text-fg-60">{stats?.availableNewWords ?? 0}</b>
        </span>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="cursor-pointer border border-rule-strong bg-transparent px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-fg transition-colors hover:bg-fg hover:text-bg disabled:cursor-not-allowed disabled:opacity-40"
        >
          {refreshing ? 'Đang tải...' : 'Tải lại'}
        </button>
      </div>

      {isInitialLoading && <div className="mt-12 text-[12.5px] text-fg-60">Đang tải phiên ôn tập...</div>}

      {error && <p className="mt-12 text-[12.5px] text-red">Không tải được dữ liệu ôn tập: {error}</p>}

      {!isInitialLoading && !error && !current && (
        <div className="mt-16">
          <h3 className="text-[22px] font-semibold">Xong phiên hôm nay.</h3>
          <p className="mt-3 text-[13.5px] leading-[1.8] text-fg-60">
            Bạn đã ôn {reviewedCount} từ.{' '}
            {stats?.dueToday
              ? `Còn ${stats.dueToday} từ đến hạn — bấm "Tải lại" để nạp phiên mới.`
              : 'Hẹn gặp lại vào ngày mai.'}
          </p>
        </div>
      )}

      {current && (
        <>
          {/* Question card - the single focal point of the screen */}
          <div className="mt-12 flex w-full flex-col items-center bg-card px-8 py-12 text-center">
            <span className="text-[11px] uppercase tracking-[0.16em] text-fg-38">
              {questionType === 'reading' ? 'Cách đọc là gì?' : 'Nghĩa tiếng Việt là gì?'}
              {' · '}
              {current.isNew ? 'Từ mới' : `Ôn lại · ${current.repetitions} lần`}
            </span>
            <span className="mt-3 font-serif text-[clamp(44px,9vw,68px)] font-light leading-[1.15]">
              {current.word}
            </span>

            {options.length >= 2 ? (
              <div className="mt-10 flex w-full max-w-[420px] flex-col gap-2.5">
                {options.map((value, i) => {
                  const isAnswer = value === correctValue;
                  const isChosen = choice?.value === value;
                  const state: OptionState = !choice
                    ? 'idle'
                    : isAnswer
                      ? 'correct'
                      : isChosen
                        ? 'wrong'
                        : 'dim';
                  const stateClass: Record<OptionState, string> = {
                    idle: 'border-rule-strong text-fg hover:bg-fg hover:text-bg',
                    correct: 'border-fg text-fg',
                    wrong: 'border-red text-red',
                    dim: 'border-rule text-fg-38',
                  };
                  return (
                    <button
                      key={`${value}-${i}`}
                      type="button"
                      disabled={!!choice}
                      onClick={() => chooseOption(value)}
                      className={`flex cursor-pointer items-baseline gap-3 border bg-transparent px-4 py-3 text-left font-sans text-[14px] transition-colors disabled:cursor-default ${stateClass[state]}`}
                    >
                      <span className="text-[10.5px] tabular-nums text-fg-38">{i + 1}</span>
                      <span className={questionType === 'reading' ? 'font-serif' : ''}>{value}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Only one word left (not enough distractors) - fall back to two-button self-rating */
              <div className="mt-10 flex w-full max-w-[420px] gap-2.5">
                <button
                  type="button"
                  disabled={!!choice}
                  onClick={() => {
                    setChoice({ value: 'remembered', correct: true });
                    void submitRating('GOOD');
                  }}
                  className="flex-1 cursor-pointer border border-rule-strong bg-transparent px-4 py-3 text-[13px] text-fg transition-colors hover:bg-fg hover:text-bg disabled:opacity-40"
                >
                  Đã nhớ
                </button>
                <button
                  type="button"
                  disabled={!!choice}
                  onClick={() => {
                    setChoice({ value: 'forgot', correct: false });
                    void submitRating('FORGOT');
                  }}
                  className="flex-1 cursor-pointer border border-rule-strong bg-transparent px-4 py-3 text-[13px] text-fg transition-colors hover:bg-fg hover:text-bg disabled:opacity-40"
                >
                  Chưa nhớ
                </button>
              </div>
            )}

          </div>

          <div className="mt-4 text-center text-[11px] text-fg-38">
            {!choice ? '1–4 để chọn đáp án' : 'Space để sang từ tiếp theo'}
          </div>
        </>
      )}

      {/* Result popup after answering */}
      {choice && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-5">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Kết quả ôn tập"
            className="max-h-[85vh] w-full max-w-[460px] overflow-y-auto bg-card px-7 py-8 text-center"
          >
            <div className="text-[12.5px] text-fg-60">
              {choice.correct ? (
                <span className="font-semibold text-fg">Đúng.</span>
              ) : (
                <>
                  <span className="font-semibold text-red">Sai</span> — đáp án đúng:{' '}
                  <b className="font-semibold text-fg">{correctValue}</b>
                </>
              )}
            </div>

            {/* Block 1 - word identity: furigana -> word -> meaning */}
            <div className="mt-7 flex flex-col items-center">
              <span className="font-serif text-[14px] text-fg-38">{current.reading}</span>
              <button type="button" onClick={() => speakJapanese(current.reading)} aria-label="Nghe cách đọc từ" className="inline-flex h-10 w-10 cursor-pointer items-center justify-center text-fg-60 hover:text-fg"><Volume2 size={16} /></button>
              <span className="mt-1 font-serif text-[clamp(36px,7vw,48px)] font-light leading-[1.15]">
                {current.word}
              </span>
              <span className="mt-4 text-[17px]">{current.meaning}</span>
            </div>

            {/* Block 2 - example, labelled to separate it from the block above */}
            {current.exampleSentence && (
              <div className="mt-8 flex flex-col items-center">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-38">Ví dụ</span>
                <span className="mt-3 font-serif text-[19px] font-light leading-[1.9]">{current.exampleSentence}</span>
                {current.exampleReading && (
                  <span className="mt-1 text-[12.5px] text-fg-60">{current.exampleReading}</span>
                )}
                {current.exampleMeaning && (
                  <span className="mt-0.5 text-[12.5px] text-fg-60">{current.exampleMeaning}</span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleContinue}
              className="mt-8 cursor-pointer border border-rule-strong bg-transparent px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg transition-colors hover:bg-fg hover:text-bg"
            >
              Tiếp theo <span className="ml-2 normal-case tracking-normal text-fg-38">(Space)</span>
            </button>
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
            aria-label="Hướng dẫn ôn tập"
            className="w-full max-w-[420px] bg-card px-7 py-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-[15px] font-semibold">Hướng dẫn ôn tập</h3>
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
              Chọn đáp án đúng bằng phím 1–4: nghĩa tiếng Việt hoặc cách đọc tùy từng câu. Sau khi chọn, nhấn Space
              để sang từ tiếp theo. Đúng/sai được ghi vào lịch ôn SRS của bạn.
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

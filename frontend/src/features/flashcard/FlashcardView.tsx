import React, { useCallback, useEffect, useState } from 'react';
import { Flame, Layers, RefreshCw, RotateCw, Sparkles, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import { OnboardingTooltip } from '../../components/OnboardingTooltip';
import { FeedbackAlert } from '../../components/FeedbackAlert';
import type { FeedbackType } from '../../components/FeedbackAlert';
import { SubmitButton } from '../../components/SubmitButton';
import { apiRequest } from '../../services/api';
import type { AuthResponse } from '../../services/api';

interface FlashcardDueItem {
  vocabularyId: number;
  word: string;
  reading: string;
  meaning: string;
  sinoVietnamese: string | null;
  exampleSentence: string | null;
  exampleReading: string | null;
  exampleMeaning: string | null;
  lessonSlug: string | null;
  isNew: boolean;
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
  dueDate: string | null;
}

interface FlashcardStats {
  learnedWords: number;
  dueToday: number;
  availableNewWords: number;
  currentStreak: number;
  longestStreak: number;
}

interface FlashcardReviewResult {
  vocabularyId: number;
  rating: string;
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
  nextDueDate: string;
  lapse: boolean;
  currentStreak: number;
  longestStreak: number;
}

interface FlashcardViewProps {
  user: AuthResponse | null;
  onRequireLogin: () => void;
}

/** 4 mức đánh giá — map sang SrsRating của backend, phím tắt 1/2/3/4 thống nhất với các trạm khác. */
const RATING_OPTIONS = [
  { rating: 'EASY', label: 'Dễ', hint: 'Nhớ rõ', shortcut: '1', color: '#10B981' },
  { rating: 'GOOD', label: 'Được', hint: 'Nhớ được', shortcut: '2', color: '#3B82F6' },
  { rating: 'HARD', label: 'Khó', hint: 'Nhớ chật vật', shortcut: '3', color: '#F59E0B' },
  { rating: 'FORGOT', label: 'Quên', hint: 'Học lại từ đầu', shortcut: '4', color: '#EF4444' },
];

export const FlashcardView: React.FC<FlashcardViewProps> = ({ user, onRequireLogin }) => {
  const [items, setItems] = useState<FlashcardDueItem[]>([]);
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; title: string; message: string } | null>(null);

  const refreshStats = useCallback(async () => {
    const statsRes = await apiRequest<FlashcardStats>('/flashcard/stats');
    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    }
  }, []);

  const loadDeck = useCallback(async () => {
    if (!user) {
      return;
    }

    const [dueRes, statsRes] = await Promise.all([
      apiRequest<FlashcardDueItem[]>('/flashcard/due-today'),
      apiRequest<FlashcardStats>('/flashcard/stats'),
    ]);

    if (dueRes.success && dueRes.data) {
      setItems(dueRes.data);
      setIndex(0);
      setFlipped(false);
      setReviewedCount(0);
      setError(null);
    } else {
      setError(dueRes.message || 'Không tải được danh sách từ cần ôn hôm nay.');
    }

    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    }
  }, [user]);

  useEffect(() => {
    void loadDeck();
  }, [loadDeck]);

  const submitRating = useCallback(
    async (rating: string) => {
      const current = items[index];
      if (!current || !flipped) {
        return;
      }

      const res = await apiRequest<FlashcardReviewResult>('/flashcard/review', {
        method: 'POST',
        body: JSON.stringify({ vocabularyId: current.vocabularyId, rating }),
      });

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
      setFlipped(false);
      setIndex((previous) => previous + 1);

      if (result.lapse) {
        setFeedback({
          type: 'info',
          title: `Đã xếp lại từ ${current.word}`,
          message: 'Từ này sẽ quay lại trong phiên ôn ngày mai.',
        });
      } else if (result.repetitions >= 3) {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.85 } });
      }

      void refreshStats();
    },
    [items, index, flipped, refreshStats]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDeck();
    setRefreshing(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        setFlipped((previous) => !previous);
        return;
      }

      const option = RATING_OPTIONS.find((item) => item.shortcut === event.key);
      if (option && flipped) {
        void submitRating(option.rating);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flipped, submitRating]);

  if (!user) {
    return (
      <div className="flashcard-shell">
        <div className="flashcard-login-required">
          <Layers size={26} color="var(--primary)" />
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Đăng nhập để bắt đầu ôn tập</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '520px', textAlign: 'center' }}>
            Tiến độ ôn tập, lịch SRS và streak được lưu theo tài khoản để hệ thống tính đúng số từ cần ôn mỗi ngày.
          </p>
          <SubmitButton onClick={onRequireLogin}>Đăng nhập / Đăng ký</SubmitButton>
        </div>
      </div>
    );
  }

  const current = items[index];
  const total = items.length;
  const isInitialLoading = stats === null && error === null;

  return (
    <div className="flashcard-shell">
      <OnboardingTooltip
        storageKey="flashcard"
        title="Hướng dẫn ôn tập Flashcard"
        description="Space để lật thẻ, sau đó chọn mức đánh giá bằng phím 1/2/3/4 (Dễ / Được / Khó / Quên). Hệ thống tự tính lịch ôn tiếp theo."
      />

      <div className="flashcard-header">
        <div>
          <h2 className="flashcard-title">
            <Layers size={20} color="var(--accent-emerald)" />
            <span>Flashcard Từ Vựng & SRS</span>
          </h2>
          <p className="flashcard-subtitle">
            {total === 0
              ? 'Không còn từ nào đến hạn — bạn có thể học từ mới ở bài tiếp theo.'
              : `Hôm nay có ${total} từ cần ôn · đã ôn ${reviewedCount}/${total}`}
          </p>
        </div>

        <div className="flashcard-stats">
          <span className="flashcard-stat">
            <TrendingUp size={13} /> Đã thuộc <strong>{stats?.learnedWords ?? 0}</strong>
          </span>
          <span className="flashcard-stat">
            Từ mới còn lại <strong>{stats?.availableNewWords ?? 0}</strong>
          </span>
          <span className="flashcard-stat">
            <Flame size={13} /> Streak <strong>{stats?.currentStreak ?? 0}</strong> ngày
          </span>
          <SubmitButton onClick={handleRefresh} loading={refreshing} variant="secondary">
            <RefreshCw size={14} />
            <span>Tải lại</span>
          </SubmitButton>
        </div>
      </div>

      {total > 0 && (
        <div className="flashcard-progress">
          <div className="flashcard-progress-bar" style={{ width: `${Math.round((reviewedCount / total) * 100)}%` }} />
        </div>
      )}

      {isInitialLoading && <div className="flashcard-note">Đang tải phiên ôn tập...</div>}

      {error && (
        <div className="flashcard-note is-error">
          <span>Không tải được dữ liệu ôn tập: {error}</span>
          <SubmitButton onClick={handleRefresh} loading={refreshing} variant="secondary">
            Thử lại
          </SubmitButton>
        </div>
      )}

      {!isInitialLoading && !error && !current && (
        <div className="flashcard-empty">
          <Sparkles size={30} color="var(--accent-gold)" />
          <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Bạn đã ôn xong hôm nay! 🎉</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {stats?.dueToday
              ? `Còn ${stats.dueToday} từ đến hạn, bấm "Tải lại" để nạp lại phiên ôn.`
              : 'Hẹn gặp lại vào ngày mai.'}
          </p>
        </div>
      )}

      {current && (
        <>
          <div className="flashcard-stage">
            <button
              type="button"
              className={`flashcard-card ${flipped ? 'is-flipped' : ''}`}
              onClick={() => setFlipped((previous) => !previous)}
              title="Bấm hoặc nhấn Space để lật thẻ"
            >
              <div className="flashcard-face flashcard-front">
                <span className="flashcard-tag">{current.isNew ? 'Từ mới' : `Ôn lại · ${current.repetitions} lần`}</span>
                <span className="flashcard-word">{current.word}</span>
                <span className="flashcard-hint">
                  <RotateCw size={13} /> Space để xem nghĩa
                </span>
              </div>

              <div className="flashcard-face flashcard-back">
                <span className="flashcard-reading">{current.reading}</span>
                {current.sinoVietnamese && <span className="flashcard-sino">Hán Việt: {current.sinoVietnamese}</span>}
                <span className="flashcard-meaning">{current.meaning}</span>
                {current.exampleSentence && (
                  <span className="flashcard-example">
                    <strong>{current.exampleSentence}</strong>
                    {current.exampleReading && <em>{current.exampleReading}</em>}
                    {current.exampleMeaning && <span>{current.exampleMeaning}</span>}
                  </span>
                )}
              </div>
            </button>
          </div>

          <div className="flashcard-rating">
            {RATING_OPTIONS.map((option) => (
              <button
                key={option.rating}
                type="button"
                className="flashcard-rating-btn"
                style={{
                  borderColor: flipped ? option.color : 'var(--border-subtle)',
                  color: flipped ? option.color : 'var(--text-muted)',
                }}
                disabled={!flipped}
                onClick={() => void submitRating(option.rating)}
              >
                <kbd>{option.shortcut}</kbd>
                <span className="flashcard-rating-label">{option.label}</span>
                <span className="flashcard-rating-hint">{option.hint}</span>
              </button>
            ))}
          </div>

          {!flipped && <div className="flashcard-hint-row">Lật thẻ trước (Space) rồi mới chọn mức đánh giá.</div>}
        </>
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

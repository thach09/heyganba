import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, PenLine, Search, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { OnboardingTooltip } from '../../components/OnboardingTooltip';
import { FeedbackAlert } from '../../components/FeedbackAlert';
import type { FeedbackType } from '../../components/FeedbackAlert';
import { SubmitButton } from '../../components/SubmitButton';
import { KanaCanvas } from '../kana/KanaCanvas';
import { apiRequest } from '../../services/api';
import type { AuthResponse } from '../../services/api';

interface RadicalDto {
  id: number;
  radical: string;
  strokeCount: number;
  name: string;
  meaning: string;
}

interface KanjiDto {
  id: number;
  character: string;
  strokeCount: number;
  onyomi: string | null;
  kunyomi: string | null;
  sinoVietnamese: string;
  meaning: string;
  mnemonic: string | null;
  lessonSlug: string | null;
  lessonTitle: string | null;
  radicals: RadicalDto[];
  practiceCount: number;
}

interface KanjiProgressResult {
  kanjiId: number;
  character: string;
  practiceCount: number;
  lastPracticedAt: string;
}

interface KanjiStationViewProps {
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

export const KanjiStationView: React.FC<KanjiStationViewProps> = ({ user, onRequireLogin }) => {
  const [kanjiList, setKanjiList] = useState<KanjiDto[]>([]);
  const [radicals, setRadicals] = useState<RadicalDto[]>([]);
  const [lesson, setLesson] = useState<string>('');
  const [radicalId, setRadicalId] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [selected, setSelected] = useState<KanjiDto | null>(null);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; title: string; message: string } | null>(null);

  const loadKanji = useCallback(async () => {
    if (!user) {
      return;
    }

    const params = new URLSearchParams();
    if (lesson) {
      params.set('lesson', lesson);
    }
    if (radicalId) {
      params.set('radical', radicalId);
    }
    if (search) {
      params.set('search', search);
    }

    const query = params.toString();
    const res = await apiRequest<KanjiDto[]>(`/kanji${query ? `?${query}` : ''}`);

    if (res.success && res.data) {
      setKanjiList(res.data);
      setError(null);
      setSelected((current) => res.data?.find((item) => item.id === current?.id) ?? res.data?.[0] ?? null);
    } else {
      setError(res.message || 'Không tải được dữ liệu kanji.');
    }
  }, [user, lesson, radicalId, search]);

  const loadRadicals = useCallback(async () => {
    if (!user) {
      return;
    }
    const res = await apiRequest<RadicalDto[]>('/radicals');
    if (res.success && res.data) {
      setRadicals(res.data);
    }
  }, [user]);

  useEffect(() => {
    void loadKanji();
  }, [loadKanji]);

  useEffect(() => {
    void loadRadicals();
  }, [loadRadicals]);

  const handlePracticeSubmit = async () => {
    if (!selected) {
      return;
    }

    setSubmitting(true);
    const res = await apiRequest<KanjiProgressResult>(`/kanji/${selected.id}/progress`, { method: 'POST' });
    setSubmitting(false);

    if (!res.success || !res.data) {
      setFeedback({
        type: 'error',
        title: 'Không lưu được tiến độ',
        message: res.message || 'Vui lòng thử lại.',
      });
      return;
    }

    const updated: KanjiDto = { ...selected, practiceCount: res.data.practiceCount };
    setSelected(updated);
    setKanjiList((previous) =>
      previous.map((item) => (item.id === updated.id ? { ...item, practiceCount: updated.practiceCount } : item))
    );

    confetti({ particleCount: 35, spread: 55, origin: { y: 0.85 } });
    setFeedback({
      type: 'success',
      title: `Đã luyện chữ ${updated.character} lần thứ ${updated.practiceCount}`,
      message: 'Tiến độ được lưu theo tài khoản của bạn. Chưa có animation thứ tự nét — hãy viết theo chữ mẫu mờ.',
    });
  };

  if (!user) {
    return (
      <div className="flashcard-shell">
        <div className="flashcard-login-required">
          <BookOpen size={26} color="var(--accent-gold)" />
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Đăng nhập để tra cứu & luyện viết Kanji</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '520px', textAlign: 'center' }}>
            Tiến độ luyện viết được lưu theo tài khoản để bạn theo dõi số lần đã luyện từng chữ.
          </p>
          <SubmitButton onClick={onRequireLogin}>Đăng nhập / Đăng ký</SubmitButton>
        </div>
      </div>
    );
  }

  return (
    <div className="kanji-shell">
      <OnboardingTooltip
        storageKey="kanji"
        title="Hướng dẫn tra cứu Kanji"
        description="Lọc theo bài học, bộ thủ hoặc tìm theo nghĩa/Hán Việt. Bấm vào chữ để xem cách đọc, mnemonic và luyện viết."
      />

      <div className="kana-hero">
        <span className="kana-phase-badge">
          <Sparkles size={13} />
          <span>Phase 3</span>
        </span>
        <h2 className="kana-hero-title">Bộ Thủ &amp; Hán Tự (Kanji)</h2>
        <p className="kana-hero-desc">
          Kanji xếp theo đúng thứ tự bài học JPD113/JPD123, kèm bộ thủ, âm Hán Việt, onyomi/kunyomi và mnemonic
          ghi nhớ. Bấm vào chữ để luyện viết theo mẫu.
        </p>
        <div className="kana-hero-stats">
          <span className="kana-stat">
            Đang hiển thị <strong>{kanjiList.length}</strong> chữ
          </span>
          <span className="kana-stat">
            Đã luyện <strong>{kanjiList.filter((item) => item.practiceCount > 0).length}</strong> chữ
          </span>
          <span className="kana-stat">
            Bộ thủ tra cứu <strong>{radicals.length}</strong>
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
          <div className="kanji-search">
            <Search size={14} />
            <input
              className="form-input kanji-search-input"
              placeholder="Tìm theo nghĩa, Hán Việt, chữ Hán hoặc cách đọc..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setSearch(searchInput.trim());
                }
              }}
            />
            <SubmitButton variant="secondary" onClick={() => setSearch(searchInput.trim())}>
              Tìm
            </SubmitButton>
            {search && (
              <SubmitButton
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                }}
              >
                Xoá lọc
              </SubmitButton>
            )}
          </div>

          <select
            className="form-input kanji-radical-select"
            value={radicalId}
            onChange={(event) => setRadicalId(event.target.value)}
          >
            <option value="">Mọi bộ thủ</option>
            {radicals.map((radical) => (
              <option key={radical.id} value={radical.id}>
                {radical.radical} ({radical.strokeCount} nét) — {radical.meaning}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="flashcard-note is-error">{error}</div>}

      <div className="kanji-layout">
        <div className="kanji-grid">
          {kanjiList.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`kanji-card ${selected?.id === item.id ? 'is-active' : ''}`}
              onClick={() => {
                setSelected(item);
                setPracticeOpen(false);
              }}
            >
              <span className="kanji-card-char">{item.character}</span>
              <span className="kanji-card-sino">{item.sinoVietnamese}</span>
              <span className="kanji-card-meaning">{item.meaning}</span>
              {item.practiceCount > 0 && <span className="kanji-card-progress">Đã luyện {item.practiceCount}×</span>}
            </button>
          ))}
          {kanjiList.length === 0 && !error && (
            <div className="kanji-empty">Không có kanji nào khớp bộ lọc hiện tại.</div>
          )}
        </div>

        <aside className="kanji-detail">
          {!selected && <div className="kana-detail-empty">Chọn một chữ Hán để xem chi tiết.</div>}

          {selected && (
            <>
              <div className="kanji-detail-head">
                <span className="kanji-detail-char">{selected.character}</span>
                <div>
                  <div className="kana-detail-romaji">{selected.sinoVietnamese}</div>
                  <div className="kana-detail-meta">
                    {selected.strokeCount} nét
                    {selected.lessonTitle ? ` · ${selected.lessonTitle}` : ''}
                  </div>
                  <div className="kana-detail-meta">Đã luyện: {selected.practiceCount} lần</div>
                </div>
              </div>

              <div className="kanji-readings">
                <span>
                  <strong>Onyomi:</strong> {selected.onyomi || '—'}
                </span>
                <span>
                  <strong>Kunyomi:</strong> {selected.kunyomi || '—'}
                </span>
              </div>

              <p className="kana-detail-note">
                <strong>Nghĩa:</strong> {selected.meaning}
              </p>

              {selected.mnemonic && (
                <div className="kana-inline-note">
                  <strong>Mnemonic:</strong> {selected.mnemonic}
                </div>
              )}

              <div className="kanji-radicals">
                <div className="canvas-tool-label">Bộ thủ</div>
                <div className="kanji-radical-chips">
                  {selected.radicals.map((radical) => (
                    <span key={radical.id} className="kanji-radical-chip" title={radical.meaning}>
                      {radical.radical} · {radical.name} ({radical.strokeCount})
                    </span>
                  ))}
                  {selected.radicals.length === 0 && <span className="kana-detail-meta">Chưa gắn bộ thủ.</span>}
                </div>
              </div>

              <div className="kana-detail-actions">
                <SubmitButton onClick={() => setPracticeOpen((previous) => !previous)}>
                  <PenLine size={15} />
                  <span>{practiceOpen ? 'Đóng luyện viết' : 'Luyện viết chữ này'}</span>
                </SubmitButton>
              </div>

              {practiceOpen && (
                <div className="kanji-practice">
                  <KanaCanvas
                    key={selected.id}
                    referenceChar={selected.character}
                    canvasSize={360}
                    submitLabel="Lưu tiến độ luyện"
                    onSubmit={handlePracticeSubmit}
                  />
                  {submitting && <div className="kana-detail-meta">Đang lưu tiến độ...</div>}
                </div>
              )}
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

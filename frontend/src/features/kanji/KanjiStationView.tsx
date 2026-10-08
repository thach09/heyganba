import { useRequestScope } from '../../lib/hooks/useRequestScope';
import { kanjiApi } from './api';
import type { RadicalDto, KanjiDto } from './types';
import { useAuth } from '../../app/useAuth';
import React, { useCallback, useEffect, useState } from 'react';
import { PenLine, Search, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FeedbackAlert } from '../../components/FeedbackAlert';
import type { FeedbackType } from '../../components/FeedbackAlert';
import { SubmitButton } from '../../components/SubmitButton';
import { KanaCanvas } from '../kana/KanaCanvas';

const LESSON_OPTIONS = [
  { slug: 'jpd113-b1', label: 'Bài 1' },
  { slug: 'jpd113-b2', label: 'Bài 2' },
  { slug: 'jpd113-b3', label: 'Bài 3' },
  { slug: 'jpd123-b4', label: 'Bài 4' },
  { slug: 'jpd123-b5', label: 'Bài 5' },
  { slug: 'jpd123-b6', label: 'Bài 6' },
  { slug: 'jpd123-b7', label: 'Bài 7' },
];

const STATION_TABS: { key: 'BROWSE' | 'WRITE'; label: string }[] = [
  { key: 'BROWSE', label: 'Tra cứu' },
  { key: 'WRITE', label: 'Luyện viết' },
];

const chipClass = (active: boolean) =>
  `cursor-pointer border px-3 py-1.5 text-[11.5px] transition-colors ${
    active ? 'border-fg bg-fg text-bg' : 'border-rule-strong bg-transparent text-fg-60 hover:border-fg hover:text-fg'
  }`;

const labelClass = 'text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-38';

/** The mnemonic block uses a tint background to stand out without a decorative rule. */
const MnemonicBlock: React.FC<{ text: string }> = ({ text }) => (
  <div className="bg-tint px-4 py-3">
    <span className={labelClass}>Mnemonic</span>
    <p className="mt-1 text-[12.5px] leading-[1.8] text-fg-60">{text}</p>
  </div>
);

export const KanjiStationView: React.FC = () => {
  const { user, requireLogin: onRequireLogin } = useAuth();
  const { run, cancel } = useRequestScope(user?.userId);
  const [kanjiList, setKanjiList] = useState<KanjiDto[]>([]);
  const [radicals, setRadicals] = useState<RadicalDto[]>([]);
  const [lesson, setLesson] = useState<string>('');
  const [radicalId, setRadicalId] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [selected, setSelected] = useState<KanjiDto | null>(null);
  const [mode, setMode] = useState<'BROWSE' | 'WRITE'>('BROWSE');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
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
    const res = await run('kanjiApi.list', signal => kanjiApi.list(query, { signal }));
    if (!res) return;

    if (res.success && res.data) {
      setKanjiList(res.data);
      setError(null);
      setSelected((current) => res.data?.find((item) => item.id === current?.id) ?? res.data?.[0] ?? null);
    } else {
      setError(res.message || 'Không tải được dữ liệu kanji.');
    }
  }, [user, lesson, radicalId, search, run]);

  const loadRadicals = useCallback(async () => {
    if (!user) {
      return;
    }
    const res = await run('kanjiApi.radicals', signal => kanjiApi.radicals({ signal }));
    if (!res) return;
    if (res.success && res.data) {
      setRadicals(res.data);
    }
  }, [user, run]);

  useEffect(() => {
    void loadKanji();
    return () => cancel('kanjiApi.list');
  }, [loadKanji, cancel]);

  useEffect(() => {
    void loadRadicals();
    return () => cancel('kanjiApi.radicals');
  }, [loadRadicals, cancel]);

  const handlePracticeSubmit = async () => {
    if (!selected) {
      return;
    }

    setSubmitting(true);
    const res = await run('kanjiApi.progress', signal => kanjiApi.progress(selected.id, { signal, method: 'POST' }));
    if (!res) return;
    setSubmitting(false);

    if (!res.success || !res.data) {
      setFeedback({
        type: 'error',
        title: 'Không lưu được tiến độ',
        message: res.message || 'Vui lòng thử lại.',
      });
      return false;
    }

    const updated: KanjiDto = { ...selected, practiceCount: res.data.practiceCount };
    setSelected(current => current?.id === updated.id ? updated : current);
    setKanjiList((previous) =>
      previous.map((item) => (item.id === updated.id ? { ...item, practiceCount: updated.practiceCount } : item))
    );

    confetti({ particleCount: 35, spread: 55, origin: { y: 0.85 } });
    setFeedback({
      type: 'success',
      title: `Đã luyện chữ ${updated.character} lần thứ ${updated.practiceCount}`,
      message: 'Hình chữ đã khớp ít nhất 80% với mẫu. Tiến độ đã được lưu vào tài khoản.',
    });
  };

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col items-center pt-16 text-center">
        <span className="font-serif text-[34px] font-light leading-none text-fg">漢字</span>
        <p className="mt-5 text-[13px] leading-[1.9] text-fg-60">
          Đăng nhập để tra cứu Kanji và luyện viết. Tiến độ luyện viết được lưu theo tài khoản để bạn theo dõi số lần
          đã luyện từng chữ.
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
          Kanji <span className="ml-2 font-serif text-[12.5px] font-normal normal-case tracking-[0.06em]">漢字</span>
        </div>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          aria-label="Hướng dẫn tra cứu Kanji"
          title="Hướng dẫn tra cứu Kanji"
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

      {/* Search + radical filter */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-38" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setSearch(searchInput.trim());
              }
            }}
            placeholder="Tìm theo nghĩa, Hán Việt, chữ Hán hoặc cách đọc..."
            aria-label="Tìm kanji"
            className="h-10 w-full min-w-[260px] border border-rule-strong bg-transparent pl-9 pr-3 text-[12.5px] text-fg outline-none transition-colors placeholder:text-fg-38 focus:border-fg"
          />
        </div>
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

        <select
          value={radicalId}
          onChange={(event) => setRadicalId(event.target.value)}
          aria-label="Lọc theo bộ thủ"
          className="h-10 cursor-pointer border border-rule-strong bg-transparent px-3 text-[12.5px] text-fg outline-none transition-colors focus:border-fg"
        >
          <option value="">Mọi bộ thủ</option>
          {radicals.map((radical) => (
            <option key={radical.id} value={radical.id}>
              {radical.radical} ({radical.strokeCount} nét) — {radical.meaning}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-6 text-[11.5px] text-fg-38">
        Đang hiển thị <span className="text-fg-60">{kanjiList.length}</span> chữ · đã luyện{' '}
        <span className="text-fg-60">{kanjiList.filter((item) => item.practiceCount > 0).length}</span> chữ · bộ thủ tra
        cứu <span className="text-fg-60">{radicals.length}</span>
      </p>

      {error && <p className="mt-4 text-[12.5px] text-red">{error}</p>}

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)_320px] items-start gap-16 max-[1100px]:grid-cols-1 max-[1100px]:gap-10">
        {/* On mobile the detail panel comes first so a pick does not require scrolling back up */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(94px,1fr))] gap-2 max-[1100px]:order-2">
          {kanjiList.map((item) => {
            const active = selected?.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-kanji-card={item.character}
                onClick={() => { setSelected(item); setFeedback(null); }}
                className={`flex cursor-pointer flex-col items-center gap-1 border px-2 py-3 transition-colors ${
                  active ? 'border-fg bg-card' : 'border-rule-strong bg-transparent hover:border-fg'
                }`}
              >
                <span className="font-serif text-[30px] font-light leading-none text-fg">{item.character}</span>
                <span className="text-[11px] text-fg-60">{item.sinoVietnamese}</span>
                <span className="max-w-full truncate text-[11px] text-fg-38">{item.meaning}</span>
                {item.practiceCount > 0 && <span className="text-[10px] text-fg-38">Đã luyện {item.practiceCount}×</span>}
              </button>
            );
          })}
          {kanjiList.length === 0 && !error && (
            <div className="col-span-full border border-rule px-4 py-10 text-center text-[12.5px] text-fg-38">
              Không có kanji nào khớp bộ lọc hiện tại.
            </div>
          )}
        </div>

        <aside data-kanji-detail className="sticky top-10 max-[1100px]:static max-[1100px]:order-1">
          <div className="bg-card px-6 py-7">
            {!selected && <p className="text-[12.5px] text-fg-38">Chọn một chữ Hán để xem chi tiết.</p>}

            {selected && (
              <>
                <div className="flex items-start gap-5">
                  <span className="font-serif text-[54px] font-light leading-none text-fg">{selected.character}</span>
                  <div className="min-w-0">
                    <div className="text-[13px] text-fg-60">{selected.sinoVietnamese}</div>
                    <div className="mt-1 text-[11.5px] text-fg-38">
                      {selected.strokeCount} nét
                      {selected.lessonTitle ? ` · ${selected.lessonTitle}` : ''}
                    </div>
                    <div className="text-[11.5px] text-fg-38">Đã luyện: {selected.practiceCount} lần</div>
                  </div>
                </div>

                <div className="mt-6 space-y-1.5 text-[13px] leading-[1.7]">
                  <div className="text-fg-60">
                    <span className={labelClass}>Onyomi</span>{' '}
                    <span className="ml-1 font-serif text-[13px] text-fg">{selected.onyomi || '—'}</span>
                  </div>
                  <div className="text-fg-60">
                    <span className={labelClass}>Kunyomi</span>{' '}
                    <span className="ml-1 font-serif text-[13px] text-fg">{selected.kunyomi || '—'}</span>
                  </div>
                </div>

                <p className="mt-5 text-[13px] leading-[1.8] text-fg-60">
                  <span className={labelClass}>Nghĩa</span>
                  <br />
                  {selected.meaning}
                </p>

                {selected.mnemonic && (
                  <div className="mt-4">
                    <MnemonicBlock text={selected.mnemonic} />
                  </div>
                )}

                <div className="mt-6">
                  <span className={labelClass}>Bộ thủ</span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selected.radicals.map((radical) => (
                      <span
                        key={radical.id}
                        title={radical.meaning}
                        className="border border-rule px-2 py-1 text-[11px] text-fg-60"
                      >
                        {radical.radical} · {radical.name} ({radical.strokeCount})
                      </span>
                    ))}
                    {selected.radicals.length === 0 && <span className="text-[11.5px] text-fg-38">Chưa gắn bộ thủ.</span>}
                  </div>
                </div>

                <div className="mt-7">
                  <SubmitButton onClick={() => setMode('WRITE')}>
                    <PenLine size={14} />
                    <span>Luyện viết chữ này</span>
                  </SubmitButton>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
        </>
      )}

      {mode === 'WRITE' && (
        <div className="mt-10 grid grid-cols-[300px_minmax(0,1fr)] items-start gap-16 max-[1100px]:grid-cols-1 max-[1100px]:gap-10">
          <div>
            <div className={labelClass}>Chọn bài</div>
            <div className="mt-3 flex flex-wrap gap-2">
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

            <div className={`${labelClass} mt-6`}>Tìm chữ</div>
            <div className="relative mt-3">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-38" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setSearch(searchInput.trim());
                  }
                }}
                placeholder="Nghĩa, Hán Việt, chữ Hán, cách đọc..."
                aria-label="Tìm kanji để luyện viết"
                className="h-10 w-full border border-rule-strong bg-transparent pl-9 pr-3 text-[12.5px] text-fg outline-none transition-colors placeholder:text-fg-38 focus:border-fg"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
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
              <span className="text-[11.5px] text-fg-38">{kanjiList.length} chữ</span>
            </div>

            <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
              {kanjiList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-kanji-write-pick={item.character}
                  onClick={() => { setSelected(item); setFeedback(null); }}
                  title={`${item.character} — ${item.sinoVietnamese}`}
                  className={`cursor-pointer px-1 py-2 text-center transition-colors ${
                    selected?.id === item.id ? 'bg-card' : 'bg-transparent hover:bg-tint'
                  }`}
                >
                  <span className="block font-serif text-[22px] font-light leading-none text-fg">
                    {item.character}
                  </span>
                  <span className="mt-1 block text-[10px] text-fg-38">{item.sinoVietnamese}</span>
                </button>
              ))}
              {kanjiList.length === 0 && (
                <p className="col-span-full text-[12px] text-fg-38">Không có chữ nào khớp bộ lọc.</p>
              )}
            </div>
          </div>

          <div>
            {!selected && <p className="text-[12.5px] text-fg-38">Chọn một chữ bên trái để luyện viết.</p>}

            {selected && (
              <>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="font-serif text-[34px] font-light leading-none text-fg">{selected.character}</span>
                  <span className="text-[12.5px] text-fg-60">
                    {selected.sinoVietnamese} · {selected.meaning}
                  </span>
                  <span className="text-[11.5px] text-fg-38">Đã luyện: {selected.practiceCount} lần</span>
                </div>

                <div className="mt-6">
                  <KanaCanvas
                    key={selected.id}
                    referenceChar={selected.character}
                    maxSize={420}
                    submitLabel="Lưu tiến độ luyện"
                    onSubmit={handlePracticeSubmit}
                    onInkChange={() => setFeedback(null)}
                  />
                </div>
                {submitting && <p className="mt-3 text-[11.5px] text-fg-38">Đang lưu tiến độ...</p>}

                {selected.mnemonic && (
                  <div className="mt-6">
                    <MnemonicBlock text={selected.mnemonic} />
                  </div>
                )}
              </>
            )}
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
            aria-label="Hướng dẫn tra cứu Kanji"
            className="w-full max-w-[420px] bg-card px-7 py-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-[15px] font-semibold">Hướng dẫn tra cứu Kanji</h3>
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
              Lọc theo bài học, bộ thủ hoặc tìm theo nghĩa / Hán Việt / chữ Hán / cách đọc. Bấm vào một chữ để xem
              onyomi, kunyomi, mnemonic và bộ thủ, rồi luyện viết theo chữ mẫu. Tiến độ luyện lưu theo tài khoản.
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

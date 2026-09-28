import React, { useState } from 'react';
import { X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FeedbackAlert } from '../../components/FeedbackAlert';
import type { FeedbackType } from '../../components/FeedbackAlert';
import { KanaTable } from './KanaTable';
import { KanaDetailPanel } from './KanaDetailPanel';
import { KanaCanvas } from './KanaCanvas';
import { KanaQuiz } from './KanaQuiz';
import { describeKanaAudioSource, playKanaAudio } from './kanaAudio';
import {
  KANA_COUNTS,
  KANA_GROUP_META,
  KANA_GROUP_ORDER,
  KANA_SCRIPT_LABEL,
  getKanaById,
  getKanaEntries,
  getKanaEntriesByGroup,
} from './kanaData';
import type { KanaEntry, KanaGroupKey, KanaScript } from './kanaData';

type StationMode = 'TABLE' | 'QUIZ' | 'WRITE';

const MODE_TABS: { key: StationMode; label: string }[] = [
  { key: 'TABLE', label: 'Bảng chữ' },
  { key: 'QUIZ', label: 'Luyện gõ' },
  { key: 'WRITE', label: 'Luyện viết tay' },
];

const DEFAULT_ENTRY_ID = 'HIRAGANA-あ';

interface KanaStationViewProps {
  /** Active kana script. Owned by App so the sidebar dropdown can target Hiragana or Katakana directly. */
  script: KanaScript;
  onScriptChange: (script: KanaScript) => void;
}

/**
 * Interactive kana station: Hiragana / Katakana switcher, one chart per group (gojuon,
 * dakuten, yoon, extended katakana, double characters); tap a character to hear it and see
 * details, then practice with the romaji typing drill or the handwriting canvas.
 */
export const KanaStationView: React.FC<KanaStationViewProps> = ({ script, onScriptChange }) => {
  const [mode, setMode] = useState<StationMode>('TABLE');
  const [selectedEntry, setSelectedEntry] = useState<KanaEntry | null>(() => getKanaById(DEFAULT_ENTRY_ID) ?? null);
  const [practiceEntry, setPracticeEntry] = useState<KanaEntry>(() => getKanaById(DEFAULT_ENTRY_ID) ?? getKanaEntries('HIRAGANA')[0]);
  const [practiceGroup, setPracticeGroup] = useState<KanaGroupKey>('GOJUON');
  const [audioNote, setAudioNote] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; title: string; message: string } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // Derived fallbacks: the script arrives as a prop (the nav can switch it), so any selection
  // belonging to the other script falls back to the first entry of the active one - no effect needed.
  const practiceGroupSafe = KANA_GROUP_ORDER[script].includes(practiceGroup) ? practiceGroup : 'GOJUON';
  const selectedEntrySafe =
    selectedEntry && selectedEntry.script === script ? selectedEntry : (getKanaEntries(script)[0] ?? null);
  const practiceEntrySafe =
    practiceEntry.script === script ? practiceEntry : (getKanaEntries(script)[0] ?? getKanaEntries('HIRAGANA')[0]);

  const handleSelectScript = (next: KanaScript) => {
    onScriptChange(next);
  };

  const handleSelectEntry = (entry: KanaEntry) => {
    setSelectedEntry(entry);
    setAudioNote(describeKanaAudioSource(playKanaAudio(entry)));
  };

  const handlePlay = (entry: KanaEntry) => {
    setAudioNote(describeKanaAudioSource(playKanaAudio(entry)));
  };

  const handlePractice = (entry: KanaEntry) => {
    onScriptChange(entry.script);
    setPracticeGroup(entry.group);
    setPracticeEntry(entry);
    setMode('WRITE');
  };

  const handleCanvasSubmit = () => {
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.8 } });
    setFeedback({
      type: 'success',
      title: `Đã luyện xong chữ ${practiceEntrySafe.character}`,
      message:
        'Giai đoạn này chưa nhận dạng chữ viết — hãy tự đối chiếu nét viết với chữ mẫu (bật/tắt bằng nút "Chữ mẫu").',
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col">
      {/* Station header */}
      <div className="flex items-center justify-between gap-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-38">
          Bảng chữ{' '}
          <span className="ml-2 font-serif text-[12.5px] font-normal normal-case tracking-[0.06em]">かな</span>
        </div>
        <div className="flex items-center gap-5">
          {(['HIRAGANA', 'KATAKANA'] as KanaScript[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleSelectScript(option)}
              className={`cursor-pointer border-0 border-b-2 bg-transparent px-0.5 pb-1 text-[12.5px] transition-colors ${
                script === option
                  ? 'border-fg font-semibold text-fg'
                  : 'border-transparent text-fg-38 hover:text-fg'
              }`}
            >
              {KANA_SCRIPT_LABEL[option]} <span className="ml-1 text-[10.5px] text-fg-38">{KANA_COUNTS[option]}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label="Hướng dẫn dùng bảng Kana"
            title="Hướng dẫn dùng bảng Kana"
            className="inline-flex h-6 w-6 cursor-pointer items-center justify-center border border-rule bg-transparent font-sans text-[11px] font-semibold text-fg-38 transition-colors hover:border-rule-strong hover:text-fg"
          >
            !
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="mt-7 flex gap-6 border-b border-rule">
        {MODE_TABS.map((tab) => (
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

      {mode === 'TABLE' && (
        <>
          <p className="mt-6 max-w-[760px] text-[12px] leading-[1.8] text-fg-60">
            {script === 'HIRAGANA' ? (
              <>
                Ba trợ từ は / へ / を không phải ký tự riêng: chữ viết giữ nguyên, chỉ đọc khác (wa / e / o) khi
                làm trợ từ trong câu.
              </>
            ) : (
              <>
                Katakana mở rộng dùng để phiên âm từ ngoại lai (ファ / フィ / ウィ / ツォ...), tách riêng khỏi 46
                chữ cơ bản. Ký tự đôi ッ (gấp đôi phụ âm) và ー (kéo dài nguyên âm) cũng có bảng riêng.
              </>
            )}
          </p>

          <div className="mt-10 grid grid-cols-[minmax(0,1fr)_320px] items-start gap-16 max-[1100px]:grid-cols-1 max-[1100px]:gap-10">
            {/* On mobile the detail panel comes first so selecting a character does not require scrolling past every group */}
            <div className="max-[1100px]:order-2">
              <KanaTable script={script} selectedId={selectedEntrySafe?.id ?? null} onSelect={handleSelectEntry} />
              <p className="mt-6 flex items-center gap-2 text-[11px] text-fg-38">
                <span aria-hidden="true" className="inline-block h-[3px] w-[3px] bg-fg opacity-60" />
                Chữ cần chú ý — dễ nhầm khi đọc hoặc đọc khác khi làm trợ từ.
              </p>
            </div>

            <div className="sticky top-10 max-[1100px]:static max-[1100px]:order-1">
              <KanaDetailPanel
                entry={selectedEntrySafe}
                audioNote={audioNote}
                onPlay={handlePlay}
                onPractice={handlePractice}
              />
            </div>
          </div>
        </>
      )}

      {mode === 'QUIZ' && (
        <div className="mt-10">
          <KanaQuiz script={script} />
        </div>
      )}

      {mode === 'WRITE' && (
        <div className="mt-10 grid grid-cols-[300px_minmax(0,1fr)] items-start gap-16 max-[1100px]:grid-cols-1 max-[1100px]:gap-10">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-38">Chọn nhóm chữ</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {KANA_GROUP_ORDER[script].map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setPracticeGroup(group)}
                  className={`cursor-pointer border bg-transparent px-3 py-1.5 text-[11.5px] transition-colors ${
                    practiceGroupSafe === group
                      ? 'border-fg text-fg'
                      : 'border-rule text-fg-60 hover:border-rule-strong hover:text-fg'
                  }`}
                >
                  {KANA_GROUP_META[group].shortLabel}
                </button>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
              {getKanaEntriesByGroup(script, practiceGroupSafe).map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setPracticeEntry(entry)}
                  title={`${entry.character} — ${entry.romaji}`}
                  className={`cursor-pointer px-1 py-2 text-center transition-colors ${
                    practiceEntrySafe.id === entry.id ? 'bg-card' : 'bg-transparent hover:bg-[rgba(236,236,230,0.05)]'
                  }`}
                >
                  <span className="block font-serif text-[22px] font-light leading-none">{entry.character}</span>
                  <span className="mt-1 block text-[10px] text-fg-38">{entry.romaji}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => playKanaAudio(practiceEntrySafe)}
              className="mt-8 cursor-pointer border border-rule-strong bg-transparent px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-fg transition-colors hover:bg-fg hover:text-bg"
            >
              Nghe phát âm chữ đang luyện
            </button>
          </div>

          <KanaCanvas key={practiceEntrySafe.id} referenceChar={practiceEntrySafe.character} onSubmit={handleCanvasSubmit} />
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
            aria-label="Hướng dẫn dùng bảng Kana"
            className="w-full max-w-[420px] bg-card px-7 py-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-[15px] font-semibold">Hướng dẫn dùng bảng Kana</h3>
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
              Tab Hiragana / Katakana để đổi bảng chữ. Bấm vào từng chữ để nghe phát âm và xem chi tiết, rồi luyện gõ
              romaji ở tab Luyện gõ hoặc luyện viết ở tab Luyện viết tay. Ở tab Luyện gõ: chọn ký tự (cả nhóm, cả hàng
              hoặc từng chữ) rồi bấm Bắt đầu — gõ romaji lần lượt theo dãy; gõ sai chữ hiện đỏ kèm cách đọc đúng và
              được nhét lại cuối dãy để gõ lại; ký tự hay sai sẽ lặp nhiều hơn.
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

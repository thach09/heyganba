import React, { useState } from 'react';
import { Grid2x2, Info, ListChecks, PenLine, Sparkles, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { OnboardingTooltip } from '../../components/OnboardingTooltip';
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

const MODE_TABS: { key: StationMode; label: string; icon: typeof Grid2x2 }[] = [
  { key: 'TABLE', label: 'Bảng chữ', icon: Grid2x2 },
  { key: 'QUIZ', label: 'Quiz nhận diện', icon: ListChecks },
  { key: 'WRITE', label: 'Luyện viết tay', icon: PenLine },
];

const DEFAULT_ENTRY_ID = 'HIRAGANA-あ';

/**
 * Bảng Kana tương tác: tab Hiragana / Katakana, mỗi tab gồm các bảng riêng
 * (46 chữ cơ bản, biến âm, âm ghép, katakana mở rộng, ký tự đôi),
 * bấm chữ để nghe phát âm + xem chi tiết, kèm quiz nhận diện và canvas luyện viết.
 */
export const KanaStationView: React.FC = () => {
  const [script, setScript] = useState<KanaScript>('HIRAGANA');
  const [mode, setMode] = useState<StationMode>('TABLE');
  const [selectedEntry, setSelectedEntry] = useState<KanaEntry | null>(() => getKanaById(DEFAULT_ENTRY_ID) ?? null);
  const [practiceEntry, setPracticeEntry] = useState<KanaEntry>(() => getKanaById(DEFAULT_ENTRY_ID) ?? getKanaEntries('HIRAGANA')[0]);
  const [practiceGroup, setPracticeGroup] = useState<KanaGroupKey>('GOJUON');
  const [audioNote, setAudioNote] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; title: string; message: string } | null>(null);

  const katakanaBasic = getKanaEntriesByGroup('KATAKANA', 'GOJUON').length;
  const katakanaExtended = getKanaEntriesByGroup('KATAKANA', 'EXTENDED_KATAKANA').length;
  const katakanaDouble = getKanaEntriesByGroup('KATAKANA', 'DOUBLE_KATAKANA').length;

  const handleSelectScript = (next: KanaScript) => {
    const entries = getKanaEntries(next);
    setScript(next);
    setPracticeGroup('GOJUON');
    setSelectedEntry(entries[0] ?? null);
    if (entries[0]) {
      setPracticeEntry(entries[0]);
    }
  };

  const handleSelectEntry = (entry: KanaEntry) => {
    setSelectedEntry(entry);
    setAudioNote(describeKanaAudioSource(playKanaAudio(entry)));
  };

  const handlePlay = (entry: KanaEntry) => {
    setAudioNote(describeKanaAudioSource(playKanaAudio(entry)));
  };

  const handlePractice = (entry: KanaEntry) => {
    setScript(entry.script);
    setPracticeGroup(entry.group);
    setPracticeEntry(entry);
    setMode('WRITE');
  };

  const handleCanvasSubmit = () => {
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.8 } });
    setFeedback({
      type: 'success',
      title: `Đã luyện xong chữ ${practiceEntry.character}`,
      message:
        'Giai đoạn này chưa nhận dạng chữ viết — hãy tự đối chiếu nét viết với chữ mẫu (bật/tắt bằng nút "Chữ mẫu").',
    });
  };

  return (
    <div>
      <OnboardingTooltip
        storageKey="kana"
        title="Hướng dẫn dùng bảng Kana"
        description="Tab Hiragana / Katakana để đổi bảng chữ. Bấm vào từng chữ để nghe phát âm và xem chi tiết, rồi luyện nhận diện hoặc luyện viết ở các tab bên dưới."
      />

      <div className="kana-hero">
        <span className="kana-phase-badge">
          <Sparkles size={13} />
          <span>Phase 1</span>
        </span>
        <h2 className="kana-hero-title">Bảng Chữ Cái Kana (Hiragana / Katakana)</h2>
        <p className="kana-hero-desc">
          Nghe phát âm, nhận diện và luyện viết từng nét. Katakana được tách thành các bảng riêng: 46 chữ cơ bản,
          biến âm, âm ghép, tổ hợp âm cho từ mượn và ký tự đôi.
        </p>
        <div className="kana-hero-stats">
          <span className="kana-stat">
            Hiragana <strong>{KANA_COUNTS.HIRAGANA}</strong> ký tự
          </span>
          <span className="kana-stat">
            Katakana <strong>{KANA_COUNTS.KATAKANA}</strong> ký tự
          </span>
          <span className="kana-stat">
            Trong đó: <strong>{katakanaBasic}</strong> cơ bản · <strong>{katakanaExtended}</strong> tổ hợp ngoại lai
            · <strong>{katakanaDouble}</strong> ký tự đôi
          </span>
        </div>
      </div>

      <div className="kana-toolbar">
        <div className="kana-tabs">
          {MODE_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                className={`kana-tab ${mode === tab.key ? 'active' : ''}`}
                onClick={() => setMode(tab.key)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="kana-tabs">
          {(['HIRAGANA', 'KATAKANA'] as KanaScript[]).map((option) => (
            <button
              key={option}
              type="button"
              className={`kana-tab ${script === option ? 'active' : ''}`}
              onClick={() => handleSelectScript(option)}
            >
              <span>{KANA_SCRIPT_LABEL[option]}</span>
              <span className="kana-tab-count">{KANA_COUNTS[option]}</span>
            </button>
          ))}
        </div>
      </div>

      {mode === 'TABLE' && (
        <>
          <div className="kana-note-banner">
            <Info size={16} />
            {script === 'HIRAGANA' ? (
              <span>
                Ba trợ từ は / へ / を không phải ký tự riêng: chữ viết giữ nguyên, chỉ đọc khác (wa / e / o) khi
                làm trợ từ trong câu.
              </span>
            ) : (
              <span>
                Katakana mở rộng dùng để phiên âm từ ngoại lai (ファ / フィ / ウィ / ツォ...), tách riêng khỏi 46
                chữ cơ bản. Ký tự đôi ッ (gấp đôi phụ âm) và ー (kéo dài nguyên âm) cũng có bảng riêng.
              </span>
            )}
          </div>

          <div className="kana-table-layout">
            <div>
              <KanaTable script={script} selectedId={selectedEntry?.id ?? null} onSelect={handleSelectEntry} />
              <div className="kana-legend">
                <span className="kana-legend-item">
                  <span className="kana-dot is-mistake" /> Chữ dễ nhầm khi đọc (シ / ツ / ソ / ン...)
                </span>
                <span className="kana-legend-item">
                  <span className="kana-dot is-particle" /> Trợ từ đọc khác (は / へ / を)
                </span>
              </div>
            </div>

            <aside className="kana-side">
              <KanaDetailPanel
                entry={selectedEntry}
                audioNote={audioNote}
                onPlay={handlePlay}
                onPractice={handlePractice}
              />
            </aside>
          </div>
        </>
      )}

      {mode === 'QUIZ' && <KanaQuiz script={script} />}

      {mode === 'WRITE' && (
        <div className="kana-write-layout">
          <div className="kana-write-picker">
            <div className="canvas-tool-label">Chọn nhóm chữ</div>
            <div className="kana-scope-chips">
              {KANA_GROUP_ORDER[script].map((group) => (
                <button
                  key={group}
                  type="button"
                  className={`chip ${practiceGroup === group ? 'is-active' : ''}`}
                  onClick={() => setPracticeGroup(group)}
                >
                  {KANA_GROUP_META[group].shortLabel}
                </button>
              ))}
            </div>

            <div className="kana-picker">
              {getKanaEntriesByGroup(script, practiceGroup).map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`kana-picker-item ${practiceEntry.id === entry.id ? 'is-active' : ''}`}
                  onClick={() => setPracticeEntry(entry)}
                  title={`${entry.character} — ${entry.romaji}`}
                >
                  <span className="kana-picker-char">{entry.character}</span>
                  <span className="kana-picker-romaji">{entry.romaji}</span>
                </button>
              ))}
            </div>

            <button type="button" className="btn btn-secondary" onClick={() => playKanaAudio(practiceEntry)}>
              <Volume2 size={16} />
              <span>Nghe phát âm chữ đang luyện</span>
            </button>
          </div>

          <KanaCanvas key={practiceEntry.id} referenceChar={practiceEntry.character} onSubmit={handleCanvasSubmit} />
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

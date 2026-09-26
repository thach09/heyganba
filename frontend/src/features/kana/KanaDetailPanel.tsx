import React from 'react';
import { Info, PenLine, TriangleAlert, Volume2 } from 'lucide-react';
import { KANA_GROUP_META, KANA_SCRIPT_LABEL } from './kanaData';
import type { KanaEntry } from './kanaData';

interface KanaDetailPanelProps {
  entry: KanaEntry | null;
  audioNote: string | null;
  onPlay: (entry: KanaEntry) => void;
  onPractice: (entry: KanaEntry) => void;
}

export const KanaDetailPanel: React.FC<KanaDetailPanelProps> = ({ entry, audioNote, onPlay, onPractice }) => {
  if (!entry) {
    return (
      <div className="kana-detail">
        <div className="kana-detail-empty">
          <Info size={18} />
          <span>Bấm vào một chữ trong bảng để nghe phát âm và xem chi tiết.</span>
        </div>
      </div>
    );
  }

  const meta = KANA_GROUP_META[entry.group];

  return (
    <div className="kana-detail">
      <div className="kana-detail-top">
        <div className="kana-detail-char" style={{ color: meta.color }}>
          {entry.character}
        </div>
        <div>
          <div className="kana-detail-romaji">{entry.romaji}</div>
          <div className="kana-detail-meta">
            {KANA_SCRIPT_LABEL[entry.script]} · {meta.shortLabel} · {entry.row}
          </div>
          <div className="kana-detail-badges">
            {entry.isCommonMistake && (
              <span className="kana-badge is-warn">
                <TriangleAlert size={12} /> Dễ nhầm khi đọc
              </span>
            )}
            {entry.isParticleException && (
              <span className="kana-badge is-particle">Trợ từ đọc khác</span>
            )}
          </div>
        </div>
      </div>

      {entry.isParticleException && (
        <div className="kana-inline-note">
          は / へ / を <strong>không phải 3 ký tự riêng biệt</strong>: chữ viết giữ nguyên, chỉ đổi cách đọc khi
          làm trợ từ trong câu.
        </div>
      )}

      {entry.notes && <p className="kana-detail-note">{entry.notes}</p>}

      {entry.examples && entry.examples.length > 0 && (
        <div className="kana-examples">
          <div className="kana-examples-title">Ví dụ</div>
          <ul>
            {entry.examples.map((example) => (
              <li key={`${entry.id}-${example.word}`}>
                <span className="kana-example-word">{example.word}</span>
                <span className="kana-example-reading">{example.reading}</span>
                <span className="kana-example-meaning">{example.meaning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="kana-detail-actions">
        <button type="button" className="btn btn-secondary" onClick={() => onPlay(entry)}>
          <Volume2 size={16} />
          <span>Nghe phát âm</span>
        </button>
        <button type="button" className="btn btn-primary" onClick={() => onPractice(entry)}>
          <PenLine size={16} />
          <span>Luyện viết chữ này</span>
        </button>
      </div>

      {audioNote && <div className="kana-audio-note">{audioNote}</div>}
    </div>
  );
};

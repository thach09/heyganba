import React from 'react';
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
      <aside className="bg-card p-7 text-[12.5px] leading-[1.8] text-fg-38">
        Bấm vào một chữ trong bảng để nghe phát âm và xem chi tiết.
      </aside>
    );
  }

  const meta = KANA_GROUP_META[entry.group];

  return (
    <aside className="bg-card p-7">
      <div className="flex items-start gap-5">
        <span className="font-serif text-[64px] font-light leading-none">{entry.character}</span>
        <div className="min-w-0 pt-1">
          <div className="text-[15px]">{entry.romaji}</div>
          <div className="mt-1 text-[11px] text-fg-38">
            {KANA_SCRIPT_LABEL[entry.script]} · {meta.shortLabel} · hàng {entry.row}
          </div>
          {(entry.isCommonMistake || entry.isParticleException) && (
            <div className="mt-3 flex flex-col gap-1 text-[11px] text-fg-60">
              {entry.isCommonMistake && <span>Dễ nhầm khi đọc</span>}
              {entry.isParticleException && <span>Trợ từ — đọc khác trong câu</span>}
            </div>
          )}
        </div>
      </div>

      {entry.isParticleException && (
        <p className="mt-5 text-[12.5px] leading-[1.8] text-fg-60">
          は / へ / を <strong className="text-fg">không phải 3 ký tự riêng biệt</strong>: chữ viết giữ nguyên,
          chỉ đổi cách đọc khi làm trợ từ trong câu.
        </p>
      )}

      {entry.notes && <p className="mt-4 text-[12.5px] leading-[1.8] text-fg-60">{entry.notes}</p>}

      {entry.examples && entry.examples.length > 0 && (
        <div className="mt-6">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-38">Ví dụ</div>
          <ul className="mt-3 flex flex-col gap-2.5">
            {entry.examples.map((example) => (
              <li key={`${entry.id}-${example.word}`} className="flex items-baseline gap-3">
                <span className="font-serif text-[17px]">{example.word}</span>
                <span className="text-[11.5px] text-fg-38">{example.reading}</span>
                <span className="text-[12.5px] text-fg-60">{example.meaning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-7 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => onPlay(entry)}
          className="cursor-pointer border border-rule-strong bg-transparent px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-fg transition-colors hover:bg-fg hover:text-bg"
        >
          Nghe phát âm
        </button>
        <button
          type="button"
          onClick={() => onPractice(entry)}
          className="cursor-pointer border border-fg bg-fg px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-bg transition-opacity hover:opacity-85"
        >
          Luyện viết chữ này
        </button>
      </div>

      {audioNote && <div className="mt-4 text-[11px] text-fg-38">{audioNote}</div>}
    </aside>
  );
};

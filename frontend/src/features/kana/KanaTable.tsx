import React from 'react';
import { KANA_GROUP_META, KANA_GROUP_ORDER, getKanaEntriesByGroup, getKanaRows } from './kanaData';
import type { KanaEntry, KanaGroupKey, KanaScript } from './kanaData';

interface KanaGroupTableProps {
  script: KanaScript;
  group: KanaGroupKey;
  selectedId: string | null;
  onSelect: (entry: KanaEntry) => void;
}

interface KanaTableProps {
  script: KanaScript;
  selectedId: string | null;
  onSelect: (entry: KanaEntry) => void;
}

/**
 * Kana chart as a grid: one block per group (gojuon, dakuten, yoon,
 * extended katakana, double characters), keeping the a-i-u-e-o columns.
 */
export const KanaTable: React.FC<KanaTableProps> = ({ script, selectedId, onSelect }) => (
  <div className="flex flex-col gap-14">
    {KANA_GROUP_ORDER[script].map((group) => (
      <KanaGroupTable
        key={`${script}-${group}`}
        script={script}
        group={group}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    ))}
  </div>
);

const KanaGroupTable: React.FC<KanaGroupTableProps> = ({ script, group, selectedId, onSelect }) => {
  const meta = KANA_GROUP_META[group];
  const rows = getKanaRows(script, group);
  const entries = getKanaEntriesByGroup(script, group);

  return (
    <section>
      <div className="flex items-baseline justify-between gap-6">
        <div>
          <h3 className="text-[13px] font-semibold">{meta.label}</h3>
          <p className="mt-1 text-[12px] text-fg-38">{meta.description}</p>
        </div>
        <span className="shrink-0 text-[11px] text-fg-38">{entries.length} ký tự</span>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {rows.map((rowDef) => (
          <div className="flex gap-2" key={`${script}-${group}-${rowDef.row}`}>
            <span className="w-12 shrink-0 pt-1.5 text-right text-[10px] leading-[1.35] text-fg-38">
              {rowDef.row}
            </span>
            {rowDef.cells.map((cell, index) => {
              const entry = cell ? entries.find((item) => item.character === cell[0]) : undefined;
              if (!entry) {
                return <span className="flex-1" key={`${rowDef.row}-${index}`} aria-hidden="true" />;
              }

              const isSelected = entry.id === selectedId;
              const needsAttention = entry.isCommonMistake || entry.isParticleException;

              return (
                <button
                  key={entry.id}
                  type="button"
                  className={`relative flex-1 cursor-pointer px-1 py-2 text-center transition-colors ${
                    isSelected ? 'bg-card' : 'bg-transparent hover:bg-tint'
                  }`}
                  onClick={() => onSelect(entry)}
                  title={`${entry.character} — ${entry.romaji} (bấm để nghe phát âm)`}
                >
                  {needsAttention && (
                    <span
                      aria-hidden="true"
                      className="absolute right-1.5 top-1.5 h-[3px] w-[3px] bg-fg opacity-60"
                    />
                  )}
                  <span className="block font-serif text-[clamp(20px,2.4vw,26px)] font-light leading-none">
                    {entry.character}
                  </span>
                  <span className={`mt-1.5 block text-[10.5px] ${isSelected ? 'text-fg-60' : 'text-fg-38'}`}>
                    {entry.romaji}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
};

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
 * Bảng kana dạng grid, mỗi nhóm (Gojūon / Dakuten / Handakuten / Yōon /
 * Katakana mở rộng / Ký tự đôi) là một bảng riêng, giữ đúng cột a-i-u-e-o.
 */
export const KanaTable: React.FC<KanaTableProps> = ({ script, selectedId, onSelect }) => (
  <div>
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
    <section className="kana-section">
      <div className="kana-section-head">
        <div>
          <h3 className="kana-section-title">
            <span className="kana-section-dot" style={{ background: meta.color }} />
            <span>{meta.label}</span>
          </h3>
          <p className="kana-section-desc">{meta.description}</p>
        </div>
        <span className="kana-count-badge" style={{ background: `${meta.color}22`, color: meta.color }}>
          {entries.length} ký tự
        </span>
      </div>

      <div className="kana-rows">
        {rows.map((rowDef) => (
          <div className="kana-row" key={`${script}-${group}-${rowDef.row}`}>
            <span className="kana-row-label">{rowDef.row}</span>
            {rowDef.cells.map((cell, index) => {
              const entry = cell ? entries.find((item) => item.character === cell[0]) : undefined;
              if (!entry) {
                return <span className="kana-cell is-spacer" key={`${rowDef.row}-${index}`} aria-hidden="true" />;
              }

              const classNames = ['kana-cell'];
              if (entry.id === selectedId) classNames.push('is-active');
              if (entry.isCommonMistake) classNames.push('is-mistake');
              if (entry.isParticleException) classNames.push('is-particle');

              return (
                <button
                  key={entry.id}
                  type="button"
                  className={classNames.join(' ')}
                  onClick={() => onSelect(entry)}
                  title={`${entry.character} — ${entry.romaji} (bấm để nghe phát âm)`}
                >
                  <span className="kana-cell-char">{entry.character}</span>
                  <span className="kana-cell-romaji">{entry.romaji}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
};

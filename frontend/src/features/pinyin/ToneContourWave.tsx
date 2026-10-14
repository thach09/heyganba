import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { TONES } from './pinyinData';
import { speakChinese } from '../../services/chineseSpeech';

export const ToneContourWave: React.FC = () => {
  const [selectedToneIndex, setSelectedToneIndex] = useState(0);
  const selectedTone = TONES[selectedToneIndex];

  const handlePlay = (text: string) => {
    speakChinese(text);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="border border-rule bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-4">
          <div>
            <h3 className="font-serif text-lg font-semibold text-fg">
              Biểu đồ cao độ Thanh điệu (声调调值图)
            </h3>
            <p className="mt-1 text-xs text-fg-60">
              Tiếng Hán phổ thông có 4 thanh điệu chính và 1 thanh nhẹ, phân bố theo thang 5 bậc âm vực (1 - 5).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {TONES.map((tone, idx) => {
              const isSelected = idx === selectedToneIndex;
              return (
                <button
                  key={tone.toneNumber}
                  type="button"
                  onClick={() => {
                    setSelectedToneIndex(idx);
                    handlePlay(tone.example);
                  }}
                  className={`cursor-pointer px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? 'border border-cinnabar bg-cinnabar text-white shadow-sm'
                      : 'border border-rule bg-tint text-fg hover:border-rule-strong'
                  }`}
                >
                  {tone.nameVi.split(' ')[0]} {tone.pitchCurve !== '·' ? `(${tone.pitchCurve})` : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* SVG Pitch Graph and Details Grid */}
        <div className="mt-6 grid grid-cols-1 items-center gap-8 md:grid-cols-2">
          {/* SVG Pitch Coordinate Canvas */}
          <div className="relative flex flex-col items-center justify-center rounded border border-rule/50 bg-bg p-4">
            <div className="absolute left-4 top-3 text-[11px] font-mono font-medium text-fg-38">
              Thang cao độ (Pitch 1-5)
            </div>

            <svg
              viewBox="0 0 280 220"
              className="h-56 w-full max-w-[320px] overflow-visible"
              aria-label="Tone Pitch Contour"
            >
              {/* Background Grid Lines: Levels 5 down to 1 */}
              {[
                { level: 5, y: 30, label: '5 (Cao)' },
                { level: 4, y: 72, label: '4 (Nửa cao)' },
                { level: 3, y: 115, label: '3 (Trung bình)' },
                { level: 2, y: 157, label: '2 (Nửa thấp)' },
                { level: 1, y: 200, label: '1 (Thấp)' },
              ].map((grid) => (
                <g key={grid.level}>
                  <line
                    x1="45"
                    y1={grid.y}
                    x2="260"
                    y2={grid.y}
                    stroke="currentColor"
                    className="text-rule"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x="35"
                    y={grid.y + 4}
                    textAnchor="end"
                    className="fill-fg-38 font-mono text-[11px]"
                  >
                    {grid.level}
                  </text>
                </g>
              ))}

              {/* Inactive tone contour lines (ghost paths) */}
              {TONES.map((t, i) => {
                if (i === selectedToneIndex) return null;
                return (
                  <path
                    key={`ghost-${t.toneNumber}`}
                    d={t.svgPath}
                    fill="none"
                    stroke="currentColor"
                    className="text-fg-38/20 transition-opacity"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Active Tone Contour Path */}
              {selectedTone.pitchCurve === '·' ? (
                <circle
                  cx="150"
                  cy="115"
                  r="7"
                  className="fill-cinnabar animate-pulse"
                />
              ) : (
                <path
                  d={selectedTone.svgPath}
                  fill="none"
                  stroke="#E11D48"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300 filter drop-shadow-[0_2px_6px_rgba(225,29,72,0.35)]"
                />
              )}

              {/* Start and End Dots for active tone */}
              {selectedTone.toneNumber === 1 && (
                <>
                  <circle cx="30" cy="30" r="5" fill="#E11D48" />
                  <circle cx="210" cy="30" r="5" fill="#E11D48" />
                </>
              )}
              {selectedTone.toneNumber === 2 && (
                <>
                  <circle cx="30" cy="110" r="5" fill="#E11D48" />
                  <circle cx="210" cy="30" r="5" fill="#E11D48" />
                </>
              )}
              {selectedTone.toneNumber === 3 && (
                <>
                  <circle cx="30" cy="140" r="5" fill="#E11D48" />
                  <circle cx="120" cy="200" r="5" fill="#E11D48" />
                  <circle cx="210" cy="70" r="5" fill="#E11D48" />
                </>
              )}
              {selectedTone.toneNumber === 4 && (
                <>
                  <circle cx="30" cy="30" r="5" fill="#E11D48" />
                  <circle cx="210" cy="200" r="5" fill="#E11D48" />
                </>
              )}
            </svg>

            <div className="mt-2 text-center text-xs text-fg-38">
              Đường lượn cao độ: <span className="font-mono font-bold text-cinnabar">{selectedTone.pitchCurve}</span>
            </div>
          </div>

          {/* Active Tone Details Card */}
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block rounded-xs bg-cinnabar/10 px-2 py-0.5 text-[11px] font-semibold text-cinnabar">
                  {selectedTone.nameZh}
                </span>
                <h4 className="mt-1 font-serif text-xl font-bold text-fg">
                  {selectedTone.nameVi}
                </h4>
                <div className="font-mono text-sm text-fg-60">
                  Ký hiệu: <span className="font-bold text-fg">{selectedTone.symbol}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePlay(selectedTone.example)}
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-cinnabar/30 bg-cinnabar/10 text-cinnabar transition-all hover:scale-105 hover:bg-cinnabar hover:text-white"
                title={`Nghe phát âm mẫu: ${selectedTone.example}`}
                aria-label={`Nghe phát âm mẫu: ${selectedTone.example}`}
              >
                <Volume2 size={20} />
              </button>
            </div>

            <p className="text-[13px] leading-relaxed text-fg-60 border-l-2 border-cinnabar pl-3">
              {selectedTone.descriptionVi}
            </p>

            {/* Example Card */}
            <div className="mt-2 rounded border border-rule bg-tint p-4">
              <div className="text-[11px] uppercase tracking-wider text-fg-38">Ví dụ tiêu biểu</div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="font-serif text-3xl font-bold text-fg">
                  {selectedTone.hanzi}
                </span>
                <span className="font-mono text-lg font-semibold text-cinnabar">
                  {selectedTone.example}
                </span>
                <span className="text-sm text-fg-60">
                  ({selectedTone.meaning})
                </span>
              </div>
            </div>

            <div className="text-xs text-fg-38">
              <span className="font-serif font-semibold text-cinnabar">「诀」</span> Mẹo ghi nhớ: Thanh 1 giữ hơi ngang bằng và ngân đều; Thanh 4 dứt khoát như chặt chém; Thanh 3 nhấn xuống tận đáy cổ họng rồi mới nhấc lên.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

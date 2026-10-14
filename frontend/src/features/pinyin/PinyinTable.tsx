import React, { useState } from 'react';
import { Volume2, Info } from 'lucide-react';
import { INITIALS, FINALS, TONES, type PinyinItem, type ToneItem } from './pinyinData';
import { speakChinese } from '../../services/chineseSpeech';

type TableTab = 'INITIALS' | 'FINALS' | 'TONES';

export const PinyinTable: React.FC = () => {
  const [tab, setTab] = useState<TableTab>('INITIALS');
  const [selectedInitial, setSelectedInitial] = useState<PinyinItem>(INITIALS[0]);
  const [selectedFinal, setSelectedFinal] = useState<PinyinItem>(FINALS[0]);
  const [selectedTone, setSelectedTone] = useState<ToneItem>(TONES[0]);

  const handlePlay = (text: string) => {
    speakChinese(text);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Category Tabs */}
      <div className="flex border-b border-rule">
        <button
          type="button"
          onClick={() => setTab('INITIALS')}
          className={`cursor-pointer px-5 py-2.5 font-serif text-sm font-semibold transition-colors ${
            tab === 'INITIALS'
              ? 'border-b-2 border-cinnabar text-cinnabar'
              : 'text-fg-60 hover:text-fg'
          }`}
        >
          21 Thanh mẫu (声母 - Initials)
        </button>
        <button
          type="button"
          onClick={() => setTab('FINALS')}
          className={`cursor-pointer px-5 py-2.5 font-serif text-sm font-semibold transition-colors ${
            tab === 'FINALS'
              ? 'border-b-2 border-cinnabar text-cinnabar'
              : 'text-fg-60 hover:text-fg'
          }`}
        >
          36 Vận mẫu (韵母 - Finals)
        </button>
        <button
          type="button"
          onClick={() => setTab('TONES')}
          className={`cursor-pointer px-5 py-2.5 font-serif text-sm font-semibold transition-colors ${
            tab === 'TONES'
              ? 'border-b-2 border-cinnabar text-cinnabar'
              : 'text-fg-60 hover:text-fg'
          }`}
        >
          Thanh điệu (声调 - 4 Tones)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Grid: 2 columns on desktop */}
        <div className="lg:col-span-2">
          {tab === 'INITIALS' && (
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 md:grid-cols-7">
              {INITIALS.map((item) => {
                const isSelected = selectedInitial.pinyin === item.pinyin;
                return (
                  <button
                    key={item.pinyin}
                    type="button"
                    onClick={() => {
                      setSelectedInitial(item);
                      handlePlay(item.exampleWord);
                    }}
                    className={`group relative flex flex-col items-center justify-center rounded border p-3 text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cinnabar bg-cinnabar/10 shadow-sm'
                        : 'border-rule bg-card hover:border-rule-strong hover:bg-tint'
                    }`}
                  >
                    <span className="font-mono text-xl font-bold text-fg group-hover:text-cinnabar">
                      {item.pinyin}
                    </span>
                    {item.ipa && (
                      <span className="mt-0.5 text-[10px] font-mono text-fg-38">
                        {item.ipa}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'FINALS' && (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
              {FINALS.map((item) => {
                const isSelected = selectedFinal.pinyin === item.pinyin;
                return (
                  <button
                    key={item.pinyin}
                    type="button"
                    onClick={() => {
                      setSelectedFinal(item);
                      handlePlay(item.exampleWord);
                    }}
                    className={`group relative flex flex-col items-center justify-center rounded border p-3 text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cinnabar bg-cinnabar/10 shadow-sm'
                        : 'border-rule bg-card hover:border-rule-strong hover:bg-tint'
                    }`}
                  >
                    <span className="font-mono text-lg font-bold text-fg group-hover:text-cinnabar">
                      {item.pinyin}
                    </span>
                    <span className="mt-0.5 text-[10px] text-fg-38 truncate max-w-full">
                      {item.exampleHanzi} ({item.exampleWord})
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'TONES' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {TONES.map((t) => {
                const isSelected = selectedTone.toneNumber === t.toneNumber;
                return (
                  <button
                    key={t.toneNumber}
                    type="button"
                    onClick={() => {
                      setSelectedTone(t);
                      handlePlay(t.example);
                    }}
                    className={`flex flex-col items-start rounded border p-4 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cinnabar bg-cinnabar/10 shadow-sm'
                        : 'border-rule bg-card hover:border-rule-strong hover:bg-tint'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-mono text-xl font-bold text-cinnabar">
                        {t.symbol}
                      </span>
                      <span className="font-mono text-xs rounded bg-rule/50 px-1.5 py-0.5 text-fg-60">
                        {t.pitchCurve}
                      </span>
                    </div>
                    <div className="mt-2 font-serif text-sm font-semibold text-fg">
                      {t.nameVi}
                    </div>
                    <div className="mt-1 text-xs text-fg-38">
                      {t.example} · {t.hanzi} ({t.meaning})
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Inspector Drawer / Card */}
        <div className="flex flex-col rounded border border-rule bg-card p-5">
          <div className="flex items-center gap-2 border-b border-rule pb-3 text-fg-38">
            <Info size={16} />
            <span className="text-xs uppercase tracking-wider font-semibold">
              Chi tiết phát âm & Hướng dẫn
            </span>
          </div>

          {tab === 'INITIALS' && (
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-3xl font-bold text-cinnabar">
                    {selectedInitial.pinyin}
                  </div>
                  <div className="text-xs text-fg-38 font-mono">
                    Phiên âm quốc tế: {selectedInitial.ipa}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handlePlay(selectedInitial.exampleWord)}
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-cinnabar/30 bg-cinnabar/10 text-cinnabar hover:bg-cinnabar hover:text-white transition-colors"
                  title="Nghe phát âm"
                >
                  <Volume2 size={18} />
                </button>
              </div>

              <div className="rounded border border-rule/60 bg-tint p-3 text-xs leading-relaxed text-fg">
                <span className="font-semibold text-cinnabar">Cách phát âm: </span>
                {selectedInitial.vietnameseGuide}
              </div>

              <div className="flex flex-col gap-1 border-t border-rule pt-3">
                <span className="text-[11px] uppercase tracking-wider text-fg-38">Từ vựng mẫu</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-2xl font-bold text-fg">{selectedInitial.exampleHanzi}</span>
                  <span className="font-mono text-sm font-semibold text-cinnabar">{selectedInitial.exampleWord}</span>
                  <span className="text-xs text-fg-60">({selectedInitial.exampleMeaning})</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'FINALS' && (
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-3xl font-bold text-cinnabar">
                    {selectedFinal.pinyin}
                  </div>
                  <div className="text-xs text-fg-38">
                    {selectedFinal.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handlePlay(selectedFinal.exampleWord)}
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-cinnabar/30 bg-cinnabar/10 text-cinnabar hover:bg-cinnabar hover:text-white transition-colors"
                  title="Nghe phát âm"
                >
                  <Volume2 size={18} />
                </button>
              </div>

              <div className="rounded border border-rule/60 bg-tint p-3 text-xs leading-relaxed text-fg">
                <span className="font-semibold text-cinnabar">Khẩu hình & Âm vị: </span>
                {selectedFinal.vietnameseGuide}
              </div>

              <div className="flex flex-col gap-1 border-t border-rule pt-3">
                <span className="text-[11px] uppercase tracking-wider text-fg-38">Từ vựng ví dụ</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-2xl font-bold text-fg">{selectedFinal.exampleHanzi}</span>
                  <span className="font-mono text-sm font-semibold text-cinnabar">{selectedFinal.exampleWord}</span>
                  <span className="text-xs text-fg-60">({selectedFinal.exampleMeaning})</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'TONES' && (
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-3xl font-bold text-cinnabar">
                    {selectedTone.symbol}
                  </div>
                  <div className="text-xs font-semibold text-fg">
                    {selectedTone.nameVi} · {selectedTone.nameZh}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handlePlay(selectedTone.example)}
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-cinnabar/30 bg-cinnabar/10 text-cinnabar hover:bg-cinnabar hover:text-white transition-colors"
                  title="Nghe phát âm"
                >
                  <Volume2 size={18} />
                </button>
              </div>

              <div className="rounded border border-rule/60 bg-tint p-3 text-xs leading-relaxed text-fg">
                <span className="font-semibold text-cinnabar">Quy luật cao độ: </span>
                {selectedTone.descriptionVi}
              </div>

              <div className="flex flex-col gap-1 border-t border-rule pt-3">
                <span className="text-[11px] uppercase tracking-wider text-fg-38">Ví dụ minh họa</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-2xl font-bold text-fg">{selectedTone.hanzi}</span>
                  <span className="font-mono text-sm font-semibold text-cinnabar">{selectedTone.example}</span>
                  <span className="text-xs text-fg-60">({selectedTone.meaning})</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

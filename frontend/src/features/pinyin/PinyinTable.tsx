import React, { useState, useEffect } from 'react';
import { Volume2, Info, AlertCircle, Filter, Sparkles, BookOpen } from 'lucide-react';
import {
  INITIALS,
  FINALS,
  TONES,
  SPELLING_RULES,
  TONE_SANDHI_RULES,
  CONFUSING_SOUND_PAIRS,
  type PinyinItem,
  type ToneItem,
} from './pinyinData';
import { speakChinese, stopChineseSpeech } from '../../services/chineseSpeech';

type TableTab = 'INITIALS' | 'FINALS' | 'TONES' | 'RULES' | 'PAIRS';

export const PinyinTable: React.FC = () => {
  const [tab, setTab] = useState<TableTab>('INITIALS');
  const [selectedInitial, setSelectedInitial] = useState<PinyinItem>(INITIALS[0]);
  const [selectedFinal, setSelectedFinal] = useState<PinyinItem>(FINALS[0]);
  const [selectedTone, setSelectedTone] = useState<ToneItem>(TONES[0]);

  // Group filter states
  const [initialFilter, setInitialFilter] = useState<string>('ALL');
  const [finalFilter, setFinalFilter] = useState<string>('ALL');
  const [audioWarning, setAudioWarning] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopChineseSpeech();
    };
  }, []);

  const handlePlay = (voiceText: string) => {
    stopChineseSpeech();
    const result = speakChinese(voiceText);
    if (result === 'no-voice') {
      setAudioWarning('Thiết bị chưa có giọng Quan thoại (zh-CN). Vui lòng kiểm tra cài đặt âm thanh hệ thống.');
    } else if (result === 'unsupported' || result === 'error') {
      setAudioWarning('Trình duyệt chưa hỗ trợ phát âm thanh này.');
    } else {
      setAudioWarning(null);
    }
  };

  const filteredInitials = initialFilter === 'ALL'
    ? INITIALS
    : INITIALS.filter((i) => i.group === initialFilter);

  const filteredFinals = finalFilter === 'ALL'
    ? FINALS
    : FINALS.filter((f) => f.group === finalFilter);

  const initialGroups = ['ALL', ...Array.from(new Set(INITIALS.map((i) => i.group)))];
  const finalGroups = ['ALL', ...Array.from(new Set(FINALS.map((f) => f.group)))];

  return (
    <div className="flex flex-col gap-6">
      {/* Category Tabs */}
      <div className="flex flex-wrap border-b border-rule gap-1">
        <button
          type="button"
          onClick={() => {
            setTab('INITIALS');
            setAudioWarning(null);
          }}
          className={`cursor-pointer px-4 py-2.5 font-serif text-sm font-semibold transition-colors ${
            tab === 'INITIALS'
              ? 'border-b-2 border-cinnabar text-cinnabar-ink'
              : 'text-fg-60 hover:text-fg'
          }`}
        >
          21+2 Thanh mẫu (Initials & Bán âm)
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('FINALS');
            setAudioWarning(null);
          }}
          className={`cursor-pointer px-4 py-2.5 font-serif text-sm font-semibold transition-colors ${
            tab === 'FINALS'
              ? 'border-b-2 border-cinnabar text-cinnabar-ink'
              : 'text-fg-60 hover:text-fg'
          }`}
        >
          36 Vận mẫu (Finals)
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('TONES');
            setAudioWarning(null);
          }}
          className={`cursor-pointer px-4 py-2.5 font-serif text-sm font-semibold transition-colors ${
            tab === 'TONES'
              ? 'border-b-2 border-cinnabar text-cinnabar-ink'
              : 'text-fg-60 hover:text-fg'
          }`}
        >
          4+1 Thanh điệu (Tones)
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('PAIRS');
            setAudioWarning(null);
          }}
          className={`cursor-pointer px-4 py-2.5 font-serif text-sm font-semibold transition-colors ${
            tab === 'PAIRS'
              ? 'border-b-2 border-cinnabar text-cinnabar-ink'
              : 'text-fg-60 hover:text-fg'
          }`}
        >
          Cặp âm dễ nhầm (Mẹo)
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('RULES');
            setAudioWarning(null);
          }}
          className={`cursor-pointer px-4 py-2.5 font-serif text-sm font-semibold transition-colors ${
            tab === 'RULES'
              ? 'border-b-2 border-cinnabar text-cinnabar-ink'
              : 'text-fg-60 hover:text-fg'
          }`}
        >
          Quy tắc chính tả & Biến điệu
        </button>
      </div>

      {/* Audio Voice Warning */}
      {audioWarning && (
        <div className="flex items-center gap-2 rounded bg-gold/10 border border-gold/20 px-4 py-2.5 text-xs text-gold-ink">
          <AlertCircle size={15} className="shrink-0" />
          <span>{audioWarning}</span>
        </div>
      )}

      {/* Sub-Filters for Initials & Finals */}
      {tab === 'INITIALS' && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="flex items-center gap-1 text-fg-38 mr-1">
            <Filter size={13} /> Phân loại:
          </span>
          {initialGroups.map((grp) => (
            <button
              key={grp}
              type="button"
              onClick={() => setInitialFilter(grp)}
              className={`cursor-pointer rounded px-2.5 py-1 text-xs transition-colors ${
                initialFilter === grp
                  ? 'bg-cinnabar text-on-accent font-medium'
                  : 'bg-card border border-rule text-fg-60 hover:text-fg'
              }`}
            >
              {grp === 'ALL' ? 'Tất cả' : grp}
            </button>
          ))}
        </div>
      )}

      {tab === 'FINALS' && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="flex items-center gap-1 text-fg-38 mr-1">
            <Filter size={13} /> Nhóm vận mẫu:
          </span>
          {finalGroups.map((grp) => (
            <button
              key={grp}
              type="button"
              onClick={() => setFinalFilter(grp)}
              className={`cursor-pointer rounded px-2.5 py-1 text-xs transition-colors ${
                finalFilter === grp
                  ? 'bg-cinnabar text-on-accent font-medium'
                  : 'bg-card border border-rule text-fg-60 hover:text-fg'
              }`}
            >
              {grp === 'ALL' ? 'Tất cả (36)' : grp}
            </button>
          ))}
        </div>
      )}

      {/* Main Grid View */}
      {(tab === 'INITIALS' || tab === 'FINALS' || tab === 'TONES') && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Selection Grid */}
          <div className="lg:col-span-2">
            {tab === 'INITIALS' && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {filteredInitials.map((item) => {
                  const isSelected = selectedInitial.pinyin === item.pinyin;
                  return (
                    <button
                      key={item.pinyin}
                      type="button"
                      onClick={() => {
                        setSelectedInitial(item);
                        handlePlay(item.hanziVoice);
                      }}
                      className={`group relative flex flex-col items-center justify-center rounded border p-3 text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-cinnabar bg-cinnabar/10 '
                          : 'border-rule bg-card hover:border-rule-strong hover:bg-tint'
                      }`}
                    >
                      <span className="font-sans text-xl font-bold text-fg group-hover:text-cinnabar-ink">
                        {item.pinyin}
                      </span>
                      {item.ipa && (
                        <span className="mt-0.5 text-[10px] font-sans text-fg-38">
                          {item.ipa}
                        </span>
                      )}
                      <span className="mt-1 text-[11px] text-fg-60 truncate max-w-full">
                        {item.exampleHanzi}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {tab === 'FINALS' && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {filteredFinals.map((item) => {
                  const isSelected = selectedFinal.pinyin === item.pinyin;
                  return (
                    <button
                      key={item.pinyin}
                      type="button"
                      onClick={() => {
                        setSelectedFinal(item);
                        handlePlay(item.hanziVoice);
                      }}
                      className={`group relative flex flex-col items-center justify-center rounded border p-3 text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-cinnabar bg-cinnabar/10 '
                          : 'border-rule bg-card hover:border-rule-strong hover:bg-tint'
                      }`}
                    >
                      <span className="font-sans text-lg font-bold text-fg group-hover:text-cinnabar-ink">
                        {item.pinyin}
                      </span>
                      {item.ipa && (
                        <span className="text-[10px] font-sans text-fg-38">
                          {item.ipa}
                        </span>
                      )}
                      <span className="mt-1 text-[11px] text-fg-60 truncate max-w-full">
                        {item.exampleHanzi} ({item.exampleWord})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {tab === 'TONES' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {TONES.map((t) => {
                  const isSelected = selectedTone.toneNumber === t.toneNumber;
                  return (
                    <button
                      key={t.toneNumber}
                      type="button"
                      onClick={() => {
                        setSelectedTone(t);
                        handlePlay(t.hanzi);
                      }}
                      className={`flex flex-col items-start rounded border p-4 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-cinnabar bg-cinnabar/10 '
                          : 'border-rule bg-card hover:border-rule-strong hover:bg-tint'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-sans text-xl font-bold text-cinnabar-ink">
                          {t.symbol}
                        </span>
                        <span className="font-sans text-xs rounded bg-rule/50 px-2 py-0.5 text-fg-60">
                          {t.pitchCurve}
                        </span>
                      </div>
                      <div className="mt-2 font-serif text-sm font-semibold text-fg">
                        {t.nameVi} · {t.nameZh}
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
                    <div className="font-sans text-3xl font-bold text-cinnabar-ink">
                      {selectedInitial.pinyin}
                    </div>
                    <div className="text-xs text-fg-38 font-sans">
                      IPA: {selectedInitial.ipa} · Nhóm: {selectedInitial.group}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePlay(selectedInitial.hanziVoice)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-cinnabar/40 bg-cinnabar/10 px-3 py-1 text-xs font-semibold text-cinnabar-ink hover:bg-cinnabar hover:text-on-accent transition-colors cursor-pointer"
                      title="Nghe âm tiết quy ước của thanh mẫu kèm nguyên âm"
                    >
                      <Volume2 size={14} /> Nghe âm tiết quy ước ({selectedInitial.hanziVoice})
                    </button>
                    <span className="text-[10px] text-fg-38">*Âm quy ước 呼读音, không phải phụ âm đứng riêng</span>
                  </div>
                </div>

                <div className="rounded border border-rule/60 bg-tint p-3 text-xs leading-relaxed text-fg">
                  <span className="font-semibold text-cinnabar-ink">Khẩu hình: </span>
                  {selectedInitial.vietnameseGuide}
                </div>

                {selectedInitial.commonMistakeVi && (
                  <div className="rounded border border-gold/20 bg-gold/10 p-3 text-xs leading-relaxed text-gold-ink">
                    <span className="font-semibold">Lưu ý cho người Việt: </span>
                    {selectedInitial.commonMistakeVi}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-rule pt-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wider text-fg-38">Ví dụ tiêu biểu</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-2xl font-bold text-fg">{selectedInitial.exampleHanzi}</span>
                      <span className="font-sans text-sm font-semibold text-cinnabar-ink">{selectedInitial.exampleWord}</span>
                      <span className="text-xs text-fg-60">({selectedInitial.exampleMeaning})</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePlay(selectedInitial.exampleHanzi)}
                    className="inline-flex items-center gap-1 rounded border border-rule px-2.5 py-1 text-xs text-fg hover:border-cinnabar hover:text-cinnabar-ink transition-colors cursor-pointer"
                    title={`Nghe từ ví dụ: ${selectedInitial.exampleWord}`}
                  >
                    <Volume2 size={13} /> Nghe từ ví dụ
                  </button>
                </div>
              </div>
            )}

            {tab === 'FINALS' && (
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-sans text-3xl font-bold text-cinnabar-ink">
                      {selectedFinal.pinyin}
                    </div>
                    <div className="text-xs text-fg-38 font-sans">
                      IPA: {selectedFinal.ipa} · {selectedFinal.group}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePlay(selectedFinal.hanziVoice)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-cinnabar/40 bg-cinnabar/10 px-3 py-1 text-xs font-semibold text-cinnabar-ink hover:bg-cinnabar hover:text-on-accent transition-colors cursor-pointer"
                    title={`Nghe âm vận mẫu đại diện: ${selectedFinal.hanziVoice}`}
                  >
                    <Volume2 size={14} /> Nghe âm đại diện ({selectedFinal.hanziVoice})
                  </button>
                </div>

                <div className="rounded border border-rule/60 bg-tint p-3 text-xs leading-relaxed text-fg">
                  <span className="font-semibold text-cinnabar-ink">Cách ghép vần: </span>
                  {selectedFinal.vietnameseGuide}
                </div>

                {selectedFinal.commonMistakeVi && (
                  <div className="rounded border border-gold/20 bg-gold/10 p-3 text-xs leading-relaxed text-gold-ink">
                    <span className="font-semibold">Lưu ý: </span>
                    {selectedFinal.commonMistakeVi}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-rule pt-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wider text-fg-38">Từ vựng ví dụ</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-2xl font-bold text-fg">{selectedFinal.exampleHanzi}</span>
                      <span className="font-sans text-sm font-semibold text-cinnabar-ink">{selectedFinal.exampleWord}</span>
                      <span className="text-xs text-fg-60">({selectedFinal.exampleMeaning})</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePlay(selectedFinal.exampleHanzi)}
                    className="inline-flex items-center gap-1 rounded border border-rule px-2.5 py-1 text-xs text-fg hover:border-cinnabar hover:text-cinnabar-ink transition-colors cursor-pointer"
                    title={`Nghe từ ví dụ: ${selectedFinal.exampleWord}`}
                  >
                    <Volume2 size={13} /> Nghe từ ví dụ
                  </button>
                </div>
              </div>
            )}

            {tab === 'TONES' && (
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-sans text-3xl font-bold text-cinnabar-ink">
                      {selectedTone.symbol}
                    </div>
                    <div className="text-xs font-semibold text-fg">
                      {selectedTone.nameVi} · {selectedTone.nameZh}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePlay(selectedTone.hanzi)}
                    className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-cinnabar/30 bg-cinnabar/10 text-cinnabar-ink hover:bg-cinnabar hover:text-on-accent transition-colors"
                    title={`Nghe phát âm: ${selectedTone.example}`}
                    aria-label={`Nghe phát âm: ${selectedTone.example}`}
                  >
                    <Volume2 size={18} />
                  </button>
                </div>

                <div className="rounded border border-rule/60 bg-tint p-3 text-xs leading-relaxed text-fg">
                  <span className="font-semibold text-cinnabar-ink">Quy luật cao độ: </span>
                  {selectedTone.descriptionVi}
                </div>

                <div className="rounded border border-gold/20 bg-gold/10 p-3 text-xs leading-relaxed text-gold-ink">
                  <span className="font-semibold">Gợi ý gần đúng: </span>
                  {selectedTone.guidelineVi}
                </div>

                <div className="flex flex-col gap-1 border-t border-rule pt-3">
                  <span className="text-[11px] uppercase tracking-wider text-fg-38">Ví dụ tiêu biểu</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-2xl font-bold text-fg">{selectedTone.hanzi}</span>
                    <span className="font-sans text-sm font-semibold text-cinnabar-ink">{selectedTone.example}</span>
                    <span className="text-xs text-fg-60">({selectedTone.meaning})</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confusing Sound Pairs Tab */}
      {tab === 'PAIRS' && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {CONFUSING_SOUND_PAIRS.map((pair) => (
            <div key={pair.id} className="rounded border border-rule bg-card p-5 flex flex-col gap-3">
              <h4 className="font-serif text-base font-bold text-cinnabar-ink flex items-center gap-2">
                <Sparkles size={16} /> {pair.title}
              </h4>
              <p className="text-xs text-fg-60 leading-relaxed">
                {pair.descriptionVi}
              </p>

              <div className="grid grid-cols-2 gap-3 mt-1">
                <div className="rounded border border-rule/60 bg-tint p-3 flex flex-col items-center text-center">
                  <span className="font-sans text-lg font-bold text-fg">{pair.soundA.pinyin}</span>
                  <span className="font-serif text-xl font-bold text-cinnabar-ink mt-1">{pair.soundA.hanzi}</span>
                  <span className="text-[11px] text-fg-38 mt-1">{pair.soundA.note}</span>
                  <button
                    type="button"
                    onClick={() => handlePlay(pair.soundA.hanzi.slice(0, 1))}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-cinnabar-ink hover:underline cursor-pointer"
                  >
                    <Volume2 size={13} /> Nghe âm A
                  </button>
                </div>

                <div className="rounded border border-rule/60 bg-tint p-3 flex flex-col items-center text-center">
                  <span className="font-sans text-lg font-bold text-fg">{pair.soundB.pinyin}</span>
                  <span className="font-serif text-xl font-bold text-cinnabar-ink mt-1">{pair.soundB.hanzi}</span>
                  <span className="text-[11px] text-fg-38 mt-1">{pair.soundB.note}</span>
                  <button
                    type="button"
                    onClick={() => handlePlay(pair.soundB.hanzi.slice(0, 1))}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-cinnabar-ink hover:underline cursor-pointer"
                  >
                    <Volume2 size={13} /> Nghe âm B
                  </button>
                </div>
              </div>

              <div className="mt-1 rounded bg-cinnabar/5 border border-cinnabar/20 p-2.5 text-xs text-fg-60">
                <span className="font-semibold text-cinnabar-ink">Mẹo thực tế: </span>
                {pair.contrastExplanation}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rules Tab: Spelling & Tone Sandhi */}
      {tab === 'RULES' && (
        <div className="flex flex-col gap-6">
          {/* Spelling Rules */}
          <div>
            <h4 className="font-serif text-base font-bold text-fg mb-3 flex items-center gap-2">
              <BookOpen size={16} className="text-cinnabar-ink" /> Quy tắc viết Pinyin quan trọng
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {SPELLING_RULES.map((r) => (
                <div key={r.id} className="rounded border border-rule bg-card p-4 flex flex-col gap-2.5">
                  <h5 className="font-serif text-sm font-semibold text-cinnabar-ink">{r.title}</h5>
                  <p className="text-xs text-fg-60 leading-relaxed font-medium">{r.summary}</p>
                  <ul className="text-[11px] text-fg-38 list-disc list-inside space-y-1">
                    {r.details.map((d, idx) => (
                      <li key={idx}>{d}</li>
                    ))}
                  </ul>
                  <div className="mt-auto border-t border-rule pt-2 flex flex-col gap-1 text-xs">
                    <span className="text-[10px] uppercase text-fg-38 font-sans">Ví dụ:</span>
                    {r.examples.map((ex, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <span className="text-fg-60">{ex.original} → <b className="text-fg">{ex.written}</b></span>
                        <span className="font-serif text-cinnabar-ink">{ex.hanzi} ({ex.meaning})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tone Sandhi Rules */}
          <div className="border-t border-rule pt-5">
            <h4 className="font-serif text-base font-bold text-fg mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-cinnabar-ink" /> Quy tắc biến điệu thiết yếu (Tone Sandhi)
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {TONE_SANDHI_RULES.map((sr) => (
                <div key={sr.id} className="rounded border border-rule bg-card p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="font-serif text-sm font-semibold text-cinnabar-ink">{sr.title}</h5>
                  </div>
                  <div className="rounded bg-cinnabar/10 px-2.5 py-1 text-xs font-sans font-bold text-cinnabar-ink w-fit">
                    {sr.ruleFormula}
                  </div>
                  <p className="text-xs text-fg-60 leading-relaxed">{sr.explanationVi}</p>
                  <div className="mt-auto border-t border-rule pt-2 flex flex-col gap-1.5 text-xs">
                    <span className="text-[10px] uppercase text-fg-38 font-sans">Ví dụ biến điệu:</span>
                    {sr.examples.map((ex, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] bg-tint px-2 py-1 rounded">
                        <div>
                          <span className="line-through text-fg-38 mr-1.5">{ex.pinyinWritten}</span>
                          <span className="font-semibold text-cinnabar-ink">→ {ex.pinyinSpoken}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif text-fg">{ex.hanzi}</span>
                          <button
                            type="button"
                            onClick={() => handlePlay(ex.hanzi)}
                            className="text-cinnabar-ink hover:opacity-80 cursor-pointer"
                            title="Nghe phát âm"
                          >
                            <Volume2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

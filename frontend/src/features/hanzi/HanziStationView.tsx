import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, Play, RefreshCw, PenTool, CheckCircle, Search } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../app/useAuth';
import { useRequestScope } from '../../lib/hooks/useRequestScope';
import { hanziApi } from './api';
import type { HanziDto } from './types';
import { speakChinese } from '../../services/chineseSpeech';
import { RedSealStamp } from '../../components/RedSealStamp';
import { FloatingExpReward } from '../../components/FloatingExpReward';
import { progressApi } from '../progress/api';
import { StudyPetCompanion } from '../companion/StudyPetCompanion';
import { useCompanion } from '../companion/useCompanionStore';

// Fallback seed characters if backend list is empty or offline
const FALLBACK_HANZI: HanziDto[] = [
  { id: 1, character: '人', pinyin: 'rén', sinoVietnamese: 'Nhân', meaning: 'Người', radical: '人', strokeCount: 2, hskLevel: 1, decomposition: 'Hình dáng người đứng nghiêng', practiceCount: 0 },
  { id: 2, character: '口', pinyin: 'kǒu', sinoVietnamese: 'Khẩu', meaning: 'Miệng, mồm, nhân khẩu', radical: '口', strokeCount: 3, hskLevel: 1, decomposition: 'Hình dáng chiếc miệng mở ra', practiceCount: 0 },
  { id: 3, character: '日', pinyin: 'rì', sinoVietnamese: 'Nhật', meaning: 'Mặt trời, ngày', radical: '日', strokeCount: 4, hskLevel: 1, decomposition: 'Hình tròn mặt trời có chấm ở giữa', practiceCount: 0 },
  { id: 4, character: '月', pinyin: 'yuè', sinoVietnamese: 'Nguyệt', meaning: 'Mặt trăng, tháng', radical: '月', strokeCount: 4, hskLevel: 1, decomposition: 'Hình trăng lưỡi liềm khuyết', practiceCount: 0 },
  { id: 5, character: '水', pinyin: 'shuǐ', sinoVietnamese: 'Thủy', meaning: 'Nước', radical: '水', strokeCount: 4, hskLevel: 1, decomposition: 'Dòng nước chảy uốn lượn', practiceCount: 0 },
  { id: 6, character: '火', pinyin: 'huǒ', sinoVietnamese: 'Hỏa', meaning: 'Lửa', radical: '火', strokeCount: 4, hskLevel: 1, decomposition: 'Ngọn lửa bốc cháy bập bùng', practiceCount: 0 },
  { id: 7, character: '山', pinyin: 'shān', sinoVietnamese: 'Sơn', meaning: 'Núi non', radical: '山', strokeCount: 3, hskLevel: 1, decomposition: 'Ba ngọn núi nhô lên trùng điệp', practiceCount: 0 },
  { id: 8, character: '木', pinyin: 'mù', sinoVietnamese: 'Mộc', meaning: 'Cây cối, gỗ', radical: '木', strokeCount: 4, hskLevel: 1, decomposition: 'Cây có cành ở trên rễ ở dưới', practiceCount: 0 },
  { id: 9, character: '好', pinyin: 'hǎo', sinoVietnamese: 'Hảo', meaning: 'Tốt, đẹp, hay', radical: '女', strokeCount: 6, hskLevel: 1, decomposition: 'Bộ Nữ (女) đứng cạnh Tử (子)', practiceCount: 0 },
  { id: 10, character: '学', pinyin: 'xué', sinoVietnamese: 'Học', meaning: 'Học tập, bắt chước', radical: '子', strokeCount: 8, hskLevel: 1, decomposition: 'Học sinh ngồi dưới mái nhà học tập', practiceCount: 0 },
  { id: 11, character: '生', pinyin: 'shēng', sinoVietnamese: 'Sinh', meaning: 'Sinh sống, đẻ, học sinh', radical: '生', strokeCount: 5, hskLevel: 1, decomposition: 'Cây cỏ nảy mầm từ mặt đất', practiceCount: 0 },
  { id: 12, character: '中', pinyin: 'zhōng', sinoVietnamese: 'Trung', meaning: 'Ở giữa, trung tâm, Trung Quốc', radical: '丨', strokeCount: 4, hskLevel: 1, decomposition: 'Đường nét xẻ thẳng vào hồng tâm', practiceCount: 0 },
  { id: 13, character: '国', pinyin: 'guó', sinoVietnamese: 'Quốc', meaning: 'Đất nước, quốc gia', radical: '囗', strokeCount: 8, hskLevel: 1, decomposition: 'Bộ Vi (囗) bao bọc viên ngọc (玉)', practiceCount: 0 },
  { id: 14, character: '语', pinyin: 'yǔ', sinoVietnamese: 'Ngữ', meaning: 'Ngôn ngữ, lời nói', radical: '讠', strokeCount: 9, hskLevel: 1, decomposition: 'Bộ Ngôn (讠) ghép với Ngũ (五) và Khẩu (口)', practiceCount: 0 },
  { id: 15, character: '大', pinyin: 'dà', sinoVietnamese: 'Đại', meaning: 'To lớn, vĩ đại', radical: '大', strokeCount: 3, hskLevel: 1, decomposition: 'Người dang rộng hai tay hai chân', practiceCount: 0 },
  { id: 16, character: '小', pinyin: 'xiǎo', sinoVietnamese: 'Tiểu', meaning: 'Nhỏ bé, bé nhỏ', radical: '小', strokeCount: 3, hskLevel: 1, decomposition: 'Vật bị chia nhỏ làm đôi', practiceCount: 0 },
];

type PracticeMode = 'ANIMATE' | 'QUIZ';

export const HanziStationView: React.FC = () => {
  const { user } = useAuth();
  const { run } = useRequestScope(user?.userId);

  const [characters, setCharacters] = useState<HanziDto[]>(FALLBACK_HANZI);
  const [selectedChar, setSelectedChar] = useState<HanziDto>(FALLBACK_HANZI[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hskFilter, setHskFilter] = useState<number>(1);
  const [mode, setMode] = useState<PracticeMode>('ANIMATE');
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [showExpReward, setShowExpReward] = useState(false);
  const [masteryScores, setMasteryScores] = useState<Record<string, number>>({});
  const { triggerReaction, rewardBamboo } = useCompanion();

  const writerRef = useRef<any>(null);
  const writerContainerRef = useRef<HTMLDivElement | null>(null);

  // Load Hanzi from backend API
  const loadCharacters = useCallback(async () => {
    const res = await run('hanziApi.list', signal => hanziApi.list(`hsk=${hskFilter}`, { signal }));
    if (res && res.success && res.data && res.data.length > 0) {
      setCharacters(res.data);
      setSelectedChar(res.data[0]);
    }

    // Load user character mastery
    try {
      const masteryRes = await progressApi.mastery('HANZI');
      if (masteryRes.success && Array.isArray(masteryRes.data)) {
        const scoreMap: Record<string, number> = {};
        for (const item of masteryRes.data) {
          scoreMap[item.targetKey] = item.masteryScore;
        }
        setMasteryScores(scoreMap);
      }
    } catch {
      // offline fallback
    }
  }, [run, hskFilter]);

  useEffect(() => {
    void loadCharacters();
  }, [loadCharacters]);

  // Initialize or update HanziWriter when character or mode changes
  useEffect(() => {
    if (!writerContainerRef.current) return;
    writerContainerRef.current.innerHTML = '';
    setIsQuizCompleted(false);

    const HanziWriter = (window as any).HanziWriter;
    if (!HanziWriter) {
      console.warn('HanziWriter not loaded yet');
      return;
    }

    try {
      const writer = HanziWriter.create(writerContainerRef.current, selectedChar.character, {
        width: 260,
        height: 260,
        padding: 24,
        showOutline: true,
        strokeAnimationSpeed: 1.2,
        delayBetweenStrokes: 180,
        strokeColor: '#E11D48', // Cinnabar Red
        radicalColor: '#F59E0B', // Imperial Gold
        outlineColor: 'rgba(120, 120, 120, 0.22)',
        drawingColor: '#10B981', // Jade Green during quiz
        drawingWidth: 16,
        showCharacter: mode === 'ANIMATE',
      });

      writerRef.current = writer;

      if (mode === 'ANIMATE') {
        writer.animateCharacter();
      } else {
        writer.quiz({
          onComplete: async () => {
            setIsQuizCompleted(true);
            setShowExpReward(true);
            triggerReaction('correct');
            rewardBamboo(2);
            void confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

            // Call Backend Practice Progress API
            try {
              await progressApi.practice({
                targetType: 'HANZI',
                targetKey: selectedChar.character,
                masteryScore: 100,
                expEarned: 15,
              });

              setMasteryScores((prev) => ({
                ...prev,
                [selectedChar.character]: Math.min(100, (prev[selectedChar.character] ?? 0) + 25),
              }));
            } catch (err) {
              console.warn('Failed to record Hanzi exp:', err);
            }
          },
        });
      }
    } catch (err) {
      console.error('Failed to instantiate HanziWriter:', err);
    }
  }, [selectedChar, mode, triggerReaction, rewardBamboo]);

  const handlePlayAudio = () => {
    speakChinese(selectedChar.character);
  };

  const handleAnimateAgain = () => {
    if (writerRef.current && mode === 'ANIMATE') {
      writerRef.current.animateCharacter();
    } else if (writerRef.current && mode === 'QUIZ') {
      writerRef.current.quiz({
        onComplete: () => {
          setIsQuizCompleted(true);
        },
      });
    }
  };

  // Filtered Hanzi list
  const filteredCharacters = characters.filter((c) => {
    if (hskFilter && c.hskLevel && c.hskLevel !== hskFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchChar = c.character.includes(q);
      const matchPinyin = c.pinyin?.toLowerCase().includes(q);
      const matchHanViet = (c.sinoVietnamese || c.hanViet)?.toLowerCase().includes(q);
      const matchMeaning = (c.meaning || c.meaningVi)?.toLowerCase().includes(q);
      return matchChar || matchPinyin || matchHanViet || matchMeaning;
    }
    return true;
  });

  const currentScore = masteryScores[selectedChar.character] ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
      {/* Floating EXP micro-animation */}
      {showExpReward && <FloatingExpReward amount={15} onComplete={() => setShowExpReward(false)} />}

      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-rule pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cinnabar">
            <span className="inline-block h-2 w-2 rounded-full bg-cinnabar" />
            Trạm Chữ Hán · 汉字笔顺与书写
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-fg">
            Học Chữ Hán (Hanzi) & Tập viết 米字格
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-fg-60">
            Khám phá quy tắc bút thuận, kết cấu chiết tự, âm Hán Việt chuẩn xác và luyện viết tay tương tác trên khung 米字格 (Mễ Tự Cách).
          </p>
        </div>

        {/* Companion & Level Badges */}
        <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setHskFilter(lvl)}
                className={`cursor-pointer px-2.5 py-1 text-xs font-semibold transition-all ${
                  hskFilter === lvl
                    ? 'border border-cinnabar bg-cinnabar text-white shadow-xs'
                    : 'border border-rule bg-card text-fg-60 hover:text-fg'
                }`}
              >
                HSK {lvl}
              </button>
            ))}
          </div>

          <StudyPetCompanion />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Side: Character Grid & Search (5 cols) */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-fg-38" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo chữ Hán, Pinyin, Hán Việt..."
              className="w-full border border-rule bg-card py-2 pl-9 pr-3 text-xs text-fg placeholder:text-fg-38 focus:border-cinnabar focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-4 gap-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredCharacters.map((c) => {
              const isSelected = selectedChar.character === c.character;
              const score = masteryScores[c.character] ?? 0;
              return (
                <button
                  key={c.id || c.character}
                  type="button"
                  onClick={() => setSelectedChar(c)}
                  className={`group relative flex flex-col items-center justify-center rounded border p-2.5 text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-cinnabar bg-cinnabar/10 shadow-xs'
                      : 'border-rule bg-card hover:border-rule-strong hover:bg-tint'
                  }`}
                >
                  <span className="font-serif text-2xl font-bold text-fg group-hover:text-cinnabar">
                    {c.character}
                  </span>
                  <span className="mt-0.5 font-mono text-[11px] text-cinnabar">
                    {c.pinyin}
                  </span>
                  <span className="text-[10px] text-fg-38 truncate max-w-full">
                    {c.sinoVietnamese || c.hanViet}
                  </span>

                  {/* Tiny Mastery indicator */}
                  {score >= 80 && (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-jade" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-fg-38 text-center">
            Hiển thị {filteredCharacters.length} chữ Hán HSK {hskFilter}
          </div>
        </div>

        {/* Right Side: Interactive Mi Zi Ge Canvas + Details (7 cols) */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          <div className="flex flex-col items-center rounded border border-rule bg-card p-6">
            {/* Mode Switcher Tabs */}
            <div className="mb-6 flex w-full justify-between items-center border-b border-rule pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode('ANIMATE')}
                  className={`cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    mode === 'ANIMATE'
                      ? 'border border-cinnabar bg-cinnabar text-white shadow-xs'
                      : 'border border-rule bg-tint text-fg-60 hover:text-fg'
                  }`}
                >
                  <Play size={14} /> Xem nét viết (Bút thuận)
                </button>

                <button
                  type="button"
                  onClick={() => setMode('QUIZ')}
                  className={`cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    mode === 'QUIZ'
                      ? 'border border-cinnabar bg-cinnabar text-white shadow-xs'
                      : 'border border-rule bg-tint text-fg-60 hover:text-fg'
                  }`}
                >
                  <PenTool size={14} /> Luyện viết tay (+15 EXP)
                </button>
              </div>

              <button
                type="button"
                onClick={handleAnimateAgain}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-rule text-fg-60 hover:border-rule-strong hover:text-fg"
                title={mode === 'ANIMATE' ? 'Phát lại nét viết' : 'Làm mới bảng vẽ'}
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Traditional Mi Zi Ge (米字格) Canvas Box */}
            <div className="relative flex h-[280px] w-[280px] items-center justify-center rounded border-2 border-cinnabar/40 bg-[#FAF8F5] shadow-inner">
              {/* Rice Paper Background Watermark Pattern */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full opacity-35"
                viewBox="0 0 280 280"
                aria-hidden="true"
              >
                {/* Horizontal & Vertical Cross */}
                <line x1="0" y1="140" x2="280" y2="140" stroke="#E11D48" strokeWidth="1" strokeDasharray="5 5" />
                <line x1="140" y1="0" x2="140" y2="280" stroke="#E11D48" strokeWidth="1" strokeDasharray="5 5" />
                {/* Diagonal Cross */}
                <line x1="0" y1="0" x2="280" y2="280" stroke="#E11D48" strokeWidth="1" strokeDasharray="5 5" />
                <line x1="0" y1="280" x2="280" y2="0" stroke="#E11D48" strokeWidth="1" strokeDasharray="5 5" />
                {/* Outer Red Frame Inner Border */}
                <rect x="8" y="8" width="264" height="264" fill="none" stroke="#E11D48" strokeWidth="0.8" opacity="0.4" />
              </svg>

              {/* HanziWriter target SVG canvas */}
              <div ref={writerContainerRef} className="relative z-10 flex h-[260px] w-[260px] items-center justify-center cursor-crosshair" />

              {/* Red Seal Stamp upon Quiz Completion */}
              {isQuizCompleted && (
                <div className="pointer-events-none absolute bottom-4 right-4 z-20">
                  <RedSealStamp text="通" size={84} />
                </div>
              )}
            </div>

            {/* Quiz Instructions / Action feedback */}
            <div className="mt-4 text-center">
              {mode === 'ANIMATE' ? (
                <p className="text-xs text-fg-60">
                  Quan sát thứ tự các nét: Từ trên xuống dưới, từ trái qua phải, từ ngoài vào trong.
                </p>
              ) : isQuizCompleted ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-jade">
                  <CheckCircle size={16} /> Xuất sắc! Bạn đã viết đúng nét chữ Hán này và nhận +15 EXP!
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-cinnabar font-medium">
                  <PenTool size={13} className="shrink-0" /> Dùng chuột hoặc ngón tay để vẽ từng nét vào khung 米字格 theo đúng thứ tự!
                </p>
              )}
            </div>
          </div>

          {/* Character Linguistic Details Card */}
          <div className="flex flex-col gap-4 rounded border border-rule bg-card p-5">
            <div className="flex items-start justify-between border-b border-rule pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-serif text-4xl font-bold text-fg">
                    {selectedChar.character}
                  </span>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold text-cinnabar">
                        {selectedChar.pinyin}
                      </span>
                      <button
                        type="button"
                        onClick={handlePlayAudio}
                        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-cinnabar/30 bg-cinnabar/10 text-cinnabar hover:bg-cinnabar hover:text-white transition-all"
                        title="Nghe phát âm"
                      >
                        <Volume2 size={14} />
                      </button>
                    </div>
                    {/* Prominent Âm Hán Việt Badge */}
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-fg-38">Âm Hán Việt:</span>
                      <span className="rounded bg-cinnabar/15 px-2 py-0.5 text-xs font-bold text-cinnabar">
                        {selectedChar.sinoVietnamese || selectedChar.hanViet || 'Chưa cập nhật'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mastery Bar */}
              <div className="flex flex-col items-end">
                <span className="text-[11px] text-fg-38">Mức độ thông thạo</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-2 w-24 bg-rule/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-jade transition-all duration-300"
                      style={{ width: `${currentScore}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-bold text-jade">{currentScore}%</span>
                </div>
              </div>
            </div>

            {/* Meaning & Meta Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="rounded bg-tint p-3">
                <span className="font-semibold text-fg-38 block mb-1">Ý NGHĨA TIẾNG VIỆT</span>
                <p className="text-sm font-medium text-fg">
                  {selectedChar.meaning || selectedChar.meaningVi}
                </p>
              </div>

              <div className="rounded bg-tint p-3">
                <span className="font-semibold text-fg-38 block mb-1">CẤU TRÚC BỘ THỦ & SỐ NÉT</span>
                <p className="text-sm text-fg">
                  Bộ thủ: <b className="font-serif text-cinnabar">{selectedChar.radical || '—'}</b> · {selectedChar.strokeCount} nét
                </p>
              </div>
            </div>

            {/* Decomposition (Chiết tự) */}
            {selectedChar.decomposition && (
              <div className="rounded border border-rule/60 bg-tint/50 p-3 text-xs leading-relaxed text-fg">
                <span className="font-serif font-semibold text-gold">「析」 Chiết tự & Mẹo nhớ: </span>
                {selectedChar.decomposition}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, Play, RefreshCw, PenTool, CheckCircle, Search, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../app/useAuth';
import { useRequestScope } from '../../lib/hooks/useRequestScope';
import { hanziApi } from './api';
import type { HanziDto, ExampleWordItem } from './types';
import { speakChinese } from '../../services/chineseSpeech';
import { RedSealStamp } from '../../components/RedSealStamp';
import { useTheme } from '../../app/useTheme';
import { FloatingExpReward } from '../../components/FloatingExpReward';
import { progressApi } from '../progress/api';
import { StudyPetCompanion } from '../companion/StudyPetCompanion';
import { useCompanion } from '../companion/useCompanionStore';

// Foundational radicals for quick filtering
const FOUNDATIONAL_RADICALS = [
  { radical: 'ALL', name: 'Tất cả' },
  { radical: '亻', name: '亻 Nhân' },
  { radical: '口', name: '口 Khẩu' },
  { radical: '女', name: '女 Nữ' },
  { radical: '氵', name: '氵 Thủy' },
  { radical: '讠', name: '讠 Ngôn' },
  { radical: '扌', name: '扌 Thủ' },
  { radical: '木', name: '木 Mộc' },
  { radical: '日', name: '日 Nhật' },
  { radical: '月', name: '月 Nguyệt' },
  { radical: '宀', name: '宀 Miên' },
  { radical: '辶', name: '辶 Quai xước' },
  { radical: '心', name: '心 Tâm' },
  { radical: '火', name: '火 Hỏa' },
];

// Fallback seed characters with decomposition & example words JSON
const FALLBACK_HANZI: HanziDto[] = [
  {
    id: 1,
    character: '人',
    pinyin: 'rén',
    sinoVietnamese: 'Nhân',
    meaning: 'Người, con người',
    radical: '人',
    strokeCount: 2,
    hskLevel: 1,
    decomposition: 'Độc thể (Hình dáng người đứng nghiêng)',
    exampleWordsJson: '[{"word":"中国人","pinyin":"Zhōngguó rén","vi":"người Trung Quốc"},{"word":"男人","pinyin":"nánrén","vi":"đàn ông"}]',
    practiceCount: 0,
    reviewStatus: 'APPROVED',
  },
  {
    id: 2,
    character: '口',
    pinyin: 'kǒu',
    sinoVietnamese: 'Khẩu',
    meaning: 'Miệng, mồm, nhân khẩu',
    radical: '口',
    strokeCount: 3,
    hskLevel: 1,
    decomposition: 'Độc thể (Hình chiếc miệng mở ra)',
    exampleWordsJson: '[{"word":"人口","pinyin":"rénkǒu","vi":"dân số"},{"word":"吃","pinyin":"chī","vi":"ăn"}]',
    practiceCount: 0,
    reviewStatus: 'APPROVED',
  },
  {
    id: 9,
    character: '好',
    pinyin: 'hǎo',
    sinoVietnamese: 'Hảo',
    meaning: 'Tốt, đẹp, hay, khỏe',
    radical: '女',
    strokeCount: 6,
    hskLevel: 1,
    decomposition: '女 (Nữ) + 子 (Tử)',
    exampleWordsJson: '[{"word":"你好","pinyin":"nǐ hǎo","vi":"xin chào"},{"word":"好看","pinyin":"hǎokàn","vi":"đẹp, ưa nhìn"}]',
    practiceCount: 0,
    reviewStatus: 'APPROVED',
  },
  {
    id: 17,
    character: '你',
    pinyin: 'nǐ',
    sinoVietnamese: 'Nhĩ',
    meaning: 'Bạn, anh, chị (ngôi thứ hai)',
    radical: '亻',
    strokeCount: 7,
    hskLevel: 1,
    decomposition: '亻 (Nhân đứng) + 尔 (Nhĩ)',
    exampleWordsJson: '[{"word":"你好","pinyin":"nǐ hǎo","vi":"xin chào"},{"word":"你们","pinyin":"nǐmen","vi":"các bạn"}]',
    practiceCount: 0,
    reviewStatus: 'PENDING_REVIEW',
    needsHumanCheck: true,
  },
  {
    id: 18,
    character: '他',
    pinyin: 'tā',
    sinoVietnamese: 'Tha',
    meaning: 'Anh ấy, ông ấy, cậu ấy',
    radical: '亻',
    strokeCount: 5,
    hskLevel: 1,
    decomposition: '亻 (Nhân đứng) + 也 (Dã)',
    exampleWordsJson: '[{"word":"他们","pinyin":"tāmen","vi":"họ, bọn họ"}]',
    practiceCount: 0,
    reviewStatus: 'PENDING_REVIEW',
    needsHumanCheck: true,
  },
  {
    id: 19,
    character: '她',
    pinyin: 'tā',
    sinoVietnamese: 'Tha',
    meaning: 'Cô ấy, bà ấy, chị ấy',
    radical: '女',
    strokeCount: 6,
    hskLevel: 1,
    decomposition: '女 (Nữ) + 也 (Dã)',
    exampleWordsJson: '[{"word":"她们","pinyin":"tāmen","vi":"các cô ấy"}]',
    practiceCount: 0,
    reviewStatus: 'PENDING_REVIEW',
    needsHumanCheck: true,
  },
  {
    id: 20,
    character: '吃',
    pinyin: 'chī',
    sinoVietnamese: 'Cật',
    meaning: 'Ăn uống, dùng bữa',
    radical: '口',
    strokeCount: 6,
    hskLevel: 1,
    decomposition: '口 (Khẩu) + 乞 (Khất)',
    exampleWordsJson: '[{"word":"吃饭","pinyin":"chīfàn","vi":"ăn cơm"},{"word":"好吃","pinyin":"hǎochī","vi":"ngon miệng"}]',
    practiceCount: 0,
    reviewStatus: 'PENDING_REVIEW',
    needsHumanCheck: true,
  },
  {
    id: 21,
    character: '喝',
    pinyin: 'hē',
    sinoVietnamese: 'Hát',
    meaning: 'Uống',
    radical: '口',
    strokeCount: 12,
    hskLevel: 1,
    decomposition: '口 (Khẩu) + 曷 (Hạt)',
    exampleWordsJson: '[{"word":"喝茶","pinyin":"hē chá","vi":"uống trà"},{"word":"喝水","pinyin":"hē shuǐ","vi":"uống nước"}]',
    practiceCount: 0,
    reviewStatus: 'PENDING_REVIEW',
    needsHumanCheck: true,
  },
  {
    id: 14,
    character: '语',
    pinyin: 'yǔ',
    sinoVietnamese: 'Ngữ',
    meaning: 'Ngôn ngữ, lời nói',
    radical: '讠',
    strokeCount: 9,
    hskLevel: 1,
    decomposition: '讠 (Ngôn) + 吾 (Ngô)',
    exampleWordsJson: '[{"word":"汉语","pinyin":"hànyǔ","vi":"tiếng Hán"},{"word":"英语","pinyin":"yīngyǔ","vi":"tiếng Anh"}]',
    practiceCount: 0,
    reviewStatus: 'APPROVED',
  },
  {
    id: 22,
    character: '话',
    pinyin: 'huà',
    sinoVietnamese: 'Thoại',
    meaning: 'Lời nói, câu chuyện',
    radical: '讠',
    strokeCount: 8,
    hskLevel: 1,
    decomposition: '讠 (Ngôn) + 舌 (Thiệt)',
    exampleWordsJson: '[{"word":"说话","pinyin":"shuōhuà","vi":"nói chuyện"},{"word":"打电话","pinyin":"dǎ diànhuà","vi":"gọi điện thoại"}]',
    practiceCount: 0,
    reviewStatus: 'PENDING_REVIEW',
    needsHumanCheck: true,
  },
  {
    id: 23,
    character: '打',
    pinyin: 'dǎ',
    sinoVietnamese: 'Đả',
    meaning: 'Đánh, gọi điện thoại',
    radical: '扌',
    strokeCount: 5,
    hskLevel: 1,
    decomposition: '扌 (Thủ) + 丁 (Đinh)',
    exampleWordsJson: '[{"word":"打电话","pinyin":"dǎ diànhuà","vi":"gọi điện thoại"}]',
    practiceCount: 0,
    reviewStatus: 'PENDING_REVIEW',
    needsHumanCheck: true,
  },
  {
    id: 24,
    character: '想',
    pinyin: 'xiǎng',
    sinoVietnamese: 'Tưởng',
    meaning: 'Muốn, nghĩ, nhớ',
    radical: '心',
    strokeCount: 13,
    hskLevel: 1,
    decomposition: '相 (Tương) + 心 (Tâm)',
    exampleWordsJson: '[{"word":"想要","pinyin":"xiǎngyào","vi":"muốn có"}]',
    practiceCount: 0,
    reviewStatus: 'PENDING_REVIEW',
    needsHumanCheck: true,
  },
  {
    id: 25,
    character: '家',
    pinyin: 'jiā',
    sinoVietnamese: 'Gia',
    meaning: 'Nhà, gia đình',
    radical: '宀',
    strokeCount: 10,
    hskLevel: 1,
    decomposition: '宀 (Miên) + 豕 (Thỉ)',
    exampleWordsJson: '[{"word":"大家","pinyin":"dàjiā","vi":"mọi người"},{"word":"回家","pinyin":"huíjiā","vi":"về nhà"}]',
    practiceCount: 0,
    reviewStatus: 'PENDING_REVIEW',
    needsHumanCheck: true,
  },
  {
    id: 10,
    character: '学',
    pinyin: 'xué',
    sinoVietnamese: 'Học',
    meaning: 'Học tập, bắt chước',
    radical: '子',
    strokeCount: 8,
    hskLevel: 1,
    decomposition: '冖 (Mịch) + 子 (Tử)',
    exampleWordsJson: '[{"word":"学习","pinyin":"xuéxí","vi":"học tập"},{"word":"学生","pinyin":"xuésheng","vi":"học sinh"}]',
    practiceCount: 0,
    reviewStatus: 'APPROVED',
  },
  {
    id: 13,
    character: '国',
    pinyin: 'guó',
    sinoVietnamese: 'Quốc',
    meaning: 'Đất nước, quốc gia',
    radical: '囗',
    strokeCount: 8,
    hskLevel: 1,
    decomposition: '囗 (Vi) + 玉 (Ngọc)',
    exampleWordsJson: '[{"word":"中国","pinyin":"Zhōngguó","vi":"Trung Quốc"},{"word":"外国","pinyin":"wàiguó","vi":"nước ngoài"}]',
    practiceCount: 0,
    reviewStatus: 'APPROVED',
  },
];

type PracticeMode = 'ANIMATE' | 'QUIZ';

export const HanziStationView: React.FC = () => {
  const { user } = useAuth();
  return <HanziStationSession key={user?.userId ?? 'guest'} />;
};
const HanziStationSession: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { run } = useRequestScope(user?.userId);

  const [characters, setCharacters] = useState<HanziDto[]>(FALLBACK_HANZI);
  const [selectedChar, setSelectedChar] = useState<HanziDto>(FALLBACK_HANZI[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hskFilter, setHskFilter] = useState<number | 'ALL'>(1);
  const [selectedRadical, setSelectedRadical] = useState<string>('ALL');
  const [mode, setMode] = useState<PracticeMode>('ANIMATE');
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [earnedExp, setEarnedExp] = useState(0);
  const [practiceNotice, setPracticeNotice] = useState('');
  const [showExpReward, setShowExpReward] = useState(false);
  const [masteryScores, setMasteryScores] = useState<Record<string, number>>({});
  const { triggerReaction, rewardBamboo } = useCompanion();

  const writerRef = useRef<any>(null);
  const writerContainerRef = useRef<HTMLDivElement | null>(null);

  // Load Hanzi from backend API
  const loadCharacters = useCallback(async () => {
    const params = new URLSearchParams();
    if (hskFilter !== 'ALL') params.append('hsk', String(hskFilter));
    const res = await run('hanziApi.list', (signal) =>
      hanziApi.list(params.toString(), { signal })
    );
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
    const timer = setTimeout(() => {
      void loadCharacters();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadCharacters]);

  // Parse example words for currently selected character
  const parsedExampleWords: ExampleWordItem[] = useMemo(() => {
    if (!selectedChar.exampleWordsJson) return [];
    try {
      const parsed = JSON.parse(selectedChar.exampleWordsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [selectedChar.exampleWordsJson]);

  const completePractice = useCallback(async () => {
    setIsQuizCompleted(true);
    triggerReaction('happy');
    if (!user) { setPracticeNotice('Đăng nhập để lưu lượt luyện viết.'); return; }
    const response = await run('hanzi.practice', signal => progressApi.practice({ targetType: 'HANZI', targetKey: selectedChar.character, isCorrect: true }, { signal }));
    if (!response) return;
    if (response.success && response.data) {
      setEarnedExp(response.data.expAwarded); setShowExpReward(true);
      setMasteryScores(prev => ({ ...prev, [selectedChar.character]: response.data!.masteryScore }));
      setPracticeNotice(`Đã lưu lượt viết đúng: +${response.data.expAwarded} EXP. Tiến độ nhiệm vụ đã cập nhật.`);
      rewardBamboo(0);
      void confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } else setPracticeNotice(response.message || 'Chưa lưu được lượt viết. Vui lòng thử lại.');
  }, [user, selectedChar.character, run, triggerReaction, rewardBamboo]);

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
        charDataLoader: (char: string) => fetch(`/hanzi-data/${encodeURIComponent(char)}.json`).then(response => {
          if (!response.ok) throw new Error('Missing handwriting asset');
          return response.json();
        }),
        onLoadCharDataError: () => setPracticeNotice('Chưa tải được dữ liệu nét viết. Vui lòng thử lại.'),
        showOutline: true,
        strokeAnimationSpeed: 1.2,
        delayBetweenStrokes: 180,
        strokeColor: getComputedStyle(document.documentElement).getPropertyValue('--paper-red').trim(), // Cinnabar Red
        radicalColor: getComputedStyle(document.documentElement).getPropertyValue('--paper-gold').trim(), // Imperial Gold
        outlineColor: 'rgba(120, 120, 120, 0.22)',
        drawingColor: getComputedStyle(document.documentElement).getPropertyValue('--paper-jade').trim(), // Jade Green during quiz
        drawingWidth: 16,
        showCharacter: mode === 'ANIMATE',
      });

      writerRef.current = writer;

      if (mode === 'ANIMATE') {
        writer.animateCharacter();
      } else {
        writer.quiz({
          onComplete: () => void completePractice(),
        });
      }
    } catch (err) {
      console.error('Failed to instantiate HanziWriter:', err);
    }
  }, [selectedChar, mode, completePractice, theme]);

  const handlePlayAudio = (textToSpeak?: string) => {
    speakChinese(textToSpeak || selectedChar.character);
  };

  const handleAnimateAgain = () => {
    if (writerRef.current && mode === 'ANIMATE') {
      writerRef.current.animateCharacter();
    } else if (writerRef.current && mode === 'QUIZ') {
      setIsQuizCompleted(false);
      writerRef.current.quiz({
        onComplete: () => void completePractice(),
      });
    }
  };

  // Filtered Hanzi list by HSK level, Radical, and Search query
  const filteredCharacters = characters.filter((c) => {
    if (hskFilter !== 'ALL' && c.hskLevel && c.hskLevel !== hskFilter) return false;
    if (selectedRadical !== 'ALL') {
      const matchRadical =
        c.radical === selectedRadical ||
        (c.radicals && c.radicals.some((r) => r.radical === selectedRadical)) ||
        (c.decomposition && c.decomposition.includes(selectedRadical));
      if (!matchRadical) return false;
    }
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
      {showExpReward && <FloatingExpReward amount={earnedExp} onComplete={() => setShowExpReward(false)} />}

      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-rule pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cinnabar-ink">
            <span className="inline-block h-2 w-2 rounded-full bg-cinnabar" />
            Trạm Chữ Hán & Bộ Thủ · 汉字笔顺与部首
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-fg">
            Học Chữ Hán (Hanzi) & Tập viết 米字格
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-fg-60">
            Khám phá quy tắc bút thuận, kết cấu chiết tự, âm Hán Việt chuẩn xác và luyện viết tay tương tác trên khung 米字格 (Mễ Tự Cách).
          </p>
        </div>

        {/* Companion Pet */}
        <div className="flex items-center gap-3">
          <StudyPetCompanion />
        </div>
      </div>

      {/* Filter Toolbar: HSK Levels & Radical Filter Chips */}
      <div className="flex flex-col gap-3 rounded border border-rule bg-card p-3 ">
        {/* HSK Level Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-38">Cấp độ HSK:</span>
          {(['ALL', 1, 2, 3, 4, 5, 6] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setHskFilter(lvl)}
              className={`cursor-pointer rounded px-2.5 py-1 text-xs font-semibold transition-all ${
                hskFilter === lvl
                  ? 'border border-cinnabar bg-cinnabar text-on-accent '
                  : 'border border-rule bg-bg text-fg-60 hover:text-fg'
              }`}
            >
              {lvl === 'ALL' ? 'Tất cả cấp độ' : `HSK ${lvl}`}
            </button>
          ))}
        </div>

        {/* Foundational Radical Chips */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-rule/50 pt-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-38">Bộ thủ căn bản:</span>
          {FOUNDATIONAL_RADICALS.map((rad) => {
            const isSelected = selectedRadical === rad.radical;
            return (
              <button
                key={rad.radical}
                type="button"
                onClick={() => setSelectedRadical(rad.radical)}
                className={`cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                  isSelected
                    ? 'border border-gold bg-gold/15 font-semibold text-gold-ink '
                    : 'border border-rule/70 bg-bg text-fg-60 hover:border-fg hover:text-fg'
                }`}
              >
                {rad.name}
              </button>
            );
          })}
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
              placeholder="Tìm theo chữ Hán, Pinyin, Hán Việt, ý nghĩa..."
              className="w-full border border-rule bg-card py-2 pl-9 pr-3 text-xs text-fg placeholder:text-fg-38 focus:border-cinnabar focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(94px,1fr))] gap-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredCharacters.map((c) => {
              const isSelected = selectedChar.character === c.character;
              const isPending = c.reviewStatus === 'PENDING_REVIEW' || c.needsHumanCheck;
              const score = masteryScores[c.character] ?? 0;
              return (
                <button
                  key={c.id || c.character}
                  type="button"
                  onClick={() => setSelectedChar(c)}
                  className={`group relative flex flex-col items-center justify-center rounded border p-2.5 text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-cinnabar bg-cinnabar/10 '
                      : 'border-rule bg-card hover:border-rule-strong hover:bg-tint'
                  }`}
                >
                  {/* Pending Badge */}
                  {isPending && (
                    <span className="mb-1 text-[12.5px] leading-relaxed text-red">
                      Chờ duyệt
                    </span>
                  )}

                  <span className="font-serif text-2xl font-bold text-fg group-hover:text-cinnabar-ink">
                    {c.character}
                  </span>
                  <span className="mt-0.5 font-sans text-[11px] text-cinnabar-ink">
                    {c.pinyin}
                  </span>
                  <span className="text-[10px] text-fg-38 truncate max-w-full">
                    {c.sinoVietnamese || c.hanViet}
                  </span>

                  {/* Tiny Mastery indicator */}
                  {score >= 80 && (
                    <span className="mt-1 h-1.5 w-1.5 bg-rank" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-fg-38 text-center">
            Hiển thị {filteredCharacters.length} chữ Hán {hskFilter !== 'ALL' ? `HSK ${hskFilter}` : ''}
            {selectedRadical !== 'ALL' ? ` · Bộ ${selectedRadical}` : ''}
          </div>
        </div>

        {/* Right Side: Interactive Mi Zi Ge Canvas + Details (7 cols) */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          <div className="flex flex-col items-center rounded border border-rule bg-card p-6 ">
            {/* Mode Switcher Tabs */}
            <div className="mb-6 flex w-full justify-between items-center border-b border-rule pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode('ANIMATE')}
                  className={`cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    mode === 'ANIMATE'
                      ? 'border border-cinnabar bg-cinnabar text-on-accent '
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
                      ? 'border border-cinnabar bg-cinnabar text-on-accent '
                      : 'border border-rule bg-tint text-fg-60 hover:text-fg'
                  }`}
                >
                  <PenTool size={14} /> Luyện viết tay
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
            <div className="relative flex h-[280px] w-[280px] items-center justify-center rounded border-2 border-cinnabar/40 bg-card ">
              {/* Rice Paper Background Watermark Pattern */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full opacity-35"
                viewBox="0 0 280 280"
                aria-hidden="true"
              >
                {/* Horizontal & Vertical Cross */}
                <line x1="0" y1="140" x2="280" y2="140" stroke="var(--paper-red)" strokeWidth="1" strokeDasharray="5 5" />
                <line x1="140" y1="0" x2="140" y2="280" stroke="var(--paper-red)" strokeWidth="1" strokeDasharray="5 5" />
                {/* Diagonal Cross */}
                <line x1="0" y1="0" x2="280" y2="280" stroke="var(--paper-red)" strokeWidth="1" strokeDasharray="5 5" />
                <line x1="0" y1="280" x2="280" y2="0" stroke="var(--paper-red)" strokeWidth="1" strokeDasharray="5 5" />
                {/* Outer Red Frame Inner Border */}
                <rect x="8" y="8" width="264" height="264" fill="none" stroke="var(--paper-red)" strokeWidth="0.8" opacity="0.4" />
              </svg>

              {/* HanziWriter target SVG canvas */}
              <div ref={writerContainerRef} className="relative z-10 flex h-[260px] w-[260px] items-center justify-center cursor-crosshair" />

              {/* Red Seal Stamp upon Quiz Completion */}
              {isQuizCompleted && (
                <div className="pointer-events-none flex justify-end py-3">
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
                <div className="flex items-center gap-1.5 text-xs font-semibold text-jade-ink">
                  <CheckCircle size={16} /> {practiceNotice || 'Xuất sắc! Bạn đã viết đúng nét chữ Hán này.'}
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-cinnabar-ink font-medium">
                  <PenTool size={13} className="shrink-0" /> Dùng chuột hoặc ngón tay để vẽ từng nét vào khung 米字格 theo đúng thứ tự!
                </p>
              )}
            </div>
          </div>

          {/* Character Linguistic Details Card (OrientalCard) */}
          <div className="flex flex-col gap-4 rounded border border-rule bg-card p-5 ">
            <div className="flex items-start justify-between border-b border-rule pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-serif text-4xl font-bold text-fg">
                    {selectedChar.character}
                  </span>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-lg font-bold text-cinnabar-ink">
                        {selectedChar.pinyin}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePlayAudio()}
                        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-cinnabar/30 bg-cinnabar/10 text-cinnabar-ink hover:bg-cinnabar hover:text-on-accent transition-all"
                        title="Nghe phát âm chữ Hán"
                        aria-label={`Nghe phát âm ${selectedChar.character}`}
                      >
                        <Volume2 size={14} />
                      </button>
                      {(selectedChar.reviewStatus === 'PENDING_REVIEW' || selectedChar.needsHumanCheck) && (
                        <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold-ink">
                          Chờ duyệt
                        </span>
                      )}
                    </div>
                    {/* Prominent Âm Hán Việt Badge */}
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-fg-38">Âm Hán Việt:</span>
                      <span className="rounded bg-cinnabar/15 px-2 py-0.5 text-xs font-bold text-cinnabar-ink">
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
                  <span className="font-sans text-xs font-bold text-jade-ink">{currentScore}%</span>
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
                <span className="font-semibold text-fg-38 block mb-1">BỘ THỦ CẤU THÀNH & NÉT</span>
                <p className="text-sm text-fg">
                  Bộ thủ: <b className="font-serif text-cinnabar-ink">{selectedChar.radical || '—'}</b> · {selectedChar.strokeCount} nét
                </p>
              </div>
            </div>

            {/* Decomposition (Chiết tự & Bộ thủ cấu thành) */}
            {selectedChar.decomposition && (
              <div className="rounded border border-gold/40 bg-gold/5 p-3.5 text-xs leading-relaxed text-fg">
                <div className="flex items-center gap-1.5 font-serif font-semibold text-gold-ink mb-1">
                  <Sparkles size={14} />
                  <span>Chiết tự & Cấu trúc chữ Hán (字形结构):</span>
                </div>
                <div className="font-medium text-fg-80">{selectedChar.decomposition}</div>
              </div>
            )}

            {/* Applied HSK Compound Words (Từ ghép HSK ứng dụng) */}
            {parsedExampleWords.length > 0 && (
              <div className="border-t border-rule/60 pt-4">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-fg-38">
                    Từ ghép HSK ứng dụng ({parsedExampleWords.length})
                  </span>
                  <span className="text-[11px] text-fg-38">Bấm loa để nghe phát âm</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {parsedExampleWords.map((ex, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded border border-rule bg-card px-3 py-2 text-xs transition-colors hover:border-cinnabar/40"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                          <span className="font-serif text-base font-semibold text-fg">{ex.word}</span>
                          <span className="font-sans text-xs text-cinnabar-ink">{ex.pinyin}</span>
                        </div>
                        <span className="text-[11.5px] text-fg-60">{ex.vi}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(ex.word)}
                        aria-label={`Nghe phát âm ${ex.word}`}
                        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-rule text-fg-60 hover:border-cinnabar hover:text-cinnabar-ink hover:bg-cinnabar/10 transition-colors"
                        title={`Nghe phát âm ${ex.word}`}
                      >
                        <Volume2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

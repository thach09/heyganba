import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, Play, RefreshCw, PenTool, CheckCircle, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useAuth } from '../../app/useAuth';
import { useRequestScope } from '../../lib/hooks/useRequestScope';
import { hanziApi } from './api';
import type { HanziDto, ExampleWordItem } from './types';
import { speakChinese, stopChineseSpeech } from '../../services/chineseSpeech';
import { loadHanziWriter } from '../../lib/hanziWriter';
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

// No academic fallback dataset: API failure must not reveal draft/sample content.
const EMPTY_CHARACTER: HanziDto = { id: 0, character: '', strokeCount: 0, practiceCount: 0 };

type PracticeMode = 'ANIMATE' | 'QUIZ';

export const HanziStationView: React.FC = () => {
  const { user } = useAuth();
  return <HanziStationSession key={user?.userId ?? 'guest'} />;
};
const HanziStationSession: React.FC = () => {
  const { theme } = useTheme();
  const { user, requireLogin } = useAuth();
  const { run, cancel } = useRequestScope(user?.userId);

  const [characters, setCharacters] = useState<HanziDto[]>([]);
  const [selectedChar, setSelectedChar] = useState<HanziDto>(EMPTY_CHARACTER);
  const [searchQuery, setSearchQuery] = useState('');
  const [hskFilter, setHskFilter] = useState<number | 'ALL'>(1);
  const [selectedRadical, setSelectedRadical] = useState<string>('ALL');
  const [mode, setMode] = useState<PracticeMode>('ANIMATE');
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [earnedExp, setEarnedExp] = useState(0);
  const [practiceNotice, setPracticeNotice] = useState('');
  const [audioNotice, setAudioNotice] = useState('');
  useEffect(() => stopChineseSpeech, [selectedChar.character]);
  const [showExpReward, setShowExpReward] = useState(false);
  const [masteryScores, setMasteryScores] = useState<Record<string, number>>({});
  const [strokeDataError, setStrokeDataError] = useState(false);
  const [writerReady, setWriterReady] = useState(() => Boolean((window as any).HanziWriter));
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void loadHanziWriter().then(() => { if (!cancelled) setWriterReady(true); })
      .catch(() => { if (!cancelled) setStrokeDataError(true); });
    return () => { cancelled = true; };
  }, [user]);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const { triggerReaction, rewardBamboo } = useCompanion();

  const writerRef = useRef<any>(null);
  const quizCompletion = useRef<(() => void) | null>(null);
  const writerContainerRef = useRef<HTMLDivElement | null>(null);

  // Load Hanzi from backend API
  const loadCharacters = useCallback(async () => {
    if (!user) return;
    setLoadState('loading');
    const params = new URLSearchParams();
    if (hskFilter !== 'ALL') params.append('hsk', String(hskFilter));
    const res = await run('hanziApi.list', (signal) =>
      hanziApi.list(params.toString(), { signal })
    );
    if (!res) return;
    if (res.success && Array.isArray(res.data)) {
      const visible = user.role === 'ROLE_ADMIN' ? res.data : res.data.filter(item => item.reviewStatus === 'APPROVED');
      setCharacters(visible);
      setSelectedChar(visible[0] ?? EMPTY_CHARACTER);
      setStrokeDataError(false);
      setIsQuizCompleted(false);
      setLoadState('loaded');
    } else { setCharacters([]); setLoadState('error'); return; }

    // Load user character mastery
    try {
      const masteryRes = await run('hanzi.mastery', signal => progressApi.mastery('HANZI', { signal }));
      if (!masteryRes) return;
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
  }, [run, hskFilter, user]);

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

    const HanziWriter = (window as any).HanziWriter;
    if (!writerReady || !HanziWriter || !selectedChar.character) return;
    let active = true;
    const controller = new AbortController();
    let writer: any;
    const onComplete = () => { if (active) void completePractice(); };
    quizCompletion.current = onComplete;

    try {
      writer = HanziWriter.create(writerContainerRef.current, selectedChar.character, {
        width: 260,
        height: 260,
        padding: 24,
        charDataLoader: (char: string) =>
          fetch(`/hanzi-data/${encodeURIComponent(char)}.json`, { signal: controller.signal }).then((response) => {
            if (!response.ok) {
              throw new Error('Missing handwriting asset');
            }
            return response.json();
          }).catch((err) => {
            if (active) setStrokeDataError(true);
            throw err;
          }),
        onLoadCharDataError: () => {
          if (!active) return;
          setStrokeDataError(true);
          setPracticeNotice('Chưa có dữ liệu nét viết động. Đang hiển thị thẻ đối chiếu thư pháp.');
        },
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
          onComplete,
        });
      }
    } catch {
      // oxlint-disable-next-line react/set-state-in-effect -- reflect synchronous failure of an external imperative writer; this state is not an effect dependency.
      setStrokeDataError(true);
    }
    return () => {
      active = false;
      controller.abort();
      cancel('hanzi.practice');
      writer?.cancelQuiz?.();
      writer?.pauseAnimation?.();
      if (writerRef.current === writer) writerRef.current = null;
      if (quizCompletion.current === onComplete) quizCompletion.current = null;
    };
  }, [selectedChar, mode, completePractice, theme, loadState, writerReady, cancel]);

  const handlePlayAudio = (textToSpeak?: string) => {
    setAudioNotice('');
    const status = speakChinese(textToSpeak || selectedChar.character, {
      onError: () => setAudioNotice('Chưa phát được âm thanh. Bấm nghe để thử lại.'),
    });
    if (status === 'no-voice') setAudioNotice('Thiết bị chưa có giọng Quan thoại. Hãy cài giọng tiếng Trung rồi thử lại.');
    else if (status === 'unsupported') setAudioNotice('Trình duyệt chưa hỗ trợ đọc tiếng Trung. Hãy thử trình duyệt khác.');
    else if (status === 'error') setAudioNotice('Chưa phát được âm thanh. Bấm nghe để thử lại.');
  };

  const handleAnimateAgain = () => {
    if (writerRef.current && mode === 'ANIMATE') {
      writerRef.current.animateCharacter();
    } else if (writerRef.current && mode === 'QUIZ') {
      setIsQuizCompleted(false);
      writerRef.current.quiz({
        onComplete: quizCompletion.current ?? (() => {}),
      });
    }
  };

  // The level field is a legacy internal grouping, not an official CTI classification.
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

  if (!user) return <div className="mx-auto max-w-[520px] pt-16 text-center text-fg">
    <h2 className="font-serif text-[24px]">Chữ Hán & Luyện viết</h2>
    <p className="mt-4 text-[13px] leading-relaxed text-fg-60">Đăng nhập để học nội dung chữ Hán đã duyệt và lưu tiến độ.</p>
    <button type="button" onClick={requireLogin} className="mt-5 border border-rule-strong px-4 py-2 text-[12.5px]">Đăng nhập / Đăng ký</button>
  </div>;
  if (loadState === 'loading') return <p role="status" className="py-8 text-[13px] text-fg-60">Đang tải chữ Hán...</p>;
  if (loadState === 'error') return <div role="alert" className="py-8 text-[13px] text-fg">
    <p>Chưa tải được chữ Hán. Không hiển thị dữ liệu mẫu thay cho nội dung đã duyệt.</p>
    <button type="button" onClick={() => void loadCharacters()} className="mt-4 border border-rule-strong px-4 py-2">Thử lại</button>
  </div>;
  if (!characters.length) return <p role="status" className="py-8 text-[13px] text-fg-60">Chưa có chữ Hán đã duyệt ở cấp này.</p>;

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
          <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-38">Nhóm chữ:</span>
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
              {lvl === 'ALL' ? 'Tất cả nhóm' : `Nhóm ${lvl}`}
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
                  onClick={() => { setSelectedChar(c); setStrokeDataError(false); setIsQuizCompleted(false); }}
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
                  {(c.sinoVietnamese || c.hanViet) && <span className="text-[10px] text-fg-38 truncate max-w-full">
                    {c.sinoVietnamese || c.hanViet}
                  </span>}

                  {/* Tiny Mastery indicator */}
                  {score >= 80 && (
                    <span className="mt-1 h-1.5 w-1.5 bg-rank" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-fg-38 text-center">
            Hiển thị {filteredCharacters.length} chữ Hán {hskFilter !== 'ALL' ? `nhóm ${hskFilter}` : ''}
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
                  onClick={() => { setMode('ANIMATE'); setStrokeDataError(false); setIsQuizCompleted(false); }}
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
                  onClick={() => { setMode('QUIZ'); setStrokeDataError(false); setIsQuizCompleted(false); }}
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

              {/* Graceful Fallback: High-resolution Calligraphy Reference Card */}
              {strokeDataError ? (
                <div
                  data-testid="calligraphy-reference-card"
                  className="relative z-10 flex h-[260px] w-[260px] flex-col items-center justify-center p-3 text-center"
                >
                  <span className="font-serif text-[108px] font-bold leading-none text-fg select-none">
                    {selectedChar.character}
                  </span>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="font-sans font-bold text-cinnabar-ink">{selectedChar.pinyin}</span>
                    <span className="text-fg-38">·</span>
                    <span className="font-semibold text-fg-60">{selectedChar.strokeCount} nét</span>
                  </div>
                  <span className="mt-1 text-[10.5px] text-fg-38">Thẻ đối chiếu thư pháp chuẩn</span>
                </div>
              ) : (
                /* HanziWriter target SVG canvas */
                <div ref={writerContainerRef} className="relative z-10 flex h-[260px] w-[260px] items-center justify-center cursor-crosshair" />
              )}

              {/* Red Seal Stamp upon Quiz Completion */}
              {isQuizCompleted && (
                <div className="pointer-events-none flex justify-end py-3">
                  <RedSealStamp text="通" size={84} />
                </div>
              )}
            </div>

            {/* Quiz Instructions / Action feedback */}
            <div className="mt-4 text-center">
              {strokeDataError ? (
                <div className="flex flex-col items-center gap-1 text-xs text-fg-60">
                  <span className="font-semibold text-gold-ink">Dữ liệu nét vẽ động đang được bổ sung</span>
                  <p className="text-[11.5px] text-fg-60">
                    Luyện viết dựa trên chữ thư pháp chuẩn phía trên theo chiết tự: {selectedChar.decomposition || `${selectedChar.radical} (${selectedChar.strokeCount} nét)`}
                  </p>
                </div>
              ) : mode === 'ANIMATE' ? (
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
            {audioNotice && <p role="status" className="text-sm text-fg-80">{audioNotice}</p>}
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
                    {(selectedChar.sinoVietnamese || selectedChar.hanViet) && <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-fg-38">Âm Hán Việt:</span>
                      <span className="rounded bg-cinnabar/15 px-2 py-0.5 text-xs font-bold text-cinnabar-ink">
                        {selectedChar.sinoVietnamese || selectedChar.hanViet}
                      </span>
                    </div>}
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
                    Từ ghép trong học liệu ({parsedExampleWords.length})
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
                          <Link
                            to={`/dictionary?q=${encodeURIComponent(ex.word)}`}
                            className="font-serif text-base font-semibold text-fg hover:text-cinnabar-ink hover:underline transition-colors"
                            title={`Tra từ "${ex.word}" trong Sổ từ vựng`}
                          >
                            {ex.word}
                          </Link>
                          <span className="font-sans text-xs text-cinnabar-ink">{ex.pinyin}</span>
                        </div>
                        <span className="text-[11.5px] text-fg-60">{ex.vi}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/dictionary?q=${encodeURIComponent(ex.word)}`}
                          aria-label={`Tra từ "${ex.word}"`}
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-rule text-fg-38 hover:border-cinnabar hover:text-cinnabar-ink hover:bg-cinnabar/10 transition-colors"
                          title={`Tra từ "${ex.word}" trong từ điển`}
                        >
                          <Search size={12} />
                        </Link>
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

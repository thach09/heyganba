import React, { useCallback, useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { Volume2, RotateCcw, ArrowRight, Star, Layers, Dumbbell, Sparkles } from 'lucide-react';
import { useAuth } from '../../app/useAuth';
import { useRequestScope } from '../../lib/hooks/useRequestScope';
import { flashcardApi } from './api';
import type { FlashcardDueItem, FlashcardStats } from './types';
import { speakChinese } from '../../services/chineseSpeech';
import { RedSealStamp } from '../../components/RedSealStamp';
import { FloatingExpReward } from '../../components/FloatingExpReward';
import { apiRequest } from '../../lib/api/client';
import { StudyPetCompanion } from '../companion/StudyPetCompanion';
import { useCompanion } from '../companion/useCompanionStore';

type StationTab = 'flashcard' | 'quiz';
type MasteryFilter = 'ALL' | 'LEARNING' | 'MASTERED';

export const FlashcardView: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.userId;
  const { run, cancel } = useRequestScope(userId);
  const { triggerReaction, rewardBamboo } = useCompanion();

  const [items, setItems] = useState<FlashcardDueItem[]>([]);
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Station State
  const [tab, setTab] = useState<StationTab>('flashcard');
  const [hskFilter, setHskFilter] = useState<number>(1);
  const [lessonFilter, setLessonFilter] = useState<number | 'ALL'>('ALL');
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 3D Flashcard State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [expReward, setExpReward] = useState<number | null>(null);
  const [showSeal, setShowSeal] = useState(false);
  const [sealText, setSealText] = useState('通');

  // Mastery scores map: vocabularyId -> score (0-100)
  const [masteryMap, setMasteryMap] = useState<Record<number, number>>({});

  // Practice Quiz State
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizIsCorrect, setQuizIsCorrect] = useState<boolean | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  // Load vocabulary & stats
  const loadData = useCallback(async () => {
    setLoading(true);
    const loaded = await run('FlashcardView-load', signal =>
      Promise.all([
        flashcardApi.due({ signal }),
        flashcardApi.stats({ signal }),
        apiRequest<any[]>('/progress/mastery?targetType=VOCAB', { signal }),
      ])
    );
    if (!loaded) return;
    const [dueRes, statsRes, masteryRes] = loaded;

    if (dueRes.success && dueRes.data) {
      setItems(dueRes.data);
      setCurrentIndex(0);
      setIsFlipped(false);
    } else {
      setError(dueRes.message || 'Không tải được danh sách từ vựng.');
    }

    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    }

    if (masteryRes.success && Array.isArray(masteryRes.data)) {
      const map: Record<number, number> = {};
      for (const m of masteryRes.data) {
        const id = Number(m.targetKey);
        if (!isNaN(id)) {
          map[id] = m.masteryScore ?? 0;
        }
      }
      setMasteryMap(map);
    }
    setLoading(false);
  }, [run]);

  useEffect(() => {
    void loadData();
    return () => cancel('FlashcardView-load');
  }, [loadData, cancel]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // HSK Level filter
      if (item.hskLevel && item.hskLevel !== hskFilter) return false;

      // Lesson filter
      if (lessonFilter !== 'ALL' && item.lessonNumber && item.lessonNumber !== lessonFilter) {
        return false;
      }

      // Mastery filter
      const score = masteryMap[item.vocabularyId] ?? ((item.repetitions ?? 0) > 2 ? 80 : 20);
      if (masteryFilter === 'LEARNING' && score >= 80) return false;
      if (masteryFilter === 'MASTERED' && score < 80) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchWord = item.word?.toLowerCase().includes(q);
        const matchPinyin = item.pinyin?.toLowerCase().includes(q);
        const matchHanViet = item.hanViet?.toLowerCase().includes(q) || item.sinoVietnamese?.toLowerCase().includes(q);
        const matchMeaning = item.meaningVi?.toLowerCase().includes(q) || item.meaning?.toLowerCase().includes(q);
        if (!matchWord && !matchPinyin && !matchHanViet && !matchMeaning) return false;
      }

      return true;
    });
  }, [items, hskFilter, lessonFilter, masteryFilter, searchQuery, masteryMap]);

  const currentItem = filteredItems[currentIndex] || filteredItems[0];

  // Helper to get mastery stars (1 to 5)
  const getStars = (vocabId: number) => {
    const score = masteryMap[vocabId] ?? 20;
    return Math.min(5, Math.max(1, Math.ceil(score / 20)));
  };

  // Flip flashcard
  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  // Play audio TTS
  const handlePlayAudio = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentItem) {
      speakChinese(currentItem.word);
    }
  };

  // SRS Rating action
  const handleRate = async (rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') => {
    if (!currentItem) return;

    const isSuccess = rating === 'GOOD' || rating === 'EASY';
    const delta = rating === 'EASY' ? 25 : rating === 'GOOD' ? 15 : rating === 'HARD' ? 5 : -10;

    try {
      await apiRequest('/progress/practice', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'VOCAB',
          targetKey: String(currentItem.vocabularyId),
          scoreDelta: delta,
          isCorrect: isSuccess,
        }),
      });

      // Update local mastery
      setMasteryMap((prev) => {
        const cur = prev[currentItem.vocabularyId] ?? 30;
        return {
          ...prev,
          [currentItem.vocabularyId]: Math.min(100, Math.max(0, cur + delta)),
        };
      });

      if (isSuccess) {
        triggerReaction('correct');
        setExpReward(15);
        if (delta >= 20) {
          setSealText('熟');
          setShowSeal(true);
          setTimeout(() => setShowSeal(false), 2000);
        }
      } else {
        triggerReaction('mistake');
      }
    } catch {
      // Offline fallback
    }

    setIsFlipped(false);
    if (currentIndex < filteredItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  // --- Practice Quiz Logic ---
  const quizPool = useMemo(() => {
    return filteredItems.slice(0, 10);
  }, [filteredItems]);

  const currentQuizItem = quizPool[quizIndex];
  const isTypingQuestion = quizIndex % 2 === 1;

  // Generate 4 multiple choice options
  const quizChoices = useMemo(() => {
    if (!currentQuizItem) return [];
    const correct = currentQuizItem.meaningVi || currentQuizItem.meaning || '';
    const distractors = items
      .filter((w) => w.vocabularyId !== currentQuizItem.vocabularyId)
      .map((w) => w.meaningVi || w.meaning || '')
      .filter(Boolean)
      .slice(0, 3);
    const pool = [correct, ...distractors];
    // Deterministic distribution to avoid impure Math.random during render
    return pool.sort((a, b) => a.localeCompare(b));
  }, [currentQuizItem, items]);

  const handleChoiceSelect = (choice: string) => {
    if (quizSubmitted) return;
    setSelectedChoice(choice);
  };

  const handleQuizSubmit = () => {
    if (quizSubmitted || !currentQuizItem) return;

    let correct = false;
    if (isTypingQuestion) {
      const normalizedInput = quizAnswer.trim().toLowerCase().replace(/\s+/g, '');
      const expectedPinyin = (currentQuizItem.pinyinNormalized || currentQuizItem.pinyin || '')
        .toLowerCase()
        .replace(/\s+/g, '');
      const expectedHanzi = currentQuizItem.word.trim();
      correct = normalizedInput === expectedPinyin || normalizedInput === expectedHanzi;
    } else {
      const expected = currentQuizItem.meaningVi || currentQuizItem.meaning || '';
      correct = selectedChoice === expected;
    }

    setQuizSubmitted(true);
    setQuizIsCorrect(correct);
    if (correct) {
      triggerReaction('correct');
      setQuizScore((prev) => prev + 1);
    } else {
      triggerReaction('mistake');
    }
  };

  const handleQuizNext = async () => {
    if (quizIndex < quizPool.length - 1) {
      setQuizIndex((prev) => prev + 1);
      setQuizAnswer('');
      setSelectedChoice(null);
      setQuizSubmitted(false);
      setQuizIsCorrect(null);
    } else {
      // Finish quiz!
      setQuizFinished(true);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      setExpReward(20);
      setSealText('通');
      setShowSeal(true);
      rewardBamboo(2);
      triggerReaction('cheer');

      // Award +20 EXP on backend
      try {
        await apiRequest('/progress/practice', {
          method: 'POST',
          body: JSON.stringify({
            targetType: 'VOCAB',
            targetKey: 'QUIZ_SESSION',
            scoreDelta: 20,
            isCorrect: true,
          }),
        });
      } catch {}
    }
  };

  const handleResetQuiz = () => {
    setQuizIndex(0);
    setQuizScore(0);
    setQuizAnswer('');
    setSelectedChoice(null);
    setQuizSubmitted(false);
    setQuizIsCorrect(null);
    setQuizFinished(false);
    setShowSeal(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 py-6">
      {/* Floating EXP micro-animation */}
      {expReward && <FloatingExpReward amount={expReward} onComplete={() => setExpReward(null)} />}

      {/* Top Header & Core Nav Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-fg">Trạm Từ Vựng · 词汇</h1>
            <span className="rounded bg-gold/15 px-2 py-0.5 font-sans text-xs font-semibold text-gold">
              HSK 1-6
            </span>
          </div>
          <p className="mt-1 text-xs text-fg-60">
            Học từ vựng tiếng Trung qua Thẻ nhớ 3D, Âm Hán Việt và Luyện gõ Pinyin.
            {stats && <span className="ml-2 text-fg-38">· Cần ôn hôm nay: {stats.dueToday}</span>}
          </p>
          {error && <p className="mt-1 text-xs text-red">{error}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StudyPetCompanion compact={true} />
          {/* Tab switcher */}
          <div className="inline-flex rounded border border-rule bg-card p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setTab('flashcard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                tab === 'flashcard' ? 'bg-fg text-bg font-semibold' : 'text-fg-60 hover:text-fg'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Thẻ 3D ({filteredItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('quiz');
                handleResetQuiz();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                tab === 'quiz' ? 'bg-fg text-bg font-semibold' : 'text-fg-60 hover:text-fg'
              }`}
            >
              <Dumbbell className="h-3.5 w-3.5" />
              <span>Luyện tập +20 EXP</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card/60 p-3 text-xs">
        {/* HSK Level Filter */}
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-fg-38">Cấp độ:</span>
          {[1, 2, 3, 4, 5, 6].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                setHskFilter(lvl);
                setCurrentIndex(0);
              }}
              className={`px-2 py-0.5 border ${
                hskFilter === lvl
                  ? 'border-gold bg-gold/20 text-gold font-bold'
                  : 'border-rule text-fg-60 hover:border-rule-strong hover:text-fg'
              }`}
            >
              HSK {lvl}
            </button>
          ))}
        </div>

        <span className="h-4 w-[1px] bg-rule" />

        {/* Lesson Filter */}
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-fg-38">Bài học:</span>
          {(['ALL', 1, 2, 3] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLessonFilter(l);
                setCurrentIndex(0);
              }}
              className={`px-2 py-0.5 border ${
                lessonFilter === l
                  ? 'border-fg bg-fg text-bg font-semibold'
                  : 'border-rule text-fg-60 hover:border-rule-strong hover:text-fg'
              }`}
            >
              {l === 'ALL' ? 'Tất cả' : `Bài ${l}`}
            </button>
          ))}
        </div>

        <span className="h-4 w-[1px] bg-rule" />

        {/* Mastery Filter */}
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-fg-38">Trạng thái:</span>
          <select
            value={masteryFilter}
            onChange={(e) => {
              setMasteryFilter(e.target.value as MasteryFilter);
              setCurrentIndex(0);
            }}
            className="border border-rule bg-bg px-2 py-0.5 text-fg text-xs focus:border-fg"
          >
            <option value="ALL">Tất cả</option>
            <option value="LEARNING">Đang học</option>
            <option value="MASTERED">Đã thông thạo (≥80%)</option>
          </select>
        </div>

        {/* Search input */}
        <div className="ml-auto flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentIndex(0);
            }}
            placeholder="Tìm chữ Hán, Pinyin, Hán Việt..."
            className="w-48 border border-rule bg-bg px-2.5 py-1 text-xs text-fg placeholder:text-fg-38 focus:border-fg focus:outline-none"
          />
        </div>
      </div>

      {/* Loading & Empty States */}
      {loading && (
        <div className="flex h-64 items-center justify-center text-xs text-fg-60">
          Đang tải dữ liệu từ vựng tiếng Trung...
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <div className="flex h-64 flex-col items-center justify-center text-center">
          <p className="font-serif text-lg text-fg-60">Không tìm thấy từ vựng phù hợp</p>
          <p className="mt-1 text-xs text-fg-38">Thử đổi bộ lọc HSK, Bài học hoặc từ khoá tìm kiếm.</p>
        </div>
      )}

      {/* MODE 1: 3D Flashcard Mode */}
      {!loading && tab === 'flashcard' && currentItem && (
        <div className="flex flex-col items-center gap-6">
          {/* Card Meta & Mastery Bar */}
          <div className="flex w-full max-w-[560px] items-center justify-between text-xs text-fg-60">
            <div className="flex items-center gap-2">
              <span className="font-mono text-fg-38">
                {currentIndex + 1} / {filteredItems.length}
              </span>
              <span>· HSK {currentItem.hskLevel || 1}</span>
              <span>· Bài {currentItem.lessonNumber || 1}</span>
            </div>

            {/* Mastery Stars */}
            <div className="flex items-center gap-1" title="Độ thông thạo từ">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < getStars(currentItem.vocabularyId)
                      ? 'fill-gold text-gold'
                      : 'text-fg-38'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 3D Flashcard Container */}
          <div
            className="perspective-1000 w-full max-w-[560px] cursor-pointer"
            onClick={handleFlip}
          >
            <div
              className={`relative min-h-[340px] w-full transition-transform duration-500 transform-style-3d ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* FRONT SIDE */}
              <div className="absolute inset-0 flex flex-col justify-between border border-rule bg-card p-8 backface-hidden shadow-lg transition-colors hover:border-rule-strong">
                {/* Top header */}
                <div className="flex items-center justify-between">
                  <span className="border border-gold/40 bg-gold/10 px-2 py-0.5 text-[11px] font-semibold text-gold">
                    HSK {currentItem.hskLevel || 1}
                  </span>
                  <button
                    type="button"
                    onClick={handlePlayAudio}
                    title="Phát âm tiếng Trung"
                    className="flex h-8 w-8 items-center justify-center border border-rule text-fg-60 transition-colors hover:border-fg hover:text-fg"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Main Hanzi */}
                <div className="my-auto flex flex-col items-center justify-center text-center">
                  <span className="font-serif text-6xl font-medium tracking-wide text-fg">
                    {currentItem.word}
                  </span>
                  {currentItem.traditional && currentItem.traditional !== currentItem.word && (
                    <span className="mt-2 text-xs text-fg-38">
                      Phồn thể: {currentItem.traditional}
                    </span>
                  )}
                </div>

                {/* Bottom hint */}
                <div className="flex items-center justify-between text-[11px] text-fg-38">
                  <span>Nhấn vào thẻ hoặc phím Space để lật</span>
                  <span>{currentItem.partOfSpeech || 'Từ vựng'}</span>
                </div>
              </div>

              {/* BACK SIDE */}
              <div className="absolute inset-0 flex flex-col justify-between border border-rule bg-card p-8 rotate-y-180 backface-hidden shadow-lg">
                {/* Red Seal Stamp animation if mastered */}
                {showSeal && (
                  <div className="absolute right-6 top-6 z-20">
                    <RedSealStamp text={sealText} size={58} />
                  </div>
                )}

                {/* Back Top */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-xl text-fg-60">{currentItem.word}</span>
                    <button
                      type="button"
                      onClick={handlePlayAudio}
                      title="Nghe phát âm"
                      className="flex h-7 w-7 items-center justify-center border border-rule text-fg-60 hover:text-fg"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Prominent Âm Hán Việt Badge */}
                  <span className="rounded border border-cinnabar/40 bg-cinnabar/10 px-2.5 py-0.5 font-sans text-xs font-bold tracking-wide text-cinnabar">
                    Hán Việt: {(currentItem.hanViet || currentItem.sinoVietnamese || 'Đang cập nhật').toUpperCase()}
                  </span>
                </div>

                {/* Back Content */}
                <div className="my-auto flex flex-col items-center text-center">
                  {/* Pinyin */}
                  <span className="font-sans text-2xl font-semibold tracking-wide text-gold">
                    {currentItem.pinyin || currentItem.reading}
                  </span>

                  {/* Vietnamese Meaning */}
                  <span className="mt-3 text-lg font-medium text-fg">
                    {currentItem.meaningVi || currentItem.meaning}
                  </span>

                  {/* Bilingual Example Sentence */}
                  {(currentItem.exampleZh || currentItem.exampleSentence) && (
                    <div className="mt-4 max-w-[460px] border-t border-rule/60 pt-3 text-left">
                      <p className="font-serif text-xs text-fg/90">
                        {currentItem.exampleZh || currentItem.exampleSentence}
                      </p>
                      {(currentItem.examplePinyin || currentItem.exampleReading) && (
                        <p className="font-sans text-[11px] text-gold/80">
                          {currentItem.examplePinyin || currentItem.exampleReading}
                        </p>
                      )}
                      {(currentItem.exampleVi || currentItem.exampleMeaning) && (
                        <p className="text-[11px] text-fg-60">
                          {currentItem.exampleVi || currentItem.exampleMeaning}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Flip back hint */}
                <div className="text-center text-[11px] text-fg-38">
                  Nhấn để lật lại chữ Hán
                </div>
              </div>
            </div>
          </div>

          {/* Rating Action Buttons (SRS interval) */}
          <div className="flex w-full max-w-[560px] items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => void handleRate('AGAIN')}
              className="flex-1 border border-red/40 py-2 text-xs font-medium text-red transition-colors hover:bg-red/10"
            >
              Chưa nhớ (-10)
            </button>
            <button
              type="button"
              onClick={() => void handleRate('HARD')}
              className="flex-1 border border-rule py-2 text-xs font-medium text-fg-60 transition-colors hover:border-fg hover:text-fg"
            >
              Khó (+5)
            </button>
            <button
              type="button"
              onClick={() => void handleRate('GOOD')}
              className="flex-1 border border-jade/50 bg-jade/10 py-2 text-xs font-semibold text-jade transition-colors hover:bg-jade/20"
            >
              Thuộc (+15 EXP)
            </button>
            <button
              type="button"
              onClick={() => void handleRate('EASY')}
              className="flex-1 border border-gold/50 bg-gold/10 py-2 text-xs font-bold text-gold transition-colors hover:bg-gold/20"
            >
              Dễ dàng (+25)
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: Practice Quiz & Pinyin Typing Mode */}
      {!loading && tab === 'quiz' && (
        <div className="mx-auto w-full max-w-[620px]">
          {/* Quiz in progress */}
          {!quizFinished && currentQuizItem && (
            <div className="flex flex-col gap-6 border border-rule bg-card p-8 shadow-md">
              {/* Quiz progress */}
              <div className="flex items-center justify-between border-b border-rule pb-3 text-xs text-fg-60">
                <span>
                  Câu hỏi {quizIndex + 1} / {quizPool.length}
                </span>
                <span className="font-semibold text-gold">Điểm: {quizScore}</span>
              </div>

              {/* Question prompt */}
              <div className="flex flex-col items-center gap-3 text-center">
                <span className="text-xs uppercase tracking-widest text-fg-38">
                  {isTypingQuestion ? 'Luyện gõ Pinyin / Chữ Hán' : 'Chọn nghĩa tiếng Việt đúng'}
                </span>
                <span className="font-serif text-5xl font-semibold text-fg">
                  {currentQuizItem.word}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-sans text-sm font-medium text-gold">
                    {currentQuizItem.pinyin || currentQuizItem.reading}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakChinese(currentQuizItem.word)}
                    className="text-fg-38 hover:text-fg"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-xs text-cinnabar font-medium">
                  Hán Việt: {(currentQuizItem.hanViet || currentQuizItem.sinoVietnamese || '').toUpperCase()}
                </span>
              </div>

              {/* Multiple Choice Mode */}
              {!isTypingQuestion && (
                <div className="flex flex-col gap-2.5">
                  {quizChoices.map((choice, i) => {
                    const isSelected = selectedChoice === choice;
                    const isCorrectChoice = choice === (currentQuizItem.meaningVi || currentQuizItem.meaning);
                    let btnStyle = 'border-rule hover:border-fg text-fg';

                    if (quizSubmitted) {
                      if (isCorrectChoice) {
                        btnStyle = 'border-jade bg-jade/15 text-jade font-semibold';
                      } else if (isSelected) {
                        btnStyle = 'border-red bg-red/15 text-red';
                      } else {
                        btnStyle = 'border-rule/40 text-fg-38';
                      }
                    } else if (isSelected) {
                      btnStyle = 'border-gold bg-gold/15 text-gold font-medium';
                    }

                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={quizSubmitted}
                        onClick={() => handleChoiceSelect(choice)}
                        className={`flex items-center justify-between border p-3 text-left text-xs transition-colors ${btnStyle}`}
                      >
                        <span>{choice}</span>
                        <span className="font-mono text-[10px] text-fg-38">[{i + 1}]</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Typing Mode */}
              {isTypingQuestion && (
                <div className="flex flex-col gap-3">
                  <label className="text-xs text-fg-60">
                    Nhập Pinyin (ví dụ: <span className="text-gold font-mono">{currentQuizItem.pinyinNormalized}</span>) hoặc gõ chữ Hán:
                  </label>
                  <input
                    type="text"
                    disabled={quizSubmitted}
                    value={quizAnswer}
                    onChange={(e) => setQuizAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (!quizSubmitted) handleQuizSubmit();
                        else handleQuizNext();
                      }
                    }}
                    placeholder="Gõ pinyin hoặc chữ Hán rồi bấm Enter..."
                    className="border border-rule bg-bg p-3 text-sm font-sans text-fg focus:border-gold focus:outline-none"
                    autoFocus
                  />
                  {quizSubmitted && !quizIsCorrect && (
                    <div className="text-xs text-red">
                      Đáp án đúng:{' '}
                      <span className="font-bold text-fg">
                        {currentQuizItem.pinyin} ({currentQuizItem.pinyinNormalized})
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                {!quizSubmitted ? (
                  <button
                    type="button"
                    onClick={handleQuizSubmit}
                    disabled={!isTypingQuestion && !selectedChoice}
                    className="ml-auto bg-fg px-6 py-2 text-xs font-semibold text-bg transition-opacity disabled:opacity-40"
                  >
                    Kiểm tra
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleQuizNext()}
                    className="ml-auto flex items-center gap-1.5 bg-jade px-6 py-2 text-xs font-bold text-bg hover:opacity-90"
                  >
                    <span>Tiếp tục</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quiz Finished Screen */}
          {quizFinished && (
            <div className="relative flex flex-col items-center gap-6 border border-rule bg-card p-10 text-center shadow-lg">
              {/* Red Seal Stamp animation */}
              {showSeal && (
                <div className="absolute right-8 top-8">
                  <RedSealStamp text="通" size={72} />
                </div>
              )}

              <Sparkles className="h-10 w-10 text-gold" />
              <div>
                <h2 className="font-serif text-2xl font-bold text-fg">Hoàn thành bài luyện tập!</h2>
                <p className="mt-1 text-xs text-fg-60">
                  Bạn trả lời đúng {quizScore} / {quizPool.length} câu hỏi.
                </p>
              </div>

              <div className="rounded-full border border-gold/40 bg-gold/10 px-5 py-2 font-sans text-sm font-bold text-gold">
                +20 EXP Đã được cộng vào tài khoản!
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleResetQuiz}
                  className="flex items-center gap-1.5 border border-rule px-4 py-2 text-xs font-medium text-fg hover:border-fg"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Luyện lại</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('flashcard')}
                  className="bg-fg px-5 py-2 text-xs font-semibold text-bg hover:opacity-90"
                >
                  Về Thẻ học 3D
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FlashcardView;

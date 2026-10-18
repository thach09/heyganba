import React, { useCallback, useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Volume2,
  RotateCcw,
  BookOpen,
  Calendar,
  BookmarkPlus,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Eye,
  EyeOff,
  Plus,
  X,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useAuth } from '../../app/useAuth';
import { useRequestScope } from '../../lib/hooks/useRequestScope';
import { flashcardApi, vocabularyApi, notebookApi } from './api';
import type {
  FlashcardDueItem,
  FlashcardStats,
  FlashcardReviewResult,
  SrsRating,
  VocabularyLesson,
  VocabularyWord,
} from './types';
import { useSearchParams } from 'react-router-dom';
import type { VocabNotebook } from '../dictionary/types';
import { speakChinese, stopChineseSpeech } from '../../services/chineseSpeech';
import { RedSealStamp } from '../../components/RedSealStamp';
import { StudyPetCompanion } from '../companion/StudyPetCompanion';
import { useCompanion } from '../companion/useCompanionStore';
import { checkPinyinAnswer } from '../pinyin/pinyinData';

type MainViewMode = 'LESSONS' | 'SRS';
type LessonSubMode = 'LIST' | 'STUDY' | 'QUIZ';

interface PendingSrsAttempt {
  readonly accountId: number;
  readonly vocabularyId: number;
  readonly rating: SrsRating;
  readonly attemptId: string;
}

export const FlashcardView: React.FC = () => {
  const { user, requireLogin } = useAuth();
  const userId = user?.userId;
  const { run, cancel, isActive } = useRequestScope(userId);
  const { triggerReaction, rewardBamboo } = useCompanion();

  // Search params for preview query
  const [searchParams, setSearchParams] = useSearchParams();
  // Query parameter NEVER grants ROLE_ADMIN; role strictly comes from authenticated session
  const isAdmin = user?.role === 'ROLE_ADMIN';
  const previewParam = searchParams.get('preview') === '1' || searchParams.get('preview') === 'true';

  // Admin Preview Toggle (Strictly restricted to authenticated ROLE_ADMIN)
  // When active: shows all drafts/pending review. When inactive: previews student view (approved only).
  const [adminPreviewDisabled, setAdminPreviewDisabled] = useState<boolean>(false);
  const adminPreviewActive = isAdmin && (previewParam || !adminPreviewDisabled);
  const attemptedUnauthorizedPreview = !isAdmin && (previewParam || searchParams.get('admin') === '1');

  const togglePreview = () => {
    if (!isAdmin) {
      requireLogin();
      return;
    }
    const nextActive = !adminPreviewActive;
    setAdminPreviewDisabled(!nextActive);
    const newParams = new URLSearchParams(searchParams);
    if (nextActive) {
      newParams.set('preview', '1');
    } else {
      newParams.delete('preview');
    }
    setSearchParams(newParams);
  };

  // Top Tabs
  const [mainMode, setMainMode] = useState<MainViewMode>('LESSONS');

  // Lesson Catalog State
  const [lessons, setLessons] = useState<VocabularyLesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<VocabularyLesson | null>(null);
  const [lessonWords, setLessonWords] = useState<VocabularyWord[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [lessonWordsLoading, setLessonWordsLoading] = useState(false);
  const [lessonWordsError, setLessonWordsError] = useState<string | null>(null);

  // Lesson Sub-mode State
  const [lessonSubMode, setLessonSubMode] = useState<LessonSubMode>('LIST');
  const [studyWordIndex, setStudyWordIndex] = useState(0);
  const [studyFlipped, setStudyFlipped] = useState(false);
  const [searchWordQuery, setSearchWordQuery] = useState('');

  // SRS Due Session State (Decoupled from Lesson catalog)
  const [dueItems, setDueItems] = useState<FlashcardDueItem[]>([]);
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [srsIndex, setSrsIndex] = useState(0);
  const [srsFlipped, setSrsFlipped] = useState(false);
  const [srsSubmitting, setSrsSubmitting] = useState(false);
  const [srsLoading, setSrsLoading] = useState(false);
  const [srsError, setSrsError] = useState<string | null>(null);
  const [pendingAttempt, setPendingAttempt] = useState<PendingSrsAttempt | null>(null);
  const [srsSessionFinished, setSrsSessionFinished] = useState(false);
  const [srsReviewedCount, setSrsReviewedCount] = useState(0);
  const [lastSrsResult, setLastSrsResult] = useState<FlashcardReviewResult | null>(null);

  // Red Seal Animation & Feedback
  const [showSeal, setShowSeal] = useState(false);
  const [sealText, setSealText] = useState('通');

  // Notebook Save Modal State
  const [notebookModalOpen, setNotebookModalOpen] = useState(false);
  const [wordToSave, setWordToSave] = useState<{ id: number; word: string; pinyin?: string | null } | null>(null);
  const [userNotebooks, setUserNotebooks] = useState<VocabNotebook[]>([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState<number | 'NEW'>('NEW');
  const [newNotebookTitle, setNewNotebookTitle] = useState('');
  const [notebookListLoading, setNotebookListLoading] = useState(false);
  const [notebookListError, setNotebookListError] = useState<string | null>(null);
  const [notebookSaveLoading, setNotebookSaveLoading] = useState(false);
  const [notebookFeedback, setNotebookFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Practice Quiz State for Lesson
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizIsCorrect, setQuizIsCorrect] = useState<boolean | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  // Stop Chinese TTS audio when navigating away or unmounting
  useEffect(() => {
    return () => {
      stopChineseSpeech();
    };
  }, []);

  // 1. Load Lessons Catalog (Public / Guest readable; does not touch SRS)
  const loadLessons = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);

    const res = await run('load-lessons', signal => vocabularyApi.lessons({ signal }));
    if (res && res.success && res.data) {
      setLessons(res.data);
      setSelectedLesson(prev => {
        if (prev && res.data.some(l => l.id === prev.id)) {
          return prev;
        }
        return null; // The filtered catalog below chooses the first eligible lesson.
      });
    } else {
      setLessons([]);
      setSelectedLesson(null);
      if (res && !res.success) {
        setCatalogError(res.message || 'Không thể kết nối máy chủ để tải danh sách bài học.');
      }
    }
    setCatalogLoading(false);
  }, [run]);

  // 2. Load Words for Selected Lesson (Public / Guest readable; independent of SRS)
  const loadSelectedLessonWords = useCallback(async (slug: string) => {
    setLessonWordsLoading(true);
    setLessonWordsError(null);

    const res = await run('load-lesson-words', signal => vocabularyApi.lessonWords(slug, { signal })).catch(error => ({ success: false, data: undefined, message: error instanceof Error ? error.message : 'Kh?ng t?i ???c b?i h?c.' }));
    if (res && res.success && res.data) {
      setLessonWords(res.data);
    } else {
      setLessonWords([]);
      if (res && !res.success) {
        setLessonWordsError(res.message || 'Không thể tải danh sách từ vựng của bài học.');
      }
    }
    setStudyWordIndex(0);
    setStudyFlipped(false);
    setQuizIndex(0);
    setQuizFinished(false);
    setQuizScore(0);
    setLessonWordsLoading(false);
  }, [run]);

  // 3. Refresh Stats only (Does NOT reset or advance current SRS card session)
  const refreshStats = useCallback(async () => {
    if (!user) {
      setStats(null);
      return;
    }
    const res = await run('refresh-srs-stats', signal => flashcardApi.stats({ signal }));
    if (res && res.success && res.data) {
      setStats(res.data);
    }
  }, [user, run]);

  // 4. Load SRS Due Session (Authenticated only; never called for guests)
  const loadSrsData = useCallback(async () => {
    if (!user) {
      setDueItems([]);
      setStats(null);
      setSrsSessionFinished(true);
      return;
    }
    setSrsLoading(true);
    setSrsError(null);

    const loaded = await run('load-srs', signal =>
      Promise.all([
        flashcardApi.due({ signal }),
        flashcardApi.stats({ signal }),
      ])
    );
    if (!loaded) return;
    const [dueRes, statsRes] = loaded;

    if (dueRes && dueRes.success && dueRes.data) {
      setDueItems(dueRes.data);
      setSrsIndex(0);
      setSrsFlipped(false);
      setPendingAttempt(null);
      setSrsSessionFinished(dueRes.data.length === 0);
    } else {
      setDueItems([]);
      setSrsSessionFinished(true);
      if (dueRes && !dueRes.success) {
        setSrsError(dueRes.message || 'Không thể tải danh sách ôn tập SRS từ máy chủ.');
      }
    }

    if (statsRes && statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    } else {
      setStats(null);
    }
    setSrsLoading(false);
  }, [user, run]);

  // Initial load on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLessons();
      if (user) {
        void refreshStats();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [loadLessons, refreshStats, user]);

  // When selected lesson changes, ONLY load its words (SRS is completely untouched!)
  const selectedSlug = selectedLesson?.slug;
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedSlug) {
        void loadSelectedLessonWords(selectedSlug);
      } else {
        setLessonWords([]);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedSlug, loadSelectedLessonWords]);

  // When user identity / session changes (login, logout, switch account):
  // Cancel previous requests and wipe account-scoped state
  useEffect(() => {
    cancel('load-srs');
    cancel('refresh-srs-stats');
    cancel('srs-review');
    cancel('load-notebooks');

    queueMicrotask(() => {
      setDueItems([]);
      setStats(null);
      setSrsIndex(0);
      setSrsFlipped(false);
      setSrsSubmitting(false);
      setSrsError(null);
      setPendingAttempt(null);
      setSrsSessionFinished(false);
      setSrsReviewedCount(0);
      setLastSrsResult(null);

      setUserNotebooks([]);
      setSelectedNotebookId('NEW');
      setWordToSave(null);
      setNotebookModalOpen(false);
      setNotebookFeedback(null);
      setNotebookListError(null);
    });

    const timer = setTimeout(() => {
      void loadLessons();
      if (user) {
        void refreshStats();
        if (mainMode === 'SRS') {
          void loadSrsData();
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Switch to SRS Tab
  const handleSwitchToSrs = () => {
    stopChineseSpeech();
    setMainMode('SRS');
    if (user && dueItems.length === 0 && !srsSessionFinished) {
      void loadSrsData();
    }
  };

  // URL is the source of truth, including back/forward and removing the filter.
  const rawLevel = (searchParams.get('level') || '').trim().toUpperCase().replace(/\s/g, '');
  const selectedLevelFilter = /^(HSK)?[1-6]$/.test(rawLevel)
    ? `HSK ${rawLevel.slice(-1)}` : rawLevel === 'INTRO' ? 'Nhập môn' : 'ALL';
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>('');
  const availableLevels = ['Nhập môn', ...[1, 2, 3, 4, 5, 6].map(n => `HSK ${n}`)];
  const setSelectedLevelFilter = (level: string) => {
    const params = new URLSearchParams(searchParams);
    if (level === 'ALL') params.delete('level');
    else params.set('level', level === 'Nhập môn' ? 'INTRO' : level.replace(' ', ''));
    setSearchParams(params);
    setSelectedLesson(null);
  };

  // Filtered lessons based on Admin Preview vs Student View + Level Filter + Search
  const displayedLessons = useMemo(() => {
    let list = lessons;
    if (isAdmin && !adminPreviewActive) {
      list = list.filter(l => l.wordCount > 0);
    }
    if (selectedLevelFilter !== 'ALL') {
      list = list.filter(l => l.curriculumLevel === selectedLevelFilter);
    }
    if (catalogSearchQuery.trim()) {
      const q = catalogSearchQuery.trim().toLowerCase();
      list = list.filter(l =>
        l.title.toLowerCase().includes(q) ||
        (l.description && l.description.toLowerCase().includes(q)) ||
        l.slug.toLowerCase().includes(q)
      );
    }
    return list;
  }, [lessons, isAdmin, adminPreviewActive, selectedLevelFilter, catalogSearchQuery]);

  useEffect(() => {
    if (!displayedLessons.some(lesson => lesson.id === selectedLesson?.id)) {
      queueMicrotask(() => {
        setSelectedLesson(displayedLessons[0] ?? null);
        setLessonWords([]);
      });
    }
  }, [displayedLessons, selectedLesson?.id]);

  // Filtered lesson words for list view
  const filteredLessonWords = useMemo(() => {
    let list = lessonWords;
    if (isAdmin && !adminPreviewActive) {
      list = list.filter(w => w.reviewStatus === 'APPROVED');
    }
    if (!searchWordQuery.trim()) return list;
    const q = searchWordQuery.trim().toLowerCase();
    return list.filter(w =>
      w.word.toLowerCase().includes(q) ||
      (w.pinyin && w.pinyin.toLowerCase().includes(q)) ||
      (w.meaningVi && w.meaningVi.toLowerCase().includes(q)) ||
      (w.hanViet && w.hanViet.toLowerCase().includes(q))
    );
  }, [lessonWords, searchWordQuery, isAdmin, adminPreviewActive]);

  // Current word in study mode
  const currentStudyWord = lessonWords[studyWordIndex] || lessonWords[0];

  // Current item in SRS mode
  const currentSrsItem = dueItems[srsIndex] || dueItems[0];

  // Distinct due vs new in SRS session
  const srsDueCounts = useMemo(() => {
    const dueCount = dueItems.filter(i => !i.isNew).length;
    const newCount = dueItems.filter(i => i.isNew).length;
    return { dueCount, newCount };
  }, [dueItems]);

  // Load Notebooks
  const loadUserNotebooks = async () => {
    setNotebookListLoading(true);
    setNotebookListError(null);

    const res = await run('load-notebooks', signal => notebookApi.list({ signal }));
    setNotebookListLoading(false);

    if (res && res.success && res.data) {
      setUserNotebooks(res.data);
      if (res.data.length > 0) {
        setSelectedNotebookId(res.data[0].id);
      } else {
        setSelectedNotebookId('NEW');
        setNewNotebookTitle('Từ vựng yêu thích');
      }
    } else {
      setUserNotebooks([]);
      if (res && !res.success) {
        setNotebookListError(res.message || 'Không thể tải danh sách sổ từ cá nhân.');
      }
    }
  };

  // Open Notebook Save Modal (Never injects fake mock notebooks!)
  const handleOpenNotebookModal = async (vocab: { id: number; word: string; pinyin?: string | null }) => {
    if (!user) {
      requireLogin();
      return;
    }
    setWordToSave(vocab);
    setNotebookFeedback(null);
    setNotebookListError(null);
    setUserNotebooks([]);
    setSelectedNotebookId('NEW');
    setNewNotebookTitle('');
    setNotebookModalOpen(true);
    await loadUserNotebooks();
  };

  // Submit Save to Notebook (If creation succeeds, retains created ID to prevent duplicate notebooks on retry)
  const handleSaveToNotebook = async () => {
    if (!wordToSave || !user || notebookSaveLoading) return;
    setNotebookSaveLoading(true);
    setNotebookFeedback(null);

    try {
      let targetId: number;
      if (selectedNotebookId === 'NEW') {
        const title = newNotebookTitle.trim() || 'Sổ từ mới';
        const createRes = await notebookApi.create({ title, description: 'Sổ lưu từ vựng cá nhân' });
        if (!createRes.success || !createRes.data) {
          throw new Error(createRes.message || 'Không thể tạo sổ từ mới.');
        }
        targetId = createRes.data.id;
        // Retain created notebook so retry will NOT duplicate creation
        setSelectedNotebookId(targetId);
        setUserNotebooks(prev => [createRes.data!, ...prev.filter(n => n.id !== targetId)]);
      } else {
        targetId = selectedNotebookId;
      }

      const addRes = await notebookApi.addWord(targetId, { vocabularyId: wordToSave.id });
      if (addRes.success) {
        setNotebookFeedback({
          type: 'success',
          message: `Đã lưu từ "${wordToSave.word}" vào sổ thành công!`,
        });
        setTimeout(() => {
          setNotebookModalOpen(false);
          setNotebookFeedback(null);
        }, 1400);
      } else {
        setNotebookFeedback({
          type: 'error',
          message: addRes.message || 'Không thể lưu từ vào sổ này.',
        });
      }
    } catch (err: any) {
      setNotebookFeedback({
        type: 'error',
        message: err.message || 'Lỗi mạng khi lưu từ vào sổ cá nhân.',
      });
    } finally {
      setNotebookSaveLoading(false);
    }
  };

  // --- SRS Review Submission with Immutable Attempt Lock ---
  const handleSrsRate = async (rating: SrsRating) => {
    if (!user) {
      requireLogin();
      return;
    }
    if (!currentSrsItem || srsSubmitting) return;

    // While waiting for resolution of a pending attempt for this card, lock against rating changes
    if (pendingAttempt && pendingAttempt.vocabularyId === currentSrsItem.vocabularyId) {
      return;
    }

    const attempt: PendingSrsAttempt = {
      accountId: user.userId,
      vocabularyId: currentSrsItem.vocabularyId,
      rating,
      attemptId: crypto.randomUUID(),
    };
    setPendingAttempt(attempt);
    await executeSrsAttempt(attempt);
  };

  const executeSrsAttempt = async (attempt: PendingSrsAttempt) => {
    if (srsSubmitting) return;
    const targetAccountId = attempt.accountId;
    const targetVocabId = attempt.vocabularyId;

    setSrsSubmitting(true);
    setSrsError(null);

    try {
      const res = await run('srs-review', signal =>
        flashcardApi.review(
          {
            vocabularyId: attempt.vocabularyId,
            rating: attempt.rating,
            attemptId: attempt.attemptId,
          },
          { signal }
        )
      );

      // Verify response is still valid for current active user and card
      if (!isActive() || !user || user.userId !== targetAccountId || currentSrsItem?.vocabularyId !== targetVocabId) {
        return;
      }

      if (res && res.success && res.data) {
        setLastSrsResult(res.data);
        setPendingAttempt(null);
        setSrsReviewedCount(prev => prev + 1);

        if (attempt.rating === 'GOOD' || attempt.rating === 'EASY') {
          triggerReaction('correct');
          if (attempt.rating === 'EASY') {
            setSealText('熟');
            setShowSeal(true);
            setTimeout(() => setShowSeal(false), 1600);
          }
        } else {
          triggerReaction('mistake');
        }

        setSrsFlipped(false);
        if (srsIndex < dueItems.length - 1) {
          setSrsIndex(prev => prev + 1);
        } else if (!srsSessionFinished) {
          setSrsSessionFinished(true);
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
          rewardBamboo(2);
        }

        // Refresh stats asynchronously without resetting the active session
        void refreshStats();
      } else {
        // Failure: keep card and input, allow explicit retry
        setSrsError(res?.message || 'Không thể kết nối máy chủ để lưu kết quả SRS. Thẻ được giữ nguyên để bạn thử lại.');
      }
    } catch (err: any) {
      setSrsError(err.message || 'Lỗi mạng khi lưu kết quả SRS.');
    } finally {
      setSrsSubmitting(false);
    }
  };

  // Retry the pending SRS rating with the exact same immutable payload
  const handleSrsRetry = () => {
    if (pendingAttempt) {
      void executeSrsAttempt(pendingAttempt);
    }
  };

  // --- Practice Quiz within Lesson ---
  const quizPool = useMemo(() => {
    return lessonWords.slice(0, 10);
  }, [lessonWords]);

  const currentQuizItem = quizPool[quizIndex];
  const isTypingQuestion = quizIndex % 2 === 1;

  const quizChoices = useMemo(() => {
    if (!currentQuizItem) return [];
    const correct = currentQuizItem.meaningVi || '';
    const distractors = lessonWords
      .filter(w => w.id !== currentQuizItem.id)
      .map(w => w.meaningVi || '')
      .filter(Boolean)
      .slice(0, 3);
    const pool = [correct, ...distractors];
    return pool.sort((a, b) => a.localeCompare(b));
  }, [currentQuizItem, lessonWords]);

  const handleQuizSubmit = () => {
    if (quizSubmitted || !currentQuizItem) return;

    let correct = false;
    if (isTypingQuestion) {
      // Use checkPinyinAnswer: handles tones, rejects Hanzi, preserves u/ü
      const expected = currentQuizItem.pinyin || '';
      correct = checkPinyinAnswer(quizAnswer, expected);
    } else {
      const expected = currentQuizItem.meaningVi || '';
      correct = selectedChoice === expected;
    }

    setQuizSubmitted(true);
    setQuizIsCorrect(correct);
    if (correct) {
      triggerReaction('correct');
      setQuizScore(prev => prev + 1);
    } else {
      triggerReaction('mistake');
    }
  };

  const handleQuizNext = () => {
    if (quizIndex < quizPool.length - 1) {
      setQuizIndex(prev => prev + 1);
      setQuizSubmitted(false);
      setQuizIsCorrect(null);
      setQuizAnswer('');
      setSelectedChoice(null);
    } else {
      setQuizFinished(true);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      rewardBamboo(1);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
      {/* Top Academic Review Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded border border-jade/30 bg-jade/10 p-3.5 text-xs text-jade-ink">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-jade-ink shrink-0" />
          <div>
            <span className="font-bold text-jade-ink">Từ vựng HSK 1–6 · Nội dung đã duyệt</span>
            <span className="text-jade-ink block sm:inline sm:ml-2">
              (Học theo chủ đề và ôn tập SRS theo cấp độ)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isAdmin ? (
            <>
              <span className="inline-flex items-center gap-1 rounded bg-cinnabar/20 text-cinnabar-ink border border-cinnabar/30 px-2 py-0.5 text-[11px] font-semibold">
                <ShieldCheck size={13} /> Admin
              </span>
              <button
                type="button"
                onClick={togglePreview}
                className="inline-flex items-center gap-1 rounded border border-gold/40 bg-card px-2.5 py-1 text-[11px] font-semibold text-gold-ink hover:bg-tint cursor-pointer transition-colors"
              >
                {adminPreviewActive ? <EyeOff size={13} /> : <Eye size={13} />}
                {adminPreviewActive ? 'Chuyển sang góc nhìn học viên' : 'Bật xem trước bản nháp Admin'}
              </button>
            </>
          ) : !user ? (
            <button
              type="button"
              onClick={requireLogin}
              className="inline-flex items-center gap-1 rounded border border-gold/40 bg-card px-2.5 py-1 text-[11px] font-semibold text-gold-ink hover:bg-tint cursor-pointer transition-colors"
            >
              <ShieldCheck size={13} /> Đăng nhập Admin
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-stone-700/50 text-stone-300 border border-stone-600/50 px-2 py-0.5 text-[11px]">
              Tài khoản học viên
            </span>
          )}
        </div>
      </div>

      {attemptedUnauthorizedPreview && (
        <div className="flex items-center gap-2 rounded border border-cinnabar/40 bg-cinnabar/10 p-3 text-xs text-cinnabar-ink">
          <AlertTriangle size={16} className="text-cinnabar-ink shrink-0" />
          <span>
            <strong>Từ chối quyền truy cập xem trước (?preview=1)</strong>: Chế độ xem trước nội dung chưa kiểm duyệt chỉ dành riêng cho tài khoản Quản trị viên (<code className="font-sans">ROLE_ADMIN</code>). Tài khoản thông thường hoặc khách không có quyền xem trước.
          </span>
        </div>
      )}

      {catalogError && (
        <div className="flex items-center justify-between rounded border border-cinnabar/30 bg-cinnabar/10 p-3 text-xs text-cinnabar-ink">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-cinnabar-ink" />
            <span>{catalogError}</span>
          </div>
          <button
            type="button"
            onClick={() => setCatalogError(null)}
            className="text-cinnabar-ink hover:text-cinnabar-ink cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {lessonWordsError && (
        <div className="flex items-center justify-between rounded border border-cinnabar/30 bg-cinnabar/10 p-3 text-xs text-cinnabar-ink">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-cinnabar-ink" />
            <span>{lessonWordsError}</span>
          </div>
          <button
            type="button"
            onClick={() => setLessonWordsError(null)}
            className="text-cinnabar-ink hover:text-cinnabar-ink cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Station Header */}
      <div className="flex flex-col gap-4 border-b border-rule pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cinnabar-ink">
            <span className="inline-block h-2 w-2 rounded-full bg-cinnabar" />
            Trạm 2 · 词汇与记忆 · Từ vựng & Sổ từ · [M2.2 Hoạt động thật]
            {(catalogLoading || lessonWordsLoading) && <RefreshCw size={13} className="animate-spin text-cinnabar-ink inline ml-1" />}
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-fg">
            Từ vựng & Ôn tập SRS
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-fg-60">
            Nắm chắc từ vựng tiếng Trung qua ngữ cảnh thực tế, lưu từ vào sổ cá nhân và ghi nhớ dài hạn bằng thuật toán lặp lại ngắt quãng SRS (SM-2).
          </p>
        </div>

        {/* Companion Dock */}
        <div className="flex items-center gap-3">
          <StudyPetCompanion />
        </div>
      </div>

      {/* Primary Mode Tabs: Học theo bài vs Ôn đến hạn (SRS) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              stopChineseSpeech();
              setMainMode('LESSONS');
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 font-serif text-sm font-semibold transition-all cursor-pointer ${
              mainMode === 'LESSONS'
                ? 'border-cinnabar text-cinnabar-ink'
                : 'border-transparent text-fg-60 hover:text-fg'
            }`}
          >
            <BookOpen size={16} /> Học theo bài (Giáo trình)
          </button>
          <button
            type="button"
            onClick={handleSwitchToSrs}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 font-serif text-sm font-semibold transition-all cursor-pointer ${
              mainMode === 'SRS'
                ? 'border-cinnabar text-cinnabar-ink'
                : 'border-transparent text-fg-60 hover:text-fg'
            }`}
          >
            <Calendar size={16} /> Ôn đến hạn (SRS SM-2)
            {srsLoading && <RefreshCw size={13} className="animate-spin text-cinnabar-ink inline ml-1" />}
            {stats && stats.dueToday > 0 && (
              <span className="rounded-full bg-cinnabar px-2 py-0.5 text-[11px] font-bold text-on-accent">
                {stats.dueToday}
              </span>
            )}
          </button>
        </div>

        {/* Stats Pill */}
        {stats && (
          <div className="hidden sm:flex items-center gap-3 text-xs text-fg-60">
            <span>Đã học: <b className="text-fg">{stats.learnedWords}</b> từ</span>
            <span>·</span>
            <span>Đến hạn: <b className="text-gold-ink">{stats.dueToday}</b> thẻ</span>
            <span>·</span>
            <span>Streak: <b className="text-cinnabar-ink">{stats.currentStreak}</b> ngày 🔥</span>
          </div>
        )}
      </div>

      {/* ========================================================
          MODE 1: HỌC THEO BÀI (LESSON CATALOG & STUDY)
         ======================================================== */}
      {mainMode === 'LESSONS' && (
        <div className="flex flex-col gap-6">
          {/* Level Filter & Catalog Search */}
          {lessons.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface/40 p-3 rounded border border-rule/60">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-fg-60 mr-1">Cấp độ:</span>
                <button
                  type="button"
                  onClick={() => setSelectedLevelFilter('ALL')}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    selectedLevelFilter === 'ALL'
                      ? 'bg-cinnabar text-on-accent font-semibold'
                      : 'border border-rule bg-card text-fg-60 hover:text-fg'
                  }`}
                >
                  Tất cả ({lessons.length})
                </button>
                {availableLevels.map(lvl => {
                  const count = lessons.filter(l => l.curriculumLevel === lvl).length;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedLevelFilter(lvl)}
                      className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        selectedLevelFilter === lvl
                          ? 'bg-cinnabar text-on-accent font-semibold'
                          : 'border border-rule bg-card text-fg-60 hover:text-fg'
                      }`}
                    >
                      {lvl} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-38" />
                <input
                  type="text"
                  placeholder="Tìm chủ đề bài học..."
                  value={catalogSearchQuery}
                  onChange={e => setCatalogSearchQuery(e.target.value)}
                  className="w-full rounded border border-rule bg-surface pl-8 pr-7 py-1.5 text-xs text-fg placeholder:text-fg-38 focus:border-cinnabar focus:outline-none"
                />
                {catalogSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCatalogSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-38 hover:text-fg cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Lesson Selector Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {displayedLessons.map(lesson => {
              const isSelected = selectedLesson?.id === lesson.id;
              return (
                <div
                  key={lesson.id}
                  onClick={() => {
                    stopChineseSpeech();
                    setSelectedLesson(lesson);
                    setLessonSubMode('LIST');
                  }}
                  className={`flex flex-col justify-between rounded border p-4.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-cinnabar bg-cinnabar/5 ring-1 ring-cinnabar/30'
                      : 'border-rule bg-card hover:border-fg-38 hover:bg-card/80'
                  }`}
                >
                  <div>
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-[11px] text-fg-38">
                      <span className="font-semibold text-cinnabar-ink uppercase tracking-wider">
                        {lesson.curriculumLevel}
                      </span>
                      <span>{lesson.wordCount} từ vựng</span>
                    </div>
                    <h3 className="mt-1.5 font-serif text-base font-bold text-fg">
                      {lesson.title}
                    </h3>
                    <p className="mt-1 text-xs text-fg-60 line-clamp-2 leading-relaxed">
                      {lesson.description}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-rule/50 text-xs">
                    <span className="text-[11px] font-sans text-fg-60">
                      {lesson.curriculumLevel || 'Nhập môn'}
                    </span>
                    <span className="font-medium text-cinnabar-ink flex items-center gap-1 text-[11px]">
                      {isSelected ? 'Đang chọn' : 'Xem bài'} →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty search/filter state */}
          {displayedLessons.length === 0 && lessons.length > 0 && (
            <div className="flex flex-col items-center justify-center rounded border border-rule bg-card p-8 text-center">
              <p className="text-xs text-fg-60">
                Không tìm thấy bài học phù hợp với bộ lọc hoặc từ khoá "{catalogSearchQuery}".
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedLevelFilter('ALL');
                  setCatalogSearchQuery('');
                }}
                className="mt-3 text-xs text-cinnabar-ink hover:underline cursor-pointer"
              >
                Xoá bộ lọc & tìm lại
              </button>
            </div>
          )}

          {/* Regular user warning if no approved lessons are visible */}
          {displayedLessons.length === 0 && lessons.length === 0 && (!isAdmin || !adminPreviewActive) && (
            <div className="flex flex-col items-center justify-center rounded border border-rule bg-card p-10 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold-ink mb-3">
                <AlertTriangle size={24} />
              </div>
              <h3 className="font-serif text-lg font-bold text-fg">
                Chưa có bài học nào được phê duyệt chính thức
              </h3>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-fg-60">
                Nội dung từ vựng M2.1 & M2.2 hiện đang trong quy trình thẩm định học thuật (<b>PENDING_REVIEW</b>). Theo quy định an toàn dữ liệu học thuật, học viên sẽ được mở bài ngay khi chuyên gia hoàn tất ký duyệt.
              </p>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={togglePreview}
                  className="mt-5 inline-flex items-center gap-1.5 rounded border border-cinnabar bg-cinnabar px-4 py-2 text-xs font-semibold text-on-accent cursor-pointer"
                >
                  <Eye size={14} /> Bật xem trước bản nháp Admin
                </button>
              ) : (
                <button
                  type="button"
                  onClick={requireLogin}
                  className="mt-5 inline-flex items-center gap-1.5 rounded border border-cinnabar bg-cinnabar px-4 py-2 text-xs font-semibold text-on-accent cursor-pointer"
                >
                  <ShieldCheck size={14} /> Đăng nhập tài khoản Quản trị để Xem trước
                </button>
              )}
            </div>
          )}

          {/* Selected Lesson Workspace */}
          {selectedLesson && lessonWords.length > 0 && (
            <div className="flex flex-col gap-5 rounded border border-rule bg-card p-6">
              {/* Lesson Submenu Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-cinnabar/10 px-2 py-0.5 font-serif text-[11px] font-bold text-cinnabar-ink border border-cinnabar/30">
                      {selectedLesson.curriculumLevel}
                    </span>
                    <h2 className="font-serif text-xl font-bold text-fg">
                      {selectedLesson.title}
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-fg-60">
                    {selectedLesson.description} · Tổng cộng: <b>{lessonWords.length} từ</b>
                  </p>
                </div>

                {/* Sub-mode switch */}
                <div className="flex items-center gap-1 bg-surface p-1 rounded border border-rule self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      stopChineseSpeech();
                      setLessonSubMode('LIST');
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                      lessonSubMode === 'LIST'
                        ? 'bg-card text-cinnabar-ink '
                        : 'text-fg-60 hover:text-fg'
                    }`}
                  >
                    Danh sách từ ({lessonWords.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopChineseSpeech();
                      setLessonSubMode('STUDY');
                      setStudyWordIndex(0);
                      setStudyFlipped(false);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                      lessonSubMode === 'STUDY'
                        ? 'bg-card text-cinnabar-ink '
                        : 'text-fg-60 hover:text-fg'
                    }`}
                  >
                    Học thẻ từ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopChineseSpeech();
                      setLessonSubMode('QUIZ');
                      setQuizIndex(0);
                      setQuizScore(0);
                      setQuizFinished(false);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                      lessonSubMode === 'QUIZ'
                        ? 'bg-card text-cinnabar-ink '
                        : 'text-fg-60 hover:text-fg'
                    }`}
                  >
                    Luyện phản xạ
                  </button>
                </div>
              </div>

              {/* Sub-view 1: WORD LIST TABLE */}
              {lessonSubMode === 'LIST' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-xs">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-38" />
                      <input
                        type="text"
                        placeholder="Tìm từ, Pinyin, nghĩa..."
                        value={searchWordQuery}
                        onChange={e => setSearchWordQuery(e.target.value)}
                        className="w-full rounded border border-rule bg-surface pl-8 pr-3 py-1.5 text-xs text-fg placeholder:text-fg-38 focus:border-cinnabar focus:outline-none"
                      />
                    </div>
                    <span className="text-xs text-fg-60">
                      Hiển thị {filteredLessonWords.length} / {lessonWords.length} từ
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded border border-rule">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface text-fg-60 uppercase text-[10px] tracking-wider border-b border-rule">
                        <tr>
                          <th className="p-3">Từ vựng</th>
                          <th className="p-3">Pinyin & Hán Việt</th>
                          <th className="p-3">Từ loại & Nghĩa</th>
                          <th className="p-3">Ngữ cảnh ví dụ</th>
                          <th className="p-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule font-sans">
                        {filteredLessonWords.map(word => (
                          <tr key={word.id} className="hover:bg-surface/50 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-serif text-2xl font-bold text-fg">
                                  {word.word}
                                </span>
                                {word.reviewStatus === 'PENDING_REVIEW' && (
                                  <span
                                    title="Nội dung chờ chuyên gia học thuật ký duyệt"
                                    className="rounded bg-gold/10 border border-gold/30 px-1.5 py-0.5 text-[10px] font-sans text-gold-ink"
                                  >
                                    Chờ duyệt
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => speakChinese(word.word)}
                                  title="Nghe phát âm từ"
                                  className="p-1 rounded text-fg-60 hover:text-cinnabar-ink hover:bg-tint cursor-pointer transition-colors"
                                >
                                  <Volume2 size={15} />
                                </button>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-gold-ink text-sm">{word.pinyin}</div>
                              <div className="text-[11px] text-fg-38 uppercase">HV: {word.hanViet}</div>
                            </td>
                            <td className="p-3">
                              <span className="inline-block rounded bg-tint px-1.5 py-0.5 text-[10px] text-fg-60 font-medium mb-1">
                                {word.partOfSpeech || 'Từ vựng'}
                              </span>
                              <div className="font-medium text-fg">{word.meaningVi}</div>
                            </td>
                            <td className="p-3 max-w-[280px]">
                              {word.exampleZh ? (
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-serif text-fg/90">{word.exampleZh}</span>
                                    <button
                                      type="button"
                                      onClick={() => speakChinese(word.exampleZh!)}
                                      title="Nghe cả câu ví dụ"
                                      className="text-fg-38 hover:text-cinnabar-ink cursor-pointer"
                                    >
                                      <Volume2 size={12} />
                                    </button>
                                  </div>
                                  <div className="text-[11px] text-gold-ink">{word.examplePinyin}</div>
                                  <div className="text-[11px] text-fg-60">{word.exampleVi}</div>
                                </div>
                              ) : (
                                <span className="text-fg-38 italic">Chưa có ví dụ</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => void handleOpenNotebookModal({ id: word.id, word: word.word, pinyin: word.pinyin })}
                                className="inline-flex items-center gap-1 rounded border border-rule bg-card px-2.5 py-1 text-[11px] font-medium text-fg-60 hover:border-cinnabar hover:text-cinnabar-ink cursor-pointer transition-colors"
                              >
                                <BookmarkPlus size={13} /> Lưu sổ từ
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-view 2: INTERACTIVE FLASHCARD STUDY */}
              {lessonSubMode === 'STUDY' && currentStudyWord && (
                <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-6 py-4">
                  {/* Progress Header */}
                  <div className="flex w-full items-center justify-between text-xs text-fg-60">
                    <span>
                      Từ {studyWordIndex + 1} / {lessonWords.length}
                    </span>
                    <span className="text-fg-38">
                      Nhấn vào thẻ hoặc phím cách để lật
                    </span>
                  </div>

                  {/* 3D Flashcard Container */}
                  <div
                    onClick={() => setStudyFlipped(prev => !prev)}
                    className="group relative min-h-[320px] w-full cursor-pointer perspective-1000"
                  >
                    <div
                      className={`grid min-h-[320px] w-full border border-rule transition-transform duration-500 transform-style-3d ${
                        studyFlipped ? 'rotate-y-180' : ''
                      }`}
                    >
                      {/* FRONT SIDE (No answer leak!) */}
                      <div className="col-start-1 row-start-1 flex min-w-0 flex-col justify-between gap-5 bg-card p-8 backface-hidden ">
                        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-[11px] text-fg-38">
                          <span className="uppercase tracking-wider font-semibold text-cinnabar-ink">
                            {selectedLesson.title}
                          </span>
                          <span>{currentStudyWord.partOfSpeech || 'Từ vựng'}</span>
                        </div>

                        <div className="my-auto flex flex-col items-center text-center">
                          <span className="break-words font-serif text-[clamp(32px,9vw,60px)] font-bold tracking-wide text-fg">
                            {currentStudyWord.word}
                          </span>
                          {currentStudyWord.traditional && currentStudyWord.traditional !== currentStudyWord.word && (
                            <span className="mt-2 text-xs text-fg-38">
                              Phồn thể: {currentStudyWord.traditional}
                            </span>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-[11px] text-fg-38">
                          <span>Bấm để lật xem phiên âm & ngữ cảnh</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakChinese(currentStudyWord.word);
                            }}
                            className="inline-flex items-center gap-1 text-fg-60 hover:text-cinnabar-ink"
                          >
                            <Volume2 size={13} /> Nghe phát âm
                          </button>
                        </div>
                      </div>

                      {/* BACK SIDE */}
                      <div className="col-start-1 row-start-1 flex min-w-0 flex-col justify-between gap-5 bg-card p-8 rotate-y-180 backface-hidden ">
                        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="font-serif text-lg font-bold text-fg">{currentStudyWord.word}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                speakChinese(currentStudyWord.word);
                              }}
                              className="text-fg-60 hover:text-cinnabar-ink"
                            >
                              <Volume2 size={14} />
                            </button>
                          </div>
                          <span className="rounded border border-cinnabar/30 bg-cinnabar/10 px-2 py-0.5 text-xs font-semibold text-cinnabar-ink uppercase">
                            Hán Việt: {currentStudyWord.hanViet}
                          </span>
                        </div>

                        <div className="my-auto flex flex-col items-center text-center">
                          <span className="font-sans text-2xl font-bold tracking-wide text-gold-ink">
                            {currentStudyWord.pinyin}
                          </span>
                          <span className="mt-2 text-lg font-semibold text-fg">
                            {currentStudyWord.meaningVi}
                          </span>

                          {currentStudyWord.exampleZh && (
                            <div className="mt-4 max-w-[440px] rounded border border-rule/60 bg-surface/80 p-3 text-left">
                              <div className="flex items-center justify-between">
                                <span className="font-serif text-xs font-medium text-fg/90">
                                  {currentStudyWord.exampleZh}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    speakChinese(currentStudyWord.exampleZh!);
                                  }}
                                  title="Nghe câu ví dụ"
                                  className="text-fg-38 hover:text-cinnabar-ink"
                                >
                                  <Volume2 size={13} />
                                </button>
                              </div>
                              <div className="text-[11px] text-gold-ink">{currentStudyWord.examplePinyin}</div>
                              <div className="text-[11px] text-fg-60">{currentStudyWord.exampleVi}</div>
                            </div>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-[11px] text-fg-38">
                          <span>Bấm để lật lại mặt chữ Hán</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleOpenNotebookModal({ id: currentStudyWord.id, word: currentStudyWord.word, pinyin: currentStudyWord.pinyin });
                            }}
                            className="inline-flex items-center gap-1 text-cinnabar-ink hover:underline"
                          >
                            <BookmarkPlus size={13} /> Lưu vào sổ từ
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Footer */}
                  <div className="flex w-full items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={studyWordIndex === 0}
                      onClick={() => {
                        stopChineseSpeech();
                        setStudyFlipped(false);
                        setStudyWordIndex(prev => Math.max(0, prev - 1));
                      }}
                      className="rounded border border-rule bg-card px-4 py-2 text-xs font-semibold text-fg-60 hover:text-fg disabled:opacity-30 cursor-pointer"
                    >
                      ← Từ trước
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleOpenNotebookModal({ id: currentStudyWord.id, word: currentStudyWord.word, pinyin: currentStudyWord.pinyin })}
                      className="inline-flex items-center gap-1.5 rounded border border-cinnabar/40 bg-card px-4 py-2 text-xs font-semibold text-cinnabar-ink hover:bg-tint cursor-pointer"
                    >
                      <BookmarkPlus size={14} /> Lưu sổ cá nhân
                    </button>

                    <button
                      type="button"
                      disabled={studyWordIndex === lessonWords.length - 1}
                      onClick={() => {
                        stopChineseSpeech();
                        setStudyFlipped(false);
                        setStudyWordIndex(prev => Math.min(lessonWords.length - 1, prev + 1));
                      }}
                      className="rounded border border-rule bg-card px-4 py-2 text-xs font-semibold text-fg-60 hover:text-fg disabled:opacity-30 cursor-pointer"
                    >
                      Từ tiếp →
                    </button>
                  </div>
                  <p className="text-[11px] text-fg-38 text-center">
                    * Lưu ý: Ôn tập tự do trong bài học không ảnh hưởng tới lịch giãn cách SRS của giáo trình.
                  </p>
                </div>
              )}

              {/* Sub-view 3: PRACTICE QUIZ FOR LESSON */}
              {lessonSubMode === 'QUIZ' && (
                <div className="mx-auto w-full max-w-[560px] py-4">
                  {!quizFinished && currentQuizItem ? (
                    <div className="flex flex-col gap-6 rounded border border-rule bg-card p-8 ">
                      <div className="flex items-center justify-between border-b border-rule pb-3 text-xs text-fg-60">
                        <span>Câu hỏi {quizIndex + 1} / {quizPool.length}</span>
                        <span className="font-semibold text-gold-ink">Điểm: {quizScore}</span>
                      </div>

                      <div className="flex flex-col items-center gap-3 text-center">
                        <span className="text-xs uppercase tracking-widest text-fg-38 font-semibold">
                          {isTypingQuestion ? 'Luyện gõ Pinyin (Không lộ phiên âm)' : 'Chọn nghĩa tiếng Việt đúng'}
                        </span>
                        {/* Display Hanzi */}
                        <span className="font-serif text-5xl font-bold text-fg">
                          {currentQuizItem.word}
                        </span>

                        {/* Pronunciation button only AFTER submit or for audio cue */}
                        {quizSubmitted && (
                          <div className="flex items-center gap-2">
                            <span className="font-sans text-sm font-medium text-gold-ink">
                              {currentQuizItem.pinyin}
                            </span>
                            <button
                              type="button"
                              onClick={() => speakChinese(currentQuizItem.word)}
                              className="text-fg-38 hover:text-cinnabar-ink cursor-pointer"
                            >
                              <Volume2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Question Answer Inputs */}
                      {isTypingQuestion ? (
                        <div className="flex flex-col gap-2">
                          <label className="text-xs text-fg-60">
                            Nhập Pinyin (hỗ trợ cả dấu `nǐ hǎo` hoặc số thanh `ni3 hao3`):
                          </label>
                          <input
                            type="text"
                            value={quizAnswer}
                            disabled={quizSubmitted}
                            onChange={e => setQuizAnswer(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleQuizSubmit();
                            }}
                            placeholder="Ví dụ: ni3 hao3 hoặc nǐ hǎo..."
                            className="rounded border border-rule bg-surface p-3 font-sans text-sm text-fg placeholder:text-fg-38 focus:border-cinnabar focus:outline-none"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2.5">
                          {quizChoices.map((choice, idx) => (
                            <button
                              key={idx}
                              type="button"
                              disabled={quizSubmitted}
                              onClick={() => setSelectedChoice(choice)}
                              className={`rounded border p-3 text-left text-xs font-medium transition-all cursor-pointer ${
                                selectedChoice === choice
                                  ? 'border-cinnabar bg-cinnabar/10 text-cinnabar-ink font-semibold'
                                  : 'border-rule bg-surface hover:border-fg-38 text-fg-90'
                              } ${
                                quizSubmitted && choice === currentQuizItem.meaningVi
                                  ? 'border-jade bg-jade/10 text-jade-ink font-bold'
                                  : ''
                              }`}
                            >
                              {choice}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Feedback on submit */}
                      {quizSubmitted && (
                        <div className={`p-3 rounded text-xs leading-relaxed ${
                          quizIsCorrect ? 'bg-jade/10 text-jade-ink border border-jade/30' : 'bg-red/10 text-red border border-red/30'
                        }`}>
                          <b>{quizIsCorrect ? '✓ Chính xác!' : '✗ Chưa đúng!'}</b>
                          <div className="mt-1 text-fg-90">
                            Đáp án Pinyin: <b className="text-gold-ink font-sans">{currentQuizItem.pinyin}</b> · Nghĩa: <b>{currentQuizItem.meaningVi}</b>
                          </div>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="flex justify-end gap-2 pt-2 border-t border-rule">
                        {!quizSubmitted ? (
                          <button
                            type="button"
                            onClick={handleQuizSubmit}
                            className="rounded bg-cinnabar px-5 py-2 font-serif text-xs font-semibold text-on-accent hover:opacity-90 cursor-pointer"
                          >
                            Xác nhận đáp án
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleQuizNext}
                            className="inline-flex items-center gap-1 rounded bg-cinnabar px-5 py-2 font-serif text-xs font-semibold text-on-accent hover:opacity-90 cursor-pointer"
                          >
                            Câu tiếp theo →
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Quiz Finished Card */
                    <div className="flex flex-col items-center justify-center rounded border border-rule bg-card p-10 text-center">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-jade/10 text-jade-ink mb-3">
                        <CheckCircle2 size={28} />
                      </div>
                      <h3 className="font-serif text-xl font-bold text-fg">
                        Hoàn thành bài luyện phản xạ!
                      </h3>
                      <p className="mt-2 text-xs text-fg-60">
                        Bạn đã trả lời đúng <b>{quizScore}</b> / {quizPool.length} câu hỏi của bài học này.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setQuizIndex(0);
                          setQuizScore(0);
                          setQuizFinished(false);
                          setQuizSubmitted(false);
                        }}
                        className="mt-5 inline-flex items-center gap-1.5 rounded border border-cinnabar bg-cinnabar px-5 py-2 text-xs font-semibold text-on-accent cursor-pointer"
                      >
                        <RotateCcw size={14} /> Luyện lại bài này
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODE 2: ÔN ĐẾN HẠN (SRS SM-2)
         ======================================================== */}
      {mainMode === 'SRS' && (
        <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-6">
          {!user ? (
            /* Guest Prompt: Do not call authenticated SRS endpoints */
            <div className="flex flex-col items-center justify-center rounded border border-rule bg-card p-10 text-center w-full">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-cinnabar/10 text-cinnabar-ink mb-4">
                <Calendar size={32} />
              </div>
              <h2 className="font-serif text-2xl font-bold text-fg">
                Ôn tập ngắt quãng (SRS SM-2)
              </h2>
              <p className="mt-2 text-xs text-fg-60 max-w-sm leading-relaxed">
                Tính năng ghi nhớ dài hạn qua thuật toán SRS yêu cầu tài khoản học viên để lưu tiến độ ôn tập và lịch giãn cách cá nhân.
              </p>
              <button
                type="button"
                onClick={requireLogin}
                className="mt-6 inline-flex items-center gap-1.5 rounded bg-cinnabar px-5 py-2 font-serif text-xs font-semibold text-on-accent cursor-pointer"
              >
                Đăng nhập để bắt đầu ôn tập
              </button>
            </div>
          ) : !srsSessionFinished && currentSrsItem ? (
            <div className="flex w-full flex-col items-center gap-5">
              {/* Session Counter and Split */}
              <div className="flex w-full items-center justify-between text-xs text-fg-60">
                <span className="font-medium">
                  Thẻ {srsIndex + 1} / {dueItems.length}
                </span>
                <span className="text-[11px] text-fg-38">
                  Đến hạn ôn: <b className="text-gold-ink">{srsDueCounts.dueCount}</b> · Từ mới: <b className="text-jade-ink">{srsDueCounts.newCount}</b>
                </span>
              </div>

              {/* Red Seal Overlay */}
              {showSeal && (
                <div className="flex justify-center py-3 pointer-events-none">
                  <RedSealStamp text={sealText} size={64} />
                </div>
              )}

              {/* 3D Flashcard */}
              <div
                onClick={() => setSrsFlipped(prev => !prev)}
                className="group relative min-h-[320px] w-full cursor-pointer perspective-1000"
              >
                <div
                  className={`grid min-h-[320px] w-full border border-rule transition-transform duration-500 transform-style-3d ${
                    srsFlipped ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* FRONT: ONLY Hanzi (No answer leaks!) */}
                  <div className="col-start-1 row-start-1 flex min-w-0 flex-col justify-between gap-5 bg-card p-8 backface-hidden ">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-[11px] text-fg-38">
                      <span className="font-semibold text-cinnabar-ink uppercase tracking-wide">
                        {currentSrsItem.isNew ? '🌱 Từ mới đưa vào phiên' : '⏳ Đến hạn ôn tập'}
                      </span>
                      <span>{currentSrsItem.partOfSpeech || 'Từ vựng'}</span>
                    </div>

                    <div className="my-auto flex flex-col items-center text-center">
                      <span className="break-words font-serif text-[clamp(32px,9vw,60px)] font-bold tracking-wide text-fg">
                        {currentSrsItem.word}
                      </span>
                      {currentSrsItem.traditional && currentSrsItem.traditional !== currentSrsItem.word && (
                        <span className="mt-2 text-xs text-fg-38">
                          Phồn thể: {currentSrsItem.traditional}
                        </span>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-[11px] text-fg-38">
                      <span>Bấm vào thẻ hoặc phím cách để lật</span>
                      <span>Nhớ lại phát âm & nghĩa trước khi lật</span>
                    </div>
                  </div>

                  {/* BACK: Full information */}
                  <div className="col-start-1 row-start-1 flex min-w-0 flex-col justify-between gap-5 bg-card p-8 rotate-y-180 backface-hidden ">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-lg font-bold text-fg">{currentSrsItem.word}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakChinese(currentSrsItem.word);
                          }}
                          className="text-fg-60 hover:text-cinnabar-ink"
                        >
                          <Volume2 size={14} />
                        </button>
                      </div>
                      <span className="rounded border border-cinnabar/30 bg-cinnabar/10 px-2 py-0.5 text-xs font-semibold text-cinnabar-ink uppercase">
                        Hán Việt: {currentSrsItem.hanViet || currentSrsItem.sinoVietnamese || 'Đang cập nhật'}
                      </span>
                    </div>

                    <div className="my-auto flex flex-col items-center text-center">
                      <span className="font-sans text-2xl font-bold tracking-wide text-gold-ink">
                        {currentSrsItem.pinyin || currentSrsItem.reading}
                      </span>
                      <span className="mt-2 text-lg font-semibold text-fg">
                        {currentSrsItem.meaningVi || currentSrsItem.meaning}
                      </span>

                      {(currentSrsItem.exampleZh || currentSrsItem.exampleSentence) && (
                        <div className="mt-4 max-w-[440px] rounded border border-rule/60 bg-surface/80 p-3 text-left">
                          <div className="flex items-center justify-between">
                            <span className="font-serif text-xs font-medium text-fg/90">
                              {currentSrsItem.exampleZh || currentSrsItem.exampleSentence}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                speakChinese(currentSrsItem.exampleZh || currentSrsItem.exampleSentence!);
                              }}
                              className="text-fg-38 hover:text-cinnabar-ink"
                            >
                              <Volume2 size={13} />
                            </button>
                          </div>
                          <div className="text-[11px] text-gold-ink">
                            {currentSrsItem.examplePinyin || currentSrsItem.exampleReading}
                          </div>
                          <div className="text-[11px] text-fg-60">
                            {currentSrsItem.exampleVi || currentSrsItem.exampleMeaning}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-[11px] text-fg-38">
                      <span>Bấm để lật lại chữ Hán</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleOpenNotebookModal({
                            id: currentSrsItem.vocabularyId,
                            word: currentSrsItem.word,
                            pinyin: currentSrsItem.pinyin,
                          });
                        }}
                        className="inline-flex items-center gap-1 text-cinnabar-ink hover:underline"
                      >
                        <BookmarkPlus size={13} /> Lưu sổ từ
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error notice if rating submission failed */}
              {srsError && (
                <div className="w-full rounded border border-red/40 bg-red/10 p-3 text-xs text-red flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0" />
                    <div>
                      <span>{srsError}</span>
                      {pendingAttempt && (
                        <div className="mt-1 text-[11px] opacity-80">
                          Đang chờ gửi lại mức đánh giá: <b>{pendingAttempt.rating}</b> (Payload đã khóa cố định).
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSrsRetry}
                    disabled={srsSubmitting}
                    className="ml-3 shrink-0 rounded bg-red px-2.5 py-1 text-[11px] font-semibold text-on-accent hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {srsSubmitting ? 'Đang gửi lại...' : 'Thử lại'}
                  </button>
                </div>
              )}

              {/* 4 SRS Rating Buttons (Disabled when locked on a pending attempt) */}
              <div className="grid w-full grid-cols-4 gap-2">
                <button
                  type="button"
                  disabled={srsSubmitting || (pendingAttempt !== null && pendingAttempt.vocabularyId === currentSrsItem.vocabularyId)}
                  onClick={() => void handleSrsRate('FORGOT')}
                  className="flex flex-col items-center justify-center rounded border border-red/40 bg-card py-2.5 text-xs font-semibold text-red hover:bg-red/10 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <span>Chưa nhớ</span>
                  <span className="text-[10px] opacity-75 font-normal">Quên</span>
                </button>
                <button
                  type="button"
                  disabled={srsSubmitting || (pendingAttempt !== null && pendingAttempt.vocabularyId === currentSrsItem.vocabularyId)}
                  onClick={() => void handleSrsRate('HARD')}
                  className="flex flex-col items-center justify-center rounded border border-rule bg-card py-2.5 text-xs font-semibold text-fg-60 hover:border-fg hover:text-fg disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <span>Khó</span>
                  <span className="text-[10px] opacity-75 font-normal">Gợi ý</span>
                </button>
                <button
                  type="button"
                  disabled={srsSubmitting || (pendingAttempt !== null && pendingAttempt.vocabularyId === currentSrsItem.vocabularyId)}
                  onClick={() => void handleSrsRate('GOOD')}
                  className="flex flex-col items-center justify-center rounded border border-jade/50 bg-jade/10 py-2.5 text-xs font-semibold text-jade-ink hover:bg-jade/20 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <span>Thuộc</span>
                  <span className="text-[10px] opacity-75 font-normal">Nhớ được</span>
                </button>
                <button
                  type="button"
                  disabled={srsSubmitting || (pendingAttempt !== null && pendingAttempt.vocabularyId === currentSrsItem.vocabularyId)}
                  onClick={() => void handleSrsRate('EASY')}
                  className="flex flex-col items-center justify-center rounded border border-gold/50 bg-gold/10 py-2.5 text-xs font-bold text-gold-ink hover:bg-gold/20 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <span>Rất dễ</span>
                  <span className="text-[10px] opacity-75 font-normal">Khắc sâu</span>
                </button>
              </div>
            </div>
          ) : (
            /* SRS Completion Screen (Does NOT loop endlessly!) */
            <div className="flex flex-col items-center justify-center rounded border border-rule bg-card p-10 text-center w-full">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-jade/10 text-jade-ink mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="font-serif text-2xl font-bold text-fg">
                Xong phiên ôn tập hôm nay!
              </h2>
              <p className="mt-2 text-xs text-fg-60 max-w-sm leading-relaxed">
                Bạn đã ôn xong <b>{srsReviewedCount} thẻ</b> trong phiên này. Thuật toán SM-2 đã cập nhật ngày ôn tiếp theo cho từng từ.
              </p>

              {lastSrsResult && (
                <div className="mt-4 rounded bg-surface p-3 text-xs text-fg-60 flex gap-4">
                  <span>Khoảng cách: <b>{lastSrsResult.intervalDays} ngày</b></span>
                  <span>·</span>
                  <span>Lặp lại: <b>{lastSrsResult.repetitions} lần</b></span>
                  <span>·</span>
                  <span>Chuỗi: <b className="text-cinnabar-ink">{lastSrsResult.currentStreak} ngày 🔥</b></span>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setMainMode('LESSONS')}
                  className="inline-flex items-center gap-1.5 rounded bg-cinnabar px-5 py-2 font-serif text-xs font-semibold text-on-accent cursor-pointer"
                >
                  <BookOpen size={14} /> Học từ mới theo bài
                </button>
                <button
                  type="button"
                  onClick={() => void loadSrsData()}
                  className="inline-flex items-center gap-1.5 rounded border border-rule bg-surface px-4 py-2 font-serif text-xs font-semibold text-fg-60 hover:text-fg cursor-pointer"
                >
                  <RefreshCw size={14} /> Kiểm tra lại danh sách
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL: LƯU TỪ VÀO SỔ CÁ NHÂN (NOTEBOOK MODAL)
         ======================================================== */}
      {notebookModalOpen && wordToSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded border border-rule bg-card p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setNotebookModalOpen(false);
                setNotebookFeedback(null);
              }}
              className="absolute right-4 top-4 text-fg-38 hover:text-fg"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2">
              <BookmarkPlus size={20} className="text-cinnabar-ink" />
              <h3 className="font-serif text-lg font-bold text-fg">
                Lưu vào Sổ từ vựng cá nhân
              </h3>
            </div>

            <p className="mt-1.5 text-xs text-fg-60">
              Lưu từ <b className="font-serif text-fg">{wordToSave.word}</b> ({wordToSave.pinyin}) vào sổ tay để bạn tự gom nhóm ôn luyện.
            </p>

            {/* Disclaimer */}
            <div className="mt-3 rounded border border-rule/60 bg-surface p-2.5 text-[11px] text-fg-60 leading-relaxed">
              💡 <b>Quy tắc hệ thống:</b> Lưu từ vào sổ tay cá nhân phục vụ tự luyện riêng, <b>hoàn toàn không làm thay đổi lịch ôn SRS giáo trình</b>.
            </div>

            {/* Feedback Message */}
            {notebookFeedback && (
              <div
                className={`mt-3 rounded p-2.5 text-xs ${
                  notebookFeedback.type === 'success'
                    ? 'border border-jade/30 bg-jade/10 text-jade-ink'
                    : 'border border-red/30 bg-red/10 text-red'
                }`}
              >
                {notebookFeedback.message}
              </div>
            )}

            {/* Notebook Selector */}
            <div className="mt-4 flex flex-col gap-3">
              <label className="text-xs font-medium text-fg-90">
                Chọn sổ tay lưu trữ:
              </label>

              {notebookListLoading && (
                <div className="flex items-center gap-2 rounded border border-rule/50 bg-surface/50 p-3 text-xs text-fg-60">
                  <RefreshCw size={14} className="animate-spin text-cinnabar-ink" />
                  <span>Đang tải danh sách sổ từ cá nhân...</span>
                </div>
              )}

              {notebookListError && (
                <div className="flex items-center justify-between rounded border border-red/40 bg-red/10 p-2.5 text-xs text-red">
                  <span>{notebookListError}</span>
                  <button
                    type="button"
                    onClick={() => void loadUserNotebooks()}
                    className="ml-2 shrink-0 rounded bg-red px-2.5 py-1 text-[11px] font-semibold text-on-accent hover:opacity-90 cursor-pointer"
                  >
                    Tải lại danh sách
                  </button>
                </div>
              )}

              {!notebookListLoading && userNotebooks.length === 0 && !notebookListError && (
                <div className="rounded border border-rule/60 bg-surface/60 p-2.5 text-[11px] text-fg-60">
                  Bạn chưa có sổ tay nào. Hãy tạo sổ tay đầu tiên để gom nhóm ôn luyện!
                </div>
              )}

              {userNotebooks.length > 0 && (
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                  {userNotebooks.map(nb => (
                    <label
                      key={nb.id}
                      className={`flex items-center justify-between rounded border p-2.5 text-xs cursor-pointer transition-colors ${
                        selectedNotebookId === nb.id
                          ? 'border-cinnabar bg-cinnabar/5 font-semibold text-cinnabar-ink'
                          : 'border-rule hover:bg-surface text-fg-90'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="notebook"
                          checked={selectedNotebookId === nb.id}
                          onChange={() => setSelectedNotebookId(nb.id)}
                          className="accent-cinnabar"
                        />
                        <span>{nb.title}</span>
                      </div>
                      <span className="text-[11px] text-fg-38">{nb.itemCount} từ</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Option to create new */}
              <label
                className={`flex items-center gap-2 rounded border p-2.5 text-xs cursor-pointer ${
                  selectedNotebookId === 'NEW'
                    ? 'border-cinnabar bg-cinnabar/5 font-semibold text-cinnabar-ink'
                    : 'border-rule hover:bg-surface text-fg-90'
                }`}
              >
                <input
                  type="radio"
                  name="notebook"
                  checked={selectedNotebookId === 'NEW'}
                  onChange={() => setSelectedNotebookId('NEW')}
                  className="accent-cinnabar"
                />
                <span className="flex items-center gap-1">
                  <Plus size={13} /> Tạo sổ mới
                </span>
              </label>

              {selectedNotebookId === 'NEW' && (
                <input
                  type="text"
                  placeholder="Nhập tên sổ mới (vd: Từ hay quên, Từ giao tiếp...)"
                  value={newNotebookTitle}
                  onChange={e => setNewNotebookTitle(e.target.value)}
                  className="rounded border border-rule bg-surface p-2 text-xs text-fg placeholder:text-fg-38 focus:border-cinnabar focus:outline-none"
                />
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNotebookModalOpen(false)}
                className="rounded border border-rule px-4 py-2 text-xs font-semibold text-fg-60 hover:text-fg cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={notebookSaveLoading}
                onClick={handleSaveToNotebook}
                className="rounded bg-cinnabar px-5 py-2 font-serif text-xs font-semibold text-on-accent hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {notebookSaveLoading ? 'Đang lưu...' : 'Xác nhận lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

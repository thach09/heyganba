import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { speakChinese, speakChineseSlow, CHINESE_SPEECH_RATES } from '../../src/services/chineseSpeech';
import { DictionaryNotebookView } from '../../src/features/dictionary/DictionaryNotebookView';
import { DashboardView } from '../../src/features/dashboard/DashboardView';
import { HanziStationView } from '../../src/features/hanzi/HanziStationView';
import { readActiveAttempt, saveActiveAttempt, clearActiveAttempt } from '../../src/features/exam/activeAttempt';
import { FlashcardView } from '../../src/features/flashcard/FlashcardView';

// Hoisted state
const fixture = vi.hoisted(() => ({
  user: { userId: 1, role: 'ROLE_USER', fullName: 'Học viên HSK' } as any,
  search: vi.fn(),
  notebooks: vi.fn(),
  dashboardHeatmap: vi.fn(),
  dashboardStats: vi.fn(),
  dashboardExp: vi.fn(),
}));

vi.mock('../../src/app/useAuth', () => ({
  useAuth: () => ({
    user: fixture.user,
    requireLogin: vi.fn(),
  }),
}));

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

vi.mock('../../src/features/companion/three/Companion3DCanvas', () => ({
  Companion3DCanvas: () => <div data-testid="mock-companion-3d-canvas" />,
}));

vi.mock('../../src/features/companion/CompanionWidget', () => ({
  CompanionWidget: () => <div data-testid="mock-companion-widget" />,
  FoodIcon: ({ className }: { type?: string; className?: string }) => <svg aria-hidden="true" className={className} />,
  CompanionSkeletonFallback: ({ size = 96, className }: { size?: number; className?: string }) => (
    <div aria-hidden="true" className={className} style={{ width: size, height: size }} />
  ),
}));

vi.mock('../../src/features/dashboard/LearningInsights', () => ({
  LearningInsights: () => <div data-testid="mock-learning-insights" />,
}));

vi.mock('../../src/features/dashboard/HskRoadmap', () => ({
  HskRoadmap: () => <div data-testid="mock-hsk-roadmap" />,
}));

vi.mock('../../src/features/dictionary/api', () => ({
  dictionaryApi: {
    search: fixture.search,
    notebooks: fixture.notebooks,
    addWord: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../../src/features/progress/api', () => ({
  progressApi: {
    heatmap: fixture.dashboardHeatmap,
    exp: fixture.dashboardExp,
    mastery: vi.fn().mockResolvedValue({ success: true, data: [] }),
    practice: vi.fn().mockResolvedValue({ success: true, data: { expAwarded: 10, masteryScore: 20 } }),
  },
}));

vi.mock('../../src/features/flashcard/api', () => ({
  vocabularyApi: {
    lessons: vi.fn().mockResolvedValue({
      success: true,
      data: [
        { id: 1, slug: 'lesson-1', title: 'Bài 1 HSK 1', description: '', curriculumLevel: 'HSK 1', wordCount: 5 },
        { id: 3, slug: 'lesson-3', title: 'Bài 3 HSK 3', description: '', curriculumLevel: 'HSK 3', wordCount: 8 },
      ],
    }),
    lessonWords: vi.fn().mockResolvedValue({
      success: true,
      data: [
        { id: 101, word: '你好', pinyin: 'nǐ hǎo', meaningVi: 'xin chào', reviewStatus: 'APPROVED' },
      ],
    }),
  },
  flashcardApi: {
    stats: fixture.dashboardStats,
    due: vi.fn().mockResolvedValue({ success: true, data: [] }),
  },
}));

vi.mock('../../src/features/hanzi/api', () => ({
  hanziApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          character: '人',
          reviewStatus: 'APPROVED',
          pinyin: 'rén',
          sinoVietnamese: 'Nhân',
          meaning: 'Người, con người',
          radical: '人',
          strokeCount: 2,
          hskLevel: 1,
          decomposition: 'Độc thể',
          exampleWordsJson: '[{"word":"中国人","pinyin":"zhōngguórén","vi":"người Trung Quốc"}]',
        },
      ],
    }),
  },
}));

describe('v2.1 EdTech UX & Stability Improvements', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_ENABLE_READING_FIXTURES', 'true');
    localStorage.clear();
    sessionStorage.clear();
    fixture.search.mockReset();
    fixture.notebooks.mockReset().mockResolvedValue({ success: true, data: [] });
    fixture.dashboardHeatmap.mockReset().mockResolvedValue({ success: true, data: [] });
    fixture.dashboardStats.mockReset().mockResolvedValue({ success: true, data: { totalLearned: 50, dueCount: 0 } });
    fixture.dashboardExp.mockReset().mockResolvedValue({ success: true, data: { level: 2, expIntoLevel: 250, expForNextLevel: 1000 } });
  });

  describe('1. Slow-speed TTS (0.75x) in chineseSpeech', () => {
    test('uses the exported slow rate for the slow option and speakChineseSlow', () => {
      let lastUtterance: any = null;
      const originalSynthesis = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');
      const originalUtterance = Object.getOwnPropertyDescriptor(window, 'SpeechSynthesisUtterance');

      window.SpeechSynthesisUtterance = class MockUtterance {
        text: string;
        rate = 1;
        voice: any = null;
        lang = 'zh-CN';
        constructor(t: string) {
          this.text = t;
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          lastUtterance = this;
        }
      } as any;

      window.speechSynthesis = {
        cancel: vi.fn(),
        speak: vi.fn(),
        getVoices: () => [{ lang: 'zh-CN', name: 'Mandarin' }] as any,
      } as any;

      try {
        expect(CHINESE_SPEECH_RATES.SLOW).toBe(0.75);
        expect(CHINESE_SPEECH_RATES.NORMAL).toBe(0.95);

        // Standard speed
        speakChinese('你好');
        expect(lastUtterance.rate).toBe(CHINESE_SPEECH_RATES.NORMAL);

        // Slow speed via options.slow
        speakChinese('你好', { slow: true });
        expect(lastUtterance.rate).toBe(CHINESE_SPEECH_RATES.SLOW);

        // Slow speed via helper
        speakChineseSlow('再见');
        expect(lastUtterance.rate).toBe(CHINESE_SPEECH_RATES.SLOW);
        expect(lastUtterance.text).toBe('再见');
      } finally {
        if (originalSynthesis) Object.defineProperty(window, 'speechSynthesis', originalSynthesis);
        else Reflect.deleteProperty(window, 'speechSynthesis');
        if (originalUtterance) Object.defineProperty(window, 'SpeechSynthesisUtterance', originalUtterance);
        else Reflect.deleteProperty(window, 'SpeechSynthesisUtterance');
      }
    });
  });

  describe('2. DictionaryNotebookView Deep Link & Contextual Reading Interactivity', () => {
    test('deep links via ?q= parameter automatically triggers search', async () => {
      fixture.search.mockResolvedValueOnce({
        success: true,
        data: {
          query: '朋友',
          totalMatches: 1,
          page: 0,
          hasMore: false,
          hanzis: [],
          vocabularies: [
            {
              id: 100,
              word: '朋友',
              reading: 'péngyou',
              meaning: 'bạn bè',
              vietnameseMeaning: 'bạn bè',
              vietnameseStatus: 'VERIFIED',
            },
          ],
        },
      });

      render(
        <MemoryRouter initialEntries={['/dictionary?q=朋友']}>
          <DictionaryNotebookView />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(fixture.search).toHaveBeenCalledWith('朋友', 0, expect.any(Object));
      });
      expect(await screen.findByText('bạn bè')).toBeInTheDocument();
    });

    test('clicking vocabulary in contextual reading opens interactive popover card', async () => {
      render(
        <MemoryRouter initialEntries={['/dictionary']}>
          <DictionaryNotebookView />
        </MemoryRouter>
      );

      // Switch to Reading tab
      const readingTabBtn = screen.getByRole('button', { name: 'Đọc hiểu tiếng Trung' });
      fireEvent.click(readingTabBtn);

      // Verify reading passage loaded
      expect(await screen.findByRole('heading', { level: 4, name: 'Ở trường học (在学校)' })).toBeInTheDocument();

      // Click on interactive word "学生"
      const wordToken = await screen.findByRole('button', { name: /Tra nhanh từ "学生"/i });
      expect(wordToken).toBeInTheDocument();

      fireEvent.click(wordToken);

      // Verify interactive popover card appears
      const popover = await screen.findByTestId('interactive-word-popover');
      expect(popover).toBeInTheDocument();
      expect(popover.textContent).toContain('xuésheng');
      expect(popover.textContent).toContain('học sinh');
    });
  });

  describe('3. Target HSK Level Selector & Smart Resume on Dashboard and Flashcard Filtering', () => {
    test('persists chosen HSK level to localStorage and updates Smart Resume CTA', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <DashboardView />
        </MemoryRouter>
      );

      // Default is HSK 1
      expect(screen.getByRole('heading', { level: 2, name: 'Mục tiêu hiện tại: HSK 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'HSK 1', pressed: true })).toBeInTheDocument();

      // Click HSK 3 selector button
      const hsk3Btn = screen.getByRole('button', { name: 'HSK 3' });
      fireEvent.click(hsk3Btn);

      // Assert state updated and saved to localStorage
      expect(localStorage.getItem('heyganba_target_hsk')).toBe('3');
      expect(screen.getByRole('heading', { level: 2, name: 'Mục tiêu hiện tại: HSK 3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'HSK 3', pressed: true })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'HSK 1', pressed: false })).toBeInTheDocument();

      // Check Smart Resume link points to /vocabulary?level=HSK3
      const smartResumeLink = screen.getByRole('link', { name: 'Học nhóm chọn lọc đang có' });
      expect(smartResumeLink.getAttribute('href')).toBe('/vocabulary?level=HSK3');
    });

    test('FlashcardView auto-filters curriculum when navigated with canonical ?level=HSK3', async () => {
      render(
        <MemoryRouter initialEntries={['/vocabulary?level=HSK3']}>
          <FlashcardView />
        </MemoryRouter>
      );

      expect(await screen.findByText('Bài 3 HSK 3')).toBeInTheDocument();
      expect(screen.queryByText('Bài 1 HSK 1')).toBeNull();
    });

    test('FlashcardView auto-filters curriculum when navigated with fallback ?hsk=3', async () => {
      render(
        <MemoryRouter initialEntries={['/vocabulary?hsk=3']}>
          <FlashcardView />
        </MemoryRouter>
      );

      expect(await screen.findByText('Bài 3 HSK 3')).toBeInTheDocument();
      expect(screen.queryByText('Bài 1 HSK 1')).toBeNull();
    });
  });

  describe('4. Resilient Fallback in HanziStationView', () => {
    test('shows calligraphy reference card when stroke data json is unavailable', async () => {
      // Mock HanziWriter on window
      (window as any).HanziWriter = {
        create: vi.fn((_target: any, _char: string, options: any) => {
          // Simulate stroke json load error
          setTimeout(() => {
            options.onLoadCharDataError?.();
          }, 0);
          return {
            animateCharacter: vi.fn(),
            quiz: vi.fn(),
          };
        }),
      };

      // Mock fetch returning 404 for hanzi-data
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as any);

      try {
        render(
          <MemoryRouter initialEntries={['/hanzi']}>
            <HanziStationView />
          </MemoryRouter>
        );

        // Verify fallback reference card is displayed
        await waitFor(() => {
          const fallbackCard = screen.getByTestId('calligraphy-reference-card');
          expect(fallbackCard).toBeInTheDocument();
          expect(fallbackCard.textContent).toContain('Chữ tham khảo');
          expect(screen.getByText('Chưa tải được dữ liệu nét viết')).toBeInTheDocument();
        });
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('5. Resilient Dual-Storage Exam Recovery (activeAttempt)', () => {
    test('recovers exam attempt from localStorage when sessionStorage is empty', () => {
      const mockAttempt = {
        examId: 42,
        answers: { 0: 'A', 1: 'B' },
        activeIndex: 1,
      };

      // Save via activeAttempt
      expect(saveActiveAttempt(999, mockAttempt)).toBe(true);

      // Verify it was written to both
      expect(sessionStorage.getItem('heyganba_exam:999')).not.toBeNull();
      expect(localStorage.getItem('heyganba_exam:999')).not.toBeNull();

      // Simulate sessionStorage wiped (e.g. cross-tab restore or browser restart)
      sessionStorage.clear();
      expect(sessionStorage.getItem('heyganba_exam:999')).toBeNull();

      // readActiveAttempt should gracefully fall back to localStorage
      const recovered = readActiveAttempt(999);
      expect(recovered).not.toBeNull();
      expect(recovered?.examId).toBe(42);
      expect(recovered?.answers).toEqual({ 0: 'A', 1: 'B' });

      // clearActiveAttempt clears both
      clearActiveAttempt(999);
      expect(localStorage.getItem('heyganba_exam:999')).toBeNull();
      expect(readActiveAttempt(999)).toBeNull();
    });
  });
});

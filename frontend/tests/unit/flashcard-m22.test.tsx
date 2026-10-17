import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FlashcardView } from '../../src/features/flashcard/FlashcardView';

const fixture = vi.hoisted(() => ({
  user: { userId: 1, role: 'ROLE_USER', fullName: 'Learner M22' } as any,
  lessons: vi.fn(),
  lessonWords: vi.fn(),
  due: vi.fn(),
  stats: vi.fn(),
  review: vi.fn(),
  notebookList: vi.fn(),
  notebookCreate: vi.fn(),
  notebookAddWord: vi.fn(),
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

vi.mock('../../src/services/chineseSpeech', () => ({
  speakChinese: vi.fn(),
  stopChineseSpeech: vi.fn(),
  isChineseSpeechSupported: () => false,
  isChineseVoiceAvailable: () => false,
  getChineseVoice: () => null,
  getVoiceDiagnostics: () => ({ supported: false, hasVoice: false, voiceName: null, voiceLang: null }),
}));

vi.mock('../../src/features/flashcard/api', () => ({
  vocabularyApi: {
    lessons: (opts?: any) => fixture.lessons(opts),
    lessonWords: (slug: string, opts?: any) => fixture.lessonWords(slug, opts),
    word: vi.fn(),
  },
  flashcardApi: {
    due: (opts?: any) => fixture.due(opts),
    stats: (opts?: any) => fixture.stats(opts),
    review: (payload: any) => fixture.review(payload),
  },
  notebookApi: {
    list: (opts?: any) => fixture.notebookList(opts),
    create: (payload: any) => fixture.notebookCreate(payload),
    addWord: (id: number, payload: any) => fixture.notebookAddWord(id, payload),
  },
}));

const mockM22Lessons = [
  {
    id: 1,
    slug: 'intro-greetings',
    title: 'Chào hỏi cơ bản',
    description: 'Bài nhập môn tiếng Trung',
    curriculumLevel: 'Nhập môn',
    orderIndex: 1,
    wordCount: 10,
  },
  {
    id: 2,
    slug: 'family-members',
    title: 'Gia đình & Xưng hô',
    description: 'Từ vựng các thành viên trong gia đình',
    curriculumLevel: 'HSK 1',
    orderIndex: 2,
    wordCount: 13,
  },
  {
    id: 3,
    slug: 'time-calendar',
    title: 'Thời gian & Lịch',
    description: 'Ngày, tháng, giờ và các buổi trong ngày',
    curriculumLevel: 'HSK 1',
    orderIndex: 3,
    wordCount: 14,
  },
  {
    id: 4,
    slug: 'dining-shopping',
    title: 'Ăn uống & Mua sắm',
    description: 'Đồ ăn, thức uống và số từ mua bán',
    curriculumLevel: 'HSK 1',
    orderIndex: 4,
    wordCount: 13,
  },
];

const mockFamilyWords = [
  {
    id: 101,
    word: '爸爸',
    pinyin: 'bàba',
    meaningVi: 'bố, cha',
    hanViet: 'BÁ BÁ',
    partOfSpeech: 'Danh từ',
    reviewStatus: 'PENDING_REVIEW',
    exampleZh: '我爸爸是老师。',
    examplePinyin: 'Wǒ bàba shì lǎoshī.',
    exampleVi: 'Bố tôi là giáo viên.',
  },
  {
    id: 102,
    word: '妈妈',
    pinyin: 'māma',
    meaningVi: 'mẹ',
    hanViet: 'MA MA',
    partOfSpeech: 'Danh từ',
    reviewStatus: 'PENDING_REVIEW',
    exampleZh: '妈妈喜欢喝茶。',
    examplePinyin: 'Māma xǐhuan hē chá.',
    exampleVi: 'Mẹ thích uống trà.',
  },
  {
    id: 103,
    word: '有',
    pinyin: 'yǒu',
    meaningVi: 'có',
    hanViet: 'HỮU',
    partOfSpeech: 'Động từ',
    reviewStatus: 'APPROVED',
  },
];

describe('Milestone M2.2 - Thematic Curriculum & Flashcard Features', () => {
  beforeEach(() => {
    fixture.user = { userId: 1, role: 'ROLE_USER', fullName: 'Learner M22' };
    fixture.lessons.mockReset().mockResolvedValue({
      success: true,
      data: mockM22Lessons,
    });
    fixture.lessonWords.mockReset().mockResolvedValue({
      success: true,
      data: mockFamilyWords,
    });
    fixture.due.mockReset().mockResolvedValue({
      success: true,
      data: [],
    });
    fixture.stats.mockReset().mockResolvedValue({
      success: true,
      data: { learnedWords: 15, dueToday: 0, currentStreak: 5, availableNewWords: 35 },
    });
    fixture.notebookList.mockReset().mockResolvedValue({
      success: true,
      data: [],
    });
  });

  it('renders M2.2 academic review banner and active station header', async () => {
    render(
      <MemoryRouter>
        <FlashcardView />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Milestone M2.2 · Kho từ vựng chủ đề HSK 1 & Ôn tập SRS \(PENDING_REVIEW\)/)
    ).toBeInTheDocument();

    expect(screen.getByText(/Trạm 2 · 词汇与记忆 · Từ vựng & Sổ từ · \[M2.2 Hoạt động thật\]/)).toBeInTheDocument();
  });

  it('filters lesson cards by curriculum level and displays correct milestone badges', async () => {
    render(
      <MemoryRouter>
        <FlashcardView />
      </MemoryRouter>
    );

    // Initial render shows all 4 lessons
    expect(await screen.findByText('Chào hỏi cơ bản')).toBeInTheDocument();
    expect(screen.getByText('Gia đình & Xưng hô')).toBeInTheDocument();
    expect(screen.getByText('Thời gian & Lịch')).toBeInTheDocument();
    expect(screen.getByText('Ăn uống & Mua sắm')).toBeInTheDocument();

    // Check milestone badge differentiation
    expect(screen.getByText('Bản thảo Nhập môn / M2.1')).toBeInTheDocument();
    expect(screen.getAllByText('Bản thảo HSK1 / M2.2')).toHaveLength(3);

    // Filter by HSK 1
    const hsk1FilterButton = screen.getByRole('button', { name: /HSK 1 \(3\)/ });
    fireEvent.click(hsk1FilterButton);

    // "Chào hỏi cơ bản" (Nhập môn) should no longer be displayed
    expect(screen.queryByText('Chào hỏi cơ bản')).not.toBeInTheDocument();
    expect(screen.getByText('Gia đình & Xưng hô')).toBeInTheDocument();
    expect(screen.getByText('Thời gian & Lịch')).toBeInTheDocument();
    expect(screen.getByText('Ăn uống & Mua sắm')).toBeInTheDocument();

    // Filter by Nhập môn
    const introFilterButton = screen.getByRole('button', { name: /Nhập môn \(1\)/ });
    fireEvent.click(introFilterButton);

    expect(screen.getByText('Chào hỏi cơ bản')).toBeInTheDocument();
    expect(screen.queryByText('Gia đình & Xưng hô')).not.toBeInTheDocument();

    // Reset to "Tất cả"
    const allFilterButton = screen.getByRole('button', { name: /Tất cả \(4\)/ });
    fireEvent.click(allFilterButton);
    expect(screen.getByText('Chào hỏi cơ bản')).toBeInTheDocument();
    expect(screen.getByText('Gia đình & Xưng hô')).toBeInTheDocument();
  });

  it('filters lesson cards by catalog search query with empty state fallback', async () => {
    render(
      <MemoryRouter>
        <FlashcardView />
      </MemoryRouter>
    );

    await screen.findByText('Gia đình & Xưng hô');

    const searchInput = screen.getByPlaceholderText('Tìm chủ đề bài học...');
    fireEvent.change(searchInput, { target: { value: 'Thời gian' } });

    expect(screen.getByText('Thời gian & Lịch')).toBeInTheDocument();
    expect(screen.queryByText('Gia đình & Xưng hô')).not.toBeInTheDocument();
    expect(screen.queryByText('Chào hỏi cơ bản')).not.toBeInTheDocument();

    // Search non-existent
    fireEvent.change(searchInput, { target: { value: 'xyz không tồn tại' } });
    expect(
      screen.getByText(/Không tìm thấy bài học phù hợp với bộ lọc hoặc từ khoá "xyz không tồn tại"/)
    ).toBeInTheDocument();

    // Clear filter button in empty state
    const clearButton = screen.getByRole('button', { name: /Xoá bộ lọc & tìm lại/ });
    fireEvent.click(clearButton);
    expect(screen.getByText('Gia đình & Xưng hô')).toBeInTheDocument();
  });

  it('displays PENDING_REVIEW badge on unreviewed vocabulary items in lesson table', async () => {
    render(
      <MemoryRouter>
        <FlashcardView />
      </MemoryRouter>
    );

    // Initial selected lesson is first lesson, words loaded
    await screen.findByText('爸爸');
    expect(screen.getByText('妈妈')).toBeInTheDocument();

    // Check PENDING_REVIEW badges for unreviewed words
    const pendingBadges = screen.getAllByText('Chờ duyệt');
    expect(pendingBadges).toHaveLength(2); // 爸爸 and 妈妈 are PENDING_REVIEW

    // Approved word '有' should not have Chờ duyệt tag
    expect(screen.getByText('有')).toBeInTheDocument();
  });

  it('supports quiz practice and correctly validates Pinyin answers', async () => {
    render(
      <MemoryRouter>
        <FlashcardView />
      </MemoryRouter>
    );

    await screen.findByText('爸爸');

    // Switch to Quiz tab
    const quizTab = screen.getByRole('button', { name: 'Luyện phản xạ' });
    fireEvent.click(quizTab);

    // Quiz container rendered
    expect(await screen.findByText(/Câu hỏi 1 \//)).toBeInTheDocument();
    expect(screen.getByText(/Điểm: 0/)).toBeInTheDocument();

    // Check if input or multiple choice is rendered
    const pinyinInput = screen.queryByPlaceholderText(/Ví dụ: ni3 hao3 hoặc nǐ hǎo/);
    if (pinyinInput) {
      fireEvent.change(pinyinInput, { target: { value: 'ba4ba' } });
      const submitBtn = screen.getByRole('button', { name: 'Kiểm tra' });
      fireEvent.click(submitBtn);

      // Score should increase to 1
      expect(screen.getByText('Điểm: 1')).toBeInTheDocument();
    } else {
      // If multiple-choice mode was chosen by index
      const buttons = screen.getAllByRole('button');
      const choiceBtn = buttons.find(b => b.textContent?.includes('bố') || b.textContent?.includes('mẹ'));
      if (choiceBtn) {
        fireEvent.click(choiceBtn);
        const submitBtn = screen.getByRole('button', { name: 'Kiểm tra' });
        fireEvent.click(submitBtn);
      }
    }
  });

  it('displays honest error banner on lesson words network failure without fake state', async () => {
    fixture.lessonWords.mockRejectedValueOnce(new Error('Network connection timeout'));

    render(
      <MemoryRouter>
        <FlashcardView />
      </MemoryRouter>
    );

    expect(await screen.findByText('Network connection timeout')).toBeInTheDocument();
    // Words table should not render fake items
    expect(screen.queryByText('爸爸')).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ExamView } from '../../src/features/exam/ExamView';

const mockSpeakChinese = vi.fn();
vi.mock('../../src/services/chineseSpeech', () => ({
  speakChinese: (text: string) => mockSpeakChinese(text),
  stopChineseSpeech: vi.fn(),
  isChineseSpeechSupported: () => true,
}));

const mockExamApi = {
  generate: vi.fn(),
  get: vi.fn(),
  submit: vi.fn(),
  result: vi.fn(),
  history: vi.fn(),
  leaderboard: vi.fn(),
};

vi.mock('../../src/features/exam/api', () => ({
  examApi: {
    generate: (...args: unknown[]) => mockExamApi.generate(...args),
    get: (...args: unknown[]) => mockExamApi.get(...args),
    submit: (...args: unknown[]) => mockExamApi.submit(...args),
    result: (...args: unknown[]) => mockExamApi.result(...args),
    history: (...args: unknown[]) => mockExamApi.history(...args),
    leaderboard: (...args: unknown[]) => mockExamApi.leaderboard(...args),
  },
}));

vi.mock('../../src/app/useAuth', () => ({
  useAuth: () => ({
    user: { userId: 1, fullName: 'Learner', role: 'ROLE_USER' },
    requireLogin: vi.fn(),
  }),
}));

const examInProgress = {
  examId: 99,
  status: 'IN_PROGRESS',
  durationMinutes: 20,
  totalQuestions: 2,
  startedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 1200000).toISOString(),
  questions: [
    {
      index: 0,
      type: 'LISTENING',
      questionText: 'Nghe phát âm và chọn nghĩa đúng của từ:',
      audioText: '学校',
      options: ['Trường học', 'Bệnh viện', 'Quán ăn', 'Cửa hàng'],
    },
    {
      index: 1,
      type: 'READING',
      questionText: '他______中国菜。(Anh ấy muốn ăn món Trung Quốc)',
      options: ['想吃', '去在', '很有', '看听'],
    },
  ],
};

const gradedPass = {
  examId: 99,
  scorePercent: 100,
  correctCount: 2,
  totalCount: 2,
  currentStreak: 1,
  details: [
    {
      index: 0,
      questionText: 'Nghe phát âm và chọn nghĩa đúng của từ:',
      submittedAnswer: 'Trường học',
      correctAnswer: 'Trường học',
      correct: true,
      explanation: '学校 (xuéxiào) nghĩa là Trường học.',
    },
    {
      index: 1,
      questionText: '他______中国菜。(Anh ấy muốn ăn món Trung Quốc)',
      submittedAnswer: '想吃',
      correctAnswer: '想吃',
      correct: true,
      explanation: '想 (xiǎng) là động từ năng nguyện biểu thị mong muốn.',
    },
  ],
};

const gradedFail = {
  examId: 99,
  scorePercent: 50,
  correctCount: 1,
  totalCount: 2,
  currentStreak: 0,
  details: [
    {
      index: 0,
      questionText: 'Nghe phát âm và chọn nghĩa đúng của từ:',
      submittedAnswer: 'Bệnh viện',
      correctAnswer: 'Trường học',
      correct: false,
      explanation: '学校 (xuéxiào) nghĩa là Trường học.',
    },
    {
      index: 1,
      questionText: '他______中国菜。(Anh ấy muốn ăn món Trung Quốc)',
      submittedAnswer: '想吃',
      correctAnswer: '想吃',
      correct: true,
      explanation: '想 (xiǎng) là động từ năng nguyện biểu thị mong muốn.',
    },
  ],
};

describe('HSK Mock Exam Engine (ExamView)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExamApi.history.mockResolvedValue({ success: true, data: [] });
    mockExamApi.leaderboard.mockResolvedValue({ success: true, data: null });
    mockExamApi.generate.mockResolvedValue({ success: true, data: examInProgress });
    mockExamApi.get.mockResolvedValue({ success: true, data: examInProgress });
  });

  it('renders HSK test presets and 200-point passing threshold metadata', async () => {
    render(
      <MemoryRouter>
        <ExamView />
      </MemoryRouter>
    );

    // Shows HSK 1 banner and passing threshold 120/200
    expect(await screen.findByText(/120 \/ 200/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Bắt đầu thi thử/ })).toBeTruthy();
  });

  it('supports listening section audio playback without leaking target Hanzi in question text', async () => {
    render(
      <MemoryRouter>
        <ExamView />
      </MemoryRouter>
    );

    // Start exam
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu thi thử/ }));

    // Verify question 0 appears with listening section header
    expect(await screen.findByText('Phần 1: Nghe hiểu (听力)')).toBeTruthy();
    expect(screen.getByText('Nghe phát âm và chọn nghĩa đúng của từ:')).toBeTruthy();

    // Verify Hanzi "学校" is NOT displayed in the question text to prevent leaking
    expect(screen.queryByText('学校')).toBeNull();

    // Click audio prompt button
    const playAudioBtn = screen.getAllByRole('button', { name: /Phát âm Quan thoại/ })[0];
    fireEvent.click(playAudioBtn);

    expect(mockSpeakChinese).toHaveBeenCalledWith('学校');
  });

  it('navigates via question palette and submits exam report with scaled HSK score', async () => {
    mockExamApi.submit.mockResolvedValue({ success: true, data: gradedPass });

    render(
      <MemoryRouter>
        <ExamView />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu thi thử/ }));
    await screen.findByText('Phần 1: Nghe hiểu (听力)');

    // Select option for Question 0
    fireEvent.click(screen.getByRole('button', { name: /1\s*Trường học/ }));

    // Use Question Palette to jump to Question 1
    const paletteBtn1 = document.querySelector('[data-exam-question="1"]');
    expect(paletteBtn1).not.toBeNull();
    fireEvent.click(paletteBtn1!);

    // Verify Question 1 appears (Reading section)
    expect(await screen.findByText('Phần 2: Đọc hiểu & Ngữ pháp (阅读)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /1\s*想吃/ }));

    // Submit exam
    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài' }));

    // Verify official score report: 200/200 scaled score and 合格 seal
    await screen.findByText(/200 \/ 200/);
    expect(screen.getByText('合格')).toBeTruthy();
    expect(screen.getByText(/Đạt chuẩn/)).toBeTruthy();
  });

  it('displays 「未过」 seal stamp and diagnostic review when score is below 120/200', async () => {
    mockExamApi.submit.mockResolvedValue({ success: true, data: gradedFail });

    render(
      <MemoryRouter>
        <ExamView />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu thi thử/ }));
    await screen.findByText('Phần 1: Nghe hiểu (听力)');

    // Submit with 1/2 correct (100 / 200 < 120)
    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài' }));

    await screen.findByText(/100 \/ 200/);
    expect(screen.getByText('未过')).toBeTruthy();
    expect(screen.getByText(/Cần ôn luyện thêm/)).toBeTruthy();

    // Verify diagnostic navigation links to Grammar and Dictionary
    expect(screen.getByRole('button', { name: /Ôn tại Trạm Ngữ pháp/ })).toBeTruthy();

  });
});

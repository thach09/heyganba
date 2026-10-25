import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FlashcardView } from '../../src/features/flashcard/FlashcardView';

const fixture = vi.hoisted(() => ({
  user: { userId: 1, role: 'ROLE_USER', fullName: 'Learner One' } as any,
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
    create: (payload: any, opts?: RequestInit) => fixture.notebookCreate(payload, opts),
    addWord: (id: number, payload: any, opts?: RequestInit) => fixture.notebookAddWord(id, payload, opts),
  },
}));

beforeEach(() => {
  fixture.user = { userId: 1, role: 'ROLE_USER', fullName: 'Learner One' };
  fixture.lessons.mockReset().mockResolvedValue({
    success: true,
    data: [
      { id: 4, slug: 'intro-greetings', title: 'Chào hỏi', description: 'Bài 1', curriculumLevel: 'Nhập môn', orderIndex: 1, wordCount: 2 },
      { id: 5, slug: 'hsk1-lesson-2', title: 'Làm quen', description: 'Bài 2', curriculumLevel: 'HSK1', orderIndex: 2, wordCount: 3 },
    ],
  });
  fixture.lessonWords.mockReset().mockResolvedValue({
    success: true,
    data: [
      { id: 10, word: '你', pinyin: 'nǐ', meaningVi: 'Bạn', reviewStatus: 'PENDING_REVIEW' },
      { id: 11, word: '好', pinyin: 'hǎo', meaningVi: 'Tốt', reviewStatus: 'APPROVED' },
    ],
  });
  fixture.due.mockReset().mockResolvedValue({
    success: true,
    data: [
      { vocabularyId: 10, word: '你', pinyin: 'nǐ', meaningVi: 'Bạn', isNew: true },
      { vocabularyId: 11, word: '好', pinyin: 'hǎo', meaningVi: 'Tốt', isNew: false },
    ],
  });
  fixture.stats.mockReset().mockResolvedValue({
    success: true,
    data: { learnedWords: 5, dueToday: 2, currentStreak: 3, availableNewWords: 8 },
  });
  fixture.review.mockReset().mockResolvedValue({
    success: true,
    data: { vocabularyId: 10, intervalDays: 1, repetitions: 1, easeFactor: 2.5, currentStreak: 4 },
  });
  fixture.notebookList.mockReset().mockResolvedValue({
    success: true,
    data: [],
  });
  fixture.notebookCreate.mockReset().mockResolvedValue({
    success: true,
    data: { id: 101, title: 'Từ yêu thích', itemCount: 0 },
  });
  fixture.notebookAddWord.mockReset().mockResolvedValue({
    success: true,
    data: { notebookId: 101, vocabularyId: 10 },
  });
});

test('catalog failure offers retry without claiming that the curriculum is empty or awaiting a teacher', async () => {
  fixture.lessons.mockResolvedValueOnce({ success: false, message: 'Mất kết nối thử nghiệm' });
  render(<MemoryRouter><FlashcardView /></MemoryRouter>);
  await screen.findByRole('alert');
  expect(screen.queryByText('Chưa có bài học đã xuất bản')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  await screen.findByRole('heading', { name: 'Chào hỏi', level: 2 });
  expect(fixture.lessons).toHaveBeenCalledTimes(2);
});

test('M2.1.1: Notebook modal never injects fake mock notebook 99 and handles empty list gracefully', async () => {
  render(<MemoryRouter><FlashcardView /></MemoryRouter>);

  // Wait for lessons and words to load
  await screen.findByRole('heading', { name: 'Chào hỏi', level: 2 });
  const saveButtons = await screen.findAllByRole('button', { name: /Lưu sổ từ/ });
  fireEvent.click(saveButtons[0]);

  // Modal opens: loads notebook list from API
  await waitFor(() => expect(fixture.notebookList).toHaveBeenCalledTimes(1));

  // Verify that fake notebook 99 is NOT present anywhere
  expect(screen.queryByText(/Sổ từ mẫu/)).toBeNull();
  expect(screen.queryByText(/Admin Preview/)).toBeNull();

  // Verify empty list notice and 'Tạo sổ mới' selected
  expect(screen.getByText(/Bạn chưa có sổ tay nào/)).toBeTruthy();
  expect(screen.getByPlaceholderText(/Nhập tên sổ mới/)).toBeTruthy();
});

test('M2.1.1: Notebook modal displays error message and retry button on API failure without mock fallback', async () => {
  fixture.notebookList.mockResolvedValueOnce({ success: false, message: 'Lỗi tải sổ từ từ máy chủ' });
  render(<MemoryRouter><FlashcardView /></MemoryRouter>);

  await screen.findByRole('heading', { name: 'Chào hỏi', level: 2 });
  const saveButtons = await screen.findAllByRole('button', { name: /Lưu sổ từ/ });
  fireEvent.click(saveButtons[0]);

  // Verify error is shown
  await screen.findByText('Lỗi tải sổ từ từ máy chủ');
  expect(screen.queryByText(/Sổ từ mẫu/)).toBeNull();

  // Clicking 'Tải lại danh sách' retries
  fixture.notebookList.mockResolvedValueOnce({
    success: true,
    data: [{ id: 88, title: 'Sổ thật của user', itemCount: 1 }],
  });
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại danh sách' }));

  await screen.findByText('Sổ thật của user');
});

test('M2.1.1: If notebook create succeeds but addWord fails, newly created notebook ID is retained to avoid duplicate creation on retry', async () => {
  fixture.notebookAddWord.mockResolvedValueOnce({ success: false, message: 'Lỗi kết nối khi thêm từ' });
  render(<MemoryRouter><FlashcardView /></MemoryRouter>);

  await screen.findByRole('heading', { name: 'Chào hỏi', level: 2 });
  const saveButtons = await screen.findAllByRole('button', { name: /Lưu sổ từ/ });
  fireEvent.click(saveButtons[0]);

  await screen.findByPlaceholderText(/Nhập tên sổ mới/);
  fireEvent.change(screen.getByPlaceholderText(/Nhập tên sổ mới/), { target: { value: 'Sổ mới thử nghiệm' } });

  // Click 'Xác nhận lưu'
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận lưu' }));

  // Creation succeeds (notebookCreate called once), but addWord fails
  await screen.findByText('Lỗi kết nối khi thêm từ');
  expect(fixture.notebookCreate).toHaveBeenCalledTimes(1);

  // Retry saving: now selectedNotebookId is already targetId (101), so notebookCreate is NOT called again!
  fixture.notebookAddWord.mockResolvedValueOnce({ success: true, data: { notebookId: 101, vocabularyId: 10 } });
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận lưu' }));

  await waitFor(() => expect(fixture.notebookAddWord).toHaveBeenCalledTimes(2));
  expect(fixture.notebookCreate).toHaveBeenCalledTimes(1); // STILL 1, no duplicate notebook created!
  expect(fixture.notebookAddWord).toHaveBeenLastCalledWith(101, { vocabularyId: 10 }, { signal: expect.any(AbortSignal) });
});

test('leaving while notebook creation is pending cannot continue adding a word under another session', async () => {
  let finish!: (value: unknown) => void;
  fixture.notebookCreate.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<MemoryRouter><FlashcardView /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Chào hỏi', level: 2 });
  fireEvent.click((await screen.findAllByRole('button', { name: /Lưu sổ từ/ }))[0]);
  await screen.findByPlaceholderText(/Nhập tên sổ mới/);
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận lưu' }));
  await waitFor(() => expect(fixture.notebookCreate).toHaveBeenCalledTimes(1));
  view.unmount();
  finish({ success: true, data: { id: 101, title: 'QA only' } });
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(fixture.notebookAddWord).not.toHaveBeenCalled();
});

test('M2.1.1: SRS rating submission failure locks payload and prevents changing rating while pending', async () => {
  fixture.review.mockResolvedValueOnce({ success: false, message: 'Mất kết nối máy chủ' });
  render(<MemoryRouter><FlashcardView /></MemoryRouter>);

  // Switch to SRS tab
  fireEvent.click(screen.getByRole('button', { name: /Ôn đến hạn/ }));
  await screen.findByText('🌱 Từ mới đưa vào phiên');

  // Submit 'HARD' rating
  fireEvent.click(screen.getByRole('button', { name: /Khó/ }));

  // Review failed: notice is displayed with locked rating information
  await screen.findByText('Mất kết nối máy chủ');
  await screen.findByText(/Đang chờ gửi lại mức đánh giá:/);

  // All 4 rating buttons must be disabled while waiting for retry
  const forgotBtn = screen.getByRole('button', { name: /Chưa nhớ/ }) as HTMLButtonElement;
  const hardBtn = screen.getByRole('button', { name: /Khó/ }) as HTMLButtonElement;
  const goodBtn = screen.getByRole('button', { name: /Thuộc/ }) as HTMLButtonElement;
  const easyBtn = screen.getByRole('button', { name: /Rất dễ/ }) as HTMLButtonElement;

  expect(forgotBtn.disabled).toBe(true);
  expect(hardBtn.disabled).toBe(true);
  expect(goodBtn.disabled).toBe(true);
  expect(easyBtn.disabled).toBe(true);

  // Retrying uses the exact same attemptId and rating
  const firstPayload = fixture.review.mock.calls[0][0];
  fixture.review.mockResolvedValueOnce({
    success: true,
    data: { vocabularyId: 10, intervalDays: 1, repetitions: 1, easeFactor: 2.5 },
  });

  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

  await waitFor(() => expect(fixture.review).toHaveBeenCalledTimes(2));
  const retryPayload = fixture.review.mock.calls[1][0];

  expect(retryPayload.attemptId).toBe(firstPayload.attemptId); // EXACT same attemptId
  expect(retryPayload.rating).toBe('HARD'); // EXACT same rating
  expect(retryPayload.vocabularyId).toBe(10);
});

test('M2.1.1: Switching lessons does not reset or reload the active SRS session', async () => {
  render(<MemoryRouter><FlashcardView /></MemoryRouter>);

  // Initial load: wait for active lesson workspace header
  await screen.findByRole('heading', { name: 'Chào hỏi', level: 2 });

  // Switch to SRS and verify card is loaded
  fireEvent.click(screen.getByRole('button', { name: /Ôn đến hạn/ }));
  await screen.findByText('Thẻ 1 / 2');
  expect(fixture.due).toHaveBeenCalledTimes(1);

  // Switch back to Lessons tab
  fireEvent.click(screen.getByRole('button', { name: /Học theo bài/ }));
  await screen.findByRole('heading', { name: 'Chào hỏi', level: 2 });

  // Select another lesson (Lesson 2: Làm quen) from catalog grid
  fireEvent.click(screen.getByRole('heading', { name: 'Làm quen', level: 3 }));
  await waitFor(() => expect(fixture.lessonWords).toHaveBeenCalledWith('hsk1-lesson-2', expect.anything()));

  // Switch back to SRS: session should NOT have reloaded or reset
  fireEvent.click(screen.getByRole('button', { name: /Ôn đến hạn/ }));
  await screen.findByText('Thẻ 1 / 2');

  // fixture.due should STILL have been called only once!
  expect(fixture.due).toHaveBeenCalledTimes(1);
});

test('a failed SRS queue is recoverable and never reports session completion', async () => {
  fixture.due.mockResolvedValueOnce({ success: false, message: 'Không tải được thẻ thử nghiệm' });
  render(<MemoryRouter><FlashcardView /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Chào hỏi', level: 2 });
  fireEvent.click(screen.getByRole('button', { name: /Ôn đến hạn/ }));
  await screen.findByRole('alert');
  expect(screen.queryByText('Xong phiên ôn tập hôm nay!')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  await screen.findByText('Thẻ 1 / 2');
});

test('M2.1.1: Unauthenticated guests viewing SRS mode see a login prompt without making authenticated calls', async () => {
  fixture.user = null; // Guest user
  render(<MemoryRouter><FlashcardView /></MemoryRouter>);

  await screen.findByRole('heading', { name: 'Chào hỏi', level: 2 });

  // Switch to SRS tab
  fireEvent.click(screen.getByRole('button', { name: /Ôn đến hạn/ }));

  // Guest prompt is displayed
  expect(await screen.findByText('Đăng nhập để bắt đầu ôn tập')).toBeTruthy();

  // No authenticated due or stats endpoints should have been called for guests
  expect(fixture.due).not.toHaveBeenCalled();
});

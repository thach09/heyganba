import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/app/AuthProvider';
import { useAuth } from '../../src/app/useAuth';
import { clearTokens, saveTokens, saveUser } from '../../src/lib/api/session';
import type { AuthResponse } from '../../src/lib/api/types';
import { ExamView } from '../../src/features/exam/ExamView';
import { FlashcardView } from '../../src/features/flashcard/FlashcardView';

const api = vi.hoisted(() => ({ generate: vi.fn(), submit: vi.fn(), review: vi.fn(), due: vi.fn() }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../../src/features/progress/productEvents', () => ({ trackLearningStarted: vi.fn() }));
vi.mock('../../src/features/progress/api', () => ({ progressApi: {
  streak: async () => ({ success: true, data: null }), heatmap: async () => ({ success: true, data: [] }),
} }));
vi.mock('../../src/features/exam/api', () => ({ examApi: {
  generate: api.generate, submit: api.submit,
  history: async () => ({ success: true, data: [] }), leaderboard: async () => ({ success: true, data: null }),
} }));
vi.mock('../../src/features/flashcard/api', () => ({ flashcardApi: {
  due: api.due, review: api.review,
  stats: async () => ({ success: true, data: { learnedWords: 0, dueToday: 2, availableNewWords: 0 } }),
} }));

const profile = (userId = 1) => ({ userId, fullName: `Learner ${userId}`, role: 'ROLE_USER', classCode: null,
  accessToken: '', refreshToken: null, email: `learner${userId}@test.invalid`, tokenType: 'Bearer' } satisfies AuthResponse);
const success = (data: unknown) => ({ success: true, data });
const exam = () => ({ examId: 17, status: 'IN_PROGRESS', durationMinutes: 20, totalQuestions: 2,
  startedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 1200000).toISOString(),
  questions: [0, 1].map(index => ({ index, type: 'GRAMMAR', questionText: `Question ${index}`, options: ['Option A', 'Option B'] })),
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}
function mount(view: React.ReactNode) {
  saveTokens('test-access', null); saveUser(profile());
  return render(<MemoryRouter><AuthProvider>{view}</AuthProvider></MemoryRouter>);
}
beforeEach(() => {
  api.generate.mockReset().mockImplementation(async () => success(exam()));
  api.submit.mockReset().mockResolvedValue(success({ examId: 17, scorePercent: 0, correctCount: 0, totalCount: 2, currentStreak: 0, details: [] }));
  api.review.mockReset();
  api.due.mockReset().mockResolvedValue(success([1, 2].map(vocabularyId => ({ vocabularyId, word: `Word ${vocabularyId}`,
    reading: `Word ${vocabularyId}`, meaning: `Meaning ${vocabularyId}`, isNew: true, repetitions: 0 }))));
});

test('QA-001: password signout/account switch removes the previous exam and answers', async () => {
  mount(<ExamView />);
  fireEvent.click(screen.getByRole('button', { name: /Bắt đầu thi thử/ }));
  await screen.findByText('Question 0'); fireEvent.keyDown(window, { key: '1' });
  expect(screen.getByText('Đã chọn')).toBeTruthy();
  act(() => clearTokens());
  expect(screen.queryByText('Question 0')).toBeNull();
  act(() => { saveTokens('other-access', null); saveUser(profile(2)); });
  expect(screen.getByRole('button', { name: /Bắt đầu thi thử/ })).toBeTruthy();
  expect(screen.queryByText('Question 0')).toBeNull();
  expect(api.submit).not.toHaveBeenCalled();
});

function Identity() {
  const { user } = useAuth();
  return <span>{user?.fullName ?? 'Signed out'}</span>;
}
test('QA-007: another tab login/logout reconciles visible identity and clears private exam state', async () => {
  mount(<><Identity /><ExamView /></>);
  fireEvent.click(screen.getByRole('button', { name: /Bắt đầu thi thử/ }));
  await screen.findByText('Question 0');
  act(() => {
    localStorage.setItem('heyganba_user', JSON.stringify(profile(2)));
    window.dispatchEvent(new StorageEvent('storage', { key: 'heyganba_user' }));
  });
  expect(screen.getByText('Learner 2')).toBeTruthy();
  expect(screen.queryByText('Question 0')).toBeNull();
  act(() => {
    localStorage.removeItem('heyganba_user');
    window.dispatchEvent(new StorageEvent('storage', { key: 'heyganba_user' }));
  });
  expect(screen.getByText('Signed out')).toBeTruthy();
});

test('QA-003: quick next/answer input waits for save, then both reviews persist without cancellation', async () => {
  const gate = deferred<ReturnType<typeof success>>();
  api.review.mockImplementationOnce(() => gate.promise).mockResolvedValue(success({ repetitions: 1 }));
  mount(<FlashcardView />);
  await screen.findByText('Word 1'); fireEvent.keyDown(window, { key: '1' });
  await waitFor(() => expect(api.review).toHaveBeenCalledTimes(1));
  const signal = api.review.mock.calls[0][0].signal;
  fireEvent.keyDown(window, { key: 'Enter' }); fireEvent.keyDown(window, { key: '1' });
  expect(api.review).toHaveBeenCalledTimes(1); expect(signal.aborted).toBe(false);
  await act(async () => gate.resolve(success({ repetitions: 1 })));
  fireEvent.keyDown(window, { key: 'Enter' }); fireEvent.keyDown(window, { key: '1' });
  await waitFor(() => expect(api.review).toHaveBeenCalledTimes(2));
  expect(signal.aborted).toBe(false);
  expect(api.review.mock.calls.map(([options]) => JSON.parse(options.body).vocabularyId)).toEqual([1, 2]);
  await waitFor(() => expect(screen.getByText('2', { selector: 'b' })).toBeTruthy());
});

test('QA-003: a failed save retains the card, blocks advancement and offers retry', async () => {
  api.review.mockResolvedValueOnce({ success: false, message: 'Offline' }).mockResolvedValue(success({ repetitions: 1 }));
  mount(<FlashcardView />); await screen.findByText('Word 1');
  fireEvent.keyDown(window, { key: '1' }); await screen.findByRole('button', { name: 'Thử lưu lại' });
  fireEvent.keyDown(window, { key: 'Enter' }); expect(screen.queryByText('Word 2')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lưu lại' }));
  await waitFor(() => expect(api.review).toHaveBeenCalledTimes(2));
  await waitFor(() => expect((screen.getByRole('button', { name: /Tiếp theo/ }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.keyDown(window, { key: 'Enter' }); expect(screen.getByText('Word 2')).toBeTruthy();
});

test('QA-005: six deadline ticks keep one submission in flight and allow explicit retry after failure', async () => {
  const gate = deferred<ReturnType<typeof success>>();
  api.submit.mockImplementationOnce(() => gate.promise).mockResolvedValue(success({ scorePercent: 0, correctCount: 0, totalCount: 2, details: [] }));
  vi.useFakeTimers();
  try {
    mount(<ExamView />);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Bắt đầu thi thử/ })));
    expect(screen.getByText('Question 0')).toBeTruthy();
    vi.setSystemTime(Date.now() + 1200001);
    await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
    expect(api.submit).toHaveBeenCalledTimes(1);
    expect(api.submit.mock.calls[0][1].signal.aborted).toBe(false);
    await act(async () => gate.resolve({ success: false, data: null, message: 'Offline' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(api.submit).toHaveBeenCalledTimes(1);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Nộp bài' })));
    expect(api.submit).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/Kết quả:/)).toBeTruthy();
  } finally { vi.useRealTimers(); }
});

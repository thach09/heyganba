import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/app/AuthProvider';
import { useAuth } from '../../src/app/useAuth';
import { saveTokens, saveUser } from '../../src/lib/api/session';
import { ApiError, type AuthResponse } from '../../src/lib/api/types';
import { ExamView } from '../../src/features/exam/ExamView';
import { FlashcardView } from '../../src/features/flashcard/FlashcardView';
import { GrammarView } from '../../src/features/grammar/GrammarView';
import { readActiveAttempt, saveActiveAttempt } from '../../src/features/exam/activeAttempt';

const api = vi.hoisted(() => ({ generate: vi.fn(), get: vi.fn(), submit: vi.fn(), result: vi.fn(), review: vi.fn(), exercises: vi.fn(), check: vi.fn() }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../../src/features/progress/productEvents', () => ({ trackLearningStarted: vi.fn() }));
vi.mock('../../src/features/progress/api', () => ({ progressApi: {
  streak: async () => ({ success: true, data: null }), heatmap: async () => ({ success: true, data: [] }),
} }));
vi.mock('../../src/features/exam/api', () => ({ examApi: {
  generate: api.generate, get: api.get, submit: api.submit, result: api.result,
  history: async () => ({ success: true, data: [] }), leaderboard: async () => ({ success: true, data: null }),
} }));
vi.mock('../../src/features/flashcard/api', () => ({ flashcardApi: {
  review: api.review, due: async () => success([1, 2].map(vocabularyId => ({ vocabularyId, word: `Word ${vocabularyId}`, reading: `Word ${vocabularyId}`, meaning: `Meaning ${vocabularyId}` }))),
  stats: async () => success({ learnedWords: 0, dueToday: 2 }),
} }));
vi.mock('../../src/features/grammar/api', () => ({ grammarApi: {
  rules: async () => success([]), exercises: api.exercises, check: api.check,
} }));
const profile = { userId: 1, fullName: 'Learner', role: 'ROLE_USER', classCode: null,
  accessToken: '', refreshToken: null, email: 'learner@test.invalid', tokenType: 'Bearer' } satisfies AuthResponse;
const success = (data: unknown) => ({ success: true, data });
const exam = { examId: 17, status: 'IN_PROGRESS', durationMinutes: 20, totalQuestions: 2,
  startedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 1200000).toISOString(),
  questions: [0, 1].map(index => ({ index, type: 'GRAMMAR', questionText: `Question ${index}`, options: ['Option A', 'Option B'] })),
};
const graded = { examId: 17, scorePercent: 0, correctCount: 0, totalCount: 2, currentStreak: 0, details: [] };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}
function mount(view: React.ReactNode) {
  saveTokens('test-access', null); saveUser(profile);
  return render(<MemoryRouter><AuthProvider>{view}</AuthProvider></MemoryRouter>);
}
beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  api.generate.mockResolvedValue(success(exam)); api.get.mockResolvedValue(success(exam));
  api.submit.mockResolvedValue(success(graded)); api.result.mockResolvedValue(success(graded));
  api.exercises.mockResolvedValue(success([{ id: 66, questionText: 'Practice question', options: ['Option A', 'Option B'] }]));
});

test('QA-002: reload restores owned exam, answers, position, then clears the checkpoint on submit', async () => {
  const view = mount(<ExamView />);
  fireEvent.click(screen.getByRole('button', { name: /Bắt đầu thi thử/ }));
  await screen.findByText('Question 0'); fireEvent.keyDown(window, { key: '1' }); fireEvent.keyDown(window, { key: 'Enter' });
  expect(readActiveAttempt(1)).toEqual({ examId: 17, answers: { 0: 'Option A' }, activeIndex: 1 });
  view.unmount(); mount(<ExamView />); await screen.findByText('Question 0');
  expect(api.get.mock.calls[0][0]).toBe(17); expect(screen.getByText('Đã chọn')).toBeTruthy();
  expect(document.querySelector('[data-exam-question="1"]')?.classList.contains('border-fg')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Nộp bài' })); await screen.findByText(/Kết quả:/);
  expect(JSON.parse(api.submit.mock.calls[0][1].body).answers).toEqual([{ index: 0, answer: 'Option A' }, { index: 1, answer: '' }]);
  expect(readActiveAttempt(1)).toBeNull();
});
test('QA-002: failed restore retains checkpoint and retries without generating another attempt', async () => {
  saveActiveAttempt(1, { examId: 17, answers: { 0: 'Option A' }, activeIndex: 0 });
  api.get.mockResolvedValueOnce({ success: false, message: 'Offline' }).mockResolvedValue(success(exam));
  mount(<ExamView />); await screen.findByRole('button', { name: /Thử khôi phục lại/ });
  expect(screen.queryByRole('button', { name: /Bắt đầu thi thử/ })).toBeNull();
  expect(readActiveAttempt(1)?.examId).toBe(17);
  fireEvent.click(screen.getByRole('button', { name: /Thử khôi phục lại/ })); await screen.findByText('Question 0');
  expect(api.generate).not.toHaveBeenCalled();
});
test('QA-002: settled submissions restore existing results and clear the checkpoint', async () => {
  saveActiveAttempt(1, { examId: 17, answers: {}, activeIndex: 0 });
  api.get.mockResolvedValue(success({ ...exam, status: 'SUBMITTED' }));
  mount(<ExamView />); await screen.findByText(/Kết quả:/);
  expect(api.result.mock.calls[0][0]).toBe(17); expect(api.submit).not.toHaveBeenCalled(); expect(readActiveAttempt(1)).toBeNull();
});
test('QA-002: inaccessible checkpoint shows an error without cached questions', async () => {
  saveActiveAttempt(1, { examId: 17, answers: {}, activeIndex: 0 });
  api.get.mockResolvedValue({ success: false, message: 'Unavailable', error: new ApiError('http', 'Unavailable', 404) });
  mount(<ExamView />); await screen.findByText('Unavailable');
  expect(screen.queryByText('Question 0')).toBeNull(); expect(readActiveAttempt(1)).toBeNull();
});
function PasswordAction() { const { changePassword } = useAuth(); return <button onClick={changePassword}>Open password</button>; }
test('QA-004: password modal owns numbers and Enter, even outside a text input', async () => {
  mount(<><PasswordAction /><FlashcardView /></>); await screen.findByText('Word 1');
  fireEvent.click(screen.getByText('Open password')); const input = screen.getByRole('dialog').querySelector('input')!;
  for (const key of ['1', '2', '3', 'Enter']) fireEvent.keyDown(input, { key });
  fireEvent.keyDown(window, { key: '1' }); fireEvent.keyDown(window, { key: 'Enter' });
  expect(api.review).not.toHaveBeenCalled(); expect(screen.getByText('Word 1')).toBeTruthy();
});
test.each(['input', 'textarea', 'div'])('QA-004: SRS ignores editable %s without a modal', async tag => {
  mount(<FlashcardView />); await screen.findByText('Word 1');
  const field = document.createElement(tag); if (tag === 'div') field.setAttribute('contenteditable', 'true'); document.body.append(field);
  try { fireEvent.keyDown(field, { key: '1' }); fireEvent.keyDown(field, { key: 'Enter' }); expect(api.review).not.toHaveBeenCalled(); }
  finally { field.remove(); }
});
test('QA-008: repeated keys/clicks create one delayed grading request and one result', async () => {
  const gate = deferred<ReturnType<typeof success>>(); api.check.mockImplementation(() => gate.promise);
  mount(<GrammarView />); fireEvent.click(screen.getByRole('button', { name: 'Luyện tập' })); await screen.findByText('Practice question');
  act(() => { fireEvent.keyDown(window, { key: '1' }); fireEvent.keyDown(window, { key: '1' }); });
  fireEvent.click(screen.getByRole('button', { name: /1\s*Option A/ }));
  expect(api.check).toHaveBeenCalledTimes(1); expect(api.check.mock.calls[0][1].signal.aborted).toBe(false);
  await act(async () => gate.resolve(success({ correct: true, correctAnswer: 'Option A', submittedAnswer: 'Option A' })));
  fireEvent.keyDown(window, { key: '1' }); expect(api.check).toHaveBeenCalledTimes(1); expect(screen.getByText('Chính xác')).toBeTruthy();
  expect(screen.getByText(/Đúng/, { selector: 'p' }).textContent).toContain('1/1 câu');
});
test('QA-008: settled failure unlocks one retry', async () => {
  api.check.mockResolvedValueOnce({ success: false, message: 'Offline' }).mockResolvedValue(success({ correct: false, correctAnswer: 'Option B' }));
  mount(<GrammarView />); fireEvent.click(screen.getByRole('button', { name: 'Luyện tập' })); await screen.findByText('Practice question');
  fireEvent.keyDown(window, { key: '1' }); await screen.findByText('Offline');
  fireEvent.keyDown(window, { key: '1' }); await screen.findByText('Giải thích'); expect(api.check).toHaveBeenCalledTimes(2);
});
test('QA-009: pending, successful empty and failed exercise loads remain distinct', async () => {
  const gate = deferred<ReturnType<typeof success>>(); api.exercises.mockImplementationOnce(() => gate.promise);
  mount(<GrammarView />); fireEvent.click(screen.getByRole('button', { name: 'Luyện tập' }));
  expect(screen.getByText('Đang tải bài tập...')).toBeTruthy(); expect(screen.queryByText(/Chưa có câu bài tập/)).toBeNull();
  await act(async () => gate.resolve(success([]))); expect(screen.getByText(/Chưa có câu bài tập/)).toBeTruthy();
  api.exercises.mockResolvedValueOnce({ success: false, message: 'Offline exercises' });
  fireEvent.click(screen.getByRole('button', { name: /Chỉ nhóm bẫy/ })); await screen.findByText('Offline exercises');
  expect(screen.queryByText(/Chưa có câu bài tập/)).toBeNull(); expect(screen.queryByText('Đang tải bài tập...')).toBeNull();
  api.exercises.mockResolvedValue(success([])); fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại' }));
  await waitFor(() => expect(screen.getByText(/Chưa có câu bài tập/)).toBeTruthy());
});

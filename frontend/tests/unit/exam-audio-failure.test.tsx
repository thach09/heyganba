import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ExamView } from '../../src/features/exam/ExamView';

const fixture = vi.hoisted(() => ({ speech: vi.fn(), submit: vi.fn() }));
vi.mock('../../src/services/chineseSpeech', () => ({ speakChinese: fixture.speech }));
vi.mock('../../src/app/useAuth', () => ({ useAuth: () => ({
  user: { userId: 91, role: 'ROLE_USER' }, requireLogin: vi.fn(), updateProfile: vi.fn(),
}) }));
vi.mock('../../src/features/exam/api', () => ({ examApi: {
  history: async () => ({ success: true, data: [] }), leaderboard: async () => ({ success: true, data: null }),
  submit: fixture.submit,
  generate: async () => ({ success: true, data: {
    examId: 991, status: 'IN_PROGRESS', durationMinutes: 20, totalQuestions: 1,
    expiresAt: new Date(Date.now() + 1_200_000).toISOString(),
    questions: [{ index: 0, type: 'LISTENING', questionText: 'Fixture listening question', audioText: '你好', options: ['A', 'B'] }],
  } }),
} }));
vi.mock('../../src/features/progress/api', () => ({ progressApi: {
  streak: async () => ({ success: true, data: null }), heatmap: async () => ({ success: true, data: [] }),
} }));
beforeEach(() => vi.clearAllMocks());
async function play() {
  render(<MemoryRouter><ExamView /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /Bắt đầu thi thử/ }));
  await screen.findByText('Fixture listening question');
  const saved = localStorage.getItem('heyganba_exam:91');
  fireEvent.click(screen.getByRole('button', { name: 'Phát âm Quan thoại' }));
  return saved;
}
test.each([
  ['no-voice', 'cài giọng tiếng Trung'],
  ['unsupported', 'Trình duyệt chưa hỗ trợ'],
  ['error', 'Bấm nghe để thử lại'],
])('speech status %s gives accessible recovery without changing the attempt', async (status, message) => {
  fixture.speech.mockReturnValue(status);
  const saved = await play();
  expect(screen.getByRole('alert').textContent).toContain(message);
  expect(localStorage.getItem('heyganba_exam:91')).toBe(saved);
  expect(fixture.submit).not.toHaveBeenCalled();
});
test('asynchronous synthesis failure provides retry feedback', async () => {
  fixture.speech.mockImplementation((_text, options) => { options.onError({ error: 'audio-busy' }); return 'spoken'; });
  await play();
  expect(screen.getByRole('alert').textContent).toContain('Bấm nghe để thử lại');
  expect(fixture.submit).not.toHaveBeenCalled();
});
test('intentional speech interruption does not show a playback error', async () => {
  fixture.speech.mockImplementation((_text, options) => { options.onError({ error: 'interrupted' }); return 'spoken'; });
  await play();
  expect(screen.queryByRole('alert')).toBeNull();
});

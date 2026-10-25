import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ExamView } from '../../src/features/exam/ExamView';
import { readActiveAttempt } from '../../src/features/exam/activeAttempt';
import { CHINESE_SPEECH_RATES } from '../../src/services/chineseSpeech';

const api = vi.hoisted(() => ({ generate: vi.fn(), get: vi.fn(), submit: vi.fn(), result: vi.fn() }));
vi.mock('../../src/app/useAuth', () => ({ useAuth: () => ({
  user: { userId: 43, fullName: 'Audio test learner', role: 'ROLE_USER' },
  requireLogin: vi.fn(), updateProfile: vi.fn(),
}) }));
vi.mock('../../src/features/exam/api', () => ({ examApi: {
  ...api,
  history: async () => ({ success: true, data: [] }),
  leaderboard: async () => ({ success: true, data: null }),
} }));
vi.mock('../../src/features/progress/api', () => ({ progressApi: {
  streak: async () => ({ success: true, data: null }),
  heatmap: async () => ({ success: true, data: [] }),
} }));

const voice = { lang: 'zh-CN', name: 'Test Mandarin voice' };
const speech = {
  getVoices: () => [voice], cancel: vi.fn(),
  speak: vi.fn<(utterance: SpeechSynthesisUtterance) => void>(),
};
const questions = [0, 1].map(index => ({
  index, type: 'LISTENING', questionText: `Audio question ${index}`,
  audioText: index === 0 ? '你好' : '谢谢', options: ['Option A', 'Option B'],
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('speechSynthesis', speech);
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string;
    constructor(text: string) { this.text = text; }
  });
  api.generate.mockResolvedValue({ success: true, data: {
    examId: 71, status: 'IN_PROGRESS', durationMinutes: 20, totalQuestions: 2,
    startedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 1_200_000).toISOString(), questions,
  } });
});

async function startExam() {
  render(<MemoryRouter><ExamView /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /Bắt đầu thi thử/ }));
  await screen.findByText('Audio question 0');
}

function card(index = 0) {
  return screen.getByText(`Audio question ${index}`).closest('[data-exam-question]') as HTMLElement;
}

function audioButton(slow: boolean, index = 0) {
  return within(card(index)).getByRole('button', { name: slow ? /0\.75x/ : 'Phát âm Quan thoại' });
}

test('normal audio uses the real Mandarin service at 0.95 and its tooltip matches', async () => {
  await startExam();
  expect(speech.speak).not.toHaveBeenCalled();
  expect(audioButton(false).title).toBe(`Nghe câu hỏi bằng giọng Quan thoại chuẩn (${CHINESE_SPEECH_RATES.NORMAL}x)`);
  fireEvent.click(audioButton(false));
  expect(CHINESE_SPEECH_RATES.NORMAL).toBe(0.95);
  expect(speech.speak).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
    text: '你好', voice, lang: 'zh-CN', rate: CHINESE_SPEECH_RATES.NORMAL,
  }));
  expect(screen.queryByText('你好')).toBeNull();
});

test('slow audio uses the real Mandarin service at 0.75', async () => {
  await startExam();
  expect(audioButton(true).title).toBe(`Nghe chậm (${CHINESE_SPEECH_RATES.SLOW}x)`);
  fireEvent.click(audioButton(true));
  expect(CHINESE_SPEECH_RATES.SLOW).toBe(0.75);
  expect(speech.speak).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
    text: '你好', voice, lang: 'zh-CN', rate: CHINESE_SPEECH_RATES.SLOW,
  }));
});

test.each([false, true])('audio clicks stop bubbling and leave answers, active question and checkpoint unchanged (slow=%s)', async slow => {
  await startExam();
  fireEvent.click(within(card(0)).getByRole('button', { name: /1\s*Option A/ }));
  const checkpoint = readActiveAttempt(43);
  const saved = localStorage.getItem('heyganba_exam:43');
  expect(checkpoint).toMatchObject({ activeIndex: 0, answers: { 0: 'Option A' } });
  fireEvent.click(audioButton(slow, 1), { detail: 0 });
  expect(speech.speak.mock.calls[0][0].text).toBe('谢谢');
  expect(readActiveAttempt(43)).toEqual(checkpoint);
  expect(localStorage.getItem('heyganba_exam:43')).toBe(saved);
  expect(card(0).classList.contains('border-fg')).toBe(true);
  expect(card(1).classList.contains('border-fg')).toBe(false);
  expect(api.submit).not.toHaveBeenCalled();
  expect(api.get).not.toHaveBeenCalled();
});

test.each([false, true])('unsupported speech gives visible feedback without playback or exam mutations (slow=%s)', async slow => {
  await startExam();
  const saved = localStorage.getItem('heyganba_exam:43');
  Reflect.deleteProperty(window, 'speechSynthesis');
  fireEvent.click(audioButton(slow, 1));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByText(/Trình duyệt.*hỗ trợ đọc/)).toBeTruthy();
  expect(speech.speak).not.toHaveBeenCalled();
  expect(speech.cancel).not.toHaveBeenCalled();
  expect(localStorage.getItem('heyganba_exam:43')).toBe(saved);
  expect(api.submit).not.toHaveBeenCalled();
});

test('rapid normal and slow clicks cancel the preceding utterance before each playback', async () => {
  await startExam();
  fireEvent.click(audioButton(false));
  fireEvent.click(audioButton(true));
  fireEvent.click(audioButton(false));
  expect(speech.speak.mock.calls.map(([utterance]) => utterance.rate)).toEqual([0.95, 0.75, 0.95]);
  expect(speech.cancel).toHaveBeenCalledTimes(3);
  for (let index = 0; index < 3; index++) {
    expect(speech.cancel.mock.invocationCallOrder[index]).toBeLessThan(speech.speak.mock.invocationCallOrder[index]);
  }
  expect(api.submit).not.toHaveBeenCalled();
});

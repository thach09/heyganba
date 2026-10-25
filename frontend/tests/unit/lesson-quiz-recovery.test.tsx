import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FlashcardView } from '../../src/features/flashcard/FlashcardView';

const fixture = vi.hoisted(() => ({ words: [] as Array<Record<string, unknown>>, user: { userId: 1, role: 'ROLE_USER' } }));
vi.mock('../../src/app/useAuth', () => ({ useAuth: () => ({ user: fixture.user, requireLogin: vi.fn() }) }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../../src/features/companion/StudyPetCompanion', () => ({ StudyPetCompanion: () => null }));
vi.mock('../../src/features/companion/useCompanionStore', () => ({ useCompanion: () => ({ triggerReaction: vi.fn(), rewardBamboo: vi.fn() }) }));
vi.mock('../../src/features/flashcard/api', () => ({
  vocabularyApi: {
    lessons: async () => ({ success: true, data: [{ id: 1, slug: 'fixture-lesson', title: 'Bài fixture', curriculumLevel: 'HSK 1', wordCount: fixture.words.length }] }),
    lessonWords: async () => ({ success: true, data: fixture.words }),
  },
  flashcardApi: { stats: async () => ({ success: true, data: null }), due: async () => ({ success: true, data: [] }) },
  notebookApi: { list: async () => ({ success: true, data: [] }) },
}));
const market = { id: 1, word: '超市', pinyin: 'chāoshì', meaningVi: 'Siêu thị', reviewStatus: 'APPROVED' };
const friend = { id: 2, word: '朋友', pinyin: 'péngyou', meaningVi: 'Bạn bè', reviewStatus: 'APPROVED' };
beforeEach(() => { fixture.words = [market]; fixture.user = { userId: 1, role: 'ROLE_USER' }; });
async function openQuiz() {
  const view = render(<MemoryRouter initialEntries={['/vocabulary?level=HSK1']}><FlashcardView /></MemoryRouter>);
  await screen.findAllByText('超市');
  fireEvent.click(screen.getByRole('button', { name: 'Luyện phản xạ' }));
  return view;
}

test('a one-word lesson uses recall without revealing its only possible meaning or Pinyin', async () => {
  await openQuiz();
  expect(screen.getByRole('textbox', { name: /^Nhập Pinyin/ })).toBeInTheDocument();
  expect(screen.getByText('Bài còn ít từ, chuyển sang luyện gõ Pinyin.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Siêu thị' })).toBeNull();
  expect(screen.queryByText('chāoshì')).toBeNull();
  expect(screen.queryByText('Siêu thị')).toBeNull();
});

test('repeated glossary meanings cannot become a single-answer multiple-choice question', async () => {
  fixture.words = [market, { ...market, id: 3 }];
  await openQuiz();
  expect(screen.getByRole('textbox', { name: /^Nhập Pinyin/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Siêu thị' })).toBeNull();
});

test('switching lesson tabs retains the question, score and unfinished Pinyin input', async () => {
  fixture.words = [market, friend];
  await openQuiz();
  fireEvent.click(screen.getByRole('button', { name: 'Siêu thị' }));
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đáp án' }));
  fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp theo →' }));
  fireEvent.change(screen.getByRole('textbox', { name: /^Nhập Pinyin/ }), { target: { value: 'peng2you' } });
  fireEvent.click(screen.getByRole('button', { name: 'Danh sách từ (2)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Luyện phản xạ' }));
  expect(screen.getByText('Câu hỏi 2 / 2')).toBeInTheDocument();
  expect(screen.getByText('Điểm: 1')).toBeInTheDocument();
  expect((screen.getByRole('textbox', { name: /^Nhập Pinyin/ }) as HTMLInputElement).value).toBe('peng2you');
});

test('explicit restart clears the previous answer and graded feedback', async () => {
  await openQuiz();
  fireEvent.change(screen.getByRole('textbox', { name: /^Nhập Pinyin/ }), { target: { value: 'chao1 shi4' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đáp án' }));
  expect(screen.getByText(/Chính xác!/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp theo →' }));
  fireEvent.click(screen.getByRole('button', { name: 'Luyện lại bài này' }));
  expect((screen.getByRole('textbox', { name: /^Nhập Pinyin/ }) as HTMLInputElement).value).toBe('');
  expect(screen.queryByText(/Chính xác!/)).toBeNull();
  expect(screen.queryByText('chāoshì')).toBeNull();
});

async function unfinishedSecondQuestion() {
  fixture.words = [market, friend];
  const view = await openQuiz();
  fireEvent.click(screen.getByRole('button', { name: 'Siêu thị' }));
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đáp án' }));
  fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp theo →' }));
  fireEvent.change(screen.getByRole('textbox', { name: /^Nhập Pinyin/ }), { target: { value: 'peng2you' } });
  return view;
}

test('remount after reload or browser navigation restores the question, answer and score', async () => {
  const view = await unfinishedSecondQuestion();
  view.unmount();
  render(<MemoryRouter initialEntries={['/vocabulary?level=HSK1']}><FlashcardView /></MemoryRouter>);
  expect(await screen.findByText('Câu hỏi 2 / 2')).toBeInTheDocument();
  expect(screen.getByText('Điểm: 1')).toBeInTheDocument();
  expect((screen.getByRole('textbox', { name: /^Nhập Pinyin/ }) as HTMLInputElement).value).toBe('peng2you');
});

test('a different account cannot resume the earlier learner’s local answers', async () => {
  const view = await unfinishedSecondQuestion();
  view.unmount();
  fixture.user = { userId: 2, role: 'ROLE_USER' };
  await openQuiz();
  expect(screen.getByText('Câu hỏi 1 / 2')).toBeInTheDocument();
  expect(screen.getByText('Điểm: 0')).toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: /^Nhập Pinyin/ })).toBeNull();
});

test('changed lesson content invalidates the cached quiz instead of showing stale answers', async () => {
  const view = await unfinishedSecondQuestion();
  view.unmount();
  fixture.words = [market, { ...friend, meaningVi: 'Nghĩa được chỉnh trong fixture' }];
  await openQuiz();
  expect(screen.getByText('Câu hỏi 1 / 2')).toBeInTheDocument();
  expect(screen.getByText('Điểm: 0')).toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: /^Nhập Pinyin/ })).toBeNull();
});

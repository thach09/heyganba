import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';
import { OrientalCard } from '../../src/components/OrientalCard';
import { HskRoadmap } from '../../src/features/dashboard/HskRoadmap';
import { FlashcardView } from '../../src/features/flashcard/FlashcardView';
import { GrammarView } from '../../src/features/grammar/GrammarView';
import { HanziStationView } from '../../src/features/hanzi/HanziStationView';
import { ExamView } from '../../src/features/exam/ExamView';
import { ALL_READING_PASSAGES } from '../../src/features/dictionary/readingData';

const f = vi.hoisted(() => ({ words: vi.fn(), hanzi: vi.fn(), generate: vi.fn(), submit: vi.fn() }));
const levels = [1, 2, 3, 4, 5, 6];
const ok = (data: unknown) => ({ success: true, data });
vi.mock('../../src/app/useAuth', () => ({ useAuth: () => ({ user: { userId: 1, role: 'ROLE_USER' }, requireLogin: vi.fn() }) }));
vi.mock('../../src/features/flashcard/api', () => ({
  vocabularyApi: {
    lessons: async () => ok(levels.map(n => ({ id: n, slug: `lesson-${n}`, title: `Topic ${n}`, description: '', curriculumLevel: `HSK ${n}`, wordCount: 1 }))),
    lessonWords: (...args: unknown[]) => f.words(...args),
  },
  flashcardApi: { stats: async () => ok(null), due: async () => ok([]) },
  notebookApi: { list: async () => ok([]) },
}));
vi.mock('../../src/features/grammar/api', () => ({ grammarApi: {
  rules: async () => ok(levels.map(n => ({ id: n, title: `Rule ${n}`, structure: `Structure ${n}`, hskLevel: n, explanation: '', reviewStatus: 'APPROVED', exerciseCount: 2 }))),
} }));
vi.mock('../../src/features/hanzi/api', () => ({ hanziApi: { list: (...args: unknown[]) => f.hanzi(...args) } }));
vi.mock('../../src/features/progress/api', () => ({ progressApi: {
  mastery: async () => ok([]), streak: async () => ok(null), heatmap: async () => ok([]),
} }));
vi.mock('../../src/features/exam/api', () => ({ examApi: {
  history: async () => ok([]), leaderboard: async () => ok(null),
  generate: (...args: unknown[]) => f.generate(...args), submit: (...args: unknown[]) => f.submit(...args),
} }));
beforeEach(() => {
  vi.clearAllMocks();
  f.words.mockImplementation(async (slug: string) => ok([{ id: 1, word: `Word ${slug}`, reviewStatus: 'APPROVED', pinyin: 'cí', meaningVi: 'từ' }]));
  f.hanzi.mockImplementation(async (query: string) => { const level = Number(new URLSearchParams(query).get('hsk') || 1); return ok([{ id: level, character: ['人','好','环','律','谦','履'][level-1], pinyin: 'pinyin', hskLevel: level, reviewStatus: 'APPROVED' }]); });
});
const mount = (node: React.ReactNode, path = '/') => render(<MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>);

test('roadmap tags use normal flow, with exactly one combined tag per stage and links to all six levels', () => {
  const { container } = mount(<HskRoadmap />);
  expect(container.querySelectorAll('[data-card-tag]')).toHaveLength(4);
  for (const tag of container.querySelectorAll('[data-card-tag]')) expect(tag.className).not.toContain('absolute');
  for (const n of levels) expect(screen.getByRole('link', { name: `Học từ vựng HSK ${n} →` }).getAttribute('href')).toBe(`/vocabulary?level=HSK${n}`);
  expect(container.querySelectorAll('[data-hsk-roadmap] h3')).toHaveLength(4);
});
test('shared card reserves space before arbitrary child headers', () => {
  const { container } = mount(<OrientalCard tag="Một nhãn dài · 拼音入门"><h3>Title</h3><button>Action</button></OrientalCard>);
  const tag=container.querySelector('[data-card-tag]')!;
  expect(tag.nextElementSibling?.textContent).toBe('Title');
  expect(tag.className).toContain('mb-5');
});

test.each(levels)('vocabulary deep link selects only HSK %i and loads the matching lesson', async n => {
  mount(<FlashcardView />, `/vocabulary?level=HSK${n}`);
  await screen.findByText(`Topic ${n}`);
  await waitFor(() => expect(f.words).toHaveBeenCalledWith(`lesson-${n}`, expect.any(Object)));
  expect(f.words.mock.calls.every(([slug]) => slug === `lesson-${n}`)).toBe(true);
  for(const other of levels.filter(level => level!==n)) expect(screen.queryByText(`Topic ${other}`)).toBeNull();
});

function Navigation() {
  const navigate=useNavigate(); const location=useLocation();
  return <><button onClick={() => navigate(-1)}>Back</button><span data-testid="url">{location.search}</span></>;
}
test('vocabulary level buttons update URL and back restores the earlier filter', async () => {
  mount(<><Navigation /><FlashcardView /></>, '/vocabulary?level=HSK3&preview=0');
  await screen.findByText('Topic 3');
  fireEvent.click(screen.getByRole('button', { name: /^HSK 6 \(/ }));
  await screen.findByText('Topic 6');
  expect(screen.getByTestId('url').textContent).toContain('level=HSK6');
  expect(screen.getByTestId('url').textContent).toContain('preview=0');
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  await screen.findByText('Topic 3');
});
test.each(levels)('grammar level %i displays its rule and accurate count', async n => {
  mount(<GrammarView />); await screen.findByText('Rule 1');
  fireEvent.click(screen.getByRole('button', { name: `HSK ${n} (1)` }));
  expect(screen.getByText(`Rule ${n}`)).toBeTruthy();
  for(const other of levels.filter(level => level!==n)) expect(screen.queryByText(`Rule ${other}`)).toBeNull();
});
test.each(levels)('Hanzi level %i requests the correct server filter', async n => {
  mount(<HanziStationView />); await waitFor(() => expect(f.hanzi).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: `HSK ${n}` }));
  await waitFor(() => expect(f.hanzi).toHaveBeenLastCalledWith(`hsk=${n}`, expect.any(Object)));
  await screen.findAllByText(['人','好','环','律','谦','履'][n-1]);
});
test.each(levels)('exam level %i sends its level and displays server scoring metadata', async n => {
  const max=n<=2?200:300, pass=max*0.6;
  f.generate.mockResolvedValue(ok({ examId: 17, hskLevel:n, maximumScore:max, passingScore:pass, status:'IN_PROGRESS', totalQuestions:1, durationMinutes:20,
    startedAt:new Date().toISOString(), expiresAt:new Date(Date.now()+1200000).toISOString(), questions:[{index:0,type:'LISTENING',questionText:'Question',options:['A','B']}] }));
  f.submit.mockResolvedValue(ok({ examId:17,hskLevel:n,maximumScore:max,passingScore:pass,scaledScore:pass,correctCount:3,totalCount:5,scorePercent:60,currentStreak:1,details:[] }));
  mount(<ExamView />);
  fireEvent.click(screen.getByRole('button', {name:`HSK ${n}`}));
  expect(screen.getByText(`${pass} / ${max} điểm (≥ 60%)`)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name:/Bắt đầu thi thử/}));
  await screen.findByText('Question');
  expect(JSON.parse(f.generate.mock.calls[0][0].body).hskLevel).toBe(n);
  fireEvent.click(screen.getByRole('button', {name:'Nộp bài'}));
  await screen.findByText(`${pass} / ${max}`);
  expect(screen.getByText('合格')).toBeTruthy();
});
test('reading catalog covers all six levels, with unique IDs and answer-backed questions', () => {
  expect(new Set(ALL_READING_PASSAGES.map(p=>p.id)).size).toBe(ALL_READING_PASSAGES.length);
  for(const level of levels) expect(ALL_READING_PASSAGES.some(p=>p.hskLevel===level)).toBe(true);
  for(const passage of ALL_READING_PASSAGES) for(const question of passage.questions) expect(question.options).toContain(question.correctAnswer);
});

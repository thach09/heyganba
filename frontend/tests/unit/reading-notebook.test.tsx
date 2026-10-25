import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DictionaryNotebookView } from '../../src/features/dictionary/DictionaryNotebookView';

const api = vi.hoisted(() => ({ search: vi.fn(), addWord: vi.fn(), user: { userId: 1 } }));
vi.mock('../../src/app/useAuth', () => ({ useAuth: () => ({ user: api.user, requireLogin: vi.fn() }) }));
vi.mock('../../src/lib/api/session', async original => ({ ...await original<typeof import('../../src/lib/api/session')>(), getSavedUser: () => ({ userId: 1 }) }));
vi.mock('../../src/features/dictionary/api', () => ({ dictionaryApi: {
  search: api.search, addWord: api.addWord,
  notebooks: async () => ({ success: true, data: [{ id: 5, title: 'Sổ fixture', items: [], itemCount: 0 }] }),
} }));
const student = { id: 103, word: '学生', reading: 'xuésheng', meaning: 'API fixture meaning' };
const result = (words: unknown[]) => ({ success: true, data: { vocabularies: words, hanzis: [] } });
beforeEach(() => { api.search.mockReset(); api.addWord.mockReset(); api.addWord.mockResolvedValue({ success: true }); });
async function selectWord() {
  const view = render(<MemoryRouter><DictionaryNotebookView /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Đọc hiểu tiếng Trung' }));
  fireEvent.click(screen.getByRole('button', { name: 'Tra nhanh từ "学生"' }));
  await act(async () => {});
  await waitFor(() => expect((screen.getByRole('button', { name: '+ Lưu vào Sổ từ' }) as HTMLButtonElement).disabled).toBe(false));
  return view;
}
test('reading save uses the API vocabulary identity and meaning, never a synthetic ID', async () => {
  api.search.mockResolvedValue(result([student]));
  await selectWord();
  fireEvent.click(screen.getByRole('button', { name: '+ Lưu vào Sổ từ' }));
  const dialog = await screen.findByRole('dialog');
  expect(dialog.textContent).toContain(student.meaning);
  expect(api.addWord).not.toHaveBeenCalled();
  fireEvent.submit(dialog.querySelector('form')!);
  await waitFor(() => expect(api.addWord).toHaveBeenCalledOnce());
  expect(JSON.parse(api.addWord.mock.calls[0][1].body)).toEqual({ vocabularyId: 103 });
});
test.each([
  { kind: 'missing', words: [] },
  { kind: 'ambiguous', words: [student, { ...student, id: 104 }] },
  { kind: 'different reading', words: [{ ...student, reading: 'xuéshēng' }] },
])(
  '$kind requires explicit dictionary selection', async ({ words }) => {
    api.search.mockResolvedValue(result(words));
    await selectWord();
    fireEvent.click(screen.getByRole('button', { name: '+ Lưu vào Sổ từ' }));
    await screen.findByText('Hãy tra từ điển và chọn mục từ phù hợp để lưu.');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.addWord).not.toHaveBeenCalled();
  },
);
test('changing the passage cancels its pending lookup and clears the previous word', async () => {
  let resolve!: (value: unknown) => void;
  api.search.mockImplementation(() => new Promise(done => { resolve = done; }));
  await selectWord();
  fireEvent.click(screen.getByRole('button', { name: '+ Lưu vào Sổ từ' }));
  fireEvent.click(screen.getByRole('button', { name: /^Nhóm 2 \(/ }));
  await act(async () => resolve(result([student])));
  expect(screen.queryByTestId('interactive-word-popover')).toBeNull();
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(api.addWord).not.toHaveBeenCalled();
});

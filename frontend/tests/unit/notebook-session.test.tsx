import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DictionaryNotebookView } from '../../src/features/dictionary/DictionaryNotebookView';

const fixture = vi.hoisted(() => ({ user: { userId: 1, role: 'ROLE_USER', fullName: 'First' }, create: vi.fn(), search: vi.fn() }));
vi.mock('../../src/app/useAuth', () => ({ useAuth: () => ({ user: fixture.user, requireLogin: vi.fn() }) }));
vi.mock('../../src/lib/api/session', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/lib/api/session')>(), getSavedUser: () => fixture.user,
}));
vi.mock('../../src/features/dictionary/api', () => ({ dictionaryApi: {
  notebooks: vi.fn(async () => ({ success: true, data: [] })), create: fixture.create, search: fixture.search,
} }));

beforeEach(() => {
  fixture.user = { userId: 1, role: 'ROLE_USER', fullName: 'First' };
  fixture.create.mockReset();
  fixture.search.mockReset();
});

test.each([
  ['ASSISTED', 'Việt tham khảo', 'chó'],
  ['VERIFIED', 'Việt', 'chó'],
  ['NONE', 'Việt', 'Chưa có nghĩa Việt đã đối chiếu'],
])('shows the correct Vietnamese provenance label for %s results', async (status, label, vietnameseMeaning) => {
  fixture.search.mockResolvedValue({ success: true, data: {
    query: 'dog', totalMatches: 1, page: 0, hasMore: false, hanzis: [],
    vocabularies: [{ id: 1258330, word: '犬', reading: 'いぬ', meaning: 'dog',
      vietnameseMeaning: status === 'NONE' ? undefined : vietnameseMeaning, vietnameseStatus: status, meaningLanguage: 'en' }],
  } });
  render(<MemoryRouter initialEntries={['/dictionary?q=dog']}><DictionaryNotebookView /></MemoryRouter>);

  expect(await screen.findByText(label, { exact: true })).not.toBeNull();
  expect(await screen.findByText('dog', { exact: true })).not.toBeNull();
  expect(screen.queryByText(status === 'ASSISTED' ? 'Việt' : 'Việt tham khảo', { exact: true })).toBeNull();
});

test('changing accounts clears a cancelled notebook save lock and private draft', async () => {
  let completeFirst!: (value: unknown) => void;
  let oldSignal!: AbortSignal;
  fixture.create.mockImplementationOnce((options: RequestInit) => {
    oldSignal = options.signal!;
    return new Promise(resolve => { completeFirst = resolve; });
  }).mockResolvedValueOnce({ success: true, data: { id: 2, title: 'Second notebook', items: [], itemCount: 0, isPublicSample: false } });
  const ui = () => <MemoryRouter><DictionaryNotebookView /></MemoryRouter>;
  const { rerender } = render(ui());
  const openCreate = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Kho từ vựng cá nhân' }));
    await screen.findByText('Sổ từ vựng của bạn (0)');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo sổ từ mới' }));
  };
  await openCreate();
  fireEvent.change(screen.getByLabelText('Tên sổ từ'), { target: { value: 'First private draft' } });
  fireEvent.click(screen.getByRole('button', { name: 'Tạo sổ', exact: true }));
  await waitFor(() => expect(fixture.create).toHaveBeenCalledTimes(1));
  fixture.user = { userId: 2, role: 'ROLE_USER', fullName: 'Second' };
  rerender(ui());
  expect(oldSignal.aborted).toBe(true);
  expect(screen.queryByRole('dialog')).toBeNull();
  await openCreate();
  expect((screen.getByLabelText('Tên sổ từ') as HTMLInputElement).value).toBe('');
  fireEvent.change(screen.getByLabelText('Tên sổ từ'), { target: { value: 'Second notebook' } });
  fireEvent.click(screen.getByRole('button', { name: 'Tạo sổ', exact: true }));
  await waitFor(() => expect(fixture.create).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await act(async () => completeFirst({ success: true, data: { id: 1, title: 'First private draft' } }));
  expect(screen.queryByText('First private draft')).toBeNull();
});

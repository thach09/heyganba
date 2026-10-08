import { beforeEach, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../../src/App';

vi.mock('../../src/features/dashboard/DashboardView', () => ({ DashboardView: () => <h1>Dashboard station</h1> }));
vi.mock('../../src/features/admin/AdminView', () => ({ AdminView: () => <h1>Admin station</h1> }));
vi.mock('../../src/features/kana/KanaStationView', () => ({ KanaStationView: ({ script }: { script: string }) => <h1>Kana station {script}</h1> }));
vi.mock('../../src/features/flashcard/FlashcardView', () => ({ FlashcardView: () => <h1>SRS station</h1> }));
vi.mock('../../src/features/dictionary/DictionaryNotebookView', () => ({ DictionaryNotebookView: () => <h1>Dictionary station</h1> }));
vi.mock('../../src/features/kanji/KanjiStationView', () => ({ KanjiStationView: () => <h1>Kanji station</h1> }));
vi.mock('../../src/features/grammar/GrammarView', () => ({ GrammarView: () => <h1>Grammar station</h1> }));
vi.mock('../../src/features/grammar/GrammarRulePage', () => ({ GrammarRulePage: () => <h1>Grammar detail</h1> }));
vi.mock('../../src/features/exam/ExamView', () => ({ ExamView: () => <h1>Exam station</h1> }));

const profile = { userId: 1, fullName: 'Local learner', email: 'learner@example.invalid', role: 'ROLE_USER', classCode: null };
const response = (data: unknown) => new Response(JSON.stringify({ success: true, data }), {
  headers: { 'Content-Type': 'application/json' },
});
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(response(url.endsWith('/auth/login')
    ? { ...profile, accessToken: 'test-access', refreshToken: 'test-refresh' }
    : { status: 'UP', currentStreak: 0 }))));
});
const mount = (path = '/') => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

test('public route renders without a saved account', async () => {
  mount('/dictionary');
  expect(await screen.findByText('Dictionary station')).toBeTruthy();
});
test('ordinary and anonymous users cannot mount the admin station', () => {
  localStorage.setItem('heyganba_user', JSON.stringify(profile));
  mount('/admin');
  expect(screen.getByText('Không có quyền truy cập')).toBeTruthy();
  expect(screen.queryByText('Admin station')).toBeNull();
});
test('restores an admin profile and allows the admin route', async () => {
  localStorage.setItem('heyganba_user', JSON.stringify({ ...profile, role: 'ROLE_ADMIN' }));
  mount('/admin');
  expect(screen.getByText('Local learner')).toBeTruthy();
  expect(await screen.findByText('Admin station')).toBeTruthy();
});
test('require-login opens the modal and successful login updates the shell', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(dialog.querySelector('#auth-email')!, { target: { value: 'learner@example.invalid' } });
  fireEvent.change(dialog.querySelector('#auth-password')!, { target: { value: 'local-test-password' } });
  fireEvent.submit(dialog.querySelector('form')!);
  await waitFor(() => expect(screen.getByText('Local learner')).toBeTruthy());
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(JSON.parse(localStorage.getItem('heyganba_user')!)).not.toHaveProperty('accessToken');
});
test('logout clears credentials and redirects to the public dashboard', async () => {
  localStorage.setItem('heyganba_user', JSON.stringify(profile));
  localStorage.setItem('heyganba_access_token', 'test-access');
  localStorage.setItem('heyganba_refresh_token', 'test-refresh');
  mount('/exam');
  fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
  await waitFor(() => expect(screen.getByText('Dashboard station')).toBeTruthy());
  expect(localStorage.getItem('heyganba_user')).toBeNull();
  expect(localStorage.getItem('heyganba_access_token')).toBeNull();
});
test('session expiration removes the signed-in shell and displays a safe notice', () => {
  localStorage.setItem('heyganba_user', JSON.stringify(profile));
  mount();
  act(() => window.dispatchEvent(new Event('heyganba:session-expired')));
  expect(screen.queryByText('Local learner')).toBeNull();
  expect(screen.getByRole('status').textContent).toContain('Phiên đăng nhập đã hết hạn');
});

test('katakana selection is restored from the URL on a fresh mount', async () => {
  mount('/kana?script=katakana');
  expect(await screen.findByText('Kana station KATAKANA')).toBeTruthy();
});

test('logout network failure retains the profile and offers a retry', async () => {
  localStorage.setItem('heyganba_user', JSON.stringify(profile));
  localStorage.setItem('heyganba_access_token', 'test-access');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Chưa đăng xuất được'));
  expect(screen.getByText('Local learner')).toBeTruthy();
  expect(localStorage.getItem('heyganba_user')).not.toBeNull();
});

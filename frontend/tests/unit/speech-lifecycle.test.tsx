import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { AppShell } from '../../src/app/AppShell';
import { AuthProvider } from '../../src/app/AuthProvider';
import { useAuth } from '../../src/app/useAuth';
import { clearTokens, saveUser } from '../../src/lib/api/session';
import type { AuthResponse } from '../../src/lib/api/types';

const fixture = vi.hoisted(() => ({ health: vi.fn(), logout: vi.fn() }));
vi.mock('../../src/lib/api/client', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/lib/api/client')>(), logoutApi: fixture.logout,
}));
vi.mock('../../src/features/progress/api', () => ({ progressApi: {
  health: fixture.health, streak: async () => ({ success: true, data: null }),
} }));
vi.mock('../../src/components/Sidebar', () => ({ Sidebar: ({ onToggleSidebar }: { onToggleSidebar: () => void }) =>
  <button onClick={onToggleSidebar}>Toggle sidebar</button>,
}));
vi.mock('../../src/components/OrientalDecorBackground', () => ({ OrientalDecorBackground: () => null }));
vi.mock('../../src/components/ThemeToggle', () => ({ ThemeToggle: () => null }));
vi.mock('../../src/app/routes', () => ({ AppRoutes: () => <input aria-label="Learning draft" /> }));

const profile = (userId = 1): AuthResponse => ({
  userId, fullName: `Learner ${userId}`, email: `learner${userId}@test.invalid`, role: 'ROLE_USER',
  classCode: null, accessToken: '', refreshToken: null, tokenType: 'Bearer',
});
const speech = { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [] };
const up = { success: true, data: { status: 'UP' } };

function Controls({ target }: { target: string }) {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  return <>
    <span data-testid="identity">{user?.userId ?? 'guest'}</span>
    <button onClick={() => navigate(target, { state: { source: 'speech test' } })}>Navigate</button>
    <button onClick={() => navigate(-1)}>Back</button>
    <button onClick={() => navigate(1)}>Forward</button>
    <button onClick={() => { void logout(); }}>Logout</button>
    <button onClick={() => user && updateProfile({ ...user, fullName: 'Updated name' })}>Update profile</button>
  </>;
}

interface Options { initial?: string; target?: string; strict?: boolean }
function tree({ initial = '/vocabulary?level=HSK1', target = '/grammar', strict = false }: Options = {}) {
  const content = <MemoryRouter initialEntries={[initial]}><AuthProvider>
    <Controls target={target} /><AppShell />
  </AuthProvider></MemoryRouter>;
  return strict ? <StrictMode>{content}</StrictMode> : content;
}
async function mount(options?: Options) {
  const view = render(tree(options));
  await act(async () => {});
  return view;
}

beforeEach(() => {
  speech.cancel.mockClear(); speech.speak.mockClear();
  fixture.health.mockReset().mockResolvedValue(up);
  fixture.logout.mockReset().mockResolvedValue(true);
  vi.stubGlobal('speechSynthesis', speech);
  vi.stubGlobal('SpeechSynthesisUtterance', class {});
  saveUser(profile());
});

test('pathname navigation cancels speech through the real Chinese Speech service', async () => {
  await mount();
  expect(speech.cancel).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));
  expect(speech.cancel).toHaveBeenCalledTimes(1);
});

test.each([
  ['/vocabulary?level=HSK1', '/vocabulary?level=HSK2'],
  ['/dictionary?q=old', '/dictionary?q=new'],
  ['/grammar?practice=1', '/grammar?practice=2'],
])('query navigation cancels the old learning audio: %s -> %s', async (initial, target) => {
  await mount({ initial, target });
  fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));
  expect(speech.cancel).toHaveBeenCalledTimes(1);
});

test('Back and Forward cancel speech for each restored learning location', async () => {
  await mount();
  fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Back' })); });
  await waitFor(() => expect(speech.cancel).toHaveBeenCalledTimes(2));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Forward' })); });
  await waitFor(() => expect(speech.cancel).toHaveBeenCalledTimes(3));
});

test('switching accounts cancels speech when the real AuthProvider replaces private state', async () => {
  await mount();
  act(() => saveUser(profile(2)));
  expect(screen.getByTestId('identity').textContent).toBe('2');
  expect(speech.cancel).toHaveBeenCalledTimes(1);
});

test('successful logout cancels speech and discards the old account', async () => {
  await mount();
  fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
  await waitFor(() => expect(screen.getByTestId('identity').textContent).toBe('guest'));
  expect(fixture.logout).toHaveBeenCalledTimes(1);
  expect(speech.cancel).toHaveBeenCalledTimes(1);
});

test('a failed logout retains the account and does not interrupt its speech', async () => {
  fixture.logout.mockResolvedValue(false);
  await mount();
  fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
  await screen.findByRole('status');
  expect(screen.getByTestId('identity').textContent).toBe('1');
  expect(speech.cancel).not.toHaveBeenCalled();
});

test('logging in from a guest session also cancels speech from the previous identity', async () => {
  clearTokens();
  await mount();
  expect(screen.getByTestId('identity').textContent).toBe('guest');
  act(() => saveUser(profile()));
  expect(screen.getByTestId('identity').textContent).toBe('1');
  expect(speech.cancel).toHaveBeenCalledTimes(1);
});

test('unmounting AppShell cancels speech once', async () => {
  const view = await mount();
  view.unmount();
  expect(speech.cancel).toHaveBeenCalledTimes(1);
});

test('ordinary parent and sidebar rerenders do not cancel speech', async () => {
  const view = await mount();
  view.rerender(tree());
  fireEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
  expect(speech.cancel).not.toHaveBeenCalled();
});

test('backend failure, online retry and recovery do not cancel speech or reset learning input', async () => {
  fixture.health.mockResolvedValueOnce({ success: false }).mockResolvedValueOnce(up);
  await mount();
  const input = screen.getByRole('textbox', { name: 'Learning draft' }) as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'Unfinished input' } });
  expect(screen.getByRole('button', { name: 'Kiểm tra lại kết nối' })).toBeTruthy();
  fireEvent.online(window);
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Kiểm tra lại kết nối' })).toBeNull());
  expect(input.value).toBe('Unfinished input');
  expect(speech.cancel).not.toHaveBeenCalled();
});

test('updating the same user profile does not cancel speech', async () => {
  await mount();
  fireEvent.click(screen.getByRole('button', { name: 'Update profile' }));
  expect(screen.getByTestId('identity').textContent).toBe('1');
  expect(speech.cancel).not.toHaveBeenCalled();
});

test.each(['/vocabulary?level=HSK1#notes', '/vocabulary?level=HSK1'])('hash-only or history-state-only navigation leaves speech playing: %s', async target => {
  await mount({ target });
  fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));
  expect(speech.cancel).not.toHaveBeenCalled();
});

test('StrictMode performs an idempotent mount cleanup, then only cancels on navigation and unmount', async () => {
  const view = await mount({ strict: true });
  expect(speech.cancel).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
  expect(speech.cancel).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));
  expect(speech.cancel).toHaveBeenCalledTimes(2);
  view.unmount();
  expect(speech.cancel).toHaveBeenCalledTimes(3);
  expect(speech.speak).not.toHaveBeenCalled();
});

test('navigation and unmount remain safe when speech synthesis is unavailable', async () => {
  const view = await mount();
  Reflect.deleteProperty(window, 'speechSynthesis');
  expect(() => fireEvent.click(screen.getByRole('button', { name: 'Navigate' }))).not.toThrow();
  expect(() => view.unmount()).not.toThrow();
  expect(speech.cancel).not.toHaveBeenCalled();
});

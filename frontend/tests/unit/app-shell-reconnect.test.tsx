import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { StrictMode, useEffect, useState } from 'react';
import { AppShell } from '../../src/app/AppShell';

const fixture = vi.hoisted(() => ({ health: vi.fn(), mounts: vi.fn(), unmounts: vi.fn() }));
vi.mock('../../src/app/useAuth', () => ({ useAuth: () => ({ user: null, requireLogin: vi.fn(), logout: vi.fn(), changePassword: vi.fn() }) }));
vi.mock('../../src/features/progress/api', () => ({ progressApi: { health: fixture.health } }));
vi.mock('../../src/components/Sidebar', () => ({ Sidebar: () => <nav /> }));
vi.mock('../../src/components/OrientalDecorBackground', () => ({ OrientalDecorBackground: () => null }));
vi.mock('../../src/components/ThemeToggle', () => ({ ThemeToggle: () => null }));
vi.mock('../../src/app/routes', () => ({ AppRoutes: () => {
  const [draft, setDraft] = useState('');
  const [card, setCard] = useState(1);
  useEffect(() => { fixture.mounts(); return () => { fixture.unmounts(); }; }, []);
  return <>
    <input aria-label="Bài làm đang nhập" value={draft} onChange={event => setDraft(event.target.value)} />
    <button onClick={() => setCard(value => value + 1)}>Thẻ tiếp theo</button>
    <output data-testid="learning-card">{card}</output>
  </>;
} }));
const up = { success: true, data: { status: 'UP' } };
const down = { success: false, message: 'Offline' };
beforeEach(() => { fixture.health.mockReset(); fixture.mounts.mockClear(); fixture.unmounts.mockClear(); });
const mount = () => render(<MemoryRouter><AppShell /></MemoryRouter>);

function deferred() {
  let resolve!: (value: typeof up | typeof down) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<typeof up | typeof down>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('reconnecting clears a stale server warning and preserves the current learning input', async () => {
  fixture.health.mockResolvedValueOnce(down).mockResolvedValueOnce(up);
  mount();
  const input = screen.getByRole('textbox', { name: 'Bài làm đang nhập' });
  fireEvent.change(input, { target: { value: 'Bài làm chưa nộp' } });
  await screen.findByRole('button', { name: 'Kiểm tra lại kết nối' });
  fireEvent.online(window);
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Kiểm tra lại kết nối' })).not.toBeInTheDocument());
  expect((input as HTMLInputElement).value).toBe('Bài làm chưa nộp');
  expect(fixture.health).toHaveBeenCalledTimes(2);
});

test('manual retry recovers without reload and ignores a late failed health response', async () => {
  let resolveFirst!: (value: typeof down) => void;
  fixture.health.mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }))
    .mockResolvedValueOnce(up).mockResolvedValueOnce(down).mockResolvedValueOnce(up);
  mount();
  const firstSignal = fixture.health.mock.calls[0][0].signal as AbortSignal;
  fireEvent.online(window);
  await waitFor(() => expect(fixture.health).toHaveBeenCalledTimes(2));
  expect(firstSignal.aborted).toBe(true);
  await act(async () => { resolveFirst(down); });
  expect(screen.queryByRole('button', { name: 'Kiểm tra lại kết nối' })).not.toBeInTheDocument();
  fireEvent.online(window);
  fireEvent.click(await screen.findByRole('button', { name: 'Kiểm tra lại kết nối' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Kiểm tra lại kết nối' })).not.toBeInTheDocument());
  expect(fixture.health).toHaveBeenCalledTimes(4);
});

test.each(['online', 'manual'])('%s retry immediately aborts the prior request before the next effect runs', async source => {
  const pending = deferred();
  fixture.health.mockResolvedValueOnce(down).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(up);
  mount();
  const retry = await screen.findByRole('button', { name: 'Kiểm tra lại kết nối' });
  fireEvent.click(retry);
  const previous = fixture.health.mock.calls[1][0].signal as AbortSignal;
  act(() => {
    if (source === 'online') window.dispatchEvent(new Event('online'));
    else retry.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(previous.aborted).toBe(true);
  });
  await waitFor(() => expect(fixture.health).toHaveBeenCalledTimes(3));
  await act(async () => { pending.resolve(down); });
  expect(screen.queryByRole('button', { name: 'Kiểm tra lại kết nối' })).toBeNull();
});

test('repeated network failures and manual retries retain learning state without remounting the route', async () => {
  fixture.health.mockRejectedValueOnce(new TypeError('offline'))
    .mockRejectedValueOnce(new TypeError('still offline')).mockResolvedValueOnce(down).mockResolvedValueOnce(up);
  mount();
  const input = screen.getByRole('textbox', { name: 'Bài làm đang nhập' }) as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'Bài làm chưa nộp' } });
  fireEvent.click(screen.getByRole('button', { name: 'Thẻ tiếp theo' }));
  const retry = await screen.findByRole('button', { name: 'Kiểm tra lại kết nối' });
  expect(retry.classList.contains('underline')).toBe(true);
  expect(retry.classList.contains('underline-offset-4')).toBe(true);
  expect(retry.classList.contains('underlineunderline-offset-4')).toBe(false);
  for (const count of [2, 3, 4]) {
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại kết nối' }));
    await waitFor(() => expect(fixture.health).toHaveBeenCalledTimes(count));
    await act(async () => {});
  }
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Kiểm tra lại kết nối' })).toBeNull());
  expect(screen.getByRole('textbox', { name: 'Bài làm đang nhập' })).toBe(input);
  expect(input.value).toBe('Bài làm chưa nộp');
  expect(screen.getByTestId('learning-card').textContent).toBe('2');
  expect(fixture.mounts).toHaveBeenCalledTimes(1);
  expect(fixture.unmounts).not.toHaveBeenCalled();
});

test('late healthy response cannot hide a newer failed health result', async () => {
  const old = deferred();
  fixture.health.mockReturnValueOnce(old.promise).mockResolvedValueOnce(down);
  mount();
  fireEvent.online(window);
  await screen.findByRole('button', { name: 'Kiểm tra lại kết nối' });
  await act(async () => { old.resolve(up); });
  expect(screen.getByRole('button', { name: 'Kiểm tra lại kết nối' })).toBeTruthy();
});

test('late rejection cannot replace a newer healthy result', async () => {
  const old = deferred();
  fixture.health.mockReturnValueOnce(old.promise).mockResolvedValueOnce(up);
  mount();
  fireEvent.online(window);
  await waitFor(() => expect(fixture.health).toHaveBeenCalledTimes(2));
  await act(async () => { old.reject(new TypeError('late network failure')); });
  expect(screen.queryByRole('button', { name: 'Kiểm tra lại kết nối' })).toBeNull();
});

test('a cancelled API request is not reported as a backend outage', async () => {
  fixture.health.mockRejectedValue(new DOMException('Session identity changed', 'AbortError'));
  mount();
  await act(async () => {});
  expect(screen.queryByRole('button', { name: 'Kiểm tra lại kết nối' })).toBeNull();
});

test.each(['resolve', 'reject'] as const)('unmount aborts the request and removes online listeners before a late %s', async outcome => {
  const add = vi.spyOn(window, 'addEventListener');
  const remove = vi.spyOn(window, 'removeEventListener');
  const pending = deferred();
  fixture.health.mockReturnValueOnce(pending.promise);
  const view = mount();
  const signal = fixture.health.mock.calls[0][0].signal as AbortSignal;
  const callback = add.mock.calls.find(([type]) => type === 'online')?.[1];
  expect(callback).toBeDefined();
  view.unmount();
  expect(signal.aborted).toBe(true);
  expect(remove).toHaveBeenCalledWith('online', callback);
  fireEvent.online(window);
  await act(async () => {
    if (outcome === 'resolve') pending.resolve(down);
    else pending.reject(new TypeError('late rejection'));
  });
  expect(fixture.health).toHaveBeenCalledTimes(1);
});

test('StrictMode cleanup leaves only the latest health request and online handler active', async () => {
  const first = deferred();
  fixture.health.mockReturnValueOnce(first.promise).mockResolvedValue(up);
  const view = render(<StrictMode><MemoryRouter><AppShell /></MemoryRouter></StrictMode>);
  expect(fixture.health.mock.calls[0][0].signal.aborted).toBe(true);
  expect(fixture.health.mock.calls[1][0].signal.aborted).toBe(false);
  fireEvent.online(window);
  await waitFor(() => expect(fixture.health).toHaveBeenCalledTimes(3));
  await act(async () => { first.resolve(down); });
  expect(screen.queryByRole('button', { name: 'Kiểm tra lại kết nối' })).toBeNull();
  view.unmount();
  expect(fixture.health.mock.calls[2][0].signal.aborted).toBe(true);
  fireEvent.online(window);
  expect(fixture.health).toHaveBeenCalledTimes(3);
});

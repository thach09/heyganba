import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/app/AuthProvider';
import { useAuth } from '../../src/app/useAuth';
import { saveTokens } from '../../src/lib/api/session';
import { clearActiveAttempt, readActiveAttempt, saveActiveAttempt } from '../../src/features/exam/activeAttempt';
import type { AuthResponse } from '../../src/lib/api/types';

const profile = (id: number) => ({ userId: id, fullName: `Fixture ${id}`, role: 'ROLE_USER' }) as AuthResponse;
const checkpoint = { examId: 42, answers: { 0: 'private' }, activeIndex: 0 };
function Controls() {
  const auth = useAuth();
  return <><span>{auth.user ? `Account ${auth.user.userId}` : 'Guest'}</span>
    <button onClick={() => void auth.logout()}>Logout</button>
    <button onClick={() => { saveTokens('account-b-access', 'account-b-refresh'); auth.updateProfile(profile(2)); }}>Switch account</button>
  </>;
}
const result = (success: boolean, status = 200) => new Response(JSON.stringify({ success, data: null }), {
  status, headers: { 'Content-Type': 'application/json' },
});
beforeEach(() => {
  localStorage.setItem('heyganba_user', JSON.stringify(profile(1)));
  saveTokens('account-a-access', 'account-a-refresh');
  clearActiveAttempt(1); readActiveAttempt(1); saveActiveAttempt(1, checkpoint);
});
const mount = () => render(<MemoryRouter><AuthProvider><Controls /></AuthProvider></MemoryRouter>);
test('confirmed server logout removes private recovery and leaves unrelated storage intact', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(result(true)));
  localStorage.setItem('theme', 'dark'); mount();
  fireEvent.click(screen.getByText('Logout'));
  await screen.findByText('Guest');
  expect(localStorage.getItem('heyganba_exam:1')).toBeNull();
  expect(sessionStorage.getItem('heyganba_exam:1')).toBeNull();
  expect(localStorage.getItem('theme')).toBe('dark');
});
test('failed logout preserves the active account and recoverable answers', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(result(false, 503)));
  const before = localStorage.getItem('heyganba_exam:1'); mount();
  fireEvent.click(screen.getByText('Logout'));
  await screen.findByText(/Chưa đăng xuất được/);
  expect(screen.getByText('Account 1')).toBeInTheDocument();
  expect(localStorage.getItem('heyganba_exam:1')).toBe(before);
  expect(localStorage.getItem('heyganba_recovery_revocation:1')).toBeNull();
});
test('switching account while logout is pending cannot clear the new identity or its recovery', async () => {
  let finish!: (value: Response) => void;
  const fetcher = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; }));
  vi.stubGlobal('fetch', fetcher); mount();
  fireEvent.click(screen.getByText('Logout'));
  await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByText('Switch account'));
  readActiveAttempt(2); saveActiveAttempt(2, { ...checkpoint, examId: 99 });
  await act(async () => finish(result(true)));
  expect(screen.getByText('Account 2')).toBeInTheDocument();
  expect(localStorage.getItem('heyganba_access_token')).toBe('account-b-access');
  expect(readActiveAttempt(2)?.examId).toBe(99);
  expect(readActiveAttempt(1)).toBeNull();
});

import { expect, test } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/app/AuthProvider';
import { useAuth } from '../../src/app/useAuth';

function ProtectedAction() {
  const { user, requireLogin, updateProfile } = useAuth();
  return <>
    <span>{user?.classCode ?? 'No class'}</span>
    <button onClick={requireLogin}>Save practice</button>
    <button onClick={() => user && updateProfile({ ...user, classCode: 'TEST' })}>Update class</button>
  </>;
}
test('a station can request login through context without route props', () => {
  render(<MemoryRouter><AuthProvider><ProtectedAction /></AuthProvider></MemoryRouter>);
  fireEvent.click(screen.getByText('Save practice'));
  expect(screen.getByRole('dialog')).toBeTruthy();
});
test('profile changes update both context and token-free saved profile', () => {
  localStorage.setItem('heyganba_user', JSON.stringify({ userId: 1, role: 'ROLE_USER', fullName: 'Test' }));
  render(<MemoryRouter><AuthProvider><ProtectedAction /></AuthProvider></MemoryRouter>);
  fireEvent.click(screen.getByText('Update class'));
  expect(screen.getByText('TEST')).toBeTruthy();
  expect(JSON.parse(localStorage.getItem('heyganba_user')!).classCode).toBe('TEST');
});

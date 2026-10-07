import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as Sentry from '@sentry/react';
import { ErrorBoundary } from '../../src/app/ErrorBoundary';

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

test('component failures are reported with a safe visible recovery path', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const report = vi.mocked(Sentry.captureException).mockReturnValue('test-event');
  const failure = new Error('private server stack');
  function Broken(): never { throw failure; }
  render(<ErrorBoundary><Broken /></ErrorBoundary>);
  expect(screen.getByRole('alert').textContent).not.toContain('private server');
  expect(screen.getByRole('button', { name: 'Tải lại trang' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Về trang chủ' })).toBeTruthy();
  expect(report).toHaveBeenCalledWith(failure, expect.any(Object));
});

import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DashboardView } from '../../src/features/dashboard/DashboardView';

const mocks = vi.hoisted(() => ({ signedIn: false, exp: vi.fn() }));
vi.mock('../../src/app/useAuth', () => ({ useAuth: () => ({ user: mocks.signedIn ? { userId: 1 } : null, requireLogin: vi.fn() }) }));
vi.mock('../../src/features/progress/api', () => ({ progressApi: { exp: mocks.exp, heatmap: vi.fn(async () => ({ success: false })) } }));
vi.mock('../../src/features/flashcard/api', () => ({ flashcardApi: { stats: vi.fn(async () => ({ success: false })) } }));
vi.mock('../../src/features/companion/CompanionWidget', () => ({ CompanionWidget: () => null }));
vi.mock('../../src/features/dashboard/LearningInsights', () => ({ LearningInsights: () => null }));
vi.mock('../../src/features/dashboard/HskRoadmap', () => ({ HskRoadmap: () => null }));
beforeEach(() => { mocks.signedIn = false; mocks.exp.mockReset(); });

test.each(['invalid', 'NaN', '2.5', 'Infinity', '0', '7'])('invalid saved target %s uses a usable HSK 1 link', saved => {
  localStorage.setItem('heyganba_target_hsk', saved);
  render(<MemoryRouter><DashboardView /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Mục tiêu hiện tại: HSK 1', level: 2 })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'HSK 1', pressed: true })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Học nhóm chọn lọc đang có/ }).getAttribute('href')).toBe('/vocabulary?level=HSK1');
});

test('a valid saved HSK 6 goal survives reload', () => {
  localStorage.setItem('heyganba_target_hsk', '6');
  render(<MemoryRouter><DashboardView /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'HSK 6', pressed: true })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Học nhóm chọn lọc đang có/ }).getAttribute('href')).toBe('/vocabulary?level=HSK6');
});

test('failed EXP response shows an error instead of invented level and EXP', async () => {
  mocks.signedIn = true;
  mocks.exp.mockResolvedValue({ success: false, message: 'Offline' });
  render(<MemoryRouter><DashboardView /></MemoryRouter>);
  expect((await screen.findByRole('alert')).textContent).toContain('Chưa tải được EXP');
  expect(screen.queryByText(/0 \/ 1[.,]?000 EXP/)).not.toBeInTheDocument();
  expect(screen.queryByText('Lên cấp:')).not.toBeInTheDocument();
});

test('pending EXP request has a loading state without fabricated progress', () => {
  mocks.signedIn = true;
  mocks.exp.mockReturnValue(new Promise(() => {}));
  render(<MemoryRouter><DashboardView /></MemoryRouter>);
  expect(screen.getByRole('status').textContent).toContain('Đang tải EXP');
  expect(screen.queryByText('Lên cấp:')).not.toBeInTheDocument();
});

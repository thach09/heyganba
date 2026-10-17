import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ThemeToggle } from '../../src/components/ThemeToggle';
import { initializeTheme } from '../../src/app/useTheme';
import { ChineseLanterns } from '../../src/components/OrientalDecorBackground';
import { SentenceOrderExercise } from '../../src/features/grammar/SentenceOrderExercise';

afterEach(() => { document.documentElement.removeAttribute('data-theme'); });
test('theme toggles update both controls and survive initialization', () => {
  localStorage.setItem('chinese-learning-theme', 'light');
  initializeTheme();
  render(<><ThemeToggle /><ThemeToggle compact /></>);
  expect(document.documentElement.dataset.theme).toBe('light');
  fireEvent.click(screen.getAllByRole('button', { name: /宣纸/ })[0]);
  expect(screen.getAllByRole('button', { name: /砚台/ })).toHaveLength(2);
  expect(localStorage.getItem('chinese-learning-theme')).toBe('dark');
  expect(initializeTheme()).toBe('dark');
});
test('theme reacts to another tab and works without local storage', () => {
  initializeTheme(); render(<ThemeToggle />);
  localStorage.setItem('chinese-learning-theme', 'light');
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'chinese-learning-theme' })));
  expect(screen.getByRole('button', { name: /宣纸/ })).toBeTruthy();
  const blocked = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  fireEvent.click(screen.getByRole('button'));
  expect(document.documentElement.dataset.theme).toBe('dark');
  blocked.mockRestore();
});
test('ceiling lanterns disappear after 20px and return at the top', () => {
  vi.stubGlobal('scrollY', 0);
  const { container, unmount } = render(<ChineseLanterns />);
  const lanterns = container.querySelector('[data-lanterns]')!;
  expect(lanterns.className).toContain('absolute');
  expect(lanterns.className).toContain('opacity-100');
  vi.stubGlobal('scrollY', 20); fireEvent.scroll(window);
  expect(lanterns.className).toContain('opacity-100');
  vi.stubGlobal('scrollY', 21); fireEvent.scroll(window);
  expect(lanterns.className).toContain('opacity-0');
  vi.stubGlobal('scrollY', 0); fireEvent.scroll(window);
  expect(lanterns.className).toContain('opacity-100');
  const remove = vi.spyOn(window, 'removeEventListener'); unmount();
  expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function)); remove.mockRestore();
});
test('ordering preserves repeated tokens, supports undo and submits the complete sentence', () => {
  const submit = vi.fn();
  render(<SentenceOrderExercise tokens={['我', '是', '我']} disabled={false} onSubmit={submit} />);
  fireEvent.click(screen.getAllByRole('button', { name: '我', exact: true })[0]);
  fireEvent.click(screen.getByRole('button', { name: '是', exact: true }));
  fireEvent.click(screen.getAllByRole('button', { name: '我', exact: true }).filter(button => !(button as HTMLButtonElement).disabled).at(-1)!);
  fireEvent.click(screen.getByRole('button', { name: 'Chấm câu' }));
  expect(submit).toHaveBeenLastCalledWith('我是我');
  fireEvent.click(screen.getByRole('button', { name: 'Xếp lại' }));
  expect((screen.getByRole('button', { name: 'Chấm câu' }) as HTMLButtonElement).disabled).toBe(true);
});

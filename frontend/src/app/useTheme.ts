import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';
const key = 'chinese-learning-theme';
const eventName = 'chinese-learning-theme-change';
export function initializeTheme(): Theme {
  let saved: string | null = null;
  try { saved = localStorage.getItem(key); } catch { /* Storage can be disabled. */ }
  const theme: Theme = saved === 'light' || saved === 'dark' ? saved
    : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  return theme;
}
function snapshot(): Theme { return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'; }
function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === key || event.key === null) { initializeTheme(); listener(); } };
  window.addEventListener(eventName, listener);
  window.addEventListener('storage', storage);
  return () => { window.removeEventListener(eventName, listener); window.removeEventListener('storage', storage); };
}
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => 'dark');
  const setTheme = (next: Theme) => {
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(key, next); } catch { /* Works for this session. */ }
    window.dispatchEvent(new Event(eventName));
  };
  return { theme, setTheme, toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
}

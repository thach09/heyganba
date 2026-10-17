import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../app/useTheme';

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'light' ? '宣纸 · Sáng (Giấy Tuyên)' : '砚台 · Tối (Nghiên Mực)';
  return <button type="button" onClick={toggleTheme} aria-label={`Đổi giao diện: ${label}`} aria-pressed={theme === 'light'}
    title={label} className="inline-flex min-h-10 cursor-pointer items-center gap-2 border border-rule-strong bg-card px-3 py-2 text-[12.5px] leading-relaxed text-fg hover:border-fg">
    {theme === 'light' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    {!compact && <span>{label}</span>}
  </button>;
}

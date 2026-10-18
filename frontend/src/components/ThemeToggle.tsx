import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../app/useTheme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark
    ? 'Chế độ tối (Nghiên Mực) — Bấm để chuyển sang chế độ sáng'
    : 'Chế độ sáng (Giấy Tuyên) — Bấm để chuyển sang chế độ tối';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      title={label}
      onClick={toggleTheme}
      className={`group relative inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center bg-transparent p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${className}`}
    >
      {/* Switch track pill */}
      <span
        aria-hidden="true"
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-rule-strong bg-bg transition-colors duration-200 motion-reduce:transition-none"
      >
        {/* Track Sun Icon (left) */}
        <Sun
          size={11}
          className={`absolute left-1.5 transition-opacity duration-150 motion-reduce:transition-none ${
            isDark ? 'opacity-30 text-fg-38' : 'opacity-100 text-gold-ink'
          }`}
        />
        {/* Track Moon Icon (right) */}
        <Moon
          size={11}
          className={`absolute right-1.5 transition-opacity duration-150 motion-reduce:transition-none ${
            isDark ? 'opacity-100 text-gold-ink' : 'opacity-30 text-fg-38'
          }`}
        />

        {/* Sliding Thumb Knob */}
        <span
          className={`inline-flex h-4.5 w-4.5 transform items-center justify-center rounded-full bg-card border border-rule-strong transition-transform duration-200 ease-in-out motion-reduce:transition-none ${
            isDark ? 'translate-x-[22px]' : 'translate-x-[2px]'
          }`}
        >
          {isDark ? (
            <Moon size={10} className="text-gold-ink" />
          ) : (
            <Sun size={10} className="text-gold-ink" />
          )}
        </span>
      </span>
    </button>
  );
}

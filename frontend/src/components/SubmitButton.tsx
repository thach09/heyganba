import React from 'react';
import { Loader2 } from 'lucide-react';

interface SubmitButtonProps {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  shortcutHint?: string;
  type?: 'button' | 'submit';
  id?: string;
  fullWidth?: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  onClick,
  loading = false,
  disabled = false,
  children,
  variant = 'primary',
  shortcutHint,
  type = 'button',
  id = 'submit-action-btn',
  fullWidth = false,
}) => {
  const variantClass =
    variant === 'primary'
      ? 'border-0 bg-fg text-bg hover:opacity-90'
      : 'border border-rule-strong bg-transparent text-fg hover:bg-fg hover:text-bg';

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        disabled || loading ? '' : 'cursor-pointer'
      } ${variantClass} ${fullWidth ? 'w-full' : ''}`}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" size={14} />
          <span>Đang xử lý...</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          {shortcutHint && (
            <kbd className="border border-current px-1.5 text-[10px] font-semibold leading-4 opacity-70">
              {shortcutHint}
            </kbd>
          )}
        </>
      )}
    </button>
  );
};

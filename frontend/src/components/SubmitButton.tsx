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
  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn btn-${variant} ${fullWidth ? 'w-full' : ''}`}
      style={{ width: fullWidth ? '100%' : 'auto' }}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" size={16} />
          <span>Đang xử lý...</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          {shortcutHint && (
            <kbd
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'currentColor',
                marginLeft: '6px',
                fontWeight: 600,
              }}
            >
              {shortcutHint}
            </kbd>
          )}
        </>
      )}
    </button>
  );
};

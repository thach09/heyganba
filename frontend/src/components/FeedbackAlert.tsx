import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

export type FeedbackType = 'success' | 'error' | 'info';

interface FeedbackAlertProps {
  type: FeedbackType;
  title: string;
  message?: string;
  onClose?: () => void;
}

/**
 * Bottom-right toast. Use only the two semantic palette colors: `--red` for errors,
 * ink for success and muted ink for information; no separate blue/green colors.
 */
export const FeedbackAlert: React.FC<FeedbackAlertProps> = ({ type, title, message, onClose }) => {
  useEffect(() => {
    if (type !== 'success' || !onClose) return;
    const timer = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(timer);
  }, [type, title, onClose]);
  const Icon = type === 'error' ? XCircle : type === 'success' ? CheckCircle2 : AlertCircle;
  const tone =
    type === 'error'
      ? 'border-l-red text-red'
      : type === 'success'
        ? 'border-l-fg text-fg'
        : 'border-l-fg-38 text-fg-60';

  return (
    <div
      id="feedback-alert-toast"
      role={type === 'error' ? 'alert' : 'status'}
      className={`animate-toast-in fixed bottom-6 right-6 z-[100] flex min-w-[320px] max-w-[440px] items-start gap-3 border border-l-2 border-rule bg-card p-4 max-[600px]:left-4 max-[600px]:right-4 max-[600px]:min-w-0 ${tone}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-fg">{title}</div>
        {message && <div className="mt-0.5 text-[12.5px] leading-[1.6] text-fg-60">{message}</div>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-fg-38 transition-colors hover:text-fg"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};

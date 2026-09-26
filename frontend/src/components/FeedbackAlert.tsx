import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

export type FeedbackType = 'success' | 'error' | 'info';

interface FeedbackAlertProps {
  type: FeedbackType;
  title: string;
  message?: string;
  onClose?: () => void;
}

export const FeedbackAlert: React.FC<FeedbackAlertProps> = ({
  type,
  title,
  message,
  onClose,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={20} color="#10B981" />;
      case 'error':
        return <XCircle size={20} color="#EF4444" />;
      default:
        return <AlertCircle size={20} color="#3B82F6" />;
    }
  };

  return (
    <div className={`feedback-alert feedback-${type}`} id="feedback-alert-toast">
      <div style={{ flexShrink: 0 }}>{getIcon()}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '14px' }}>{title}</div>
        {message && (
          <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '2px' }}>
            {message}
          </div>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            opacity: 0.7,
            padding: '2px',
          }}
          aria-label="Đóng"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

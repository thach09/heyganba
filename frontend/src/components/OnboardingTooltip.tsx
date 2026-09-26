import React, { useState, useEffect } from 'react';
import { Compass, X } from 'lucide-react';

interface OnboardingTooltipProps {
  storageKey: string;
  title: string;
  description: string;
}

export const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  storageKey,
  title,
  description,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(`onboarding_${storageKey}`);
    if (!isDismissed) {
      setVisible(true);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(`onboarding_${storageKey}`, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="onboarding-banner" id="onboarding-tooltip-banner">
      <div className="onboarding-content">
        <div className="onboarding-icon">
          <Compass size={24} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#FFF' }}>
            {title}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {description}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={handleDismiss}
          className="btn btn-secondary"
          style={{ padding: '6px 14px', fontSize: '12px' }}
        >
          Đã hiểu
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
          }}
          title="Bỏ qua"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

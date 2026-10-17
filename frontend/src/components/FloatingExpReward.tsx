import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface FloatingExpRewardProps {
  amount: number;
  label?: string;
  onComplete?: () => void;
  className?: string;
}

/**
 * Floating EXP micro-animation:
 * Displays a glowing Imperial Gold (+amount EXP) pill that floats up and fades smoothly into progress.
 */
export const FloatingExpReward: React.FC<FloatingExpRewardProps> = ({
  amount,
  label,
  onComplete,
  className = '',
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`pointer-events-none fixed z-50 flex items-center gap-1.5 rounded-full border border-gold/40 bg-card/95 px-3 py-1 font-sans text-xs font-bold text-gold-ink  shadow-gold/20 backdrop-blur-sm animate-[float-exp_1.2s_ease-out_forwards] ${className}`}
      style={{
        left: '50%',
        top: '40%',
        transform: 'translate(-50%, -50%)',
      }}
      role="status"
      aria-live="polite"
    >
      <Sparkles className="h-3.5 w-3.5 animate-spin text-gold-ink" style={{ animationDuration: '3s' }} />
      <span>+{amount} EXP</span>
      {label && <span className="text-[10px] text-fg-60">· {label}</span>}
    </div>
  );
};

export default FloatingExpReward;

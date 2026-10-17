import React from 'react';

interface RedSealStampProps {
  text?: string;
  subText?: string;
  size?: number;
  className?: string;
  animated?: boolean;
}

/**
 * Chinese Traditional Red Seal Stamp (印章 / Đóng dấu triện đỏ)
 * Features:
 * - Cinnabar red (#E11D48) double ink borders
 * - Classic seal script typography (chữ triện / Hán thư)
 * - Spring slam micro-animation (scale: 2.4 -> 1.0, rotate: -12deg)
 */
export const RedSealStamp: React.FC<RedSealStampProps> = ({
  text = '通',
  subText,
  size = 64,
  className = '',
  animated = true,
}) => {
  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center select-none border-2 border-cinnabar bg-cinnabar/10 text-cinnabar-ink  ${
        animated ? 'animate-[seal-slam_0.45s_cubic-bezier(0.34,1.56,0.64,1)_forwards]' : 'rotate-[-12deg]'
      } ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '3px',
        padding: '3px',
      }}
      aria-label={`Dấu triện: ${text}`}
    >
      {/* Inner weathered frame */}
      <div className="flex h-full w-full flex-col items-center justify-center border border-dashed border-cinnabar/80 p-0.5">
        <span
          className="font-serif font-bold tracking-widest leading-none text-cinnabar-ink"
          style={{ fontSize: Math.round(size * 0.44) }}
        >
          {text}
        </span>
        {subText && (
          <span
            className="mt-0.5 font-sans font-semibold tracking-tighter uppercase leading-none text-cinnabar-ink"
            style={{ fontSize: Math.max(9, Math.round(size * 0.16)) }}
          >
            {subText}
          </span>
        )}
      </div>
    </div>
  );
};

export default RedSealStamp;

import React from 'react';

interface RedSealStampProps {
  text?: string;
  subText?: string;
  size?: number;
  className?: string;
  animated?: boolean;
}

/**
 * Learning feedback stamp, using Vietnamese labels and existing theme tokens.
 * Historical callers may retain their state identifiers; these are not lessons.
 */
export const RedSealStamp: React.FC<RedSealStampProps> = ({
  text = '通',
  subText,
  size = 64,
  className = '',
  animated = true,
}) => {
  // Interface feedback labels, not dictionary translations or curriculum claims.
  const label: string = ({'通':'Xong','熟':'Nhớ','合格':'Đạt','未过':'Ôn thêm','勉':'Cố lên'} as Record<string,string>)[text] ?? text;
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
      aria-label={`Kết quả: ${label}`}
    >
      {/* Inner weathered frame */}
      <div className="flex h-full w-full flex-col items-center justify-center border border-dashed border-cinnabar/80 p-0.5">
        <span
          className="font-sans font-bold leading-none text-cinnabar-ink"
          style={{ fontSize: Math.min(Math.round(size * 0.44),Math.floor((size-12)/Math.max(label.length*.65,1))) }}
        >
          {label}
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

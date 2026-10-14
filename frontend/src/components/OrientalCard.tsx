import React from 'react';

interface OrientalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  tag?: string;
  tagVariant?: 'cinnabar' | 'jade' | 'gold' | 'ink';
  hoverCorners?: boolean;
  active?: boolean;
}

export function OrientalCard({
  children,
  className = '',
  tag,
  tagVariant = 'cinnabar',
  hoverCorners = true,
  active = false,
  ...props
}: OrientalCardProps) {
  const tagColorStyles = {
    cinnabar: 'bg-[#B91C1C]/20 text-[#EF4444] border-[#B91C1C]/40',
    jade: 'bg-[#0F766E]/20 text-[#2DD4BF] border-[#0F766E]/40',
    gold: 'bg-[#D97706]/20 text-[#F59E0B] border-[#D97706]/40',
    ink: 'bg-white/10 text-fg-60 border-white/20',
  }[tagVariant];

  return (
    <div
      className={`group relative rounded-xl border border-[#252834] bg-gradient-to-b from-[#14161f] via-[#101217] to-[#0c0d12] p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-[#D97706]/40 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.6),0_0_20px_rgba(217,119,6,0.1)] ${className}`}
      {...props}
    >
      {/* Traditional Chinese Cloud Meander Fretwork Corners (Hồi Văn Vân Đầu - 回纹云头角) */}
      {hoverCorners && (
        <>
          {/* Top-Left */}
          <svg
            aria-hidden="true"
            className={`pointer-events-none absolute top-1.5 left-1.5 w-3.5 h-3.5 select-none transition-colors duration-200 ${
              active ? 'text-[#D97706]' : 'text-fg/20 group-hover:text-[#D97706]'
            }`}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <path d="M 1 14 L 1 1 L 14 1 M 4 6 L 8 6 L 8 10" />
          </svg>

          {/* Top-Right */}
          <svg
            aria-hidden="true"
            className={`pointer-events-none absolute top-1.5 right-1.5 w-3.5 h-3.5 select-none transition-colors duration-200 ${
              active ? 'text-[#D97706]' : 'text-fg/20 group-hover:text-[#D97706]'
            }`}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <path d="M 15 14 L 15 1 L 2 1 M 12 6 L 8 6 L 8 10" />
          </svg>

          {/* Bottom-Left */}
          <svg
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-1.5 left-1.5 w-3.5 h-3.5 select-none transition-colors duration-200 ${
              active ? 'text-[#D97706]' : 'text-fg/20 group-hover:text-[#D97706]'
            }`}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <path d="M 1 2 L 1 15 L 14 15 M 4 10 L 8 10 L 8 6" />
          </svg>

          {/* Bottom-Right */}
          <svg
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-1.5 right-1.5 w-3.5 h-3.5 select-none transition-colors duration-200 ${
              active ? 'text-[#D97706]' : 'text-fg/20 group-hover:text-[#D97706]'
            }`}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <path d="M 15 2 L 15 15 L 2 15 M 12 10 L 8 10 L 8 6" />
          </svg>
        </>
      )}

      {/* Traditional Vertical Bookmark Tag (e.g. HSK 壹) */}
      {tag && (
        <div className="absolute top-3 right-4 z-10 flex items-center">
          <span
            className={`inline-flex items-center rounded-sm border px-2 py-0.5 font-serif text-[10.5px] font-medium tracking-wide ${tagColorStyles}`}
          >
            {tag}
          </span>
        </div>
      )}

      {children}
    </div>
  );
}

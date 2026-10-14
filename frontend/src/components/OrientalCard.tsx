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
    cinnabar: 'bg-[#C83E31]/15 text-[#C83E31] border-[#C83E31]/30',
    jade: 'bg-[#2E7D6B]/15 text-[#2E7D6B] border-[#2E7D6B]/30',
    gold: 'bg-[#D97706]/15 text-[#D97706] border-[#D97706]/30',
    ink: 'bg-white/10 text-fg-60 border-white/20',
  }[tagVariant];

  return (
    <div
      className={`group relative rounded-xl border border-rule bg-[#1A1B18] p-5 shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all duration-200 hover:border-[#C83E31]/50 hover:shadow-[3px_3px_0px_rgba(200,62,49,0.18)] ${className}`}
      {...props}
    >
      {/* Traditional Corner Brackets (┌ ┐ └ ┘) */}
      {hoverCorners && (
        <>
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute top-1.5 left-1.5 font-serif text-[11px] leading-none select-none transition-colors duration-200 ${
              active ? 'text-[#C83E31]' : 'text-fg/20 group-hover:text-[#C83E31]'
            }`}
          >
            ┌
          </span>
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute top-1.5 right-1.5 font-serif text-[11px] leading-none select-none transition-colors duration-200 ${
              active ? 'text-[#C83E31]' : 'text-fg/20 group-hover:text-[#C83E31]'
            }`}
          >
            ┐
          </span>
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-1.5 left-1.5 font-serif text-[11px] leading-none select-none transition-colors duration-200 ${
              active ? 'text-[#C83E31]' : 'text-fg/20 group-hover:text-[#C83E31]'
            }`}
          >
            └
          </span>
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-1.5 right-1.5 font-serif text-[11px] leading-none select-none transition-colors duration-200 ${
              active ? 'text-[#C83E31]' : 'text-fg/20 group-hover:text-[#C83E31]'
            }`}
          >
            ┘
          </span>
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

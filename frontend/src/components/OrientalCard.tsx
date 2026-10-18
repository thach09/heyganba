import React from 'react';

interface OrientalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  tag?: string;
  bookmark?: string;
  tagVariant?: 'cinnabar' | 'jade' | 'gold' | 'ink';
  hoverCorners?: boolean;
  active?: boolean;
}

export function OrientalCard({
  children,
  className = '',
  tag,
  bookmark,
  tagVariant = 'cinnabar',
  hoverCorners = true,
  active = false,
  ...props
}: OrientalCardProps) {
  const displayTag = bookmark || tag;
  return (
    <div
      data-lattice={hoverCorners} className={`oriental-card relative min-w-0 bg-card p-5 leading-relaxed ${active ? 'text-fg' : ''} ${className}`}
      {...props}
    >
      {displayTag && (
        <div data-card-tag className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-2">
          <span className={`break-words text-[12.5px] leading-relaxed ${tagVariant === 'jade' ? 'text-rank' : 'text-fg-60'}`}>
            {displayTag}
          </span>
          <span aria-hidden="true" className="ml-auto shrink-0 font-serif text-[11px] leading-none text-fg/20 [writing-mode:vertical-rl]">温故知新</span>
          {bookmark && tag && bookmark !== tag && (
            <span className="break-words text-[12px] leading-relaxed text-fg-38">
              {tag}
            </span>
          )}
        </div>
      )}

      {children}
    </div>
  );
}

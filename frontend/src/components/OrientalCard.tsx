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
  hoverCorners: _hoverCorners,
  active = false,
  ...props
}: OrientalCardProps) {
  const displayTag = bookmark || tag;
  return (
    <div
      className={`min-w-0 bg-card p-5 leading-relaxed ${active ? 'text-fg' : ''} ${className}`}
      {...props}
    >
      {displayTag && (
        <div data-card-tag className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-2">
          <span className={`break-words text-[12.5px] leading-relaxed ${tagVariant === 'jade' ? 'text-rank' : 'text-fg-60'}`}>
            {displayTag}
          </span>
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

import React from 'react';
import { Flame } from 'lucide-react';

interface MascotMilestone {
  minStreak: number;
  label: string;
  note: string;
  color: string;
  Icon: React.FC<{ className?: string }>;
}

// Crisp inline SVG emblems with Chinese motifs (Zero cheap OS emojis)
const DragonIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="14" fill="#D97706" fillOpacity="0.15" stroke="#D97706" strokeWidth="1.5" />
    <path
      d="M10 20C12 14 16 12 22 10C20 16 18 22 12 22C10 22 9 21 10 20Z"
      fill="#D97706"
      stroke="#B45309"
      strokeWidth="1.2"
    />
    <circle cx="19" cy="13" r="1.5" fill="#FFFFFF" />
    <path d="M14 10L16 7L18 10" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M22 10L25 9" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const PhoenixIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="14" fill="#C83E31" fillOpacity="0.15" stroke="#C83E31" strokeWidth="1.5" />
    <path
      d="M16 6C13 12 11 16 8 20C13 19 19 19 24 20C21 16 19 12 16 6Z"
      fill="#C83E31"
      stroke="#991B1B"
      strokeWidth="1.2"
    />
    <circle cx="16" cy="11" r="1.5" fill="#FDE047" />
    <path d="M12 24Q16 26 20 24" stroke="#C83E31" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const JadeBirdIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="14" fill="#2E7D6B" fillOpacity="0.15" stroke="#2E7D6B" strokeWidth="1.5" />
    <path
      d="M11 18C13 14 17 12 21 13C20 18 16 21 12 21C11 21 10.5 20 11 18Z"
      fill="#2E7D6B"
      stroke="#065F46"
      strokeWidth="1.2"
    />
    <circle cx="18" cy="15" r="1.2" fill="#FFFFFF" />
    <path d="M21 13L24 14" stroke="#2E7D6B" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const FledglingIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="14" fill="#EAB308" fillOpacity="0.15" stroke="#EAB308" strokeWidth="1.5" />
    <circle cx="16" cy="16" r="6" fill="#FACC15" />
    <circle cx="14" cy="15" r="1" fill="#1C1D1A" />
    <circle cx="18" cy="15" r="1" fill="#1C1D1A" />
    <polygon points="16,16 15,18 17,18" fill="#EA580C" />
  </svg>
);

const HatchingIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="14" fill="#64748B" fillOpacity="0.15" stroke="#64748B" strokeWidth="1.5" />
    <ellipse cx="16" cy="17" rx="6" ry="8" fill="#E2E8F0" />
    <path d="M12 17L14 19L16 16L18 19L20 17" stroke="#1C1D1A" strokeWidth="1" fill="none" />
  </svg>
);

const EggIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="14" fill="#94A3B8" fillOpacity="0.1" stroke="#94A3B8" strokeWidth="1.5" />
    <ellipse cx="16" cy="17" rx="6" ry="8" fill="#CBD5E1" />
  </svg>
);

const MILESTONES: MascotMilestone[] = [
  { minStreak: 30, label: 'Kim Long (金龙)', note: 'Bậc thầy kiên trì', color: 'text-gold-ink', Icon: DragonIcon },
  { minStreak: 14, label: 'Chu Tước (朱雀)', note: 'Bay cao, học đều', color: 'text-cinnabar-ink', Icon: PhoenixIcon },
  { minStreak: 7, label: 'Thanh Điểu (青鸟)', note: 'Đã thành thói quen tuần', color: 'text-jade-ink', Icon: JadeBirdIcon },
  { minStreak: 3, label: 'Ấu Điểu (幼鸟)', note: 'Bắt đầu vững vàng', color: 'text-gold-ink', Icon: FledglingIcon },
  { minStreak: 1, label: 'Sơ Khai (初开)', note: 'Khởi đầu tốt', color: 'text-fg-60', Icon: HatchingIcon },
  { minStreak: 0, label: 'Thái Cực Noãn', note: 'Học 1 ngày để nở', color: 'text-fg-38', Icon: EggIcon },
];

interface MascotBadgeProps {
  longestStreak: number;
  currentStreak?: number;
}

export const MascotBadge: React.FC<MascotBadgeProps> = ({ longestStreak, currentStreak }) => {
  const milestone = MILESTONES.find((item) => longestStreak >= item.minStreak) ?? MILESTONES[MILESTONES.length - 1];
  const nextMilestone = [...MILESTONES].reverse().find((item) => item.minStreak > longestStreak);
  const Icon = milestone.Icon;

  return (
    <div className="flex items-center gap-3.5">
      <div className="flex-shrink-0" title={milestone.note}>
        <Icon className="h-9 w-9" />
      </div>
      <div className="flex flex-col gap-0.5 text-left">
        <div className="flex items-center gap-1.5">
          <span className="font-serif text-[13.5px] font-bold text-fg">{milestone.label}</span>
          <span className="inline-flex items-center gap-1 rounded bg-rule/50 px-1.5 py-0.2 text-[10px] text-fg-60">
            <Flame className="h-3 w-3 text-cinnabar-ink" />
            {longestStreak} ngày
          </span>
        </div>
        <span className="text-[11.5px] text-fg-38">
          {typeof currentStreak === 'number' ? `Đang duy trì ${currentStreak} ngày liên tục` : milestone.note}
        </span>
        {nextMilestone && (
          <span className="text-[11px] text-fg-38">
            Còn {nextMilestone.minStreak - longestStreak} ngày để tiến hoá thành{' '}
            <strong className={nextMilestone.color}>{nextMilestone.label}</strong>
          </span>
        )}
      </div>
    </div>
  );
};

export default MascotBadge;

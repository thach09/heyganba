import React from 'react';

/**
 * Temporary emoji mascot that evolves with the longest streak.
 * Replace the MILESTONES assets later without changing the component call sites.
 */
const MILESTONES = [
  { minStreak: 30, emoji: '🐉', label: 'Rồng Nhật', note: 'Bậc thầy kiên trì' },
  { minStreak: 14, emoji: '🦅', label: 'Đại bàng', note: 'Bay cao, học đều' },
  { minStreak: 7, emoji: '🐥', label: 'Chim non', note: 'Đã thành thói quen tuần' },
  { minStreak: 3, emoji: '🐤', label: 'Gà con', note: 'Bắt đầu vững vàng' },
  { minStreak: 1, emoji: '🐣', label: 'Trứng nở', note: 'Khởi đầu tốt' },
  { minStreak: 0, emoji: '🥚', label: 'Trứng', note: 'Học 1 ngày để nở' },
];

interface MascotBadgeProps {
  longestStreak: number;
  currentStreak?: number;
}

export const MascotBadge: React.FC<MascotBadgeProps> = ({ longestStreak, currentStreak }) => {
  const milestone = MILESTONES.find((item) => longestStreak >= item.minStreak) ?? MILESTONES[MILESTONES.length - 1];
  const nextMilestone = [...MILESTONES].reverse().find((item) => item.minStreak > longestStreak);

  return (
    <div className="flex items-center gap-4">
      <span className="text-[32px] leading-none" title={milestone.note} aria-hidden="true">
        {milestone.emoji}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-semibold text-fg">{milestone.label}</span>
        <span className="text-[11.5px] text-fg-38">
          Streak dài nhất {longestStreak} ngày
          {typeof currentStreak === 'number' ? ` · hiện tại ${currentStreak} ngày` : ''}
        </span>
        {nextMilestone && (
          <span className="text-[11.5px] text-fg-38">
            Còn {nextMilestone.minStreak - longestStreak} ngày để tiến hoá thành {nextMilestone.emoji}{' '}
            {nextMilestone.label}
          </span>
        )}
      </div>
    </div>
  );
};

export default MascotBadge;

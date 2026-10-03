import React from 'react';

/**
 * Mascot CHÍNH THỨC của HeyGanba: chuỗi emoji tiến hoá theo streak (🥚 → 🐣 → 🐤 → 🐥 → 🦅 → 🐉).
 *
 * Quyết định (27/09/2026): đây là giải pháp lâu dài, KHÔNG còn là "tạm/placeholder" — không làm thêm mascot
 * nào khác; logo cổng Torii vẫn là biểu tượng thương hiệu chính. Mỗi bậc có `alt` mô tả để screen reader đọc
 * được (accessibility), không ẩn khỏi cây accessibility như trước.
 */
const MILESTONES = [
  { minStreak: 30, emoji: '🐉', label: 'Rồng Nhật', note: 'Bậc thầy kiên trì', alt: 'Rồng — mascot bậc 30 ngày streak' },
  { minStreak: 14, emoji: '🦅', label: 'Đại bàng', note: 'Bay cao, học đều', alt: 'Đại bàng — mascot bậc 14 ngày streak' },
  { minStreak: 7, emoji: '🐥', label: 'Chim non', note: 'Đã thành thói quen tuần', alt: 'Chim non — mascot bậc 7 ngày streak' },
  { minStreak: 3, emoji: '🐤', label: 'Gà con', note: 'Bắt đầu vững vàng', alt: 'Gà con — mascot bậc 3 ngày streak' },
  { minStreak: 1, emoji: '🐣', label: 'Trứng nở', note: 'Khởi đầu tốt', alt: 'Trứng nở — mascot bậc 1 ngày streak' },
  { minStreak: 0, emoji: '🥚', label: 'Trứng', note: 'Học 1 ngày để nở', alt: 'Trứng — mascot khi chưa có streak' },
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
      <span className="text-[32px] leading-none" title={milestone.note} role="img" aria-label={milestone.alt}>
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
            Còn {nextMilestone.minStreak - longestStreak} ngày để tiến hoá thành{' '}
            <span role="img" aria-label={nextMilestone.alt}>
              {nextMilestone.emoji}
            </span>{' '}
            {nextMilestone.label}
          </span>
        )}
      </div>
    </div>
  );
};

export default MascotBadge;

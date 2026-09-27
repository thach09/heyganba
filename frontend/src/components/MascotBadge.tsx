import React from 'react';

/**
 * Mascot tạm: chuỗi emoji tiến hoá theo streak dài nhất (quyết định đã chốt — chưa chờ asset thiết kế).
 * Khi có bộ hình chính thức chỉ cần thay bảng MILESTONES bên dưới, không đổi nơi gọi component.
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
    <div className="mascot-badge">
      <span className="mascot-emoji" title={milestone.note}>
        {milestone.emoji}
      </span>
      <div className="mascot-info">
        <span className="mascot-label">{milestone.label}</span>
        <span className="kana-detail-meta">
          Streak dài nhất {longestStreak} ngày
          {typeof currentStreak === 'number' ? ` · hiện tại ${currentStreak} ngày` : ''}
        </span>
        {nextMilestone && (
          <span className="kana-detail-meta">
            Còn {nextMilestone.minStreak - longestStreak} ngày để tiến hoá thành {nextMilestone.emoji}{' '}
            {nextMilestone.label}
          </span>
        )}
      </div>
    </div>
  );
};

export default MascotBadge;

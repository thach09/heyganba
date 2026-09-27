import React, { useEffect, useState } from 'react';
import { 
  Languages, 
  Layers, 
  BookOpen, 
  Sparkles, 
  GraduationCap, 
  ArrowRight,
  CheckCircle,
  Clock
} from 'lucide-react';
import type { StationKey } from '../../components/Sidebar';
import { MascotBadge } from '../../components/MascotBadge';
import { apiRequest } from '../../services/api';
import type { AuthResponse } from '../../services/api';

interface StreakDto {
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
}

interface DashboardViewProps {
  onSelectStation: (station: StationKey) => void;
  user?: AuthResponse | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onSelectStation, user }) => {
  const [streak, setStreak] = useState<StreakDto | null>(null);

  useEffect(() => {
    if (!user) {
      // Không setState đồng bộ trong effect (tránh warning react-hooks): chỉ fetch khi đã đăng nhập,
      // mascot được render có điều kiện theo `user` nên không cần reset state khi logout.
      return;
    }

    void apiRequest<StreakDto>('/streak').then((res) => {
      if (res.success && res.data) {
        setStreak(res.data);
      }
    });
  }, [user]);

  const stations = [
    {
      key: 'kana' as StationKey,
      phase: 'Phase 1',
      title: 'Bảng Chữ Cái Kana',
      desc: 'Bảng Hiragana, Katakana tương tác, audio phát âm chuẩn và canvas viết tay. Katakana có bảng riêng cho tổ hợp âm từ mượn và ký tự đôi.',
      features: [
        '46 Hiragana + 46 Katakana',
        'Biến âm & Âm ghép',
        'Katakana mở rộng (ファ / ウィ / ツォ)',
        'Ký tự đôi ッ / ー',
        'Canvas luyện viết tay',
        'Audio phát âm',
      ],
      icon: Languages,
      color: '#3B82F6',
      status: 'Ready',
    },
    {
      key: 'flashcard' as StationKey,
      phase: 'Phase 2',
      title: 'Flashcard Từ Vựng & SRS',
      desc: 'Học từ vựng theo giáo trình Dekiru Nihongo (JPD113/JPD123) với thuật toán lặp lại ngắt quãng SM-2.',
      features: ['Thuật toán SM-2 rút gọn', 'Hàng đợi ôn tập theo ngày', 'Cache Redis tối ưu', 'Từ vựng theo bài 1–7'],
      icon: Layers,
      color: '#10B981',
      status: 'Ready',
    },
    {
      key: 'kanji' as StationKey,
      phase: 'Phase 3',
      title: 'Bộ Thủ & Hán Tự (Kanji)',
      desc: 'Tra cứu theo bộ thủ, mnemonic ghi nhớ hình ảnh, âm Hán Việt và animation thứ tự nét vẽ.',
      features: ['214 Bộ thủ thông dụng', 'Thứ tự bài học Dekiru', 'Hán Việt + Onyomi/Kunyomi', 'Luyện viết Kanji'],
      icon: BookOpen,
      color: '#F59E0B',
      status: 'Ready',
    },
    {
      key: 'grammar' as StationKey,
      phase: 'Phase 4',
      title: 'Trợ Từ & Ngữ Pháp',
      desc: '17 điểm ngữ pháp JPD113 + ngữ pháp JPD123. Bộ bài tập chuyên sâu cho nhóm bẫy dễ mất điểm.',
      features: ['Bẫy trợ từ は/へ/を', 'Số đếm biến âm ngoại lệ', 'Chấm điểm phía Server', 'Audio ngữ cảnh'],
      icon: Sparkles,
      color: '#8B5CF6',
      status: 'Ready',
    },
    {
      key: 'exam' as StationKey,
      phase: 'Phase 5',
      title: 'Thi Thử & Đấu Trường',
      desc: 'Đề thi mô phỏng định dạng kỳ thi JPD FPT University, streak heatmap, và bảng xếp hạng lớp học.',
      features: ['Mô phỏng đề JPD113/123', 'Streak Heatmap', 'Mascot tiến hóa', 'Leaderboard theo lớp'],
      icon: GraduationCap,
      color: '#EC4899',
      status: 'Ready',
    },
  ];

  return (
    <div>
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(255, 75, 85, 0.15) 0%, rgba(19, 27, 46, 0.9) 100%)',
          border: '1px solid var(--border-active)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
        }}
      >
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '12px', fontWeight: 700, marginBottom: '12px' }}>
            <Sparkles size={14} />
            <span>Nền tảng học tiếng Nhật Dekiru Nihongo FPT</span>
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '10px' }}>
            Chào mừng bạn đến với HeyGanba! 🎌
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6 }}>
            Hệ thống 5 trạm học tập toàn diện được thiết kế bám sát giáo trình JPD113/JPD123.
            Nền tảng hạ tầng Phase 0 đã hoàn tất với REST API chuẩn hóa, bảo mật JWT và cơ sở dữ liệu PostgreSQL.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {user && (
            <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
              {/* Mascot tạm: emoji tiến hoá theo streak — xem components/MascotBadge.tsx */}
              <MascotBadge longestStreak={streak?.longestStreak ?? 0} currentStreak={streak?.currentStreak ?? 0} />
            </div>
          )}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px 20px', minWidth: '130px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cấu trúc</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>5 Trạm</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px 20px', minWidth: '130px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Học phần</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#3B82F6' }}>JPD113/123</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Bản đồ 5 Trạm học tập</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Học tập tuần tự từ nhận diện bảng chữ cái đến thi thử tổng hợp</p>
        </div>
      </div>

      <div className="stations-grid">
        {stations.map((st) => {
          const Icon = st.icon;
          return (
            <div
              key={st.key}
              className="station-card"
              onClick={() => onSelectStation(st.key)}
            >
              <div className="station-card-header">
                <div className="station-icon-box" style={{ background: `${st.color}15`, color: st.color }}>
                  <Icon size={24} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-muted)' }}>
                    {st.phase}
                  </span>
                </div>
              </div>

              <div className="station-card-title">{st.title}</div>
              <p className="station-card-desc">{st.desc}</p>

              <div className="station-features">
                {st.features.map((feat, idx) => (
                  <span key={idx} className="feature-tag">
                    {feat}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                  {st.status.includes('Ready') ? (
                    <>
                      <CheckCircle size={14} color="#10B981" />
                      <span style={{ color: '#10B981', fontWeight: 600 }}>Sẵn sàng</span>
                    </>
                  ) : (
                    <>
                      <Clock size={14} />
                      <span>{st.status}</span>
                    </>
                  )}
                </span>
                <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}>
                  Khám phá <ArrowRight size={14} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

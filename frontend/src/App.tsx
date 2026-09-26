import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import type { StationKey } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { AuthModal } from './features/auth/AuthModal';
import { DashboardView } from './features/dashboard/DashboardView';
import { AdminView } from './features/admin/AdminView';
import { StationPlaceholderView } from './features/common/StationPlaceholderView';
import { KanaStationView } from './features/kana/KanaStationView';
import { getSavedUser, clearTokens, apiRequest } from './services/api';
import type { AuthResponse } from './services/api';

export function App() {
  const [currentStation, setCurrentStation] = useState<StationKey>('dashboard');
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    // Check saved user session
    const saved = getSavedUser();
    if (saved) {
      setUser(saved);
    }

    // Ping backend health check (/api/v1/health)
    apiRequest<any>('/health')
      .then((res) => {
        setBackendHealthy(res.success && res.data?.status === 'UP');
      })
      .catch(() => {
        setBackendHealthy(false);
      });
  }, []);

  const handleLogout = () => {
    clearTokens();
    setUser(null);
    if (currentStation === 'admin') {
      setCurrentStation('dashboard');
    }
  };

  const stationTitles: Record<StationKey, string> = {
    dashboard: 'Bảng Điều Khiển — HeyGanba!',
    kana: 'Bảng Chữ Cái Kana (Hiragana / Katakana)',
    flashcard: 'Flashcard Từ Vựng & SRS',
    kanji: 'Bộ Thủ & Hán Tự (Kanji)',
    grammar: 'Trợ Từ & Ngữ Pháp',
    exam: 'Thi Thử & Đấu Trường',
    admin: 'Khu Vực Quản Trị Hệ Thống',
  };

  return (
    <div className="app-container">
      {/* Ambient background glows */}
      <div className="ambient-bg">
        <div className="blob-1" />
        <div className="blob-2" />
        <div className="blob-3" />
      </div>

      {/* Navigation Sidebar */}
      <Sidebar
        currentStation={currentStation}
        onSelectStation={(key) => setCurrentStation(key)}
        user={user}
        isOpen={isSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Navbar
          user={user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          streakCount={3}
          activeStationTitle={stationTitles[currentStation]}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="content-body">
          {backendHealthy === false && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 18px',
                fontSize: '13px',
                color: 'var(--accent-gold)',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                ⚠️ Máy chủ backend (Spring Boot) chưa khởi chạy hoặc đang cold start. Để kích hoạt toàn bộ tính năng API, chạy: <code>mvn spring-boot:run</code> tại thư mục <code>backend</code> hoặc dùng Docker Compose.
              </span>
            </div>
          )}

          {currentStation === 'dashboard' && (
            <DashboardView onSelectStation={(st) => setCurrentStation(st)} />
          )}

          {currentStation === 'admin' && (
            user?.role === 'ROLE_ADMIN' ? (
              <AdminView />
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
                <h3 style={{ color: '#EF4444', marginBottom: '8px' }}>Không có quyền truy cập (403 Forbidden)</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Vui lòng đăng nhập bằng tài khoản Administrator để truy cập khu vực này.</p>
              </div>
            )
          )}

          {currentStation === 'kana' && <KanaStationView />}

          {currentStation === 'flashcard' && (
            <StationPlaceholderView
              stationKey="flashcard"
              stationTitle="Flashcard Từ Vựng & SRS Engine"
              phaseTag="Phase 2"
              badgeColor="#10B981"
              description="Thuật toán lặp lại ngắt quãng SM-2 rút gọn tính toán chính xác chu kỳ ôn tập. Giao diện lật thẻ chỉ hiển thị đúng số từ cần ôn hôm nay với cache Redis hiệu năng cao."
              modules={[
                'Engine SRS SM-2 rút gọn (Dễ / Được / Khó / Quên)',
                'Truy vấn "Từ cần ôn hôm nay" tối ưu qua Redis cache',
                'Job @Scheduled 00:05 tự động đồng bộ hàng ngày',
                'Mapping từ vựng theo bài học Dekiru Nihongo Bài 1–7',
                'Kiểm soát bảo mật user_id nghiêm ngặt ở tầng service',
              ]}
            />
          )}

          {currentStation === 'kanji' && (
            <StationPlaceholderView
              stationKey="kanji"
              stationTitle="Bộ Thủ & Hán Tự (Kanji)"
              phaseTag="Phase 3"
              badgeColor="#F59E0B"
              description="Kanji sắp xếp tuần tự theo đúng bài học Dekiru (JPD113/123), không tải ngẫu nhiên theo độ khó. Kết hợp bộ thủ, Hán Việt và mnemonic hình ảnh giúp ghi nhớ lâu bền."
              modules={[
                'Tra cứu Kanji theo bài học và theo 214 bộ thủ',
                'Hiển thị song song Onyomi, Kunyomi và âm Hán Việt',
                'Canvas luyện viết chữ Hán kế thừa từ Trạm Kana',
                'Lưu trữ tiến độ luyện tập riêng cho từng tài khoản',
                'Dữ liệu thứ tự nét Stroke Order animation',
              ]}
            />
          )}

          {currentStation === 'grammar' && (
            <StationPlaceholderView
              stationKey="grammar"
              stationTitle="Trợ Từ & Ngữ Pháp (Bẫy Thường Gặp)"
              phaseTag="Phase 4"
              badgeColor="#8B5CF6"
              description="17 điểm ngữ pháp JPD113 và cấu trúc JPD123. Phân hệ bài tập điền khuyết với trọng tâm là các bẫy thường gặp trong đề thi Dekiru FPT."
              modules={[
                'Bộ bài tập cho nhóm bẫy trợ từ: は (wa), へ (e), を (o)',
                'Bẫy số đếm biến âm: ngày 14/20/24, giờ 4/7/9, phút ふん/ぷん',
                'Chấm điểm phía Server và chuẩn hóa Unicode',
                'Giải thích chi tiết nguyên nhân bẫy sau mỗi câu trả lời',
                'Nghe audio ngữ cảnh trước khi chọn trợ từ',
              ]}
            />
          )}

          {currentStation === 'exam' && (
            <StationPlaceholderView
              stationKey="exam"
              stationTitle="Thi Thử, Streak Heatmap & Leaderboard"
              phaseTag="Phase 5"
              badgeColor="#EC4899"
              description="Hệ thống thi thử mô phỏng đề thi JPD FPT University. Chuỗi streak học tập hàng ngày với heatmap kiểu GitHub và linh vật mascot tiến hóa theo cấp độ."
              modules={[
                'Sinh đề thi thử ngẫu nhiên từ kho câu hỏi chuẩn format FPT',
                'Streak Heatmap hiển thị biểu đồ nhiệt tương tác',
                'Mascot tiến hóa qua các mốc học tập',
                'Bảng xếp hạng Redis Sorted Set theo từng mã lớp học',
                'Audit log ghi lại toàn bộ lịch sử chỉnh sửa nội dung',
              ]}
            />
          )}
        </main>
      </div>

      {/* Auth Modal for Login / Register */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(loggedInUser) => {
          setUser(loggedInUser);
        }}
      />
    </div>
  );
}

export default App;

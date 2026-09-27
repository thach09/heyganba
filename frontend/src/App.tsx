import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import type { StationKey } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { AuthModal } from './features/auth/AuthModal';
import { DashboardView } from './features/dashboard/DashboardView';
import { AdminView } from './features/admin/AdminView';
import { KanaStationView } from './features/kana/KanaStationView';
import { FlashcardView } from './features/flashcard/FlashcardView';
import { KanjiStationView } from './features/kanji/KanjiStationView';
import { GrammarView } from './features/grammar/GrammarView';
import { ExamView } from './features/exam/ExamView';
import { getSavedUser, clearTokens, apiRequest } from './services/api';
import type { AuthResponse } from './services/api';

/** Breakpoint phải khớp đúng `@media (max-width: 900px)` trong index.css. */
const MOBILE_BREAKPOINT_QUERY = '(max-width: 900px)';

/**
 * Theo dõi breakpoint mobile bằng matchMedia — cùng nguồn sự thật với CSS media query.
 *
 * Trước đây state sidebar tính bằng `window.innerWidth` (số đo tức thời, còn đổi theo pinch-zoom
 * trên iOS) nên có thể lệch pha với CSS: JS tưởng desktop → sidebar ở trạng thái mở, trong khi CSS
 * vẫn xếp nó thành overlay trên mobile → menu che hết giao diện mà không có nút đóng/lớp phủ.
 */
function useIsMobileLayout(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}

export function App() {
  const [currentStation, setCurrentStation] = useState<StationKey>('dashboard');
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const isMobileLayout = useIsMobileLayout();
  /**
   * Lựa chọn thủ công của người dùng cho thanh menu: `null` = chưa chọn → theo mặc định của từng
   * breakpoint (desktop mở sẵn dạng cột, mobile đóng). Suy ra ngay trong render nên khi xoay màn
   * hình / đổi kích thước cửa sổ giá trị tự đúng, không cần effect đồng bộ state.
   */
  const [sidebarPreference, setSidebarPreference] = useState<boolean | null>(null);
  const sidebarDefaultOpen = !isMobileLayout;
  const isSidebarOpen = sidebarPreference ?? sidebarDefaultOpen;
  // Overlay chỉ tồn tại trên mobile; desktop là cột cố định nên không cần lớp phủ.
  const isSidebarOverlay = isMobileLayout && isSidebarOpen;
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  // Streak thật của người đang đăng nhập — trước đây topbar hardcode "3 ngày".
  const [streakCount, setStreakCount] = useState(0);

  const closeSidebar = () => setSidebarPreference(false);
  const toggleSidebar = () => setSidebarPreference(!isSidebarOpen);

  // Khóa cuộn trang nền khi overlay menu đang mở trên thiết bị di động
  useEffect(() => {
    if (!isSidebarOverlay) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSidebarOverlay]);

  // Phím Esc đóng overlay menu (tiện khi dùng bàn phím rời hoặc thu nhỏ cửa sổ trên desktop).
  useEffect(() => {
    if (!isSidebarOverlay) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarPreference(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOverlay]);

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

  useEffect(() => {
    if (!user) {
      return;
    }

    void apiRequest<{ currentStreak: number }>('/streak').then((res) => {
      if (res.success && res.data) {
        setStreakCount(res.data.currentStreak);
      }
    });
  }, [user]);

  const handleLogout = () => {
    clearTokens();
    setUser(null);
    if (currentStation === 'admin') {
      setCurrentStation('dashboard');
    }
  };

  const handleSelectStation = (station: StationKey) => {
    setCurrentStation(station);
    if (isMobileLayout) {
      closeSidebar();
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

      {/* Lớp phủ đóng menu: chỉ render khi sidebar đang mở dạng overlay trên di động */}
      {isSidebarOverlay && (
        <div
          className="sidebar-backdrop"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Navigation Sidebar */}
      <Sidebar
        currentStation={currentStation}
        onSelectStation={handleSelectStation}
        onClose={closeSidebar}
        isOverlay={isMobileLayout}
        user={user}
        isOpen={isSidebarOpen}
      />

      {/* Main Content Area */}
      <div className={`main-wrapper ${isSidebarOpen ? '' : 'is-collapsed'}`}>
        <Navbar
          user={user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          streakCount={streakCount}
          activeStationTitle={stationTitles[currentStation]}
          onToggleSidebar={toggleSidebar}
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
            <DashboardView user={user} onSelectStation={handleSelectStation} />
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
            <FlashcardView user={user} onRequireLogin={() => setIsAuthModalOpen(true)} />
          )}

          {currentStation === 'kanji' && (
            <KanjiStationView user={user} onRequireLogin={() => setIsAuthModalOpen(true)} />
          )}

          {currentStation === 'grammar' && (
            <GrammarView user={user} onRequireLogin={() => setIsAuthModalOpen(true)} />
          )}

          {currentStation === 'exam' && (
            <ExamView user={user} onRequireLogin={() => setIsAuthModalOpen(true)} />
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

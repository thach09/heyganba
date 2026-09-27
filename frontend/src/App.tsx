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

export function App() {
  const [currentStation, setCurrentStation] = useState<StationKey>('dashboard');
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  // Streak thật của người đang đăng nhập — trước đây topbar hardcode "3 ngày".
  const [streakCount, setStreakCount] = useState(0);

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
      <div className={`main-wrapper ${isSidebarOpen ? '' : 'is-collapsed'}`}>
        <Navbar
          user={user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          streakCount={streakCount}
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
            <DashboardView user={user} onSelectStation={(st) => setCurrentStation(st)} />
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

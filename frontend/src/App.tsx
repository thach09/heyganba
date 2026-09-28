import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './features/auth/AuthModal';
import { DashboardView } from './features/dashboard/DashboardView';
import { AdminView } from './features/admin/AdminView';
import { KanaStationView } from './features/kana/KanaStationView';
import { FlashcardView } from './features/flashcard/FlashcardView';
import { KanjiStationView } from './features/kanji/KanjiStationView';
import { GrammarView } from './features/grammar/GrammarView';
import { GrammarRulePage } from './features/grammar/GrammarRulePage';
import { ExamView } from './features/exam/ExamView';
import { getSavedUser, clearTokens, apiRequest } from './services/api';
import type { AuthResponse } from './services/api';

/** The breakpoint must match the `@media (max-width: 900px)` query in index.css. */
const MOBILE_BREAKPOINT_QUERY = '(max-width: 900px)';

/**
 * Track the mobile breakpoint with matchMedia - same source of truth as the CSS media query.
 *
 * The sidebar state used to be derived from `window.innerWidth` (an instant measurement that also
 * changes under pinch-zoom on iOS), so it could drift from CSS: JS assumed desktop and kept the
 * sidebar open while CSS still rendered it as a mobile overlay - the menu covered the whole screen
 * with no close button and no backdrop.
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
  const navigate = useNavigate();
  // Owned here so the sidebar dropdown can target Hiragana or Katakana directly.
  const [kanaScript, setKanaScript] = useState<'HIRAGANA' | 'KATAKANA'>('HIRAGANA');
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const isMobileLayout = useIsMobileLayout();
  /**
   * Manual user preference for the menu: `null` = not chosen yet -> follow the breakpoint default
   * (desktop starts open as a column, mobile closed). Derived directly during render, so rotating
   * the screen or resizing the window keeps it correct without a state-sync effect.
   */
  const [sidebarPreference, setSidebarPreference] = useState<boolean | null>(null);
  const sidebarDefaultOpen = !isMobileLayout;
  const isSidebarOpen = sidebarPreference ?? sidebarDefaultOpen;
  // The overlay only exists on mobile; on desktop the sidebar is a fixed column, so no backdrop is needed.
  const isSidebarOverlay = isMobileLayout && isSidebarOpen;
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  // Real streak of the signed-in user - the topbar used to hardcode "3 ngày".
  const [streakCount, setStreakCount] = useState(0);

  const closeSidebar = () => setSidebarPreference(false);
  const toggleSidebar = () => setSidebarPreference(!isSidebarOpen);

  // Lock background scrolling while the menu overlay is open on mobile
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

  // Esc closes the menu overlay (handy with an external keyboard or a resized desktop window).
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
    navigate('/');
  };

  /** Mobile: picking a nav item closes the drawer (desktop keeps it open as a column). */
  const handleNavigate = () => {
    if (isMobileLayout) {
      closeSidebar();
    }
  };

  return (
    <div className="relative z-[1] flex min-h-screen">
      {/* Menu backdrop: only rendered while the sidebar is open as a mobile overlay */}
      {isSidebarOverlay && (
        <div
          className="fixed inset-0 z-[95] bg-scrim"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Navigation Sidebar */}
      <Sidebar
        onNavigate={handleNavigate}
        onClose={closeSidebar}
        isOverlay={isMobileLayout}
        user={user}
        isOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
        onSelectKanaScript={setKanaScript}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        streakCount={streakCount}
      />

      {/* Mobile: drawer opener button (desktop uses the edge tab attached to the sidebar) */}
      {isMobileLayout && !isSidebarOpen && (
        <button
          type="button"
          onClick={toggleSidebar}
          title="Mở thanh điều hướng"
          aria-label="Mở thanh điều hướng"
          className="fixed left-2 top-2 z-40 inline-flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent text-fg-38 transition-colors hover:text-fg"
        >
          <Menu size={18} />
        </button>
      )}

      {/* Main Content Area */}
      <div
        className={`flex min-h-screen flex-1 flex-col transition-[margin] duration-150 ${
          isSidebarOpen ? 'ml-[216px] max-[900px]:ml-0' : 'ml-0'
        }`}
      >
        <main className="w-full flex-1 px-14 pb-14 pt-10 max-[900px]:px-5 max-[900px]:pb-10 max-[900px]:pt-16">
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

          <Routes>
            <Route path="/" element={<DashboardView user={user} />} />
            <Route
              path="/kana"
              element={<KanaStationView script={kanaScript} onScriptChange={setKanaScript} />}
            />
            <Route
              path="/vocabulary"
              element={<FlashcardView user={user} onRequireLogin={() => setIsAuthModalOpen(true)} />}
            />
            <Route
              path="/kanji"
              element={<KanjiStationView user={user} onRequireLogin={() => setIsAuthModalOpen(true)} />}
            />
            <Route
              path="/grammar"
              element={<GrammarView user={user} onRequireLogin={() => setIsAuthModalOpen(true)} />}
            />
            <Route
              path="/grammar/:ruleId"
              element={<GrammarRulePage user={user} onRequireLogin={() => setIsAuthModalOpen(true)} />}
            />
            <Route path="/exam" element={<ExamView user={user} onRequireLogin={() => setIsAuthModalOpen(true)} />} />
            <Route
              path="/admin"
              element={
                user?.role === 'ROLE_ADMIN' ? (
                  <AdminView />
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
                    <h3 style={{ color: '#EF4444', marginBottom: '8px' }}>Không có quyền truy cập (403 Forbidden)</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Vui lòng đăng nhập bằng tài khoản Administrator để truy cập khu vực này.</p>
                  </div>
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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

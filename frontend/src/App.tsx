import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './features/auth/AuthModal';
import { ChangePasswordModal } from './features/auth/ChangePasswordModal';
import { DashboardView } from './features/dashboard/DashboardView';
import { AdminView } from './features/admin/AdminView';
import { KanaStationView } from './features/kana/KanaStationView';
import { FlashcardView } from './features/flashcard/FlashcardView';
import { KanjiStationView } from './features/kanji/KanjiStationView';
import { GrammarView } from './features/grammar/GrammarView';
import { GrammarRulePage } from './features/grammar/GrammarRulePage';
import { ExamView } from './features/exam/ExamView';
import { DictionaryNotebookView } from './features/dictionary/DictionaryNotebookView';
import { getSavedUser, clearTokens, apiRequest, logoutApi } from './services/api';
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
  const [user, setUser] = useState<AuthResponse | null>(() => getSavedUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [accountNotice, setAccountNotice] = useState('');
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
    const expired = () => { setUser(null); setAccountNotice('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'); };
    window.addEventListener('heyganba:session-expired', expired);
    return () => window.removeEventListener('heyganba:session-expired', expired);
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

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore network/server errors during logout
    } finally {
      clearTokens();
      setUser(null);
      navigate('/');
    }
  };

  /** Mobile: picking a nav item closes the drawer (desktop keeps it open as a column). */
  const handleNavigate = () => {
    if (isMobileLayout) {
      closeSidebar();
    }
  };

  /** Open sign-in and close the mobile drawer; otherwise its higher z-index hides the modal. */
  const openAuthModal = () => {
    setIsAuthModalOpen(true);
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
        onOpenAuthModal={openAuthModal}
        onLogout={handleLogout}
        onChangePassword={() => { setChangingPassword(true); if (isMobileLayout) closeSidebar(); }}
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
        className={`flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-150 ${
          isSidebarOpen ? 'ml-[216px] max-[900px]:ml-0' : 'ml-0'
        }`}
      >
        <main className="w-full min-w-0 flex-1 px-14 pb-14 pt-10 max-[900px]:px-5 max-[900px]:pb-10 max-[900px]:pt-16">
          {backendHealthy === false && (
            <div className="mb-5 border-l-2 border-l-red bg-tint px-4 py-3 text-[12.5px] leading-[1.8] text-fg-60">
              Tạm thời không kết nối được với máy chủ. Vui lòng thử lại sau ít phút.
              {import.meta.env.DEV && (
                <span className="mt-1 block text-fg-38">
                  Dev: backend chưa chạy hoặc đang cold start — <code className="border border-rule px-1 text-[12px]">mvn
                  spring-boot:run</code> trong <code className="border border-rule px-1 text-[12px]">backend</code> hoặc
                  Docker Compose.
                </span>
              )}
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
              element={<FlashcardView user={user} onRequireLogin={openAuthModal} />}
            />
            <Route
              path="/dictionary"
              element={<DictionaryNotebookView user={user} onRequireLogin={openAuthModal} />}
            />
            <Route
              path="/kanji"
              element={<KanjiStationView user={user} onRequireLogin={openAuthModal} />}
            />
            <Route
              path="/grammar"
              element={<GrammarView user={user} onRequireLogin={openAuthModal} />}
            />
            <Route
              path="/grammar/:ruleId"
              element={<GrammarRulePage user={user} onRequireLogin={openAuthModal} />}
            />
            <Route path="/exam" element={<ExamView user={user} onRequireLogin={openAuthModal} />} />
            <Route
              path="/admin"
              element={
                user?.role === 'ROLE_ADMIN' ? (
                  <AdminView />
                ) : (
                  <div className="mx-auto flex w-full max-w-[520px] flex-col items-center pt-16 text-center">
                    <span className="font-serif text-[30px] font-light leading-none text-fg-38">403</span>
                    <h3 className="mt-4 text-[15px] font-semibold text-fg">Không có quyền truy cập</h3>
                    <p className="mt-2 text-[12.5px] leading-[1.9] text-fg-60">
                      Vui lòng đăng nhập bằng tài khoản Administrator để truy cập khu vực này.
                    </p>
                    <Link
                      to="/"
                      className="mt-6 text-[11.5px] text-fg-38 underline underline-offset-2 transition-colors hover:text-fg"
                    >
                      ← Về trang chủ
                    </Link>
                  </div>
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Auth Modal for Login / Register */}
      {changingPassword && user && <ChangePasswordModal onClose={() => setChangingPassword(false)} onChanged={() => {
        setChangingPassword(false); setUser(null); setAccountNotice('Đã đổi mật khẩu. Vui lòng đăng nhập lại bằng mật khẩu mới.'); setIsAuthModalOpen(true);
      }} />}
      {accountNotice && <div role="status" className="fixed bottom-4 right-4 z-[120] max-w-[calc(100%-32px)] bg-card p-4 text-[12.5px] text-fg">
        {accountNotice}<button type="button" aria-label="Đóng thông báo" onClick={() => setAccountNotice('')} className="ml-4 cursor-pointer">×</button>
      </div>}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setAccountNotice('');
        }}
      />
    </div>
  );
}

export default App;

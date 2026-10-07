import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import type { AuthResponse } from '../services/api';

interface SidebarProps {
  /** Mobile: close the drawer after choosing a nav item; desktop keeps it open. */
  onNavigate?: () => void;
  user: AuthResponse | null;
  isOpen?: boolean;
  /** Mobile: the sidebar floats above content (overlay) - needs a close button and auto-closes after picking a station. */
  isOverlay?: boolean;
  onClose?: () => void;
  /** Desktop: collapse / reopen the sidebar. */
  onToggleSidebar?: () => void;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  onChangePassword?: () => void;
  streakCount?: number;
}

const itemBase =
  'relative flex w-full items-baseline gap-2.5 border-0 bg-transparent p-0 text-left font-sans text-sm text-fg cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[3px] focus-visible:outline-fg-38';

const ToriiMark = () => (
  <svg
    width="26"
    height="24"
    viewBox="0 0 26 24"
    aria-hidden="true"
    className="shrink-0 fill-none stroke-fg-60"
    strokeWidth={1.1}
    strokeLinecap="round"
  >
    <path d="M2 5 H24 M4 9 H22 M6.5 9 V21 M19.5 9 V21 M13 9 V14" />
  </svg>
);

const ActiveTick = () => (
  <span aria-hidden="true" className="absolute -left-4 top-1 bottom-1 w-0.5 bg-rank" />
);

const iconButton =
  'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center border border-rule bg-transparent text-fg-60 transition-colors hover:border-rule-strong hover:text-fg';

interface NavButtonProps {
  k: string;
  v: string;
  active?: boolean;
  onClick: () => void;
  badge?: React.ReactNode;
  chev?: boolean;
  ariaHasPopup?: boolean;
  ariaExpanded?: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({
  k,
  v,
  active = false,
  onClick,
  badge,
  chev,
  ariaHasPopup,
  ariaExpanded,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={itemBase}
    aria-haspopup={ariaHasPopup}
    aria-expanded={ariaExpanded}
  >
    {active && <ActiveTick />}
    <span className={`font-serif text-base ${active ? 'font-semibold' : ''}`}>{k}</span>
    <span className={`text-[11px] ${active ? 'text-rank' : 'text-fg-38'}`}>{v}</span>
    {chev && (
      <span aria-hidden="true" className="ml-auto font-serif text-[13px] leading-none text-fg-38">
        ›
      </span>
    )}
    {badge}
  </button>
);

interface NavItemProps {
  to: string;
  k: string;
  v: string;
  onNavigate?: () => void;
  badge?: React.ReactNode;
}

/** Render a real URL link while keeping the previous navigation-item styling. */
const NavItem: React.FC<NavItemProps> = ({ to, k, v, onNavigate, badge }) => (
  <NavLink end={to === '/'} to={to} onClick={onNavigate} className={itemBase}>
    {({ isActive }) => (
      <>
        {isActive && <ActiveTick />}
        <span className={`font-serif text-base ${isActive ? 'font-semibold' : ''}`}>{k}</span>
        <span className={`text-[11px] ${isActive ? 'text-rank' : 'text-fg-38'}`}>{v}</span>
        {badge}
      </>
    )}
  </NavLink>
);

export const Sidebar: React.FC<SidebarProps> = ({
  onNavigate,
  user,
  isOpen = true,
  isOverlay = false,
  onClose,
  onToggleSidebar,
  onOpenAuthModal,
  onLogout,
  onChangePassword,
  streakCount = 0,
}) => {
  const isAdmin = user?.role === 'ROLE_ADMIN';
  const location = useLocation();
  const [charGroupOpen, setCharGroupOpen] = useState(false);
  const charGroupActive = location.pathname.startsWith('/kana') || location.pathname.startsWith('/kanji');
  const charGroupRef = useRef<HTMLDivElement | null>(null);

  /**
   * The flyout can be opened by click/tap and would otherwise stay stuck:
   * close it on outside click or Escape. Hover open/close is handled by pointer
   * events (see the group handlers) instead of CSS `@media (hover: hover)`, which
   * some environments (touch-primary devices, headless browsers) never match.
   */
  useEffect(() => {
    if (!charGroupOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (charGroupRef.current && !charGroupRef.current.contains(event.target as Node)) {
        setCharGroupOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCharGroupOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [charGroupOpen]);

  const closeFlyout = () => setCharGroupOpen(false);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 flex w-[216px] flex-col overflow-visible overscroll-contain bg-bg pb-8 pl-8 pr-4 pt-10 transition-transform duration-150 max-[900px]:overflow-y-auto max-[900px]:z-[100] max-[900px]:w-[min(280px,82vw)] max-[900px]:p-6 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-label="Thanh điều hướng chính"
      inert={isOverlay && !isOpen}
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <ToriiMark />
          <div>
            <div className="text-[15px] font-semibold tracking-[0.01em] text-fg">HeyGanba</div>
            <span className="block text-[10px] uppercase tracking-[0.22em] text-fg-38">日本語</span>
          </div>
        </div>
        {isOverlay && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng thanh điều hướng"
            title="Đóng thanh điều hướng"
            className={iconButton}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Edge tab attached to the sidebar: open shows ‹ on the right edge, closed slides to the screen edge and flips to › */}
      {!isOverlay && onToggleSidebar && (
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={isOpen ? 'Thu gọn thanh điều hướng' : 'Mở thanh điều hướng'}
          title={isOpen ? 'Thu gọn thanh điều hướng' : 'Mở thanh điều hướng'}
          className="absolute -right-5 top-12 z-40 inline-flex h-10 w-5 cursor-pointer items-center justify-center border border-l-0 border-rule bg-card text-fg-38 transition-colors hover:border-rule-strong hover:text-fg"
        >
          <ChevronLeft size={14} className={isOpen ? '' : 'rotate-180'} />
        </button>
      )}

      <nav className="mt-11 flex flex-1 flex-col gap-3.5">
        <NavItem to="/" k="今日" v="Hôm nay" onNavigate={onNavigate} />

        <div
          ref={charGroupRef}
          className="relative"
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') {
              setCharGroupOpen(true);
            }
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') {
              setCharGroupOpen(false);
            }
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setCharGroupOpen(false);
            }
          }}
        >
          <NavButton
            k="文字"
            v="Chữ viết"
            active={charGroupActive}
            chev
            ariaHasPopup
            ariaExpanded={charGroupOpen}
            onClick={() => setCharGroupOpen(true)}
          />
          <div
            role="menu"
            className={`absolute left-full top-[-10px] z-40 ml-3.5 min-w-[180px] bg-card py-2.5 transition-opacity max-[900px]:static max-[900px]:z-auto max-[900px]:ml-0 max-[900px]:mt-2 max-[900px]:min-w-0 max-[900px]:bg-transparent max-[900px]:pl-4 ${
              charGroupOpen ? 'visible opacity-100 max-[900px]:block' : 'invisible opacity-0 max-[900px]:hidden'
            }`}
          >
            <span aria-hidden="true" className="absolute -left-3.5 top-0 bottom-0 w-3.5 max-[900px]:hidden" />
            <Link
              to="/kana?script=hiragana"
              role="menuitem"
              onClick={(event) => {
                // Pointer click: drop focus so group-focus-within stops keeping the flyout open.
                // Keyboard activation (detail === 0) keeps focus for further tabbing.
                if (event.detail > 0) {
                  event.currentTarget.blur();
                }
                closeFlyout();
                onNavigate?.();
              }}
              className="flex w-full cursor-pointer items-baseline gap-2.5 border-0 bg-transparent px-4 py-2 text-left font-sans text-fg hover:bg-tint"
            >
              <span className="font-serif text-sm">ひらがな</span>
              <span className="text-[10.5px] text-fg-38">Hiragana</span>
            </Link>
            <Link
              to="/kana?script=katakana"
              role="menuitem"
              onClick={(event) => {
                if (event.detail > 0) {
                  event.currentTarget.blur();
                }
                closeFlyout();
                onNavigate?.();
              }}
              className="flex w-full cursor-pointer items-baseline gap-2.5 border-0 bg-transparent px-4 py-2 text-left font-sans text-fg hover:bg-tint"
            >
              <span className="font-serif text-sm">カタカナ</span>
              <span className="text-[10.5px] text-fg-38">Katakana</span>
            </Link>
            <Link
              to="/kanji"
              role="menuitem"
              onClick={(event) => {
                if (event.detail > 0) {
                  event.currentTarget.blur();
                }
                closeFlyout();
                onNavigate?.();
              }}
              className="flex w-full cursor-pointer items-baseline gap-2.5 border-0 bg-transparent px-4 py-2 text-left font-sans text-fg hover:bg-tint"
            >
              <span className="font-serif text-sm">漢字</span>
              <span className="text-[10.5px] text-fg-38">Kanji</span>
            </Link>
          </div>
        </div>

        <NavItem to="/vocabulary" k="単語" v="Từ vựng" onNavigate={onNavigate} />
        <NavItem to="/dictionary" k="辞書" v="Tra cứu & Sổ từ" onNavigate={onNavigate} />
        <NavItem to="/grammar" k="文法" v="Ngữ pháp" onNavigate={onNavigate} />
        <NavItem to="/exam" k="試験" v="Thi thử" onNavigate={onNavigate} />

        {isAdmin && (
          <NavItem
            to="/admin"
            k="管理"
            v="Quản trị"
            onNavigate={onNavigate}
            badge={<span className="ml-auto text-[10px] uppercase tracking-[0.12em] text-red">Admin</span>}
          />
        )}
      </nav>

      <div className="mt-auto flex flex-col gap-3 pt-6">
        {user ? (
          <>
            <div className="min-w-0">
              <div className="truncate text-xs text-fg-60" title={user.fullName}>
                {user.fullName}
              </div>
              <div className="text-[10.5px] text-fg-38">
                {user.role === 'ROLE_ADMIN' ? 'Quản trị viên' : 'Học viên'}
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 text-[11px] text-fg-38">
              <span className="font-serif">連続</span>
              <b className="font-serif text-sm font-semibold text-fg-60">{streakCount}</b>
              <span>ngày</span>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="cursor-pointer self-start border border-rule-strong bg-transparent px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-fg transition-colors hover:bg-fg hover:text-bg"
              >
                Đăng xuất
              </button>
            )}
            {onChangePassword && <button type="button" onClick={onChangePassword} className="min-h-11 cursor-pointer self-start bg-transparent text-[12.5px] text-fg-60 hover:text-fg">Đổi mật khẩu</button>}
          </>
        ) : (
          onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="cursor-pointer self-start border border-fg bg-fg px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-bg transition-opacity hover:opacity-85"
            >
              Đăng nhập
            </button>
          )
        )}
        <div className="text-[11px] leading-[1.8] text-fg-38">
          <span className="font-serif text-xs">練習は嘘をつかない</span>
          <br />
          Luyện tập không nói dối.
        </div>
      </div>
    </aside>
  );
};

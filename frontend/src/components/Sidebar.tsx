import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import type { AuthResponse } from '../lib/api/types';

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

/** Chinese Imperial Seal Stamp (朱砂玉印 - khắc chữ 漢) as the platform brand icon */
const ChineseSealStamp = () => (
  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border border-[#D97706]/70 bg-[#B91C1C]/20 shadow-[0_0_12px_rgba(185,28,28,0.35)]">
    <div className="absolute inset-[2px] rounded-[2px] border border-[#B91C1C]/70" />
    <span className="relative z-10 font-serif text-[15px] font-black leading-none text-[#EF4444]">
      漢
    </span>
  </div>
);

const ActiveTick = () => (
  <span aria-hidden="true" className="absolute -left-4 top-1 bottom-1 w-0.5 bg-[#D97706] shadow-[0_0_8px_rgba(217,119,6,0.7)]" />
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
  const charGroupActive = location.pathname.startsWith('/hanzi') || location.pathname.startsWith('/pinyin');
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
      className={`fixed inset-y-0 left-0 z-20 flex w-[216px] flex-col overflow-visible overscroll-contain bg-[#0a0b10]/95 border-r border-[#1e202b] backdrop-blur-md pb-8 pl-8 pr-4 pt-10 transition-transform duration-150 max-[900px]:overflow-y-auto max-[900px]:z-[100] max-[900px]:w-[min(280px,82vw)] max-[900px]:p-6 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-label="Thanh điều hướng chính"
      inert={isOverlay && !isOpen}
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <ChineseSealStamp />
          <div className="min-w-0">
            <div className="font-sans text-[16px] font-bold tracking-tight text-fg whitespace-nowrap">
              Học tiếng Trung
            </div>
            <span className="block font-sans text-[11px] font-medium tracking-[0.16em] text-[#E5A93C]">
              中文学习 · 华语
            </span>
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
            className={`absolute left-full top-[-10px] z-40 ml-3.5 min-w-[188px] bg-card py-2.5 transition-opacity max-[900px]:static max-[900px]:z-auto max-[900px]:ml-0 max-[900px]:mt-2 max-[900px]:min-w-0 max-[900px]:bg-transparent max-[900px]:pl-4 ${
              charGroupOpen ? 'visible opacity-100 max-[900px]:block' : 'invisible opacity-0 max-[900px]:hidden'
            }`}
          >
            <span aria-hidden="true" className="absolute -left-3.5 top-0 bottom-0 w-3.5 max-[900px]:hidden" />
            <Link
              to="/pinyin"
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
              <span className="font-serif text-sm">拼音</span>
              <span className="text-[10.5px] text-fg-38">Pinyin & Phát âm</span>
            </Link>
            <Link
              to="/hanzi"
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
              <span className="font-serif text-sm">汉字</span>
              <span className="text-[10.5px] text-fg-38">Chữ Hán (Tập viết)</span>
            </Link>
          </div>
        </div>

        <NavItem to="/vocabulary" k="词汇" v="Từ vựng" onNavigate={onNavigate} />
        <NavItem to="/dictionary" k="字典" v="Tra cứu & Sổ từ" onNavigate={onNavigate} />
        <NavItem to="/grammar" k="语法" v="Ngữ pháp" onNavigate={onNavigate} />
        <NavItem to="/exam" k="测试" v="Luyện tập" onNavigate={onNavigate} />

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
              <div className="truncate text-xs font-medium text-fg-60" title={user.fullName}>
                {user.fullName?.toLowerCase().includes('heyganba') ? 'Administrator' : user.fullName}
              </div>
              {user.fullName?.toLowerCase().includes('heyganba') ? null : (
                <div className="text-[10.5px] text-fg-38">
                  {user.role === 'ROLE_ADMIN' ? 'Administrator' : 'Học viên'}
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-1.5 text-[11px] text-fg-38">
              <span className="font-serif">连续</span>
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
          <span className="font-serif text-xs">学而时习之</span>
          <br />
          Học rồi thường xuyên ôn lại.
        </div>
      </div>
    </aside>
  );
};

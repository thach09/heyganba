import React from 'react';
import { Flame, LogIn, LogOut, Menu } from 'lucide-react';
import type { AuthResponse } from '../services/api';

interface NavbarProps {
  user: AuthResponse | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  streakCount?: number;
  activeStationTitle: string;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuthModal,
  onLogout,
  streakCount = 0,
  activeStationTitle,
  onToggleSidebar,
}) => {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="topbar-icon-btn"
            title="Ẩn/hiện thanh điều hướng"
            aria-label="Ẩn/hiện thanh điều hướng"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="page-title-group">
          <h1>{activeStationTitle}</h1>
        </div>
      </div>

      <div className="topbar-actions">
        {user && (
          <div className="streak-pill" title={`Chuỗi ngày học liên tục: ${streakCount} ngày`}>
            <Flame size={16} fill="currentColor" />
            <span className="streak-text-full">{streakCount} ngày streak</span>
            <span className="streak-text-compact">{streakCount} ngày</span>
          </div>
        )}

        {user ? (
          <div className="topbar-user-area">
            <div className="topbar-user-block">
              <div className="topbar-user-name" title={user.fullName}>{user.fullName}</div>
              <div className="topbar-user-role">
                {user.role === 'ROLE_ADMIN' ? 'Quản trị viên' : 'Học viên'}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="btn btn-secondary topbar-logout-btn"
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="btn btn-primary topbar-auth-btn"
          >
            <LogIn size={16} />
            <span>Đăng nhập / Đăng ký</span>
          </button>
        )}
      </div>
    </header>
  );
};

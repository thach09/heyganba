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
  streakCount = 1,
  activeStationTitle,
  onToggleSidebar,
}) => {
  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Menu size={22} />
          </button>
        )}
        <div className="page-title-group">
          <h1>{activeStationTitle}</h1>
        </div>
      </div>

      <div className="topbar-actions">
        {user && (
          <div className="streak-pill" title="Chuỗi ngày học liên tục">
            <Flame size={16} fill="currentColor" />
            <span>{streakCount} ngày streak</span>
          </div>
        )}

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{user.fullName}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {user.role === 'ROLE_ADMIN' ? 'Quản trị viên' : 'Học viên'}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="btn btn-secondary"
              style={{ padding: '8px 12px' }}
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="btn btn-primary"
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            <LogIn size={16} />
            <span>Đăng nhập / Đăng ký</span>
          </button>
        )}
      </div>
    </header>
  );
};

import React from 'react';
import { 
  Home, 
  Languages, 
  Layers, 
  BookOpen, 
  Sparkles, 
  GraduationCap, 
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';
import type { AuthResponse } from '../services/api';

export type StationKey = 
  | 'dashboard' 
  | 'kana' 
  | 'flashcard' 
  | 'kanji' 
  | 'grammar' 
  | 'exam' 
  | 'admin';

interface SidebarProps {
  currentStation: StationKey;
  onSelectStation: (station: StationKey) => void;
  user: AuthResponse | null;
  isOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentStation,
  onSelectStation,
  user,
  isOpen = true,
}) => {
  const isAdmin = user?.role === 'ROLE_ADMIN';

  const navItems = [
    { key: 'dashboard', label: 'Tổng quan', icon: Home },
    { key: 'kana', label: 'Bảng Kana', icon: Languages, badge: 'P1' },
    { key: 'flashcard', label: 'Flashcard SRS', icon: Layers, badge: 'P2' },
    { key: 'kanji', label: 'Bộ thủ & Kanji', icon: BookOpen, badge: 'P3' },
    { key: 'grammar', label: 'Trợ từ & Bẫy', icon: Sparkles, badge: 'P4' },
    { key: 'exam', label: 'Thi thử Dekiru', icon: GraduationCap, badge: 'P5' },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="brand">
        <div className="brand-icon">が</div>
        <div>
          <div className="brand-title">HeyGanba!</div>
          <div className="brand-tag">Dekiru Nihongo</div>
        </div>
      </div>

      <nav className="nav-menu">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentStation === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectStation(item.key as StationKey)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          );
        })}

        {/* Admin section: completely hidden from non-admin users */}
        {isAdmin && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ padding: '0 12px 8px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Quản trị hệ thống
            </div>
            <button
              onClick={() => onSelectStation('admin')}
              className={`nav-item ${currentStation === 'admin' ? 'active' : ''}`}
            >
              <ShieldCheck size={18} color="#EF4444" />
              <span>Khu vực Admin</span>
              <span className="nav-badge admin">Admin</span>
            </button>
          </div>
        )}
      </nav>

      {user && (
        <div className="user-snippet">
          <div className="avatar">
            <UserIcon size={18} />
          </div>
          <div className="user-info">
            <div className="user-name">{user.fullName}</div>
            <div className="user-role">{user.email}</div>
          </div>
        </div>
      )}
    </aside>
  );
};

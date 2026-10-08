import { Fragment, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import type { ReactNode } from 'react';
import { AuthContext } from './useAuth';
import { useNavigate } from 'react-router-dom';
import { clearTokens, getSavedUser, invalidateTabSession, saveUser } from '../lib/api/session';
import { logoutApi } from '../lib/api/client';
import type { AuthResponse } from '../lib/api/types';
import { AuthModal } from '../features/auth/AuthModal';
import { ChangePasswordModal } from '../features/auth/ChangePasswordModal';

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthResponse | null>(getSavedUser);
  const [authOpen, setAuthOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const reconcile = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== null && event.key !== 'heyganba_user') return;
      const profile = getSavedUser();
      if (event instanceof StorageEvent && profile?.userId !== user?.userId) invalidateTabSession();
      // Commit the visible identity and unmount private state before an HTTP retry can run.
      flushSync(() => {
        setUser(profile);
        if (profile?.userId !== user?.userId) setPasswordOpen(false);
      });
    };
    window.addEventListener('storage', reconcile);
    window.addEventListener('heyganba:session-changed', reconcile);
    return () => {
      window.removeEventListener('storage', reconcile);
      window.removeEventListener('heyganba:session-changed', reconcile);
    };
  }, [user?.userId]);

  useEffect(() => {
    const expire = () => {
      setUser(null);
      setPasswordOpen(false);
      setNotice('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    };
    window.addEventListener('heyganba:session-expired', expire);
    return () => window.removeEventListener('heyganba:session-expired', expire);
  }, []);

  const logout = async () => {
    if (!await logoutApi()) {
      setNotice('Chưa đăng xuất được khỏi máy chủ. Vui lòng kiểm tra mạng rồi thử lại.');
      return;
    }
    clearTokens();
    setUser(null);
    setPasswordOpen(false);
    setNotice('');
    navigate('/');
  };
  const updateProfile = (profile: AuthResponse) => { saveUser(profile); setUser(profile); };

  return <AuthContext.Provider value={{ user, requireLogin: () => setAuthOpen(true), logout,
    changePassword: () => setPasswordOpen(true), updateProfile }}>
    <Fragment key={user?.userId ?? 'guest'}>{children}</Fragment>
    {passwordOpen && user && <ChangePasswordModal onClose={() => setPasswordOpen(false)} onChanged={() => {
      setPasswordOpen(false); setUser(null);
      setNotice('Đã đổi mật khẩu. Vui lòng đăng nhập lại bằng mật khẩu mới.'); setAuthOpen(true);
    }} />}
    {notice && <div role="status" className="fixed bottom-4 right-4 z-[120] max-w-[calc(100%-32px)] bg-card p-4 text-[12.5px] text-fg">
      {notice}<button type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')} className="ml-4 cursor-pointer">×</button>
    </div>}
    {authOpen && <AuthModal isOpen onClose={() => setAuthOpen(false)} onAuthSuccess={profile => {
      updateProfile(profile); setNotice('');
    }} />}
  </AuthContext.Provider>;
}

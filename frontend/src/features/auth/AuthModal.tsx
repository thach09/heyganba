import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon } from 'lucide-react';
import { apiRequest, saveTokens, saveUser } from '../../services/api';
import type { AuthResponse } from '../../services/api';
import { SubmitButton } from '../../components/SubmitButton';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthResponse) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const body = isRegister 
        ? { email, password, fullName }
        : { email, password };

      const res = await apiRequest<AuthResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.success && res.data) {
        saveTokens(res.data.accessToken, res.data.refreshToken);
        saveUser(res.data);
        onAuthSuccess(res.data);
        onClose();
      } else {
        const errorMsg = res.message || (typeof res.error === 'string' ? res.error : 'Đăng nhập không thành công');
        setError(errorMsg);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const handlePrefillAdmin = () => {
    setIsRegister(false);
    setEmail('admin@heyganba.vn');
    setPassword('Admin@HeyGanba2026!');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>
            {isRegister ? 'Tạo tài khoản HeyGanba' : 'Đăng nhập vào HeyGanba'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '13px',
              color: '#f87171',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Họ và tên</label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <SubmitButton
              type="submit"
              loading={loading}
              fullWidth
              id="auth-submit-btn"
            >
              {isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
            </SubmitButton>
          </div>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {isRegister ? (
            <div>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
              >
                Đăng nhập ngay
              </button>
            </div>
          ) : (
            <div>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
              >
                Đăng ký miễn phí
              </button>
            </div>
          )}
        </div>

        {/* Nút nạp sẵn tài khoản admin chỉ hiện ở môi trường dev — không đưa credential mẫu lên production. */}
        {import.meta.env.DEV && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={handlePrefillAdmin}
              style={{
                background: 'none',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                fontSize: '11px',
                padding: '6px 12px',
                cursor: 'pointer',
              }}
            >
              Nạp sẵn tài khoản Admin thử nghiệm
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

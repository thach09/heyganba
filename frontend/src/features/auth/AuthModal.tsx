import React, { useState } from 'react';
import { Lock, Mail, User as UserIcon, Users } from 'lucide-react';
import { apiRequest, saveTokens, saveUser } from '../../services/api';
import type { AuthResponse } from '../../services/api';
import { SubmitButton } from '../../components/SubmitButton';
import { Modal } from '../../components/Modal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthResponse) => void;
}

const fieldLabel = 'block text-[11.5px] text-fg-38 mb-1.5';
const inputClass =
  'h-10 w-full border border-rule-strong bg-bg px-4 text-[12.5px] text-fg outline-none transition-colors placeholder:text-fg-38 focus:border-fg';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [requireTwoFactor, setRequireTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
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
        ? { email, password, fullName, classCode: classCode.trim() || null }
        : { email, password, twoFactorCode: twoFactorCode.trim() || undefined };

      const res = await apiRequest<AuthResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.success && res.data) {
        if (res.data.twoFactorRequired) {
          setRequireTwoFactor(true);
          setError(null);
          return;
        }
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

  return (
    <Modal compact title={isRegister ? 'Tạo tài khoản HeyGanba' : 'Đăng nhập vào HeyGanba'} onClose={onClose}>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[16px] font-semibold text-fg">
            {isRegister ? 'Tạo tài khoản HeyGanba' : 'Đăng nhập vào HeyGanba'}
          </h2>
        </div>

        {error && (
          <div
            id="auth-error"
            className="mt-4 border-l-2 border-l-red bg-tint px-3 py-2 text-[12.5px] leading-[1.7] text-red"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="mt-5">
                <label htmlFor="auth-full-name" className={fieldLabel}>
                  Họ và tên
                </label>
                <div className="relative">
                  <UserIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-38" />
                  <input
                    id="auth-full-name"
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="auth-class-code" className={fieldLabel}>
                  Mã lớp (không bắt buộc)
                </label>
                <div className="relative">
                  <Users size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-38" />
                  <input
                    id="auth-class-code"
                    type="text"
                    maxLength={50}
                    placeholder="VD: JPD113-A"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    title="Dùng để xếp hạng theo lớp; có thể bổ sung sau trong Trạm Thi Thử."
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>
            </>
          )}

          <div className="mt-4">
            <label htmlFor="auth-email" className={fieldLabel}>
              Email
            </label>
            <div className="relative">
              <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-38" />
              <input
                id="auth-email"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="auth-password" className={fieldLabel}>
              Mật khẩu
            </label>
            <div className="relative">
              <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-38" />
              <input
                id="auth-password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          {requireTwoFactor && (
            <div className="mt-4 border-l-2 border-l-rank bg-tint p-3.5 animate-toast-in">
              <label htmlFor="auth-2fa-code" className="block text-[11.5px] font-semibold text-fg">
                Mã xác thực 2FA (6 chữ số)
              </label>
              <p className="mt-1 text-[11px] text-fg-60">
                Tài khoản của bạn đã bật 2FA. Vui lòng mở ứng dụng Google Authenticator và nhập mã 6 số.
              </p>
              <input
                id="auth-2fa-code"
                type="text"
                maxLength={6}
                autoFocus
                required
                placeholder="123456"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                className={`${inputClass} mt-2 font-mono text-[16px] text-center tracking-widest`}
              />
            </div>
          )}

          <div className="mt-7">
            <SubmitButton type="submit" loading={loading} fullWidth id="auth-submit-btn">
              {isRegister ? 'Tạo tài khoản' : requireTwoFactor ? 'Xác nhận mã 2FA & Đăng nhập' : 'Đăng nhập'}
            </SubmitButton>
          </div>
        </form>

        <div className="mt-6 text-center text-[12.5px] text-fg-60">
          {isRegister ? (
            <div>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                }}
                className="cursor-pointer border-0 bg-transparent p-0 text-[12.5px] font-semibold text-fg underline underline-offset-2 transition-colors hover:text-fg-60"
              >
                Đăng nhập ngay
              </button>
            </div>
          ) : (
            <div>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                }}
                className="cursor-pointer border-0 bg-transparent p-0 text-[12.5px] font-semibold text-fg underline underline-offset-2 transition-colors hover:text-fg-60"
              >
                Đăng ký miễn phí
              </button>
            </div>
          )}
        </div>

    </Modal>
  );
};

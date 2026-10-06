import { useRef, useState } from 'react';
import { apiRequest, clearTokens, getRefreshToken } from '../../services/api';
import { SubmitButton } from '../../components/SubmitButton';
import { Modal } from '../../components/Modal';

export function ChangePasswordModal({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy.current) return;
    if (newPassword !== confirmation) { setError('Mật khẩu xác nhận chưa khớp.'); return; }
    busy.current = true; setSaving(true); setError('');
    const response = await apiRequest('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword, refreshToken: getRefreshToken() }) });
    busy.current = false; setSaving(false);
    if (!response.success) { setError(response.message || 'Chưa đổi được mật khẩu. Vui lòng thử lại.'); return; }
    clearTokens(); onChanged();
  };
  return <Modal title="Đổi mật khẩu" onClose={onClose}>
    <h2 className="text-[17px] font-semibold text-fg">Đổi mật khẩu</h2>
    <p className="mt-3 text-[12.5px] leading-[1.8] text-fg-60">Sau khi đổi, bạn sẽ đăng xuất trên tất cả thiết bị. Đăng nhập lại bằng mật khẩu mới.</p>
    <form className="mt-5 flex flex-col gap-4" onSubmit={submit}>
      {([
        ['Mật khẩu hiện tại', currentPassword, setCurrentPassword, 'current-password'],
        ['Mật khẩu mới', newPassword, setNewPassword, 'new-password'],
        ['Nhập lại mật khẩu mới', confirmation, setConfirmation, 'new-password'],
      ] as const).map(([label, value, setter, autocomplete], i) => <label key={label} className="text-[12.5px] text-fg-60">
        {label}<input type="password" value={value} onChange={e => setter(e.target.value)} autoComplete={autocomplete} required minLength={i ? 6 : 1} maxLength={50}
          className="mt-2 w-full border border-rule-strong bg-bg px-3 py-2.5 text-[13.5px] text-fg" />
      </label>)}
      {error && <p role="alert" className="text-[12.5px] text-red">{error}</p>}
      <SubmitButton type="submit" loading={saving}>Lưu mật khẩu mới</SubmitButton>
    </form>
  </Modal>;
}

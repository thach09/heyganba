import React, { useEffect, useState } from 'react';
import { ShieldAlert, Users, Server, CheckCircle2, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../services/api';
import type { UserProfileResponse } from '../../services/api';
import { SubmitButton } from '../../components/SubmitButton';

interface AdminStatusData {
  authorizedAdmin: string;
  role: string;
  totalUsers: number;
}

export const AdminView: React.FC = () => {
  const [statusData, setStatusData] = useState<AdminStatusData | null>(null);
  const [users, setUsers] = useState<UserProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, usersRes] = await Promise.all([
        apiRequest<AdminStatusData>('/admin/status'),
        apiRequest<UserProfileResponse[]>('/admin/users'),
      ]);

      if (statusRes.success && statusRes.data) {
        setStatusData(statusRes.data);
      } else {
        setError(statusRes.message || 'Không thể truy cập API Quản trị');
      }

      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải thông tin quản trị');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={26} />
            <span>Khu vực Quản trị Hệ thống (Admin Portal)</span>
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Trang chỉ hiển thị cho tài khoản có phân quyền <code style={{ color: '#f87171' }}>ROLE_ADMIN</code>. Mọi hành động đều được lưu audit log.
          </p>
        </div>
        <SubmitButton
          onClick={fetchAdminData}
          loading={loading}
          variant="secondary"
        >
          <RefreshCw size={14} />
          <span>Làm mới dữ liệu</span>
        </SubmitButton>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', padding: '16px', color: '#f87171', marginBottom: '24px' }}>
          <strong>Lỗi xác thực quyền:</strong> {error}
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
            <Server size={18} color="#3B82F6" />
            <span>Trạng thái Backend API</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} />
            <span>Active (/api/v1)</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Spring Boot 3.4.3 • Java 21 LTS
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
            <Users size={18} color="#10B981" />
            <span>Tổng người dùng</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>
            {statusData?.totalUsers ?? users.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Đã đăng ký trong hệ thống
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
            <ShieldAlert size={18} color="#EF4444" />
            <span>Admin đang xác thực</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', wordBreak: 'break-all' }}>
            {statusData?.authorizedAdmin || 'Chưa xác thực'}
          </div>
          <div style={{ fontSize: '12px', color: '#f87171', fontWeight: 600, marginTop: '6px' }}>
            Quyền: ROLE_ADMIN
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Danh sách người dùng đã tạo</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>ID</th>
                <th style={{ padding: '12px 16px' }}>Họ và tên</th>
                <th style={{ padding: '12px 16px' }}>Email</th>
                <th style={{ padding: '12px 16px' }}>Vai trò</th>
                <th style={{ padding: '12px 16px' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>#{u.id}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{u.fullName}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: u.role === 'ROLE_ADMIN' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      color: u.role === 'ROLE_ADMIN' ? '#f87171' : '#60a5fa',
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: u.isActive ? '#10B981' : '#EF4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: u.isActive ? '#10B981' : '#EF4444' }}></span>
                      {u.isActive ? 'Hoạt động' : 'Bị khoá'}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chưa có danh sách người dùng hoặc đang tải...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

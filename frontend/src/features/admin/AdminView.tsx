import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../services/api';
import type { UserProfileResponse } from '../../services/api';
import { SubmitButton } from '../../components/SubmitButton';

interface AdminStatusData {
  authorizedAdmin: string;
  role: string;
  totalUsers: number;
}

const labelClass = 'text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-38';
const thClass = 'border-b border-rule pb-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fg-38';
const tdClass = 'border-b border-rule py-2.5 text-fg-60';

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
    <div className="mx-auto flex w-full max-w-[1100px] flex-col">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className={labelClass}>
            Admin <span className="ml-2 font-serif text-[12.5px] font-normal normal-case tracking-[0.06em]">管理</span>
          </div>
          <h2 className="mt-3 flex min-w-0 flex-wrap items-center gap-2.5 text-[15px] font-semibold text-fg">
            <ShieldAlert size={17} className="text-fg-60" />
            <span>Khu vực Quản trị Hệ thống</span>
          </h2>
          <p className="mt-1.5 max-w-full break-words text-[11.5px] leading-[1.8] text-fg-38">
            Trang chỉ hiển thị cho tài khoản có phân quyền <span className="text-fg-60">ROLE_ADMIN</span>. Mọi hành động
            đều được lưu audit log.
          </p>
        </div>
        <SubmitButton onClick={fetchAdminData} loading={loading} variant="secondary">
          <RefreshCw size={13} />
          <span>Làm mới dữ liệu</span>
        </SubmitButton>
      </div>

      {error && (
        <div className="mt-6 border-l-2 border-l-red bg-tint px-4 py-3 text-[12.5px] leading-[1.7] text-red">
          <strong className="font-semibold">Lỗi xác thực quyền:</strong> {error}
        </div>
      )}

      {/* Số liệu hệ thống */}
      <div className="mt-8 grid gap-3 min-[900px]:grid-cols-3">
        <div className="bg-card px-5 py-4">
          <div className={labelClass}>Trạng thái Backend API</div>
          <div className="mt-2 flex items-center gap-2 font-serif text-[18px] leading-none text-fg">
            <CheckCircle2 size={16} className="text-fg-60" />
            <span>Active (/api/v1)</span>
          </div>
          <div className="mt-2 text-[11.5px] text-fg-38">Spring Boot 3.4.3 • Java 21 LTS</div>
        </div>

        <div className="bg-card px-5 py-4">
          <div className={labelClass}>Tổng người dùng</div>
          <div className="mt-2 font-serif text-[22px] leading-none text-fg">
            {statusData?.totalUsers ?? users.length}
          </div>
          <div className="mt-2 text-[11.5px] text-fg-38">Đã đăng ký trong hệ thống</div>
        </div>

        <div className="bg-card px-5 py-4">
          <div className={labelClass}>Admin đang xác thực</div>
          <div className="mt-2 break-all text-[13px] font-semibold text-fg">
            {statusData?.authorizedAdmin || 'Chưa xác thực'}
          </div>
          <div className="mt-2 text-[11.5px] text-red">Quyền: ROLE_ADMIN</div>
        </div>
      </div>

      {/* Danh sách người dùng */}
      <section className="mt-10 border-t border-rule pt-6">
        <h3 className="text-[13px] font-semibold text-fg">Danh sách người dùng đã tạo</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                <th className={thClass}>ID</th>
                <th className={thClass}>Họ và tên</th>
                <th className={thClass}>Email</th>
                <th className={thClass}>Vai trò</th>
                <th className={thClass}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className={`${tdClass} tabular-nums`}>#{u.id}</td>
                  <td className={`${tdClass} font-semibold text-fg`}>{u.fullName}</td>
                  <td className={tdClass}>{u.email}</td>
                  <td className={tdClass}>
                    {/* Admin gets solid ink; users get an outline, matching the exam rank badges. */}
                    <span
                      className={`inline-flex border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] ${
                        u.role === 'ROLE_ADMIN' ? 'border-fg bg-fg text-bg' : 'border-rule text-fg-60'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <span className={`flex items-center gap-2 ${u.isActive ? 'text-fg-60' : 'text-red'}`}>
                      <span className={`h-[6px] w-[6px] ${u.isActive ? 'bg-fg-60' : 'bg-red'}`} aria-hidden="true" />
                      {u.isActive ? 'Hoạt động' : 'Bị khoá'}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[12.5px] text-fg-38">
                    Chưa có danh sách người dùng hoặc đang tải...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

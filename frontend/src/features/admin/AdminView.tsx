import { useRequestScope } from '../../lib/hooks/useRequestScope';
import { adminApi } from './api';
import type { AdminStatusData, AuditLogItem, TwoFactorStatusResponse, VocabularyAdminItem, HanziAdminItem, ExerciseAdminItem } from './types';
import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  BookA,
  Languages,
  HelpCircle,
  Plus,
  Trash2,
  Edit2,
  History,
} from 'lucide-react';
import type { UserProfileResponse } from '../../lib/api/types';
import { SubmitButton } from '../../components/SubmitButton';
import { ReviewQueuePanel } from './ReviewQueuePanel';

const labelClass = 'text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-38';
const thClass = 'border-b border-rule pb-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fg-38';
const tdClass = 'border-b border-rule py-2.5 text-fg-60 text-[12.5px]';

export const AdminView: React.FC = () => {
  const { run, isActive } = useRequestScope();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | '2FA' | 'VOCAB' | 'HANZI' | 'EXERCISES' | 'REVIEW'>('OVERVIEW');

  // Overview state
  const [statusData, setStatusData] = useState<AdminStatusData | null>(null);
  const [users, setUsers] = useState<UserProfileResponse[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 2FA State
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatusResponse | null>(null);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorUrl, setTwoFactorUrl] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isSubmitting2FA, setIsSubmitting2FA] = useState(false);

  // Vocabulary CRUD state
  const [vocabList, setVocabList] = useState<VocabularyAdminItem[]>([]);
  const [vocabSearch, setVocabSearch] = useState('');
  const [vocabModalOpen, setVocabModalOpen] = useState(false);
  const [editingVocabId, setEditingVocabId] = useState<number | null>(null);
  const [vocabForm, setVocabForm] = useState({
    word: '',
    reading: '',
    meaning: '',
    sinoVietnamese: '',
    exampleSentence: '',
    exampleReading: '',
    exampleMeaning: '',
  });

  // Hanzi CRUD state
  const [hanziList, setHanziList] = useState<HanziAdminItem[]>([]);
  const [hanziSearch, setHanziSearch] = useState('');
  const [hanziModalOpen, setHanziModalOpen] = useState(false);
  const [editingHanziId, setEditingHanziId] = useState<number | null>(null);
  const [hanziForm, setHanziForm] = useState({
    character: '',
    strokeCount: 4,
    pinyin: '',
    traditional: '',
    sinoVietnamese: '',
    meaning: '',
    mnemonic: '',
  });

  // Exercise CRUD state
  const [exerciseList, setExerciseList] = useState<ExerciseAdminItem[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [exerciseForm, setExerciseForm] = useState({
    grammarRuleId: 1,
    questionText: '',
    optionsJson: '["A","B","C","D"]',
    correctAnswer: 'A',
    explanation: '',
    isCommonMistake: false,
    mistakeCategory: '',
  });

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (msg: string) => {
    setToast(msg);
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await run('AdminView-load', signal => Promise.all([
        adminApi.status({ signal }),
        adminApi.users({ signal }),
        adminApi.logs({ signal }),
      ]));
    if (!loaded) return;
    const [statusRes, usersRes, logsRes] = loaded;

      if (statusRes.success && statusRes.data) setStatusData(statusRes.data);
      else setError(statusRes.message || 'Không thể truy cập API Quản trị');

      if (usersRes.success && usersRes.data) setUsers(usersRes.data);
      if (logsRes.success && logsRes.data) setAuditLogs(logsRes.data);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải thông tin quản trị');
    } finally {
      if (isActive()) setLoading(false);
    }
  };

  const fetch2FAStatus = async () => {
    const res = await run('adminApi.twoFactorStatus', signal => adminApi.twoFactorStatus({ signal }));
    if (!res) return;
    if (res.success && res.data) {
      setTwoFactorStatus(res.data);
    }
  };

  const handleSetup2FA = async () => {
    setIsSubmitting2FA(true);
    try {
      const res = await run('adminApi.twoFactorSetup', signal => adminApi.twoFactorSetup({ signal, method: 'POST' }));
    if (!res) return;
      if (res.success && res.data) {
        setTwoFactorSecret(res.data.secret);
        setTwoFactorUrl(res.data.otpAuthUrl);
        showToast('Đã khởi tạo Secret 2FA mới. Hãy quét hoặc nhập vào Google Authenticator');
      }
    } finally {
      if (isActive()) setIsSubmitting2FA(false);
    }
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) return;
    setIsSubmitting2FA(true);
    try {
      const res = await run('adminApi.twoFactorEnable', signal => adminApi.twoFactorEnable({ signal,
        method: 'POST',
        body: JSON.stringify({ code: twoFactorCode.trim() }),
      }));
    if (!res) return;
      if (res.success) {
        showToast('Kích hoạt 2FA thành công! Tài khoản admin của bạn đã được bảo vệ.');
        setTwoFactorCode('');
        setTwoFactorSecret(null);
        setTwoFactorUrl(null);
        fetch2FAStatus();
      } else {
        showToast(res.message || 'Mã xác thực không chính xác');
      }
    } finally {
      if (isActive()) setIsSubmitting2FA(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) return;
    setIsSubmitting2FA(true);
    try {
      const res = await run('adminApi.twoFactorDisable', signal => adminApi.twoFactorDisable({ signal,
        method: 'POST',
        body: JSON.stringify({ code: twoFactorCode.trim() }),
      }));
    if (!res) return;
      if (res.success) {
        showToast('Đã huỷ kích hoạt 2FA');
        setTwoFactorCode('');
        fetch2FAStatus();
      } else {
        showToast(res.message || 'Mã xác thực không chính xác');
      }
    } finally {
      if (isActive()) setIsSubmitting2FA(false);
    }
  };

  // Vocabulary handlers
  const fetchVocabulary = async () => {
    const res = await run('adminApi.vocabulary', signal => adminApi.vocabulary(vocabSearch, { signal }));
    if (!res) return;
    if (res.success && res.data) setVocabList(res.data);
  };

  const handleSaveVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingVocabId ? 'PUT' : 'POST';

    const res = await run('adminApi.saveContent', signal => adminApi.saveContent('vocabulary', editingVocabId, { signal,
      method,
      body: JSON.stringify(vocabForm),
    }));
    if (!res) return;

    if (res.success) {
      showToast(editingVocabId ? 'Cập nhật từ vựng thành công' : 'Thêm từ vựng mới thành công');
      setVocabModalOpen(false);
      setEditingVocabId(null);
      fetchVocabulary();
      fetchAdminData();
    } else {
      showToast(res.message || 'Lỗi lưu từ vựng');
    }
  };

  const handleDeleteVocab = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn lưu trữ (archive) từ vựng này?')) return;
    const res = await run('adminApi.deleteContent', signal => adminApi.deleteContent('vocabulary', id, { signal, method: 'DELETE' }));
    if (!res) return;
    if (res.success) {
      showToast('Đã lưu trữ từ vựng (ARCHIVED)');
      fetchVocabulary();
      fetchAdminData();
    } else {
      showToast(res.message || 'Lỗi khi lưu trữ từ vựng');
    }
  };

  // Hanzi handlers
  const fetchHanzi = async () => {
    const res = await run('adminApi.hanzi', signal => adminApi.hanzi(hanziSearch, { signal }));
    if (!res) return;
    if (res.success && res.data) setHanziList(res.data);
  };

  const handleSaveHanzi = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingHanziId ? 'PUT' : 'POST';

    const res = await run('adminApi.saveContent', signal => adminApi.saveContent('hanzi', editingHanziId, { signal,
      method,
      body: JSON.stringify(hanziForm),
    }));
    if (!res) return;

    if (res.success) {
      showToast(editingHanziId ? 'Cập nhật Hanzi thành công' : 'Thêm Hanzi mới thành công');
      setHanziModalOpen(false);
      setEditingHanziId(null);
      fetchHanzi();
      fetchAdminData();
    } else {
      showToast(res.message || 'Lỗi lưu Hanzi');
    }
  };

  const handleDeleteHanzi = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xoá Hanzi này?')) return;
    const res = await run('adminApi.deleteContent', signal => adminApi.deleteContent('hanzi', id, { signal, method: 'DELETE' }));
    if (!res) return;
    if (res.success) {
      showToast('Đã xoá Hanzi');
      fetchHanzi();
      fetchAdminData();
    }
  };

  // Exercise handlers
  const fetchExercises = async () => {
    const res = await run('adminApi.exercises', signal => adminApi.exercises(exerciseSearch, { signal }));
    if (!res) return;
    if (res.success && res.data) setExerciseList(res.data);
  };

  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingExerciseId ? 'PUT' : 'POST';

    const res = await run('adminApi.saveContent', signal => adminApi.saveContent('exercises', editingExerciseId, { signal,
      method,
      body: JSON.stringify(exerciseForm),
    }));
    if (!res) return;

    if (res.success) {
      showToast(editingExerciseId ? 'Cập nhật bài tập thành công' : 'Thêm bài tập mới thành công');
      setExerciseModalOpen(false);
      setEditingExerciseId(null);
      fetchExercises();
      fetchAdminData();
    } else {
      showToast(res.message || 'Lỗi lưu bài tập');
    }
  };

  const handleDeleteExercise = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xoá bài tập này?')) return;
    const res = await run('adminApi.deleteContent', signal => adminApi.deleteContent('exercises', id, { signal, method: 'DELETE' }));
    if (!res) return;
    if (res.success) {
      showToast('Đã xoá bài tập');
      fetchExercises();
      fetchAdminData();
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    if (activeTab === '2FA') fetch2FAStatus();
    // eslint-disable-next-line react/set-state-in-effect
    if (activeTab === 'VOCAB') fetchVocabulary();
    // eslint-disable-next-line react/set-state-in-effect
    if (activeTab === 'HANZI') fetchHanzi();
    // eslint-disable-next-line react/set-state-in-effect
    if (activeTab === 'EXERCISES') fetchExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className={labelClass}>
            Khu vực Quản trị{' '}
            <span className="ml-2 font-serif text-[12.5px] font-normal normal-case tracking-[0.06em]">管理中心</span>
          </div>
          <h2 className="mt-3 flex items-center gap-2.5 text-[17px] font-semibold text-fg">
            <ShieldAlert size={18} className="text-fg-60" />
            <span>Khu vực Quản trị Hệ thống</span>
          </h2>
          <p className="mt-1.5 text-[12px] leading-[1.8] text-fg-38">
            Quản trị người dùng, audit log, cài đặt xác thực hai yếu tố (2FA) và CRUD trực tiếp ngân hàng câu hỏi, từ
            vựng, Hanzi qua giao diện.
          </p>
        </div>

        <div className="flex gap-2">
          <SubmitButton onClick={fetchAdminData} loading={loading} variant="secondary">
            <RefreshCw size={13} />
            <span>Làm mới</span>
          </SubmitButton>
        </div>
      </div>

      {toast && (
        <div className="mt-4 border-l-2 border-l-rank bg-tint px-4 py-2.5 text-[12.5px] text-fg animate-toast-in">
          {toast}
        </div>
      )}

      {error && (
        <div className="mt-6 border-l-2 border-l-red bg-tint px-4 py-3 text-[12.5px] leading-[1.7] text-red">
          <strong className="font-semibold">Lỗi xác thực quyền:</strong> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-1 border-b border-rule pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW')}
          className={`cursor-pointer border-b-2 px-4 py-2 text-[12.5px] font-medium transition-colors ${
            activeTab === 'OVERVIEW' ? 'border-fg font-semibold text-fg' : 'border-transparent text-fg-60 hover:text-fg'
          }`}
        >
          Người dùng & Audit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('2FA')}
          className={`flex items-center gap-1.5 cursor-pointer border-b-2 px-4 py-2 text-[12.5px] font-medium transition-colors ${
            activeTab === '2FA' ? 'border-fg font-semibold text-fg' : 'border-transparent text-fg-60 hover:text-fg'
          }`}
        >
          <KeyRound size={13} />
          <span>Bảo mật 2FA</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('VOCAB')}
          className={`flex items-center gap-1.5 cursor-pointer border-b-2 px-4 py-2 text-[12.5px] font-medium transition-colors ${
            activeTab === 'VOCAB' ? 'border-fg font-semibold text-fg' : 'border-transparent text-fg-60 hover:text-fg'
          }`}
        >
          <BookA size={13} />
          <span>Quản lý Từ vựng</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('HANZI')}
          className={`flex items-center gap-1.5 cursor-pointer border-b-2 px-4 py-2 text-[12.5px] font-medium transition-colors ${
            activeTab === 'HANZI' ? 'border-fg font-semibold text-fg' : 'border-transparent text-fg-60 hover:text-fg'
          }`}
        >
          <Languages size={13} />
          <span>Quản lý Hanzi</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('REVIEW')}
          className={`flex items-center gap-1.5 cursor-pointer border-b-2 px-4 py-2 text-[12.5px] font-medium transition-colors ${
            activeTab === 'REVIEW'
              ? 'border-fg font-semibold text-fg'
              : 'border-transparent text-fg-60 hover:text-fg'
          }`}
        >
          <ShieldAlert size={13} />
          <span>Thẩm định Học thuật (Cần kiểm)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('EXERCISES')}
          className={`flex items-center gap-1.5 cursor-pointer border-b-2 px-4 py-2 text-[12.5px] font-medium transition-colors ${
            activeTab === 'EXERCISES'
              ? 'border-fg font-semibold text-fg'
              : 'border-transparent text-fg-60 hover:text-fg'
          }`}
        >
          <HelpCircle size={13} />
          <span>Quản lý Bài tập</span>
        </button>
      </div>

      {/* TAB: CẦN KIỂM (hàng đợi duyệt nội dung do AI soạn) */}
      {activeTab === 'REVIEW' && <ReviewQueuePanel />}

      {/* TAB: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="mt-6 flex flex-col gap-10">
          <div className="grid gap-3 min-[900px]:grid-cols-3">
            <div className="bg-card px-5 py-4">
              <div className={labelClass}>Phiên quản trị</div>
              <div className="mt-2 flex items-center gap-2 font-serif text-[18px] text-fg">
                <CheckCircle2 size={16} className="text-fg-60" />
                <span>Đã xác thực</span>
              </div>
              <div className="mt-2 text-[11.5px] text-fg-38">Quản lý nội dung và tài khoản</div>
            </div>

            <div className="bg-card px-5 py-4">
              <div className={labelClass}>Tổng người dùng</div>
              <div className="mt-2 font-serif text-[22px] text-fg">{statusData?.totalUsers ?? users.length}</div>
              <div className="mt-2 text-[11.5px] text-fg-38">Tài khoản đã đăng ký</div>
            </div>

            <div className="bg-card px-5 py-4">
              <div className={labelClass}>Admin xác thực</div>
              <div className="mt-2 break-all text-[13px] font-semibold text-fg">
                {statusData?.authorizedAdmin || 'Chưa xác thực'}
              </div>
              <div className="mt-2 text-[11.5px] text-red">Phân quyền: ROLE_ADMIN</div>
            </div>
          </div>

          {/* Danh sách người dùng */}
          <div>
            <h3 className="text-[13px] font-semibold text-fg">Danh sách người dùng</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-[12.5px]">
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
                          <span
                            className={`h-[6px] w-[6px] ${u.isActive ? 'bg-fg-60' : 'bg-red'}`}
                            aria-hidden="true"
                          />
                          {u.isActive ? 'Hoạt động' : 'Bị khoá'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs */}
          <div className="border-t border-rule pt-8">
            <div className="flex items-center gap-2">
              <History size={16} className="text-fg-38" />
              <h3 className="text-[13px] font-semibold text-fg">Nhật ký Audit Log (50 hoạt động gần nhất)</h3>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-[12.5px]">
                <thead>
                  <tr>
                    <th className={thClass}>Thời gian</th>
                    <th className={thClass}>Admin thực hiện</th>
                    <th className={thClass}>Bảng dữ liệu</th>
                    <th className={thClass}>ID bản ghi</th>
                    <th className={thClass}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className={`${tdClass} text-[11px] text-fg-38`}>
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className={`${tdClass} font-medium text-fg`}>{log.adminEmail || 'Hệ thống'}</td>
                      <td className={`${tdClass} font-sans text-[11.5px]`}>{log.tableName}</td>
                      <td className={`${tdClass} tabular-nums`}>#{log.recordId ?? '—'}</td>
                      <td className={tdClass}>
                        <span
                          className={`inline-flex px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
                            log.action === 'CREATE'
                              ? 'bg-rank/20 text-rank'
                              : log.action === 'UPDATE'
                              ? 'bg-fg-38/20 text-fg'
                              : 'bg-red/20 text-red'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-fg-38">
                        Chưa có lịch sử audit log
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: 2FA */}
      {activeTab === '2FA' && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="border border-rule bg-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-[17px] font-semibold text-fg">
                  Xác thực hai yếu tố (2FA — RFC 6238 TOTP)
                </h3>
                <p className="mt-1 text-[12.5px] text-fg-38">
                  Bảo vệ tài khoản quản trị viên trước các cuộc tấn công đánh cắp mật khẩu. Tương thích với Google
                  Authenticator, Microsoft Authenticator, 1Password...
                </p>
              </div>
              <span
                className={`border px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.1em] ${
                  twoFactorStatus?.enabled ? 'border-rank text-rank bg-tint' : 'border-rule text-fg-38'
                }`}
              >
                {twoFactorStatus?.enabled ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
              </span>
            </div>

            {!twoFactorStatus?.enabled ? (
              <div className="mt-6 border-t border-rule pt-6">
                {!twoFactorSecret ? (
                  <div>
                    <p className="text-[13px] text-fg-60">
                      Khi bật 2FA, mỗi lần đăng nhập vào tài khoản admin bạn sẽ cần nhập mã 6 số thay đổi mỗi 30 giây từ ứng dụng Authenticator trên điện thoại.
                    </p>
                    <div className="mt-4">
                      <SubmitButton onClick={handleSetup2FA} loading={isSubmitting2FA} variant="primary">
                        Bắt đầu thiết lập 2FA
                      </SubmitButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="border-l-2 border-l-rank bg-tint p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-38">
                        Mã Secret Key (Nhập vào Authenticator)
                      </div>
                      <div className="mt-1 font-sans text-[16px] font-bold text-fg select-all">{twoFactorSecret}</div>
                      {twoFactorUrl && (
                        <div className="mt-2 text-[11px] text-fg-38 break-all">
                          URL: <code>{twoFactorUrl}</code>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleEnable2FA} className="flex flex-col gap-3">
                      <label className={labelClass} htmlFor="admin-enable-2fa-code">Nhập mã 6 chữ số từ ứng dụng để xác nhận</label>
                      <div className="flex gap-2">
                        <input id="admin-enable-2fa-code"
                          type="text"
                          maxLength={6}
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="VD: 123456"
                          className="w-[200px] border border-rule bg-bg px-4 py-2 font-sans text-[16px] tracking-widest text-fg focus:border-fg focus:outline-none text-center"
                          required
                        />
                        <SubmitButton type="submit" loading={isSubmitting2FA} variant="primary">
                          Kích hoạt 2FA
                        </SubmitButton>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6 border-t border-rule pt-6">
                <p className="text-[13px] text-fg-60">
                  Tài khoản của bạn đang được bảo vệ bởi xác thực hai bước. Muốn tắt tính năng này, vui lòng nhập mã xác thực từ điện thoại để xác nhận danh tính:
                </p>
                <form onSubmit={handleDisable2FA} className="mt-4 flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Mã 6 chữ số"
                    aria-label="Mã xác thực để tắt 2FA"
                    className="w-[180px] border border-rule bg-bg px-4 py-2 font-sans text-[15px] text-fg focus:border-fg focus:outline-none text-center"
                    required
                  />
                  <SubmitButton type="submit" loading={isSubmitting2FA} variant="secondary">
                    Tắt 2FA
                  </SubmitButton>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: VOCABULARY CRUD */}
      {activeTab === 'VOCAB' && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchVocabulary();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={vocabSearch}
                onChange={(e) => setVocabSearch(e.target.value)}
                placeholder="Tìm từ vựng, cách đọc, nghĩa..."
                aria-label="Tìm từ vựng"
                className="w-[280px] border border-rule bg-card px-3 py-1.5 text-[12.5px] text-fg focus:border-fg focus:outline-none"
              />
              <SubmitButton type="submit" variant="secondary">
                Tìm
              </SubmitButton>
            </form>

            <SubmitButton
              onClick={() => {
                setEditingVocabId(null);
                setVocabForm({
                  word: '',
                  reading: '',
                  meaning: '',
                  sinoVietnamese: '',
                  exampleSentence: '',
                  exampleReading: '',
                  exampleMeaning: '',
                });
                setVocabModalOpen(true);
              }}
              variant="primary"
            >
              <Plus size={14} />
              <span>Thêm từ vựng mới</span>
            </SubmitButton>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className={thClass}>ID</th>
                  <th className={thClass}>Từ vựng</th>
                  <th className={thClass}>Cách đọc</th>
                  <th className={thClass}>Hán Việt</th>
                  <th className={thClass}>Ý nghĩa</th>
                  <th className={thClass}>Trạng thái</th>
                  <th className={`${thClass} text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {vocabList.map((v) => (
                  <tr key={v.id} className={v.reviewStatus === 'ARCHIVED' ? 'opacity-60' : ''}>
                    <td className={`${tdClass} tabular-nums`}>#{v.id}</td>
                    <td className={`${tdClass} font-serif font-semibold text-fg text-[14px]`}>{v.word}</td>
                    <td className={`${tdClass} font-serif text-fg-60`}>{v.reading}</td>
                    <td className={`${tdClass} text-fg-38`}>{v.sinoVietnamese || '—'}</td>
                    <td className={`${tdClass} text-fg`}>{v.meaning}</td>
                    <td className={tdClass}>
                      <span
                        className={`inline-block px-1.5 py-0.5 text-[10.5px] font-medium ${
                          v.reviewStatus === 'ARCHIVED'
                            ? 'border border-red text-red bg-tint'
                            : v.reviewStatus === 'APPROVED'
                            ? 'border border-rank text-rank'
                            : 'border border-rule text-fg-38'
                        }`}
                      >
                        {v.reviewStatus || 'APPROVED'}
                      </span>
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVocabId(v.id);
                            setVocabForm({
                              word: v.word,
                              reading: v.reading,
                              meaning: v.meaning,
                              sinoVietnamese: v.sinoVietnamese || '',
                              exampleSentence: v.exampleSentence || '',
                              exampleReading: v.exampleReading || '',
                              exampleMeaning: v.exampleMeaning || '',
                            });
                            setVocabModalOpen(true);
                          }}
                          className="cursor-pointer text-fg-60 hover:text-fg"
                          title="Sửa"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVocab(v.id)}
                          className="cursor-pointer text-fg-38 hover:text-red"
                          title="Xoá"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: HANZI CRUD */}
      {activeTab === 'HANZI' && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchHanzi();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={hanziSearch}
                onChange={(e) => setHanziSearch(e.target.value)}
                placeholder="Tìm chữ Hanzi, Pinyin / Hán Việt, nghĩa..."
                aria-label="Tìm chữ Hán"
                className="w-[280px] border border-rule bg-card px-3 py-1.5 text-[12.5px] text-fg focus:border-fg focus:outline-none"
              />
              <SubmitButton type="submit" variant="secondary">
                Tìm
              </SubmitButton>
            </form>

            <SubmitButton
              onClick={() => {
                setEditingHanziId(null);
                setHanziForm({
                  character: '',
                  strokeCount: 4,
                  pinyin: '',
                  traditional: '',
                  sinoVietnamese: '',
                  meaning: '',
                  mnemonic: '',
                });
                setHanziModalOpen(true);
              }}
              variant="primary"
            >
              <Plus size={14} />
              <span>Thêm Hanzi mới</span>
            </SubmitButton>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className={thClass}>ID</th>
                  <th className={thClass}>Chữ</th>
                  <th className={thClass}>Số nét</th>
                  <th className={thClass}>Âm On / Kun</th>
                  <th className={thClass}>Hán Việt</th>
                  <th className={thClass}>Ý nghĩa</th>
                  <th className={`${thClass} text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {hanziList.map((k) => (
                  <tr key={k.id}>
                    <td className={`${tdClass} tabular-nums`}>#{k.id}</td>
                    <td className={`${tdClass} font-serif font-bold text-fg text-[18px]`}>{k.character}</td>
                    <td className={`${tdClass} tabular-nums`}>{k.strokeCount}</td>
                    <td className={`${tdClass} text-[11.5px] text-fg-60`}>
                      {k.pinyin && <div>Pinyin: {k.pinyin}</div>}
                      {k.traditional && <div>Phồn thể: {k.traditional}</div>}
                    </td>
                    <td className={`${tdClass} font-semibold text-fg`}>{k.sinoVietnamese || '—'}</td>
                    <td className={`${tdClass} text-fg`}>{k.meaning}</td>
                    <td className={`${tdClass} text-right`}>
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingHanziId(k.id);
                            setHanziForm({
                              character: k.character,
                              strokeCount: k.strokeCount,
                              pinyin: k.pinyin || '',
                              traditional: k.traditional || '',
                              sinoVietnamese: k.sinoVietnamese || '',
                              meaning: k.meaning,
                              mnemonic: k.mnemonic || '',
                            });
                            setHanziModalOpen(true);
                          }}
                          className="cursor-pointer text-fg-60 hover:text-fg"
                          title="Sửa"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHanzi(k.id)}
                          className="cursor-pointer text-fg-38 hover:text-red"
                          title="Xoá"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: EXERCISES CRUD */}
      {activeTab === 'EXERCISES' && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchExercises();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                placeholder="Tìm câu hỏi, đáp án..."
                aria-label="Tìm câu hỏi bài tập"
                className="w-[280px] border border-rule bg-card px-3 py-1.5 text-[12.5px] text-fg focus:border-fg focus:outline-none"
              />
              <SubmitButton type="submit" variant="secondary">
                Tìm
              </SubmitButton>
            </form>

            <SubmitButton
              onClick={() => {
                setEditingExerciseId(null);
                setExerciseForm({
                  grammarRuleId: 1,
                  questionText: '',
                  optionsJson: '["A","B","C","D"]',
                  correctAnswer: 'A',
                  explanation: '',
                  isCommonMistake: false,
                  mistakeCategory: '',
                });
                setExerciseModalOpen(true);
              }}
              variant="primary"
            >
              <Plus size={14} />
              <span>Thêm câu hỏi mới</span>
            </SubmitButton>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className={thClass}>ID</th>
                  <th className={thClass}>Nội dung câu hỏi</th>
                  <th className={thClass}>Đáp án đúng</th>
                  <th className={thClass}>Giải thích</th>
                  <th className={thClass}>Bẫy lỗi</th>
                  <th className={`${thClass} text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {exerciseList.map((ex) => (
                  <tr key={ex.id}>
                    <td className={`${tdClass} tabular-nums`}>#{ex.id}</td>
                    <td className={`${tdClass} font-serif font-medium text-fg`}>{ex.questionText}</td>
                    <td className={`${tdClass} font-bold text-rank`}>{ex.correctAnswer}</td>
                    <td className={`${tdClass} text-fg-38 text-[11.5px]`}>{ex.explanation || '—'}</td>
                    <td className={tdClass}>
                      {ex.isCommonMistake ? (
                        <span className="border border-red/40 bg-red/10 px-1.5 py-0.5 text-[10px] text-red font-medium">
                          {ex.mistakeCategory || 'Bẫy lỗi'}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExerciseId(ex.id);
                            setExerciseForm({
                              grammarRuleId: 1,
                              questionText: ex.questionText,
                              optionsJson: ex.optionsJson,
                              correctAnswer: ex.correctAnswer,
                              explanation: ex.explanation || '',
                              isCommonMistake: ex.isCommonMistake,
                              mistakeCategory: ex.mistakeCategory || '',
                            });
                            setExerciseModalOpen(true);
                          }}
                          className="cursor-pointer text-fg-60 hover:text-fg"
                          title="Sửa"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExercise(ex.id)}
                          className="cursor-pointer text-fg-38 hover:text-red"
                          title="Xoá"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VOCAB MODAL */}
      {vocabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4">
          <div className="w-full max-w-[500px] border border-rule bg-card p-6  animate-toast-in">
            <h3 className="font-serif text-[17px] font-semibold text-fg">
              {editingVocabId ? 'Chỉnh sửa từ vựng' : 'Thêm từ vựng mới'}
            </h3>
            <form onSubmit={handleSaveVocab} className="mt-4 flex flex-col gap-3">
              <div>
                <label className={labelClass} htmlFor="admin-content-field-1">Từ vựng (chữ Hán)</label>
                <input id="admin-content-field-1"
                  type="text"
                  required
                  value={vocabForm.word}
                  onChange={(e) => setVocabForm({ ...vocabForm, word: e.target.value })}
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="admin-content-field-2">Phiên âm Pinyin</label>
                  <input id="admin-content-field-2"
                    type="text"
                    required
                    value={vocabForm.reading}
                    onChange={(e) => setVocabForm({ ...vocabForm, reading: e.target.value })}
                    className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="admin-content-field-3">Hán Việt (tuỳ chọn)</label>
                  <input id="admin-content-field-3"
                    type="text"
                    value={vocabForm.sinoVietnamese}
                    onChange={(e) => setVocabForm({ ...vocabForm, sinoVietnamese: e.target.value })}
                    className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="admin-content-field-4">Ý nghĩa tiếng Việt</label>
                <input id="admin-content-field-4"
                  type="text"
                  required
                  value={vocabForm.meaning}
                  onChange={(e) => setVocabForm({ ...vocabForm, meaning: e.target.value })}
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="admin-content-field-5">Câu ví dụ tiếng Trung (tuỳ chọn)</label>
                <input id="admin-content-field-5"
                  type="text"
                  value={vocabForm.exampleSentence}
                  onChange={(e) => setVocabForm({ ...vocabForm, exampleSentence: e.target.value })}
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVocabModalOpen(false)}
                  className="cursor-pointer border border-rule px-4 py-2 text-[12px] text-fg-60 hover:text-fg"
                >
                  Huỷ
                </button>
                <SubmitButton type="submit" variant="primary">
                  Lưu từ vựng
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HANZI MODAL */}
      {hanziModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4">
          <div className="w-full max-w-[500px] border border-rule bg-card p-6  animate-toast-in">
            <h3 className="font-serif text-[17px] font-semibold text-fg">
              {editingHanziId ? 'Chỉnh sửa chữ Hán (Hanzi)' : 'Thêm chữ Hán (Hanzi) mới'}
            </h3>
            <form onSubmit={handleSaveHanzi} className="mt-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="admin-content-field-6">Chữ Hán</label>
                  <input id="admin-content-field-6"
                    type="text"
                    required
                    maxLength={2}
                    value={hanziForm.character}
                    onChange={(e) => setHanziForm({ ...hanziForm, character: e.target.value })}
                    className="mt-1 w-full border border-rule bg-bg px-3 py-2 font-serif text-[16px] text-fg focus:border-fg focus:outline-none"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="admin-content-field-7">Số nét</label>
                  <input id="admin-content-field-7"
                    type="number"
                    required
                    min={1}
                    value={hanziForm.strokeCount}
                    onChange={(e) => setHanziForm({ ...hanziForm, strokeCount: Number(e.target.value) })}
                    className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="admin-content-field-8">Phiên âm Pinyin</label>
                  <input id="admin-content-field-8"
                    type="text"
                    value={hanziForm.pinyin}
                    onChange={(e) => setHanziForm({ ...hanziForm, pinyin: e.target.value })}
                    className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="admin-content-field-9">Chữ phồn thể</label>
                  <input id="admin-content-field-9"
                    type="text"
                    value={hanziForm.traditional}
                    onChange={(e) => setHanziForm({ ...hanziForm, traditional: e.target.value })}
                    className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="admin-content-field-10">Âm Hán Việt</label>
                  <input id="admin-content-field-10"
                    type="text"
                    value={hanziForm.sinoVietnamese}
                    onChange={(e) => setHanziForm({ ...hanziForm, sinoVietnamese: e.target.value })}
                    className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="admin-content-field-11">Ý nghĩa</label>
                  <input id="admin-content-field-11"
                    type="text"
                    required
                    value={hanziForm.meaning}
                    onChange={(e) => setHanziForm({ ...hanziForm, meaning: e.target.value })}
                    className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="admin-content-field-12">Chiết tự & Mẹo nhớ</label>
                <textarea id="admin-content-field-12"
                  rows={2}
                  value={hanziForm.mnemonic}
                  onChange={(e) => setHanziForm({ ...hanziForm, mnemonic: e.target.value })}
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setHanziModalOpen(false)}
                  className="cursor-pointer border border-rule px-4 py-2 text-[12px] text-fg-60 hover:text-fg"
                >
                  Huỷ
                </button>
                <SubmitButton type="submit" variant="primary">
                  Lưu chữ Hán
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXERCISE MODAL */}
      {exerciseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4">
          <div className="w-full max-w-[500px] border border-rule bg-card p-6  animate-toast-in">
            <h3 className="font-serif text-[17px] font-semibold text-fg">
              {editingExerciseId ? 'Chỉnh sửa câu hỏi bài tập' : 'Thêm câu hỏi mới'}
            </h3>
            <form onSubmit={handleSaveExercise} className="mt-4 flex flex-col gap-3">
              <div>
                <label className={labelClass} htmlFor="admin-content-field-13">Nội dung câu hỏi</label>
                <input id="admin-content-field-13"
                  type="text"
                  required
                  value={exerciseForm.questionText}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, questionText: e.target.value })}
                  placeholder="VD: 我 __ 学生。"
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 font-serif text-[14px] text-fg focus:border-fg focus:outline-none"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="admin-content-field-14">Danh sách lựa chọn (JSON array)</label>
                <input id="admin-content-field-14"
                  type="text"
                  required
                  value={exerciseForm.optionsJson}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, optionsJson: e.target.value })}
                  placeholder='["是","在","有","和"]'
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 font-sans text-[12.5px] text-fg focus:border-fg focus:outline-none"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="admin-content-field-15">Đáp án đúng</label>
                <input id="admin-content-field-15"
                  type="text"
                  required
                  value={exerciseForm.correctAnswer}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, correctAnswer: e.target.value })}
                  placeholder="VD: 是"
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="admin-content-field-16">Giải thích chi tiết</label>
                <textarea id="admin-content-field-16"
                  rows={2}
                  value={exerciseForm.explanation}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, explanation: e.target.value })}
                  placeholder="Lý do chọn đáp án này..."
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isCommonMistake"
                  checked={exerciseForm.isCommonMistake}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, isCommonMistake: e.target.checked })}
                  className="accent-rank"
                />
                <label htmlFor="isCommonMistake" className="text-[12.5px] text-fg-60">
                  Đánh dấu là câu bẫy lỗi hay gặp (Common mistake)
                </label>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExerciseModalOpen(false)}
                  className="cursor-pointer border border-rule px-4 py-2 text-[12px] text-fg-60 hover:text-fg"
                >
                  Huỷ
                </button>
                <SubmitButton type="submit" variant="primary">
                  Lưu bài tập
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

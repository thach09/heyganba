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
import { apiRequest } from '../../services/api';
import type { UserProfileResponse } from '../../services/api';
import { SubmitButton } from '../../components/SubmitButton';
import { ReviewQueuePanel } from './ReviewQueuePanel';

interface AdminStatusData {
  authorizedAdmin: string;
  role: string;
  totalUsers: number;
}

interface AuditLogItem {
  id: number;
  adminEmail: string | null;
  tableName: string;
  recordId: number | null;
  action: string;
  createdAt: string;
}

interface TwoFactorStatusResponse {
  secret: string;
  otpAuthUrl: string | null;
  enabled: boolean;
}

interface VocabularyAdminItem {
  id: number;
  word: string;
  reading: string;
  meaning: string;
  sinoVietnamese?: string;
  exampleSentence?: string;
  exampleReading?: string;
  exampleMeaning?: string;
}

interface KanjiAdminItem {
  id: number;
  character: string;
  strokeCount: number;
  onyomi?: string;
  kunyomi?: string;
  sinoVietnamese?: string;
  meaning: string;
  mnemonic?: string;
}

interface ExerciseAdminItem {
  id: number;
  questionText: string;
  optionsJson: string;
  correctAnswer: string;
  explanation?: string;
  isCommonMistake: boolean;
  mistakeCategory?: string;
}

const labelClass = 'text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-38';
const thClass = 'border-b border-rule pb-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fg-38';
const tdClass = 'border-b border-rule py-2.5 text-fg-60 text-[12.5px]';

export const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | '2FA' | 'VOCAB' | 'KANJI' | 'EXERCISES' | 'REVIEW'>('OVERVIEW');

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

  // Kanji CRUD state
  const [kanjiList, setKanjiList] = useState<KanjiAdminItem[]>([]);
  const [kanjiSearch, setKanjiSearch] = useState('');
  const [kanjiModalOpen, setKanjiModalOpen] = useState(false);
  const [editingKanjiId, setEditingKanjiId] = useState<number | null>(null);
  const [kanjiForm, setKanjiForm] = useState({
    character: '',
    strokeCount: 4,
    onyomi: '',
    kunyomi: '',
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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, usersRes, logsRes] = await Promise.all([
        apiRequest<AdminStatusData>('/admin/status'),
        apiRequest<UserProfileResponse[]>('/admin/users'),
        apiRequest<AuditLogItem[]>('/admin/audit-logs'),
      ]);

      if (statusRes.success && statusRes.data) setStatusData(statusRes.data);
      else setError(statusRes.message || 'Không thể truy cập API Quản trị');

      if (usersRes.success && usersRes.data) setUsers(usersRes.data);
      if (logsRes.success && logsRes.data) setAuditLogs(logsRes.data);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải thông tin quản trị');
    } finally {
      setLoading(false);
    }
  };

  const fetch2FAStatus = async () => {
    const res = await apiRequest<TwoFactorStatusResponse>('/admin/2fa/status');
    if (res.success && res.data) {
      setTwoFactorStatus(res.data);
    }
  };

  const handleSetup2FA = async () => {
    setIsSubmitting2FA(true);
    try {
      const res = await apiRequest<TwoFactorStatusResponse>('/admin/2fa/setup', { method: 'POST' });
      if (res.success && res.data) {
        setTwoFactorSecret(res.data.secret);
        setTwoFactorUrl(res.data.otpAuthUrl);
        showToast('Đã khởi tạo Secret 2FA mới. Hãy quét hoặc nhập vào Google Authenticator');
      }
    } finally {
      setIsSubmitting2FA(false);
    }
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) return;
    setIsSubmitting2FA(true);
    try {
      const res = await apiRequest('/admin/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code: twoFactorCode.trim() }),
      });
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
      setIsSubmitting2FA(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) return;
    setIsSubmitting2FA(true);
    try {
      const res = await apiRequest('/admin/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ code: twoFactorCode.trim() }),
      });
      if (res.success) {
        showToast('Đã huỷ kích hoạt 2FA');
        setTwoFactorCode('');
        fetch2FAStatus();
      } else {
        showToast(res.message || 'Mã xác thực không chính xác');
      }
    } finally {
      setIsSubmitting2FA(false);
    }
  };

  // Vocabulary handlers
  const fetchVocabulary = async () => {
    const url = vocabSearch.trim()
      ? `/admin/vocabulary?q=${encodeURIComponent(vocabSearch.trim())}`
      : '/admin/vocabulary?size=50';
    const res = await apiRequest<VocabularyAdminItem[]>(url);
    if (res.success && res.data) setVocabList(res.data);
  };

  const handleSaveVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = editingVocabId ? `/admin/vocabulary/${editingVocabId}` : '/admin/vocabulary';
    const method = editingVocabId ? 'PUT' : 'POST';

    const res = await apiRequest(endpoint, {
      method,
      body: JSON.stringify(vocabForm),
    });

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
    if (!confirm('Bạn có chắc chắn muốn xoá từ vựng này?')) return;
    const res = await apiRequest(`/admin/vocabulary/${id}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Đã xoá từ vựng');
      fetchVocabulary();
      fetchAdminData();
    }
  };

  // Kanji handlers
  const fetchKanji = async () => {
    const url = kanjiSearch.trim()
      ? `/admin/kanji?q=${encodeURIComponent(kanjiSearch.trim())}`
      : '/admin/kanji?size=50';
    const res = await apiRequest<KanjiAdminItem[]>(url);
    if (res.success && res.data) setKanjiList(res.data);
  };

  const handleSaveKanji = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = editingKanjiId ? `/admin/kanji/${editingKanjiId}` : '/admin/kanji';
    const method = editingKanjiId ? 'PUT' : 'POST';

    const res = await apiRequest(endpoint, {
      method,
      body: JSON.stringify(kanjiForm),
    });

    if (res.success) {
      showToast(editingKanjiId ? 'Cập nhật Kanji thành công' : 'Thêm Kanji mới thành công');
      setKanjiModalOpen(false);
      setEditingKanjiId(null);
      fetchKanji();
      fetchAdminData();
    } else {
      showToast(res.message || 'Lỗi lưu Kanji');
    }
  };

  const handleDeleteKanji = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xoá Kanji này?')) return;
    const res = await apiRequest(`/admin/kanji/${id}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Đã xoá Kanji');
      fetchKanji();
      fetchAdminData();
    }
  };

  // Exercise handlers
  const fetchExercises = async () => {
    const url = exerciseSearch.trim()
      ? `/admin/exercises?q=${encodeURIComponent(exerciseSearch.trim())}`
      : '/admin/exercises?size=50';
    const res = await apiRequest<ExerciseAdminItem[]>(url);
    if (res.success && res.data) setExerciseList(res.data);
  };

  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = editingExerciseId ? `/admin/exercises/${editingExerciseId}` : '/admin/exercises';
    const method = editingExerciseId ? 'PUT' : 'POST';

    const res = await apiRequest(endpoint, {
      method,
      body: JSON.stringify(exerciseForm),
    });

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
    const res = await apiRequest(`/admin/exercises/${id}`, { method: 'DELETE' });
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
    if (activeTab === 'KANJI') fetchKanji();
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
            Admin Portal{' '}
            <span className="ml-2 font-serif text-[12.5px] font-normal normal-case tracking-[0.06em]">管理ポータル</span>
          </div>
          <h2 className="mt-3 flex items-center gap-2.5 text-[17px] font-semibold text-fg">
            <ShieldAlert size={18} className="text-fg-60" />
            <span>Khu vực Quản trị Hệ thống HeyGanba</span>
          </h2>
          <p className="mt-1.5 text-[12px] leading-[1.8] text-fg-38">
            Quản trị người dùng, audit log, cài đặt xác thực hai yếu tố (2FA) và CRUD trực tiếp ngân hàng câu hỏi, từ
            vựng, Kanji qua giao diện.
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
          onClick={() => setActiveTab('KANJI')}
          className={`flex items-center gap-1.5 cursor-pointer border-b-2 px-4 py-2 text-[12.5px] font-medium transition-colors ${
            activeTab === 'KANJI' ? 'border-fg font-semibold text-fg' : 'border-transparent text-fg-60 hover:text-fg'
          }`}
        >
          <Languages size={13} />
          <span>Quản lý Kanji</span>
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
          <span>Cần kiểm</span>
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
              <div className={labelClass}>Trạng thái Backend API</div>
              <div className="mt-2 flex items-center gap-2 font-serif text-[18px] text-fg">
                <CheckCircle2 size={16} className="text-fg-60" />
                <span>Active (/api/v1)</span>
              </div>
              <div className="mt-2 text-[11.5px] text-fg-38">Spring Boot 3.4.3 • Java 21 LTS</div>
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
              <table className="w-full border-collapse text-[12.5px]">
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
                      <td className={`${tdClass} font-mono text-[11.5px]`}>{log.tableName}</td>
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
                      <div className="mt-1 font-mono text-[16px] font-bold text-fg select-all">{twoFactorSecret}</div>
                      {twoFactorUrl && (
                        <div className="mt-2 text-[11px] text-fg-38 break-all">
                          URL: <code>{twoFactorUrl}</code>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleEnable2FA} className="flex flex-col gap-3">
                      <label className={labelClass}>Nhập mã 6 chữ số từ ứng dụng để xác nhận</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="VD: 123456"
                          className="w-[200px] border border-rule bg-bg px-4 py-2 font-mono text-[16px] tracking-widest text-fg focus:border-fg focus:outline-none text-center"
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
                    className="w-[180px] border border-rule bg-bg px-4 py-2 font-mono text-[15px] text-fg focus:border-fg focus:outline-none text-center"
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
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className={thClass}>ID</th>
                  <th className={thClass}>Từ vựng</th>
                  <th className={thClass}>Cách đọc</th>
                  <th className={thClass}>Hán Việt</th>
                  <th className={thClass}>Ý nghĩa</th>
                  <th className={`${thClass} text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {vocabList.map((v) => (
                  <tr key={v.id}>
                    <td className={`${tdClass} tabular-nums`}>#{v.id}</td>
                    <td className={`${tdClass} font-serif font-semibold text-fg text-[14px]`}>{v.word}</td>
                    <td className={`${tdClass} font-serif text-fg-60`}>{v.reading}</td>
                    <td className={`${tdClass} text-fg-38`}>{v.sinoVietnamese || '—'}</td>
                    <td className={`${tdClass} text-fg`}>{v.meaning}</td>
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

      {/* TAB: KANJI CRUD */}
      {activeTab === 'KANJI' && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchKanji();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={kanjiSearch}
                onChange={(e) => setKanjiSearch(e.target.value)}
                placeholder="Tìm chữ Kanji, âm On/Kun, nghĩa..."
                className="w-[280px] border border-rule bg-card px-3 py-1.5 text-[12.5px] text-fg focus:border-fg focus:outline-none"
              />
              <SubmitButton type="submit" variant="secondary">
                Tìm
              </SubmitButton>
            </form>

            <SubmitButton
              onClick={() => {
                setEditingKanjiId(null);
                setKanjiForm({
                  character: '',
                  strokeCount: 4,
                  onyomi: '',
                  kunyomi: '',
                  sinoVietnamese: '',
                  meaning: '',
                  mnemonic: '',
                });
                setKanjiModalOpen(true);
              }}
              variant="primary"
            >
              <Plus size={14} />
              <span>Thêm Kanji mới</span>
            </SubmitButton>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
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
                {kanjiList.map((k) => (
                  <tr key={k.id}>
                    <td className={`${tdClass} tabular-nums`}>#{k.id}</td>
                    <td className={`${tdClass} font-serif font-bold text-fg text-[18px]`}>{k.character}</td>
                    <td className={`${tdClass} tabular-nums`}>{k.strokeCount}</td>
                    <td className={`${tdClass} text-[11.5px] text-fg-60`}>
                      {k.onyomi && <div>On: {k.onyomi}</div>}
                      {k.kunyomi && <div>Kun: {k.kunyomi}</div>}
                    </td>
                    <td className={`${tdClass} font-semibold text-fg`}>{k.sinoVietnamese || '—'}</td>
                    <td className={`${tdClass} text-fg`}>{k.meaning}</td>
                    <td className={`${tdClass} text-right`}>
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingKanjiId(k.id);
                            setKanjiForm({
                              character: k.character,
                              strokeCount: k.strokeCount,
                              onyomi: k.onyomi || '',
                              kunyomi: k.kunyomi || '',
                              sinoVietnamese: k.sinoVietnamese || '',
                              meaning: k.meaning,
                              mnemonic: k.mnemonic || '',
                            });
                            setKanjiModalOpen(true);
                          }}
                          className="cursor-pointer text-fg-60 hover:text-fg"
                          title="Sửa"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteKanji(k.id)}
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
          <div className="w-full max-w-[500px] border border-rule bg-card p-6 shadow-xl animate-toast-in">
            <h3 className="font-serif text-[17px] font-semibold text-fg">
              {editingVocabId ? 'Chỉnh sửa từ vựng' : 'Thêm từ vựng mới'}
            </h3>
            <form onSubmit={handleSaveVocab} className="mt-4 flex flex-col gap-3">
              <div>
                <label className={labelClass}>Từ vựng (Kanji / Kana)</label>
                <input
                  type="text"
                  required
                  value={vocabForm.word}
                  onChange={(e) => setVocabForm({ ...vocabForm, word: e.target.value })}
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Cách đọc (Furigana)</label>
                  <input
                    type="text"
                    required
                    value={vocabForm.reading}
                    onChange={(e) => setVocabForm({ ...vocabForm, reading: e.target.value })}
                    className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                  />
                </div>
                <div>
                  <label className={labelClass}>Hán Việt (tuỳ chọn)</label>
                  <input
                    type="text"
                    value={vocabForm.sinoVietnamese}
                    onChange={(e) => setVocabForm({ ...vocabForm, sinoVietnamese: e.target.value })}
                    className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Ý nghĩa tiếng Việt</label>
                <input
                  type="text"
                  required
                  value={vocabForm.meaning}
                  onChange={(e) => setVocabForm({ ...vocabForm, meaning: e.target.value })}
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                />
              </div>
              <div>
                <label className={labelClass}>Câu ví dụ tiếng Nhật (tuỳ chọn)</label>
                <input
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

      {/* KANJI MODAL */}
      {kanjiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4">
          <div className="w-full max-w-[500px] border border-rule bg-card p-6 shadow-xl animate-toast-in">
            <h3 className="font-serif text-[17px] font-semibold text-fg">
              {editingKanjiId ? 'Chỉnh sửa Kanji' : 'Thêm Kanji mới'}
            </h3>
            <form onSubmit={handleSaveKanji} className="mt-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Chữ Kanji</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={kanjiForm.character}
                    onChange={(e) => setKanjiForm({ ...kanjiForm, character: e.target.value })}
                    className="mt-1 w-full border border-rule bg-bg px-3 py-2 font-serif text-[16px] text-fg focus:border-fg focus:outline-none"
                  />
                </div>
                <div>
                  <label className={labelClass}>Số nét</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={kanjiForm.strokeCount}
                    onChange={(e) => setKanjiForm({ ...kanjiForm, strokeCount: Number(e.target.value) })}
                    className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Âm On (Katakana)</label>
                  <input
                    type="text"
                    value={kanjiForm.onyomi}
                    onChange={(e) => setKanjiForm({ ...kanjiForm, onyomi: e.target.value })}
                    className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                  />
                </div>
                <div>
                  <label className={labelClass}>Âm Kun (Hiragana)</label>
                  <input
                    type="text"
                    value={kanjiForm.kunyomi}
                    onChange={(e) => setKanjiForm({ ...kanjiForm, kunyomi: e.target.value })}
                    className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Âm Hán Việt</label>
                  <input
                    type="text"
                    value={kanjiForm.sinoVietnamese}
                    onChange={(e) => setKanjiForm({ ...kanjiForm, sinoVietnamese: e.target.value })}
                    className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                  />
                </div>
                <div>
                  <label className={labelClass}>Ý nghĩa</label>
                  <input
                    type="text"
                    required
                    value={kanjiForm.meaning}
                    onChange={(e) => setKanjiForm({ ...kanjiForm, meaning: e.target.value })}
                    className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Mẹo nhớ (Mnemonic)</label>
                <textarea
                  rows={2}
                  value={kanjiForm.mnemonic}
                  onChange={(e) => setKanjiForm({ ...kanjiForm, mnemonic: e.target.value })}
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setKanjiModalOpen(false)}
                  className="cursor-pointer border border-rule px-4 py-2 text-[12px] text-fg-60 hover:text-fg"
                >
                  Huỷ
                </button>
                <SubmitButton type="submit" variant="primary">
                  Lưu Kanji
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXERCISE MODAL */}
      {exerciseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4">
          <div className="w-full max-w-[500px] border border-rule bg-card p-6 shadow-xl animate-toast-in">
            <h3 className="font-serif text-[17px] font-semibold text-fg">
              {editingExerciseId ? 'Chỉnh sửa câu hỏi bài tập' : 'Thêm câu hỏi mới'}
            </h3>
            <form onSubmit={handleSaveExercise} className="mt-4 flex flex-col gap-3">
              <div>
                <label className={labelClass}>Nội dung câu hỏi</label>
                <input
                  type="text"
                  required
                  value={exerciseForm.questionText}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, questionText: e.target.value })}
                  placeholder="VD: わたし __ たなか です。"
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 font-serif text-[14px] text-fg focus:border-fg focus:outline-none"
                />
              </div>
              <div>
                <label className={labelClass}>Danh sách lựa chọn (JSON array)</label>
                <input
                  type="text"
                  required
                  value={exerciseForm.optionsJson}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, optionsJson: e.target.value })}
                  placeholder='["は","が","を","に"]'
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 font-mono text-[12.5px] text-fg focus:border-fg focus:outline-none"
                />
              </div>
              <div>
                <label className={labelClass}>Đáp án đúng</label>
                <input
                  type="text"
                  required
                  value={exerciseForm.correctAnswer}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, correctAnswer: e.target.value })}
                  placeholder="VD: は"
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                />
              </div>
              <div>
                <label className={labelClass}>Giải thích chi tiết</label>
                <textarea
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

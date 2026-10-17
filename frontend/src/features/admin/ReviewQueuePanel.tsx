import { useRequestScope } from '../../lib/hooks/useRequestScope';
import { adminApi } from './api';
import type { ReviewQueueItem } from './types';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Search, Filter, ShieldCheck, AlertTriangle, BookOpen, FileText } from 'lucide-react';

const CONTENT_LABEL: Record<string, string> = {
  KANA: 'Kana',
  VOCABULARY: 'Từ vựng (词汇)',
  KANJI: 'Chữ Hán (汉字)',
  GRAMMAR_EXERCISE: 'Bài tập ngữ pháp (语法练习)',
};

const thClass = 'border-b border-rule pb-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fg-38';
const tdClass = 'border-b border-rule py-2.5 align-top text-fg-60 text-[12.5px]';

export const ReviewQueuePanel: React.FC = () => {
  const { run, cancel } = useRequestScope();
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [onlyNeedsCheck, setOnlyNeedsCheck] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'VOCABULARY' | 'KANJI' | 'GRAMMAR_EXERCISE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'NEEDS_CHECK'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await run('adminApi.reviewQueue', (signal) =>
      adminApi.reviewQueue(onlyNeedsCheck, { signal })
    );
    if (!res) return;
    if (res.success && res.data) {
      setItems(res.data);
    } else {
      setError(res.message || 'Không tải được hàng đợi kiểm nội dung.');
    }
    setLoading(false);
  }, [onlyNeedsCheck, run]);

  useEffect(() => {
    void load();
    return () => cancel('adminApi.reviewQueue');
  }, [load, cancel]);

  useEffect(() => {
    if (!successToast) return;
    const timer = window.setTimeout(() => setSuccessToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [successToast]);

  const handleApprove = async (item: ReviewQueueItem) => {
    const actionKey = `${item.contentType}-${item.id}`;
    setActionLoadingId(actionKey);
    setError(null);

    const res = await run(`adminApi.approve-${actionKey}`, (signal) =>
      adminApi.approveReviewItem(item.contentType, item.id, 'Phê duyệt từ Admin Console', { signal })
    );

    setActionLoadingId(null);
    if (!res) return;

    if (res.success) {
      setSuccessToast(`Đã phê duyệt [${item.label}] thành công (APPROVED).`);
      // Update item in local list honestly
      setItems((prev) =>
        prev.map((i) =>
          i.contentType === item.contentType && i.id === item.id
            ? { ...i, reviewStatus: 'APPROVED', needsHumanCheck: false }
            : i
        )
      );
    } else {
      setError(res.message || `Lỗi khi phê duyệt [${item.label}]. Vui lòng thử lại.`);
    }
  };

  const handleReject = async (item: ReviewQueueItem) => {
    if (!confirm(`Bạn có chắc chắn muốn từ chối / lưu trữ nội dung [${item.label}]?`)) return;

    const actionKey = `${item.contentType}-${item.id}`;
    setActionLoadingId(actionKey);
    setError(null);

    const res = await run(`adminApi.reject-${actionKey}`, (signal) =>
      adminApi.rejectReviewItem(item.contentType, item.id, 'Từ chối bởi Admin Reviewer', { signal })
    );

    setActionLoadingId(null);
    if (!res) return;

    if (res.success) {
      setSuccessToast(`Đã lưu trữ / từ chối [${item.label}].`);
      setItems((prev) =>
        prev.map((i) =>
          i.contentType === item.contentType && i.id === item.id
            ? { ...i, reviewStatus: 'ARCHIVED', needsHumanCheck: false }
            : i
        )
      );
    } else {
      setError(res.message || `Lỗi khi từ chối [${item.label}]. Vui lòng thử lại.`);
    }
  };

  // Summary counts
  const counts = useMemo(() => {
    const total = items.length;
    const needsCheck = items.filter((i) => i.needsHumanCheck).length;
    const pending = items.filter((i) => i.reviewStatus === 'PENDING_REVIEW').length;
    const approved = items.filter((i) => i.reviewStatus === 'APPROVED').length;
    const vocab = items.filter((i) => i.contentType === 'VOCABULARY').length;
    const kanji = items.filter((i) => i.contentType === 'KANJI').length;
    const exercises = items.filter((i) => i.contentType === 'GRAMMAR_EXERCISE').length;

    return { total, needsCheck, pending, approved, vocab, kanji, exercises };
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Type filter
      if (typeFilter !== 'ALL' && item.contentType !== typeFilter) return false;

      // Status filter
      if (statusFilter === 'NEEDS_CHECK' && !item.needsHumanCheck) return false;
      if (statusFilter === 'PENDING' && item.reviewStatus !== 'PENDING_REVIEW') return false;
      if (statusFilter === 'APPROVED' && item.reviewStatus !== 'APPROVED') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchLabel = item.label.toLowerCase().includes(q);
        const matchDetail = item.detail.toLowerCase().includes(q);
        const matchNote = item.reviewNote ? item.reviewNote.toLowerCase().includes(q) : false;
        const matchSource = item.sourceRef ? item.sourceRef.toLowerCase().includes(q) : false;
        return matchLabel || matchDetail || matchNote || matchSource;
      }

      return true;
    });
  }, [items, typeFilter, statusFilter, searchQuery]);

  const [bulkApproving, setBulkApproving] = useState(false);

  const handleApproveAll = async () => {
    if (!confirm('Bạn có chắc chắn muốn TỰ ĐỘNG PHÊ DUYỆT TOÀN BỘ nội dung đang chờ duyệt (M1-M5: HSK 1 + HSK 2) sang APPROVED?')) return;
    setBulkApproving(true);
    setError(null);
    const res = await run('adminApi.approveAllReviewItems', (signal) =>
      adminApi.approveAllReviewItems({ signal })
    );
    setBulkApproving(false);
    if (!res) return;
    if (res.success) {
      const count = res.data?.approvedCount ?? 0;
      setSuccessToast(`Đã tự động phê duyệt toàn bộ ${count} mục nội dung thành công (APPROVED).`);
      void load();
    } else {
      setError(res.message || 'Lỗi khi phê duyệt hàng loạt.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-[18px] font-semibold text-fg">Hàng đợi Thẩm định Học thuật (Academic Review Queue)</h2>
            <span className="rounded-full bg-tint px-2 py-0.5 text-[10px] font-medium text-fg-60">HSK 1 & HSK 2 Syllabus</span>
          </div>
          <p className="mt-1 text-[12.5px] leading-[1.7] text-fg-60">
            Kiểm tra và phê duyệt nội dung học thuật tiếng Trung (từ vựng, chữ Hán, bài tập). Sử dụng nút{' '}
            <strong className="text-emerald-500">Duyệt tất cả</strong> để phê duyệt nhanh toàn bộ giáo trình.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={bulkApproving || loading}
            onClick={() => void handleApproveAll()}
            className="flex cursor-pointer items-center gap-1.5 border border-emerald-600 bg-emerald-600/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-600/20 transition-colors dark:text-emerald-400"
            title="Tự động phê duyệt toàn bộ nội dung giáo trình"
          >
            <CheckCircle2 size={13} className={bulkApproving ? 'animate-spin' : ''} />
            <span>{bulkApproving ? 'Đang duyệt...' : 'Duyệt tất cả (Bulk Approve)'}</span>
          </button>
          <button
            type="button"
            onClick={() => setOnlyNeedsCheck((prev) => !prev)}
            className={`cursor-pointer border px-3 py-1.5 text-[11px] font-medium transition-colors ${
              onlyNeedsCheck ? 'border-red text-red bg-red/10' : 'border-rule text-fg-60 hover:border-rule-strong hover:text-fg'
            }`}
          >
            {onlyNeedsCheck ? 'Đang lọc: Chỉ mục cần kiểm' : 'Lọc nhanh: Mục cần kiểm'}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="flex cursor-pointer items-center gap-1.5 border border-rule px-3 py-1.5 text-[11px] text-fg-60 transition-colors hover:border-rule-strong hover:text-fg"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Tải lại</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successToast && (
        <div className="flex items-center gap-2 border-l-2 border-emerald-500 bg-tint px-4 py-2.5 text-[12.5px] text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={15} />
          <span>{successToast}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 border-l-2 border-red bg-tint px-4 py-3 text-[12.5px] leading-[1.7] text-red">
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 min-[900px]:grid-cols-7">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`border p-3 cursor-pointer transition-colors ${
            statusFilter === 'ALL' ? 'bg-card border-rule-strong' : 'bg-card/50 border-rule hover:border-fg-38'
          }`}
        >
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-38">Tổng số</div>
          <div className="mt-1 font-serif text-[20px] font-semibold text-fg">{counts.total}</div>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'NEEDS_CHECK' ? 'ALL' : 'NEEDS_CHECK')}
          className={`border p-3 cursor-pointer transition-colors ${
            statusFilter === 'NEEDS_CHECK' ? 'bg-card border-red/60 ring-1 ring-red/30' : 'bg-card/50 border-rule hover:border-red/40'
          }`}
        >
          <div className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-red">
            <AlertTriangle size={11} />
            <span>Cần kiểm</span>
          </div>
          <div className="mt-1 font-serif text-[20px] font-semibold text-red">{counts.needsCheck}</div>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
          className={`border p-3 cursor-pointer transition-colors ${
            statusFilter === 'PENDING' ? 'bg-card border-amber-500/60 ring-1 ring-amber-500/30' : 'bg-card/50 border-rule hover:border-amber-500/40'
          }`}
        >
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-amber-500">Chờ duyệt</div>
          <div className="mt-1 font-serif text-[20px] font-semibold text-amber-500">{counts.pending}</div>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED')}
          className={`border p-3 cursor-pointer transition-colors ${
            statusFilter === 'APPROVED' ? 'bg-card border-emerald-500/60 ring-1 ring-emerald-500/30' : 'bg-card/50 border-rule hover:border-emerald-500/40'
          }`}
        >
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-emerald-500">Đã duyệt</div>
          <div className="mt-1 font-serif text-[20px] font-semibold text-emerald-500">{counts.approved}</div>
        </div>
        <div className="bg-card border border-rule p-3">
          <div className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-fg-38">
            <BookOpen size={11} />
            <span>Từ vựng</span>
          </div>
          <div className="mt-1 font-serif text-[20px] font-semibold text-fg">{counts.vocab}</div>
        </div>
        <div className="bg-card border border-rule p-3">
          <div className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-fg-38">
            <ShieldCheck size={11} />
            <span>Chữ Hán</span>
          </div>
          <div className="mt-1 font-serif text-[20px] font-semibold text-fg">{counts.kanji}</div>
        </div>
        <div className="bg-card border border-rule p-3">
          <div className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-fg-38">
            <FileText size={11} />
            <span>Bài tập</span>
          </div>
          <div className="mt-1 font-serif text-[20px] font-semibold text-fg">{counts.exercises}</div>
        </div>
      </div>

      {/* Filter Toolbar & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-rule bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-fg-38 mr-1">
            <Filter size={12} />
            <span>Loại:</span>
          </span>
          <button
            type="button"
            onClick={() => setTypeFilter('ALL')}
            className={`cursor-pointer px-2.5 py-1 text-[11px] font-medium transition-colors ${
              typeFilter === 'ALL' ? 'bg-tint font-semibold text-fg border border-rule-strong' : 'text-fg-60 hover:text-fg'
            }`}
          >
            Tất cả ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('VOCABULARY')}
            className={`cursor-pointer px-2.5 py-1 text-[11px] font-medium transition-colors ${
              typeFilter === 'VOCABULARY' ? 'bg-tint font-semibold text-fg border border-rule-strong' : 'text-fg-60 hover:text-fg'
            }`}
          >
            Từ vựng ({counts.vocab})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('KANJI')}
            className={`cursor-pointer px-2.5 py-1 text-[11px] font-medium transition-colors ${
              typeFilter === 'KANJI' ? 'bg-tint font-semibold text-fg border border-rule-strong' : 'text-fg-60 hover:text-fg'
            }`}
          >
            Chữ Hán ({counts.kanji})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('GRAMMAR_EXERCISE')}
            className={`cursor-pointer px-2.5 py-1 text-[11px] font-medium transition-colors ${
              typeFilter === 'GRAMMAR_EXERCISE' ? 'bg-tint font-semibold text-fg border border-rule-strong' : 'text-fg-60 hover:text-fg'
            }`}
          >
            Bài tập ({counts.exercises})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px] flex-1 max-w-[340px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-38" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo từ, phiên âm, ghi chú..."
            className="w-full border border-rule bg-card py-1.5 pl-8 pr-3 text-[12px] text-fg outline-none transition-colors placeholder:text-fg-38 focus:border-rule-strong"
          />
        </div>
      </div>

      <p className="text-[11.5px] text-fg-38">
        {loading
          ? 'Đang đồng bộ dữ liệu thẩm định…'
          : `Hiển thị ${filteredItems.length} trên tổng ${items.length} mục.`}
      </p>

      {/* Main Review Table */}
      <div className="overflow-x-auto border border-rule bg-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-tint/40">
              <th className={`${thClass} px-3`}>Loại</th>
              <th className={thClass}>Nội dung</th>
              <th className={thClass}>Chi tiết / Phiên âm</th>
              <th className={thClass}>Trạng thái</th>
              <th className={thClass}>Nguồn / Lý do kiểm tra</th>
              <th className={`${thClass} px-3 text-right`}>Hành động phê duyệt</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const actionKey = `${item.contentType}-${item.id}`;
              const isProcessing = actionLoadingId === actionKey;

              return (
                <tr key={actionKey} className="transition-colors hover:bg-tint/20">
                  <td className={`${tdClass} px-3 font-medium text-fg-60`}>
                    <span className="rounded bg-tint px-1.5 py-0.5 text-[10.5px]">
                      {CONTENT_LABEL[item.contentType] ?? item.contentType}
                    </span>
                  </td>
                  <td className={`${tdClass} font-serif text-[15px] font-medium text-fg`}>
                    {item.label}
                  </td>
                  <td className={tdClass}>
                    <div className="max-w-[280px] break-words text-[12px] leading-relaxed text-fg-60">
                      {item.detail}
                    </div>
                  </td>
                  <td className={tdClass}>
                    <div className="flex flex-col gap-1 items-start">
                      {item.needsHumanCheck ? (
                        <span className="inline-flex items-center gap-1 border border-red/40 bg-red/10 px-1.5 py-0.5 text-[10px] font-semibold text-red">
                          <AlertTriangle size={10} />
                          Cần kiểm
                        </span>
                      ) : (
                        <span className="border border-rule px-1.5 py-0.5 text-[10px] text-fg-38">
                          Đã đối chiếu
                        </span>
                      )}
                      <span
                        className={`text-[10.5px] font-medium ${
                          item.reviewStatus === 'APPROVED'
                            ? 'text-emerald-500'
                            : item.reviewStatus === 'PENDING_REVIEW'
                            ? 'text-amber-500'
                            : 'text-fg-38'
                        }`}
                      >
                        {item.reviewStatus === 'APPROVED'
                          ? '✓ APPROVED'
                          : item.reviewStatus === 'PENDING_REVIEW'
                          ? '⏳ PENDING_REVIEW'
                          : item.reviewStatus}
                      </span>
                    </div>
                  </td>
                  <td className={tdClass}>
                    <div className="max-w-[280px] text-[11.5px] leading-relaxed">
                      {item.reviewNote && (
                        <p className="font-medium text-red/90">{item.reviewNote}</p>
                      )}
                      {item.sourceRef && (
                        <p className="mt-0.5 text-[10.5px] text-fg-38 font-mono">{item.sourceRef}</p>
                      )}
                      {!item.reviewNote && !item.sourceRef && (
                        <span className="text-[11px] text-fg-38 italic">—</span>
                      )}
                    </div>
                  </td>
                  <td className={`${tdClass} px-3 text-right`}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={isProcessing || item.reviewStatus === 'APPROVED'}
                        onClick={() => void handleApprove(item)}
                        className={`flex items-center gap-1 border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          item.reviewStatus === 'APPROVED'
                            ? 'cursor-not-allowed border-rule text-fg-38 opacity-60'
                            : 'cursor-pointer border-emerald-600/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400'
                        }`}
                        title="Phê duyệt nội dung học thuật"
                      >
                        <CheckCircle2 size={12} />
                        <span>{item.reviewStatus === 'APPROVED' ? 'Đã duyệt' : 'Duyệt'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing || item.reviewStatus === 'ARCHIVED'}
                        onClick={() => void handleReject(item)}
                        className={`flex items-center gap-1 border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          item.reviewStatus === 'ARCHIVED'
                            ? 'cursor-not-allowed border-rule text-fg-38 opacity-60'
                            : 'cursor-pointer border-red/40 text-red hover:bg-red/10'
                        }`}
                        title="Từ chối hoặc lưu trữ"
                      >
                        <XCircle size={12} />
                        <span>Từ chối</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && filteredItems.length === 0 && (
          <div className="py-12 text-center text-[12.5px] text-fg-38">
            Không tìm thấy mục nào phù hợp với bộ lọc hiện tại.
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewQueuePanel;

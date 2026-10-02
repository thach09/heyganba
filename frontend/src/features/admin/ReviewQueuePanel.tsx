import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiRequest } from '../../services/api';

interface ReviewQueueItem {
  contentType: string;
  id: number;
  label: string;
  detail: string;
  needsHumanCheck: boolean;
  reviewStatus: string;
  sourceRef: string | null;
  reviewNote: string | null;
}

const CONTENT_LABEL: Record<string, string> = {
  KANA: 'Kana',
  VOCABULARY: 'Từ vựng',
  KANJI: 'Kanji',
  GRAMMAR_EXERCISE: 'Bài tập ngữ pháp',
};

const thClass = 'border-b border-rule pb-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fg-38';
const tdClass = 'border-b border-rule py-2.5 align-top text-fg-60 text-[12.5px]';

/**
 * Tab "Cần kiểm" (admin): hàng đợi duyệt nội dung do AI soạn.
 *
 * Quy trình (27/09/2026): nội dung AI tự soạn mà CHƯA đối chiếu được nguồn, hoặc câu có thể có 2 đáp án đúng theo
 * ngữ cảnh, được server xếp LÊN ĐẦU kèm `reviewNote` (lý do) + `sourceRef` (nguồn đã đối chiếu) — để người biết
 * tiếng Nhật vào chốt mà không phải tự lọc. Chi tiết: docs/Internal/content-mapping-fpt-curriculum.md.
 */
export const ReviewQueuePanel: React.FC = () => {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [onlyNeedsCheck, setOnlyNeedsCheck] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiRequest<ReviewQueueItem[]>(
      `/admin/review-queue?limit=100&onlyNeedsCheck=${onlyNeedsCheck}`,
    );
    if (res.success && res.data) {
      setItems(res.data);
    } else {
      setError(res.message || 'Không tải được hàng đợi kiểm nội dung.');
    }
    setLoading(false);
  }, [onlyNeedsCheck]);

  useEffect(() => {
    void load();
  }, [load]);

  const needsCheckCount = items.filter((item) => item.needsHumanCheck).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-[17px] font-semibold text-fg">Cần kiểm</h2>
          <p className="mt-1 text-[12.5px] leading-[1.7] text-fg-60">
            Nội dung AI tự soạn mà <strong className="text-fg-60">chưa đối chiếu được nguồn</strong> (hoặc có thể có
            nhiều hơn 1 đáp án theo ngữ cảnh) được xếp lên đầu — mỗi dòng ghi rõ lý do và nguồn đã dùng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyNeedsCheck((previous) => !previous)}
            className={`cursor-pointer border px-2.5 py-1 text-[11px] transition-colors ${
              onlyNeedsCheck ? 'border-fg text-fg' : 'border-rule text-fg-60 hover:border-rule-strong hover:text-fg'
            }`}
          >
            Chỉ hiện nhóm cần kiểm
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="flex cursor-pointer items-center gap-1.5 border border-rule px-2.5 py-1 text-[11px] text-fg-60 transition-colors hover:border-rule-strong hover:text-fg"
          >
            <RefreshCw size={13} />
            Tải lại
          </button>
        </div>
      </div>

      {error && <p className="text-[12.5px] text-red">{error}</p>}

      <p className="text-[11.5px] text-fg-38">
        {loading
          ? 'Đang tải…'
          : `Hiện ${items.length} item · trong đó ${needsCheckCount} item cần người biết tiếng Nhật chốt.`}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thClass}>Loại</th>
              <th className={thClass}>Nội dung</th>
              <th className={thClass}>Đáp án</th>
              <th className={thClass}>Trạng thái</th>
              <th className={thClass}>Nguồn / lý do cần kiểm</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.contentType}-${item.id}`}>
                <td className={tdClass}>{CONTENT_LABEL[item.contentType] ?? item.contentType}</td>
                <td className={`${tdClass} font-serif text-[13.5px] text-fg`}>{item.label}</td>
                <td className={tdClass}>{item.detail}</td>
                <td className={tdClass}>
                  {item.needsHumanCheck ? (
                    <span className="border border-red/40 bg-red/10 px-1.5 py-0.5 text-[10px] font-medium text-red">
                      Cần kiểm
                    </span>
                  ) : (
                    <span className="border border-rule px-1.5 py-0.5 text-[10px] text-fg-38">Đã đối chiếu</span>
                  )}
                  <span className="mt-1 block text-[10.5px] text-fg-38">{item.reviewStatus}</span>
                </td>
                <td className={tdClass}>
                  {item.reviewNote && <span className="block text-fg-60">{item.reviewNote}</span>}
                  {item.sourceRef && <span className="mt-1 block text-[10.5px] text-fg-38">{item.sourceRef}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && items.length === 0 && (
          <p className="py-6 text-center text-[12.5px] text-fg-38">Không còn nội dung nào trong hàng đợi.</p>
        )}
      </div>
    </div>
  );
};

export default ReviewQueuePanel;

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SubmitButton } from '../../components/SubmitButton';
import { apiRequest } from '../../services/api';
import type { AuthResponse } from '../../services/api';
import type { GrammarRuleDto } from './types';

interface GrammarRulePageProps {
  user: AuthResponse | null;
  onRequireLogin: () => void;
}

const labelClass = 'text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-38';

/** Số điểm ngữ pháp gợi ý ở cuối trang. */
const OTHERS_LIMIT = 6;

/**
 * Trang chi tiết một điểm ngữ pháp (`/grammar/:ruleId`) — mặt đọc riêng, không phải popup:
 * có URL riêng, F5 giữ nguyên trang, back/forward của trình duyệt chạy đúng.
 * Cuối trang là "Ngữ pháp khác": cùng bài trước, thiếu thì lấy các điểm liền kề theo số thứ tự.
 */
export const GrammarRulePage: React.FC<GrammarRulePageProps> = ({ user, onRequireLogin }) => {
  const { ruleId } = useParams();
  const navigate = useNavigate();
  const [rule, setRule] = useState<GrammarRuleDto | null>(null);
  const [others, setOthers] = useState<GrammarRuleDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRule = useCallback(async () => {
    if (!user || !ruleId) {
      return;
    }
    setLoading(true);
    const [ruleRes, listRes] = await Promise.all([
      apiRequest<GrammarRuleDto>(`/grammar/rules/${ruleId}`),
      apiRequest<GrammarRuleDto[]>('/grammar/rules'),
    ]);
    setLoading(false);

    if (!ruleRes.success || !ruleRes.data) {
      setError(ruleRes.message || 'Không tải được điểm ngữ pháp này.');
      return;
    }

    const current = ruleRes.data;
    setRule(current);
    setError(null);

    const all = listRes.success && listRes.data ? listRes.data : [];
    const sameLesson = all.filter(
      (item) => item.id !== current.id && item.lessonSlug && item.lessonSlug === current.lessonSlug
    );
    if (sameLesson.length >= 3) {
      setOthers(sameLesson.slice(0, OTHERS_LIMIT));
      return;
    }

    // Bài ít điểm quá thì lấp thêm các điểm liền kề theo số thứ tự cho phần gợi ý khỏi trống.
    const picked = [...sameLesson];
    const pickedIds = new Set([current.id, ...picked.map((item) => item.id)]);
    for (const item of all) {
      if (picked.length >= OTHERS_LIMIT) {
        break;
      }
      if (!pickedIds.has(item.id)) {
        picked.push(item);
        pickedIds.add(item.id);
      }
    }
    setOthers(picked.slice(0, OTHERS_LIMIT));
  }, [user, ruleId]);

  useEffect(() => {
    void loadRule();
  }, [loadRule]);

  // Đổi sang điểm khác qua link trong "Ngữ pháp khác" thì bắt đầu từ đầu trang.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [ruleId]);

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col items-center pt-16 text-center">
        <span className="font-serif text-[34px] font-light leading-none text-fg">文法</span>
        <p className="mt-5 text-[13px] leading-[1.9] text-fg-60">
          Đăng nhập để xem chi tiết điểm ngữ pháp và luyện bài tập.
        </p>
        <div className="mt-7">
          <SubmitButton onClick={onRequireLogin}>Đăng nhập / Đăng ký</SubmitButton>
        </div>
      </div>
    );
  }

  return (
    <article className="mx-auto flex w-full max-w-[720px] flex-col">
      <Link to="/grammar" className="self-start text-[11.5px] text-fg-38 transition-colors hover:text-fg">
        ← Danh sách ngữ pháp
      </Link>

      {loading && <p className="mt-8 text-[12.5px] text-fg-38">Đang tải…</p>}

      {error && !loading && <p className="mt-8 text-[12.5px] text-red">{error}</p>}

      {rule && !loading && (
        <>
          <h1 className="mt-7 font-serif text-[32px] leading-[1.4] text-fg">{rule.structure}</h1>
          <div className="mt-3 text-[11.5px] text-fg-38">
            #{rule.number}
            {rule.lessonTitle ? ` · ${rule.lessonTitle}` : ''} · {rule.exerciseCount} câu bài tập
          </div>

          <p className="mt-7 text-[14px] leading-[2] text-fg-60">{rule.explanation}</p>

          {rule.notes && (
            <div className="mt-6 bg-tint px-5 py-4">
              <span className={labelClass}>Lưu ý</span>
              <p className="mt-1 text-[13px] leading-[1.9] text-fg-60">{rule.notes}</p>
            </div>
          )}

          <div className="mt-9">
            <SubmitButton onClick={() => navigate(`/grammar?practice=${rule.id}`)}>Luyện tập phần này</SubmitButton>
          </div>
        </>
      )}

      {others.length > 0 && (
        <section className="mt-14 border-t border-rule pt-6">
          <div className="flex items-baseline justify-between gap-4">
            <span className={labelClass}>Ngữ pháp khác</span>
            <Link to="/grammar" className="text-[11.5px] text-fg-38 transition-colors hover:text-fg">
              Xem tất cả →
            </Link>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 min-[1101px]:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {others.map((item) => (
              <Link
                key={item.id}
                to={`/grammar/${item.id}`}
                data-other-rule={item.id}
                className="flex flex-col gap-1 border border-rule px-3 py-3 transition-colors hover:border-fg hover:bg-tint"
              >
                <span className="font-serif text-[15px] leading-[1.5] text-fg">{item.structure}</span>
                <span className="text-[11px] text-fg-38">
                  #{item.number}
                  {item.lessonTitle ? ` · ${item.lessonTitle}` : ''} · {item.exerciseCount} câu
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
};

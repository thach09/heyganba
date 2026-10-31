import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api/client';
import { useAuth } from '../../app/useAuth';
import { OrientalCard } from '../../components/OrientalCard';

interface Insights {
  levels: { level: number; learnedWords: number; totalWords: number; practicedGrammar: number; totalGrammar: number }[];
  quests: { code: string; title: string; description: string; route: string; progress: number; target: number; exp: number; bamboo: number; claimed: boolean }[];
  wallet: { bamboo: number; affectionExp: number };
}
export function LearningInsights({ section }: { section: 'quests' | 'mastery' }) {
  const { user } = useAuth();
  return <LearningInsightsSession key={user?.userId ?? 'guest'} section={section} />;
}
function LearningInsightsSession({ section }: { section: 'quests' | 'mastery' }) {
  const { user } = useAuth();
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiRequest<Insights>('/progress/insights', { signal });
      if (signal?.aborted) return;
      if (res.success && res.data) { setData(res.data); setError(''); }
      else setError(res.message || 'Không tải được tiến độ.');
    } catch { if (!signal?.aborted) setError('Không tải được tiến độ.'); }
  }, []);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    // oxlint-disable-next-line react/set-state-in-effect
    void load(controller.signal);
    return () => {
      controller.abort();
    };
  }, [user, load]);
  const claim = async (code: string) => {
    setBusy(true);
    try {
      const res = await apiRequest<Insights>(`/progress/quests/${encodeURIComponent(code)}/claim`, { method: 'POST' });
      if (res.success && res.data) { setData(res.data); window.dispatchEvent(new Event('companion-wallet-changed')); }
      else setError(res.message || 'Chưa nhận được thưởng.');
    } catch { setError('Chưa nhận được thưởng. Bạn có thể thử lại.'); }
    finally { setBusy(false); }
  };
  return <OrientalCard className="h-full p-6" tag={section === 'quests' ? 'Nhiệm vụ hằng ngày' : 'Tiến độ học tập'} tagVariant="gold">
    <h3 className="font-serif text-xl font-bold">{section === 'quests' ? 'Nhiệm vụ Hằng ngày' : 'Tiến độ học liệu hiện có'}</h3>
    <p className="mt-2 text-sm text-fg-60">{section === 'quests' ? 'Nhận EXP và măng trúc sau khi hoàn thành. Làm mới mỗi ngày theo giờ Việt Nam.' : 'Từ đã ôn nhớ và điểm ngữ pháp đã trả lời đúng. Đây là tiến độ luyện tập trong ứng dụng.'}</p>
    {!user ? <p className="mt-4 text-sm text-fg-60">Đăng nhập để xem tiến độ và nhận thưởng.</p> : error ? <p role="alert" className="mt-4 text-sm text-cinnabar-ink">{error} <button type="button" onClick={() => void load()} className="underline">Tải lại</button></p> : !data ? <p role="status" className="mt-4 text-sm text-fg-60">Đang tải tiến độ…</p> : section === 'quests' ? <div className="mt-5 space-y-3">
      {data.quests.map(quest => <div key={quest.code} className="flex flex-wrap items-center justify-between gap-3 border border-rule p-3">
        <div className="min-w-0 flex-1"><h4 className="text-sm font-semibold">{quest.title}</h4><p className="mt-1 text-xs text-fg-60">{quest.description} · {quest.progress}/{quest.target}</p><p className="mt-1 text-xs text-jade-ink">+{quest.exp} EXP · +{quest.bamboo} 🎋</p></div>
        {quest.claimed ? <span className="text-xs text-jade-ink">Đã nhận ✓</span> : quest.progress >= quest.target ? <button type="button" disabled={busy} onClick={() => void claim(quest.code)} className="border border-jade px-3 py-2 text-xs text-jade-ink disabled:opacity-50">Nhận thưởng</button> : <Link to={quest.route} className="text-xs text-cinnabar-ink underline">Học ngay →</Link>}
      </div>)}
    </div> : <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {data.levels.map(level => <div key={level.level} className="space-y-2"><h4 className="font-semibold">Nhóm chọn lọc {level.level}</h4>{[{ label: 'Từ vựng', value: level.learnedWords, total: level.totalWords }, { label: 'Ngữ pháp', value: level.practicedGrammar, total: level.totalGrammar }].map(metric => <div key={metric.label}><p className="mb-1 flex justify-between gap-2 text-xs text-fg-60"><span>{metric.label}</span><span>{metric.value}/{metric.total}</span></p><div role="progressbar" aria-label={`${metric.label} nhóm chọn lọc ${level.level}`} aria-valuemin={0} aria-valuemax={Math.max(1,metric.total)} aria-valuenow={metric.value} className="h-2 bg-rule"><div className="h-full bg-jade" style={{ width: `${metric.total ? Math.min(100,metric.value/metric.total*100) : 0}%` }} /></div></div>)}</div>)}
    </div>}
  </OrientalCard>;
}

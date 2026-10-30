import { OrientalCard } from '../../components/OrientalCard';
import { LearningInsights } from './LearningInsights';
import { HskRoadmap } from './HskRoadmap';
import { progressApi } from '../progress/api';
import { flashcardApi } from '../flashcard/api';
import type { FlashcardStats } from '../flashcard/types';
import type { HeatmapDay } from '../progress/types';
import type { UserExp } from './types';
import { useAuth } from '../../app/useAuth';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, ArrowRight, BookOpen, Clock, PenTool } from 'lucide-react';
import { CompanionWidget } from '../companion/CompanionWidget';

/** Dashboard metrics are derived from authenticated server progress. */

const TRACKER_DAYS = 24 * 7;
const CHART_DAYS = 30;
const INTENSITY = [0.06, 0.22, 0.44, 0.66, 0.9];
const OFFICIAL_HSK_COVERAGE: Record<number, { mapped: number; total: number }> = {
  1: { mapped: 244, total: 300 }, 2: { mapped: 86, total: 200 },
  3: { mapped: 59, total: 500 }, 4: { mapped: 43, total: 1000 },
  5: { mapped: 38, total: 1600 }, 6: { mapped: 13, total: 1800 },
};




const formatNumber = (value: number) => value.toLocaleString('vi-VN');

const toLocalDate = (isoDate: unknown): Date => {
  if (!isoDate) return new Date();
  if (Array.isArray(isoDate)) {
    const [year, month, day] = isoDate;
    return new Date(Number(year) || 2026, (Number(month) || 1) - 1, Number(day) || 1);
  }
  if (typeof isoDate === 'string') {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1);
  }
  if (isoDate instanceof Date) return isoDate;
  return new Date();
};

/** 0 = Monday ... 6 = Sunday (heatmap columns run Mon -> Sun) */
const mondayFirstIndex = (date: Date) => (date.getDay() + 6) % 7;

const Caption: React.FC<{ text: string }> = ({ text }) => (
  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-38">
    {text}
  </div>
);

const StatRow: React.FC<{ label: string; value: number | null }> = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-4 py-3">
    <span className="text-[13px] text-fg-60">{label}</span>
    <b className="text-base font-semibold tabular-nums">{value === null ? '—' : formatNumber(value)}</b>
  </div>
);

/** Tracker: per-day ink density - the more you study, the brighter the cell */
const Tracker: React.FC<{ days: HeatmapDay[] }> = ({ days }) => {
  const cells = useMemo<(HeatmapDay | null)[]>(() => {
    if (!days || days.length === 0 || !days[0]) {
      return Array.from({ length: TRACKER_DAYS }, () => null);
    }
    const pad = mondayFirstIndex(toLocalDate(days[0].date));
    return [...Array.from({ length: pad }, () => null), ...days];
  }, [days]);

  const level = useMemo(() => {
    const validDays = Array.isArray(days) ? days : [];
    const max = Math.max(1, ...validDays.map((day) => day?.itemCount || 0));
    return (count: number) => (count <= 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4)));
  }, [days]);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-6">
        <Caption text="Hoạt động" />
        <div className="inline-flex items-center gap-1.5 text-[10.5px] text-fg-38">
          ít
          {INTENSITY.map((opacity) => (
            <i key={opacity} className="inline-block h-2 w-2 bg-fg" style={{ opacity }} />
          ))}
          nhiều
        </div>
      </div>
      <div className="mt-[22px] flex gap-3">
        <div
          aria-hidden="true"
          className="grid grid-rows-[repeat(7,minmax(0,1fr))] gap-[3px] text-[9px] leading-none text-fg-38"
        >
          <span className="self-center" style={{ gridRow: 1 }}>T2</span>
          <span className="self-center" style={{ gridRow: 3 }}>T4</span>
          <span className="self-center" style={{ gridRow: 5 }}>T6</span>
        </div>
        <div
          aria-hidden="true"
          className="grid min-w-0 flex-1 auto-cols-fr grid-flow-col grid-rows-[repeat(7,minmax(0,1fr))] gap-[3px]"
        >
          {cells.map((cell, index) => (
            <i
              key={index}
              className="block aspect-square w-full bg-fg"
              style={{ opacity: INTENSITY[cell ? level(cell.itemCount) : 0] }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const WeekStats: React.FC<{ items: number | null; correct: number | null; learned: number | null }> = ({
  items,
  correct,
  learned,
}) => (
  <div className="flex h-full flex-col">
    <Caption text="Tuần này" />
    <div className="mt-[22px] flex flex-1 flex-col justify-between">
      <StatRow label="Lượt học" value={items} />
      <StatRow label="Trả lời đúng" value={correct} />
      <StatRow label="Thẻ đã ôn nhớ (tổng)" value={learned} />
    </div>
  </div>
);

/** 30-day ink bar chart - today is the brightest, the last 7 days are brighter than the rest */
const ActivityChart: React.FC<{ days: HeatmapDay[]; metric: 'itemCount' | 'correctCount'; label: string }> = ({
  days,
  metric,
  label,
}) => {
  const values = useMemo(() => (Array.isArray(days) ? days.map((day) => day?.[metric] || 0) : []), [days, metric]);
  const max = Math.max(1, ...values);
  const total = values.reduce((sum, value) => sum + value, 0);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-6">
        <Caption text={label} />
        <div className="text-[10.5px] text-fg-38">
          {values.length === 0 ? '—' : `${formatNumber(total)} · 30 ngày`}
        </div>
      </div>
      <div className="mt-[22px] flex h-[88px] items-end justify-between border-b border-rule">
        {values.map((value, index) => {
          const opacity =
            index === values.length - 1
              ? 'opacity-[0.95]'
              : index >= values.length - 7
                ? 'opacity-[0.62]'
                : 'opacity-[0.38]';
          const height = value <= 0 ? '2px' : `${Math.max(6, Math.round((value / max) * 100))}%`;
          return (
            <i
              key={index}
              aria-hidden="true"
              className={`block w-[min(12px,3%)] bg-fg ${opacity}`}
              style={{ height }}
            />
          );
        })}
      </div>
    </div>
  );
};

export const DashboardView: React.FC = () => {
  const { user } = useAuth();
  const [heatmap, setHeatmap] = useState<HeatmapDay[] | null>(null);
  const [flashStats, setFlashStats] = useState<FlashcardStats | null>(null);
  const [userExp, setUserExp] = useState<UserExp | null>(null);
  const [expError, setExpError] = useState(false);
  const [targetHsk, setTargetHsk] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('heyganba_target_hsk');
      const level = Number(saved);
      return Number.isInteger(level) && level >= 1 && level <= 6 ? level : 1;
    } catch {
      return 1;
    }
  });

  const handleSelectTargetHsk = (level: number) => {
    setTargetHsk(level);
    try {
      localStorage.setItem('heyganba_target_hsk', String(level));
    } catch {
      // ignore storage quota errors
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    const controller = new AbortController();
    void progressApi.heatmap(TRACKER_DAYS, { signal: controller.signal }).then((res) => {
      if (!controller.signal.aborted && res.success && Array.isArray(res.data)) {
        setHeatmap(res.data);
      }
    }).catch(() => { /* Cancellation is silent. */ });

    void flashcardApi.stats({ signal: controller.signal }).then((res) => {
      if (!controller.signal.aborted && res.success && res.data) {
        setFlashStats(res.data);
      }
    }).catch(() => { /* Cancellation is silent. */ });

    void progressApi.exp({ signal: controller.signal }).then((res) => {
      if (controller.signal.aborted) return;
      if (res.success && res.data) setUserExp(res.data);
      else setExpError(true);
    }).catch(() => { if (!controller.signal.aborted) setExpError(true); });
    return () => controller.abort();
  }, [user]);

  const { weekItems, weekCorrect } = useMemo(() => {
    const safeHeatmap = Array.isArray(heatmap) ? heatmap : [];
    const weekDays = safeHeatmap.length ? mondayFirstIndex(toLocalDate(safeHeatmap[safeHeatmap.length - 1].date)) + 1 : 0;
    const last7 = weekDays ? safeHeatmap.slice(-weekDays) : [];
    return {
      weekItems: last7.reduce((sum, day) => sum + (day?.itemCount || 0), 0),
      weekCorrect: last7.reduce((sum, day) => sum + (day?.correctCount || 0), 0),
    };
  }, [heatmap]);

  const currentLevel = userExp?.level ?? 1;
  const currentExp = userExp?.expIntoLevel ?? 0;
  const nextLevelExp = userExp?.expForNextLevel ?? 1000;
  const expPercent = Math.min(100, Math.round((currentExp / nextLevelExp) * 100));

  const chartDays = useMemo(() => (user && Array.isArray(heatmap) ? heatmap.slice(-CHART_DAYS) : []), [heatmap, user]);

  return (
    <>
      <header className="flex flex-col items-start">
        {user && !userExp ? (
          <p role={expError ? 'alert' : 'status'} className="text-[13px] text-fg-60">
            {expError ? 'Chưa tải được EXP. Tải lại trang để thử lại.' : 'Đang tải EXP...'}
          </p>
        ) : user ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-baseline gap-1.5 text-[14px] text-fg">
              <span className="text-fg-60 text-[13px]">Cấp</span>
              <b className="font-serif text-[22px] font-bold text-fg leading-none">{currentLevel}</b>
              <span className="mx-1 text-fg-38">·</span>
              <span className="font-sans text-[13px] text-fg-60">
                {formatNumber(currentExp)} / {formatNumber(nextLevelExp)} EXP
              </span>
            </div>

            {/* Thanh nhỏ hiển thị sắp lên cấp / kinh nghiệm chưa */}
            <div className="flex items-center gap-2.5 rounded-full border border-rule bg-card/95 px-3 py-1 ">
              <span className="text-[11px] text-fg-38">Lên cấp:</span>
              <div
                className="relative h-2 w-28 overflow-hidden rounded-full bg-rule/70"
                title={`Đã tích lũy ${expPercent}% để lên cấp ${currentLevel + 1}`}
              >
                <div
                  className="h-full rounded-full bg-gold transition-all duration-500 "
                  style={{ width: `${expPercent}%` }}
                />
              </div>
              <span className="font-sans text-[11px] font-semibold text-gold-ink">
                {expPercent}%
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[13px] text-fg-60">
            Đăng nhập để theo dõi tiến độ học tập
          </div>
        )}
      </header>

      {/* Target HSK Level Selector & Smart Next-Action Banner */}
      <section className="mt-6 rounded-2xl border border-rule bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule/50 pb-4">
          <div className="flex items-center gap-2.5">
            <Target className="h-5 w-5 text-cinnabar-ink" />
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-38">
                Lộ trình Hán ngữ trọng tâm
              </div>
              <h2 className="font-serif text-lg font-bold text-fg">
                Mục tiêu hiện tại: <span className="text-cinnabar-ink">HSK {targetHsk}</span>
              </h2>
            </div>
          </div>

          {/* HSK Level Quick Selector (1..6) */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chọn mục tiêu HSK">
            {[1, 2, 3, 4, 5, 6].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => handleSelectTargetHsk(lvl)}
                aria-pressed={targetHsk === lvl}
                className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  targetHsk === lvl
                    ? 'bg-cinnabar text-on-accent shadow-sm ring-2 ring-cinnabar/40'
                    : 'border border-rule bg-tint text-fg-60 hover:border-rule-strong hover:text-fg'
                }`}
              >
                HSK {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Smart Next-Action CTA (Tiếp tục học ngay) */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs text-fg-60 leading-relaxed">
              HSK {targetHsk} là mục tiêu học. Đã ghép chắc chắn {OFFICIAL_HSK_COVERAGE[targetHsk].mapped}/{OFFICIAL_HSK_COVERAGE[targetHsk].total} ID từ và cách đọc CTI 3.0; các mục nhiều ID cùng cách đọc chưa tính. Nhóm bài học hiện có là tuyển chọn nội bộ, không phải phạm vi CTI đầy đủ.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to={`/vocabulary?level=HSK${targetHsk}`}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cinnabar bg-cinnabar px-4 py-2 text-xs font-semibold text-on-accent transition-all hover:opacity-90 shadow-sm"
            >
              <BookOpen size={14} />
              <span>Học nhóm chọn lọc đang có</span>
              <ArrowRight size={14} />
            </Link>

            <Link
              to="/vocabulary"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rule bg-card px-3 py-2 text-xs font-medium text-fg-60 hover:text-fg hover:border-rule-strong transition-colors"
            >
              <Clock size={13} />
              <span>Ôn tập đến hạn</span>
            </Link>

            <Link
              to="/hanzi"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rule bg-card px-3 py-2 text-xs font-medium text-fg-60 hover:text-fg hover:border-rule-strong transition-colors"
            >
              <PenTool size={13} />
              <span>Viết chữ Hán</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Companion Pet & Daily Quests Section */}
      <section className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 flex flex-col">
          <CompanionWidget />
        </div>

        <div className="lg:col-span-5 flex flex-col">
<LearningInsights section="quests" />
        </div>
      </section>

      <div className="mt-8"><LearningInsights section="mastery" /></div>
      <HskRoadmap />

      {/* Learning Analytics & Reflection Section */}
      <section className="mt-12 grid grid-cols-2 gap-x-12 gap-y-10 max-[900px]:grid-cols-1 max-[900px]:gap-8">
        <OrientalCard className="p-6">
          <Tracker days={heatmap ?? []} />
        </OrientalCard>

        <OrientalCard className="p-6">
          <WeekStats
            items={user && heatmap !== null ? weekItems : null}
            correct={user && heatmap !== null ? weekCorrect : null}
            learned={user ? (flashStats?.learnedWords ?? null) : null}
          />
        </OrientalCard>

        <OrientalCard className="p-6">
          <ActivityChart days={chartDays} metric="itemCount" label="Lượt học" />
        </OrientalCard>

        <OrientalCard className="p-6">
          <ActivityChart days={chartDays} metric="correctCount" label="Trả lời đúng" />
        </OrientalCard>
      </section>
    </>
  );
};

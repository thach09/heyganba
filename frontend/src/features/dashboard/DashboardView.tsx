import { progressApi } from '../progress/api';
import { flashcardApi } from '../flashcard/api';
import type { FlashcardStats } from '../flashcard/types';
import type { HeatmapDay } from '../progress/types';
import type { UserExp } from './types';
import { useAuth } from '../../app/useAuth';
import React, { useEffect, useMemo, useState } from 'react';
import { CompanionWidget } from '../companion/CompanionWidget';
import { OrientalCard } from '../../components/OrientalCard';

/**
 * Dashboard - the reflection surface (see DESIGN.md):
 * 24-week ink-density tracker, "This week", two 30-day charts, level/EXP.
 *
 * Real data: `/streak/heatmap` (itemCount, correctCount) + `/flashcard/stats`.
 * EXP is computed client-side from itemCount (not in the DB yet): 10 EXP per study item, 2,000 per level.
 */

const TRACKER_DAYS = 24 * 7;
const CHART_DAYS = 30;
const INTENSITY = [0.06, 0.22, 0.44, 0.66, 0.9];

const RANK_TONES: Record<number, { bg: string; text: string; fill: string; border: string }> = {
  1: { bg: 'bg-rank-1/15', text: 'text-rank-1', fill: 'bg-rank-1', border: 'border-rank-1/40' },
  2: { bg: 'bg-rank-2/15', text: 'text-rank-2', fill: 'bg-rank-2', border: 'border-rank-2/40' },
  3: { bg: 'bg-rank-3/15', text: 'text-rank-3', fill: 'bg-rank-3', border: 'border-rank-3/40' },
  4: { bg: 'bg-rank-4/15', text: 'text-rank-4', fill: 'bg-rank-4', border: 'border-rank-4/40' },
  5: { bg: 'bg-rank-5/20', text: 'text-rank-5', fill: 'bg-rank-5', border: 'border-rank-5/50' },
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
      <StatRow label="Từ đã thuộc" value={learned} />
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
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [flashStats, setFlashStats] = useState<FlashcardStats | null>(null);
  const [userExp, setUserExp] = useState<UserExp | null>(null);

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
      if (!controller.signal.aborted && res.success && res.data) {
        setUserExp(res.data);
      }
    }).catch(() => { /* Cancellation is silent. */ });
    return () => controller.abort();
  }, [user]);

  const { weekItems, weekCorrect } = useMemo(() => {
    const safeHeatmap = Array.isArray(heatmap) ? heatmap : [];
    const last7 = safeHeatmap.slice(-7);
    return {
      weekItems: last7.reduce((sum, day) => sum + (day?.itemCount || 0), 0),
      weekCorrect: last7.reduce((sum, day) => sum + (day?.correctCount || 0), 0),
    };
  }, [heatmap]);

  const currentLevel = userExp?.level ?? 1;
  const currentExp = userExp?.expIntoLevel ?? 0;
  const nextLevelExp = userExp?.expForNextLevel ?? 1000;
  const rankTier = userExp?.rankTier ?? 1;
  const rankName = userExp?.rankName ?? 'Sơ khởi';
  const rankTone = RANK_TONES[rankTier] ?? RANK_TONES[1] ?? { bg: 'bg-rank-1/15', text: 'text-rank-1', fill: 'bg-rank-1', border: 'border-rank-1/40' };
  const expPercent = Math.min(100, Math.round((currentExp / nextLevelExp) * 100));

  const chartDays = useMemo(() => (user && Array.isArray(heatmap) ? heatmap.slice(-CHART_DAYS) : []), [heatmap, user]);

  const now = new Date();
  const viDate = now.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <>
      <header className="flex items-start justify-between gap-10 max-[900px]:flex-col max-[900px]:gap-7">
        <div className="pt-0.5 text-[12.5px] text-fg-38">
          {viDate}
        </div>

        <div className="text-right max-[900px]:text-left">
          <div className="flex items-center justify-end gap-2 max-[900px]:justify-start">
            <span className={`inline-flex items-center px-2 py-0.5 text-[10.5px] font-medium tracking-[0.1em] border ${rankTone.border} ${rankTone.bg} ${rankTone.text} rounded-sm`}>
              {rankName} (Tier {rankTier})
            </span>
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-fg-38">Kinh nghiệm</span>
          </div>
          {user ? (
            <>
              <div className="mt-1 text-[13.5px]">
                Cấp{' '}
                <b className="mr-0.5 font-serif text-[22px] font-semibold">{currentLevel}</b> ·{' '}
                {formatNumber(currentExp)} / {formatNumber(nextLevelExp)} EXP
              </div>
              <div className="relative ml-auto mt-2.5 h-[2px] w-[220px] max-w-full bg-rule max-[900px]:ml-0 max-[900px]:w-full">
                <i
                  aria-hidden="true"
                  className={`absolute inset-y-0 left-0 ${rankTone.fill}`}
                  style={{ width: `${expPercent}%` }}
                />
              </div>
            </>
          ) : (
            <div className="mt-1 text-[13.5px] text-fg-60">Đăng nhập để theo dõi tiến độ</div>
          )}
        </div>
      </header>

      {/* Prominent Companion Pet Widget */}
      <div className="mt-8">
        <CompanionWidget />
      </div>

      <section className="mt-10 grid grid-cols-2 gap-x-12 gap-y-10 max-[900px]:grid-cols-1 max-[900px]:gap-8">
        <OrientalCard tag="Mật độ học" tagVariant="cinnabar" className="p-6">
          <Tracker days={heatmap} />
        </OrientalCard>

        <OrientalCard tag="Tổng kết" tagVariant="gold" className="p-6">
          <WeekStats
            items={user ? weekItems : null}
            correct={user ? weekCorrect : null}
            learned={user ? (flashStats?.learnedWords ?? null) : null}
          />
        </OrientalCard>

        <OrientalCard tag="Xu hướng 30 ngày" tagVariant="ink" className="p-6">
          <ActivityChart days={chartDays} metric="itemCount" label="Lượt học" />
        </OrientalCard>

        <OrientalCard tag="Tỉ lệ chính xác" tagVariant="jade" className="p-6">
          <ActivityChart days={chartDays} metric="correctCount" label="Trả lời đúng" />
        </OrientalCard>
      </section>
    </>
  );
};

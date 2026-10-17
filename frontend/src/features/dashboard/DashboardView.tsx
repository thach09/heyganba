import { HskRoadmap } from './HskRoadmap';
import { progressApi } from '../progress/api';
import { flashcardApi } from '../flashcard/api';
import type { FlashcardStats } from '../flashcard/types';
import type { HeatmapDay } from '../progress/types';
import type { UserExp } from './types';
import { useAuth } from '../../app/useAuth';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, BookOpen, PenTool, Award } from 'lucide-react';
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
  const expPercent = Math.min(100, Math.round((currentExp / nextLevelExp) * 100));

  const chartDays = useMemo(() => (user && Array.isArray(heatmap) ? heatmap.slice(-CHART_DAYS) : []), [heatmap, user]);

  return (
    <>
      <header className="flex flex-col items-start">
        {user ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-baseline gap-1.5 text-[14px] text-fg">
              <span className="text-fg-60 text-[13px]">Cấp</span>
              <b className="font-serif text-[22px] font-bold text-fg leading-none">{currentLevel}</b>
              <span className="mx-1 text-fg-38">·</span>
              <span className="font-mono text-[13px] text-fg-60">
                {formatNumber(currentExp)} / {formatNumber(nextLevelExp)} EXP
              </span>
            </div>

            {/* Thanh nhỏ hiển thị sắp lên cấp / kinh nghiệm chưa */}
            <div className="flex items-center gap-2.5 rounded-full border border-[#262834] bg-[#12141a]/95 px-3 py-1 shadow-inner">
              <span className="text-[11px] text-fg-38">Lên cấp:</span>
              <div
                className="relative h-2 w-28 overflow-hidden rounded-full bg-rule/70"
                title={`Đã tích lũy ${expPercent}% để lên cấp ${currentLevel + 1}`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] transition-all duration-500 shadow-[0_0_8px_rgba(217,119,6,0.6)]"
                  style={{ width: `${expPercent}%` }}
                />
              </div>
              <span className="font-mono text-[11px] font-semibold text-[#F59E0B]">
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

      {/* Companion Pet & Daily Quests Section */}
      <section className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 flex flex-col">
          <CompanionWidget />
        </div>

        <div className="lg:col-span-5 flex flex-col">
          <OrientalCard className="h-full flex flex-col justify-between p-6" tag="每日任务" tagVariant="gold">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#F59E0B]" />
                <Caption text="Nhiệm vụ hôm nay" />
              </div>
              <h3 className="mt-2 font-serif text-[18px] font-bold text-fg">
                Nhiệm vụ Hằng ngày
              </h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-fg-60">
                Tích luỹ EXP thăng cấp và thu hoạch 🎋 Măng Trúc nuôi dưỡng Linh Thú mỗi ngày.
              </p>

              <div className="mt-5 space-y-3">
                {/* Quest 1 */}
                <div className="group/item flex items-center justify-between gap-3 rounded-lg border border-rule/60 bg-surface/50 p-3 transition-colors hover:border-[#D97706]/40 hover:bg-surface">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cinnabar/10 text-cinnabar">
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-semibold text-fg">Ôn tập Flashcard HSK</h4>
                      <p className="text-[11.5px] text-fg-60">Ôn tập 10 thẻ SRS hoặc học bài mới</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                      <span className="text-[#F59E0B] font-semibold">+30 EXP</span>
                      <span className="text-emerald-400 font-semibold">+2 🎋</span>
                    </div>
                    <Link
                      to="/vocabulary"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-cinnabar hover:underline"
                    >
                      Học ngay →
                    </Link>
                  </div>
                </div>

                {/* Quest 2 */}
                <div className="group/item flex items-center justify-between gap-3 rounded-lg border border-rule/60 bg-surface/50 p-3 transition-colors hover:border-[#D97706]/40 hover:bg-surface">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                      <PenTool size={18} />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-semibold text-fg">Luyện viết chữ Hán</h4>
                      <p className="text-[11.5px] text-fg-60">Viết đúng bút thuận 3 chữ Hán / Bộ thủ</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                      <span className="text-[#F59E0B] font-semibold">+25 EXP</span>
                      <span className="text-emerald-400 font-semibold">+2 🎋</span>
                    </div>
                    <Link
                      to="/hanzi"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-cinnabar hover:underline"
                    >
                      Luyện viết →
                    </Link>
                  </div>
                </div>

                {/* Quest 3 */}
                <div className="group/item flex items-center justify-between gap-3 rounded-lg border border-rule/60 bg-surface/50 p-3 transition-colors hover:border-[#D97706]/40 hover:bg-surface">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                      <Award size={18} />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-semibold text-fg">Ngữ pháp & Khảo thí</h4>
                      <p className="text-[11.5px] text-fg-60">Hoàn thành 1 bài trắc nghiệm / đề thi</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                      <span className="text-[#F59E0B] font-semibold">+50 EXP</span>
                      <span className="text-emerald-400 font-semibold">+3 🎋</span>
                    </div>
                    <Link
                      to="/grammar"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-cinnabar hover:underline"
                    >
                      Làm bài →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-rule/40 text-[11px] text-fg-38 flex items-center justify-between">
              <span>Làm mới mỗi ngày lúc 00:00</span>
              <span className="text-emerald-400/90 flex items-center gap-1">
                🎋 Măng Trúc tự cộng vào túi đồ
              </span>
            </div>
          </OrientalCard>
        </div>
      </section>

      <HskRoadmap />

      {/* Learning Analytics & Reflection Section */}
      <section className="mt-12 grid grid-cols-2 gap-x-12 gap-y-10 max-[900px]:grid-cols-1 max-[900px]:gap-8">
        <OrientalCard className="p-6">
          <Tracker days={heatmap} />
        </OrientalCard>

        <OrientalCard className="p-6">
          <WeekStats
            items={user ? weekItems : null}
            correct={user ? weekCorrect : null}
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

"use client";

import { useMemo } from "react";
import type { DashaPeriodNode, DashaSystem } from "@/lib/astrology/timing/DashaEngine";
import { createDashaSubperiods } from "@/lib/astrology/timing/period-expansion";

const TRACKS: Record<DashaSystem, string[]> = {
  vimshottari: ["Maha", "Antar", "Pratyantar", "Sookshma"],
  ashtottari: ["Maha", "Antar", "Pratyantar"],
  yogini: ["Maha", "Antar", "Pratyantar"],
  chara: ["Maha", "Antar"],
  kalachakra: ["Deha/Jeeva Maha", "Antar"],
};

const PLANET_COLORS: Record<string, string> = {
  Sun: "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-800/50",
  Moon: "bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-800/50",
  Mars: "bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800/50",
  Mercury: "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/50",
  Jupiter: "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/50",
  Venus: "bg-pink-100 text-pink-900 border-pink-200 dark:bg-pink-900/30 dark:text-pink-200 dark:border-pink-800/50",
  Saturn: "bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/50",
  Rahu: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-200 dark:border-fuchsia-800/50",
  Ketu: "bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800/50",
};

const PLANET_ABBREVIATIONS: Record<string, string> = {
  Sun: "Su",
  Moon: "Mo",
  Mars: "Ma",
  Mercury: "Me",
  Jupiter: "Ju",
  Venus: "Ve",
  Saturn: "Sa",
  Rahu: "Ra",
  Ketu: "Ke",
};

const YOGINI_PLANETS: Record<string, string> = {
  Mangala: "Moon",
  Pingala: "Sun",
  Dhanya: "Jupiter",
  Bhramari: "Mars",
  Bhadrika: "Mercury",
  Ulka: "Saturn",
  Siddha: "Venus",
  Sankata: "Rahu",
};

const ZODIAC = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const SIGN_RULERS: Record<string, string> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter",
};

function getPlanetColors(planet: string) {
  return PLANET_COLORS[planet] ?? PLANET_COLORS.Saturn;
}

function colorClassesFor(period: DashaPeriodNode, system: DashaSystem) {
  const planet = system === "chara" || system === "kalachakra"
    ? SIGN_RULERS[period.lord]
    : YOGINI_PLANETS[period.lord] ?? period.lord;
  return getPlanetColors(planet ?? "Saturn");
}

function abbreviationFor(period: DashaPeriodNode, system: DashaSystem) {
  if (system === "chara" || system === "kalachakra") return period.lord.slice(0, 3);
  const planet = YOGINI_PLANETS[period.lord] ?? period.lord;
  return PLANET_ABBREVIATIONS[planet] ?? period.lord.slice(0, 2);
}

interface TimelineRow {
  label: string;
  level: number;
  periods: DashaPeriodNode[];
  domainStart: number;
  domainEnd: number;
  activePeriod?: DashaPeriodNode;
}

function periodBounds(period: DashaPeriodNode) {
  const virtualStart = typeof period.details?.virtualStart === "string"
    ? Date.parse(period.details.virtualStart)
    : Number.NaN;
  return {
    start: Number.isFinite(virtualStart) ? virtualStart : Date.parse(period.start),
    end: Date.parse(period.end),
  };
}

function getTimelineChildren(period: DashaPeriodNode, system: DashaSystem) {
  const bounds = periodBounds(period);
  const visibleStart = Date.parse(period.start);
  if (bounds.start < visibleStart) {
    const expanded = createDashaSubperiods({
      ...period,
      start: new Date(bounds.start).toISOString(),
      details: undefined,
      subPeriods: [],
    }, system);
    if (expanded.length) return expanded;
  }
  return period.subPeriods.length
    ? period.subPeriods
    : createDashaSubperiods(period, system);
}

function isActiveAt(period: DashaPeriodNode, activeTime: number) {
  const { start, end } = periodBounds(period);
  return start <= activeTime && activeTime < end;
}

function buildTimeline(
  periods: DashaPeriodNode[],
  system: DashaSystem,
  activeTime: number,
  labels: string[],
) {
  const activePath: DashaPeriodNode[] = [];
  const childrenByParent = new Map<string, DashaPeriodNode[]>();
  let candidates = periods;

  for (let level = 0; level < labels.length; level += 1) {
    const active = candidates.find((period) => isActiveAt(period, activeTime));
    if (!active) break;
    activePath.push(active);
    if (level < labels.length - 1) {
      candidates = getTimelineChildren(active, system);
      childrenByParent.set(active.id, candidates);
    }
  }

  const currentMaha = activePath[0];
  if (!currentMaha) {
    const emptyRows: TimelineRow[] = labels.map((label, level) => ({
      label,
      level: level + 1,
      periods: [],
      domainStart: activeTime,
      domainEnd: activeTime,
    }));
    return {
      activePath,
      rows: emptyRows,
    };
  }

  const currentMahaIndex = periods.findIndex(({ id }) => id === currentMaha.id);
  const mahaPeriods = periods.slice(Math.max(0, currentMahaIndex - 1), currentMahaIndex + 2);
  const firstMaha = periodBounds(mahaPeriods[0]);
  const lastMaha = periodBounds(mahaPeriods.at(-1)!);
  const rows: TimelineRow[] = [{
    label: labels[0],
    level: 1,
    periods: mahaPeriods,
    domainStart: firstMaha.start,
    domainEnd: lastMaha.end,
    activePeriod: currentMaha,
  }];

  for (let level = 1; level < labels.length; level += 1) {
    const parent = activePath[level - 1];
    if (!parent) {
      rows.push({
        label: labels[level],
        level: level + 1,
        periods: [],
        domainStart: activeTime,
        domainEnd: activeTime,
      });
      continue;
    }

    const parentBounds = periodBounds(parent);
    const childPeriods = childrenByParent.get(parent.id) ?? getTimelineChildren(parent, system);
    rows.push({
      label: labels[level],
      level: level + 1,
      periods: childPeriods,
      domainStart: parentBounds.start,
      domainEnd: parentBounds.end,
      activePeriod: activePath[level],
    });
  }

  return { activePath, rows };
}

function durationInDays(period: DashaPeriodNode) {
  const { start, end } = periodBounds(period);
  return Math.max(0, (end - start) / 86_400_000);
}

function formatDuration(period: DashaPeriodNode) {
  const days = durationInDays(period);
  const years = days / (period.yearLengthDays || 365.2425);
  if (years < 1) return `${Math.max(1, Math.round(days))} days`;
  return `${Number(years.toFixed(1))} yrs`;
}

function formatElapsedRemaining(period: DashaPeriodNode, activeTime: number) {
  const { start, end } = periodBounds(period);
  const yearLengthDays = period.yearLengthDays || 365.2425;
  const crossedDays = Math.max(0, Math.min(end, activeTime) - start) / 86_400_000;
  const remainingDays = Math.max(0, end - Math.max(start, activeTime)) / 86_400_000;
  const formatPart = (days: number) => days >= yearLengthDays
    ? `${Number((days / yearLengthDays).toFixed(1))} yrs`
    : `${Math.round(days)} days`;
  return `${formatPart(crossedDays)} crossed | ${formatPart(remainingDays)} to go`;
}

function percentageAt(activeTime: number, start: number, end: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.max(0, Math.min(100, ((activeTime - start) / (end - start)) * 100));
}

export default function CascadingDashaTimeline({
  periods,
  system,
  activeDate,
}: {
  periods: DashaPeriodNode[];
  system: DashaSystem;
  activeDate: Date | number;
}) {
  const activeTime = activeDate instanceof Date ? activeDate.getTime() : activeDate;
  const labels = TRACKS[system];
  const { activePath, rows } = useMemo(
    () => buildTimeline(periods, system, activeTime, labels),
    [activeTime, labels.length, periods, system],
  );
  const summary = activePath.length
    ? `Current dasha is ${activePath.map(({ lord }) => lord).join(" > ")}`
    : "Current dasha is outside the calculated period range";

  return (
    <section aria-label="Dasha timeline" className="space-y-3 rounded-xl border border-border bg-card px-3 py-4 sm:px-4">
      <div className="text-center">
        <h3 className="text-sm font-semibold">{summary}</h3>
        <div className="mt-1 flex items-center justify-center gap-2">
          <p className="text-[10px] text-muted-foreground">Maha window · active parent subperiods</p>
          <span className="rounded bg-amber-300 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-950">Now</span>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="w-[76px] shrink-0 space-y-2">
          {rows.map(({ label }) => <div key={label} className="flex h-20 items-center text-[10px] font-medium text-muted-foreground">{label}</div>)}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {rows.map((row) => {
            const domainDuration = row.domainEnd - row.domainStart;
            const nowPercent = percentageAt(activeTime, row.domainStart, row.domainEnd);
            const elapsedLabel = row.level <= 2 && row.activePeriod
              ? formatElapsedRemaining(row.activePeriod, activeTime)
              : null;
            const metricTransform = nowPercent < 15 ? "translateX(0%)"
              : nowPercent > 85 ? "translateX(-100%)" : "translateX(-50%)";

            return (
              <div key={row.label} className="relative h-20 overflow-visible" aria-label={`${row.label} periods`}>
                <div className="absolute inset-x-0 bottom-5 flex h-8 overflow-visible rounded-md bg-muted/50 ring-1 ring-inset ring-border/70">
                  {row.periods.map((period) => {
                    const bounds = periodBounds(period);
                    const visibleStart = Math.max(bounds.start, row.domainStart);
                    const visibleEnd = Math.min(bounds.end, row.domainEnd);
                    const duration = Math.max(0, visibleEnd - visibleStart);
                    const width = domainDuration > 0 ? duration / domainDuration * 100 : 0;
                    if (width <= 0) return null;

                    const active = isActiveAt(period, activeTime);
                    const durationLabel = formatDuration(period);

                    return (
                      <div
                        key={period.id}
                        title={`${period.lord} · ${new Date(bounds.start).toLocaleDateString("en-GB")} – ${new Date(bounds.end).toLocaleDateString("en-GB")}`}
                        className="relative h-full shrink-0"
                        style={{ width: `${width}%` }}
                      >
                        <span className="absolute -top-6 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">
                          {durationLabel}
                        </span>
                        <div className={`flex h-full w-full items-center justify-center overflow-hidden border-r px-0.5 text-xs font-medium transition-colors duration-200 ${colorClassesFor(period, system)} ${active ? "ring-1 ring-inset ring-current/40" : ""}`}>
                          <span className="truncate text-slate-900 dark:text-slate-200">
                            {abbreviationFor(period, system)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {row.periods.length > 0 && domainDuration > 0 && (
                  <div
                    aria-label={`${row.label} current datetime`}
                    className="pointer-events-none absolute bottom-0 top-0 z-10 border-l border-dashed border-amber-950 dark:border-amber-200"
                    style={{ left: `${nowPercent}%` }}
                  />
                )}
                {elapsedLabel && (
                  <span
                    className="absolute bottom-0 z-20 whitespace-nowrap rounded bg-card/95 px-1 text-[9px] font-medium text-muted-foreground"
                    style={{ left: `${nowPercent}%`, transform: metricTransform }}
                    title={`${row.label}: ${elapsedLabel}`}
                  >
                    {elapsedLabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

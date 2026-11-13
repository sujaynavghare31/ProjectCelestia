"use client";

import type { DashaPeriodNode, DashaSystem } from "@/lib/astrology/timing/DashaEngine";
import { createDashaSubperiods } from "@/lib/astrology/timing/period-expansion";

const LEVELS = [
  { name: "Maha Dasha", color: "amber" },
  { name: "Antar Dasha", color: "teal" },
  { name: "Pratyantar Dasha", color: "indigo" },
  { name: "Sookshma Dasha", color: "rose" },
] as const;

const COLORS = {
  amber: {
    border: "border-amber-200/90 dark:border-amber-800/70",
    label: "text-amber-900/75 dark:text-amber-200/75",
    title: "text-amber-950 dark:text-amber-50",
    track: "bg-amber-100 dark:bg-amber-950/70",
    fill: "bg-amber-700 dark:bg-amber-400",
    marker: "bg-amber-950 dark:bg-amber-100",
  },
  teal: {
    border: "border-teal-200/90 dark:border-teal-800/70",
    label: "text-teal-900/75 dark:text-teal-200/75",
    title: "text-teal-950 dark:text-teal-50",
    track: "bg-teal-100 dark:bg-teal-950/70",
    fill: "bg-teal-700 dark:bg-teal-400",
    marker: "bg-teal-950 dark:bg-teal-100",
  },
  indigo: {
    border: "border-indigo-200/90 dark:border-indigo-800/70",
    label: "text-indigo-900/75 dark:text-indigo-200/75",
    title: "text-indigo-950 dark:text-indigo-50",
    track: "bg-indigo-100 dark:bg-indigo-950/70",
    fill: "bg-indigo-700 dark:bg-indigo-400",
    marker: "bg-indigo-950 dark:bg-indigo-100",
  },
  rose: {
    border: "border-rose-200/90 dark:border-rose-800/70",
    label: "text-rose-900/75 dark:text-rose-200/75",
    title: "text-rose-950 dark:text-rose-50",
    track: "bg-rose-100 dark:bg-rose-950/70",
    fill: "bg-rose-700 dark:bg-rose-400",
    marker: "bg-rose-950 dark:bg-rose-100",
  },
} as const;

function activePeriods(periods: DashaPeriodNode[], now: number): DashaPeriodNode[] {
  const active = periods.find((period) => Date.parse(period.start) <= now && now < Date.parse(period.end));
  if (!active) return [];
  return [active, ...activePeriods(active.subPeriods, now)];
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function ActivePeriodCard({
  periods,
  system,
  now = Date.now(),
}: {
  periods: DashaPeriodNode[];
  system: DashaSystem;
  now?: number;
}) {
  const active = activePeriods(periods, now);
  const sookshma = system === "chara" || active.length < 3
    ? undefined
    : createDashaSubperiods(active[2], system).find(
      (period) => Date.parse(period.start) <= now && now < Date.parse(period.end),
    );
  const visibleLevels = system === "chara" ? LEVELS.slice(0, 2) : LEVELS;
  const currentPeriods = system === "chara" ? active.slice(0, 2) : [...active.slice(0, 3), ...(sookshma ? [sookshma] : [])];

  return (
    <section
      aria-label="Currently active Dasha periods"
      className="rounded-xl border border-amber-300/80 bg-amber-50/70 p-4 dark:border-amber-900/70 dark:bg-amber-950/20"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-amber-950 dark:text-amber-100">Active period</h3>
        <p className="text-[11px] tabular-nums text-amber-900/75 dark:text-amber-200/75">
          {new Date(now).toLocaleDateString("en-GB", { dateStyle: "long", timeZone: "UTC" })}
        </p>
      </div>
      {currentPeriods.length ? (
        <div className={`mt-3 grid gap-2 ${system === "chara" ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
          {visibleLevels.map(({ name, color }, index) => {
            const period = currentPeriods[index];
            const colors = COLORS[color];
            const start = period ? Date.parse(period.start) : 0;
            const end = period ? Date.parse(period.end) : 0;
            const progress = period && end > start
              ? Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100))
              : 0;

            return (
              <div key={name} className={`min-w-0 rounded-lg border bg-white/80 px-3 py-2.5 dark:bg-slate-950/35 ${colors.border}`}>
                <p className={`text-[10px] font-medium uppercase tracking-wide ${colors.label}`}>{name}</p>
                {period ? (
                  <>
                    <p className={`mt-1 truncate text-sm font-semibold ${colors.title}`}>{period.lord}</p>
                    <p className={`mt-1 text-[10px] tabular-nums ${colors.label}`}>
                      {formatDate(period.start)} – {formatDate(period.end)}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div
                        role="progressbar"
                        aria-label={`${name} elapsed`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(progress)}
                        className={`relative h-1.5 min-w-0 flex-1 rounded-full ${colors.track}`}
                      >
                        <div className={`h-full rounded-full ${colors.fill}`} style={{ width: `${progress}%` }} />
                        <span
                          aria-hidden="true"
                          className={`absolute -top-1 size-3 -translate-x-1/2 rounded-full border-2 border-white shadow-sm dark:border-slate-950 ${colors.marker}`}
                          style={{ left: `${progress}%` }}
                        />
                      </div>
                      <span className={`shrink-0 text-[10px] font-medium tabular-nums ${colors.label}`}>{Math.round(progress)}%</span>
                    </div>
                    <p className={`mt-1 text-[9px] font-semibold uppercase tracking-wide ${colors.label}`}>
                      <span className="mr-1 inline-block h-2.5 w-px align-[-2px] bg-current" />
                      Now
                    </p>
                  </>
                ) : (
                  <p className={`mt-1 text-xs ${colors.label}`}>Not available in this system</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-xs text-amber-950/80 dark:text-amber-100/80">
          No period in this timeline includes today. Choose a chart whose Dasha dates cover the current date.
        </p>
      )}
    </section>
  );
}

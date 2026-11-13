"use client";

import type { DashaPeriodNode } from "@/lib/astrology/timing/DashaEngine";

const LEVEL_LABELS = ["Maha Dasha", "Antar Dasha", "Pratyantar Dasha"];

function activePeriods(periods: DashaPeriodNode[], now: number): DashaPeriodNode[] {
  const active = periods.find((period) => Date.parse(period.start) <= now && now < Date.parse(period.end));
  if (!active) return [];
  return [active, ...activePeriods(active.subPeriods, now)];
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function DashaActiveCard({ periods, now = Date.now() }: { periods: DashaPeriodNode[]; now?: number }) {
  const active = activePeriods(periods, now).slice(0, 3);
  return (
    <section aria-label="Currently active Dasha periods" className="rounded-xl border border-amber-300/80 bg-amber-50/70 p-4 dark:border-amber-900/70 dark:bg-amber-950/20">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-amber-950 dark:text-amber-100">Active period</h3>
        <p className="text-[11px] tabular-nums text-amber-900/75 dark:text-amber-200/75">{new Date(now).toLocaleDateString("en-GB", { dateStyle: "long" })}</p>
      </div>
      {active.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {LEVEL_LABELS.map((label, index) => {
            const period = active[index];
            const start = period ? Date.parse(period.start) : 0;
            const end = period ? Date.parse(period.end) : 0;
            const progress = period && end > start ? Math.max(0, Math.min(100, (now - start) / (end - start) * 100)) : 0;
            return (
              <div key={label} className={`min-w-0 rounded-lg border px-3 py-2.5 ${period ? "border-amber-200/90 bg-white/80 dark:border-amber-800/70 dark:bg-slate-950/35" : "border-dashed border-amber-200/90 bg-transparent dark:border-amber-800/60"}`}>
                <p className="text-[10px] font-medium uppercase tracking-wide text-amber-900/70 dark:text-amber-200/70">{label}</p>
                {period ? (
                  <>
                    <p className="mt-1 truncate text-sm font-semibold text-amber-950 dark:text-amber-50">{period.lord}</p>
                    <p className="mt-1 text-[10px] tabular-nums text-amber-900/70 dark:text-amber-200/70">{formatDate(period.start)} – {formatDate(period.end)}</p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-amber-200/80 dark:bg-amber-900/80" aria-label={`${Math.round(progress)}% elapsed`}>
                      <div className="h-full rounded-full bg-amber-700 transition-[width] duration-300 dark:bg-amber-400" style={{ width: `${progress}%` }} />
                    </div>
                  </>
                ) : <p className="mt-1 text-xs text-muted-foreground">No active subperiod</p>}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-xs text-amber-950/80 dark:text-amber-100/80">No period in this timeline includes today. Choose a chart whose Dasha dates cover the current date.</p>
      )}
    </section>
  );
}

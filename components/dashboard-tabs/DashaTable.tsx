"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, LocateFixed } from "lucide-react";
import type { DashaPeriodNode } from "@/lib/astrology/timing/DashaEngine";

type FlatRow = { period: DashaPeriodNode; depth: number; key: string };

function makeKey(period: DashaPeriodNode, parent = "") {
  const key = `${period.lord}:${period.start}`;
  return parent ? `${parent}/${key}` : key;
}

function findActivePath(periods: DashaPeriodNode[], now: number, parent = "", expanded = new Set<string>()): Set<string> {
  const active = periods.find((period) => Date.parse(period.start) <= now && now < Date.parse(period.end));
  if (!active || !active.subPeriods.length) return expanded;
  const key = makeKey(active, parent);
  expanded.add(key);
  return findActivePath(active.subPeriods, now, key, expanded);
}

function flatten(periods: DashaPeriodNode[], expanded: Set<string>, depth = 0, parent = ""): FlatRow[] {
  return periods.flatMap((period) => {
    const key = makeKey(period, parent);
    const row = { period, depth, key };
    return expanded.has(key) && period.subPeriods.length
      ? [row, ...flatten(period.subPeriods, expanded, depth + 1, key)]
      : [row];
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function DashaTable({ periods, title }: { periods: DashaPeriodNode[]; title: string }) {
  const tableContainer = useRef<HTMLDivElement>(null);
  const activeRow = useRef<HTMLTableRowElement>(null);
  const [expanded, setExpanded] = useState(() => findActivePath(periods, Date.now()));
  const now = Date.now();
  const rows = useMemo(() => flatten(periods, expanded), [periods, expanded]);
  const currentPeriod = periods.find((period) => Date.parse(period.start) <= now && now < Date.parse(period.end));

  const jumpToCurrent = () => {
    if (!activeRow.current || !tableContainer.current) return;
    const container = tableContainer.current;
    const row = activeRow.current;
    const top = row.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
    container.scrollTo({ top: Math.max(0, top - container.clientHeight / 3), behavior: "smooth" });
    row.focus({ preventScroll: true });
  };

  return (
    <section aria-label={`${title} periods`} className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{periods.length} major periods · Expand a row to inspect subperiods.</p>
        <button
          type="button"
          onClick={jumpToCurrent}
          disabled={!currentPeriod}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 text-xs font-medium text-amber-950 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-900/50"
        >
          <LocateFixed className="size-3.5" /> Jump to current
        </button>
      </div>

      <div ref={tableContainer} className="max-h-[min(62vh,680px)] overflow-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[680px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-muted text-[10px] uppercase tracking-wide text-muted-foreground shadow-sm">
            <tr>
              <th scope="col" className="w-[36%] px-3 py-2.5 font-semibold">Period</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Start</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">End</th>
              <th scope="col" className="w-24 px-3 py-2.5 text-right font-semibold">Duration</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ period, depth, key }) => {
              const isCurrent = Date.parse(period.start) <= now && now < Date.parse(period.end);
              const hasChildren = period.subPeriods.length > 0;
              const isExpanded = expanded.has(key);
              return (
                <tr
                  key={key}
                  ref={isCurrent ? activeRow : undefined}
                  tabIndex={isCurrent ? -1 : undefined}
                  aria-current={isCurrent ? "date" : undefined}
                  className={`border-t border-border/70 transition-colors ${isCurrent ? "bg-amber-50 text-amber-950 dark:bg-amber-900/20 dark:text-amber-100" : depth ? "bg-muted/25 hover:bg-muted/50" : "hover:bg-muted/35"}`}
                >
                  <td className="px-3 py-2">
                    <div className="flex min-w-0 items-center gap-1.5" style={{ paddingInlineStart: `${depth * 18}px` }}>
                      {hasChildren ? (
                        <button
                          type="button"
                          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${period.lord} ${period.name}`}
                          aria-expanded={isExpanded}
                          onClick={() => setExpanded((current) => {
                            const next = new Set(current);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            return next;
                          })}
                          className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          <ChevronDown className={`size-3.5 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                        </button>
                      ) : <span className="w-5 shrink-0" />}
                      <span className={`truncate ${depth ? "text-muted-foreground" : "font-semibold"}`}>{period.lord}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{period.name.replace(" Dasha", "")}</span>
                      {isCurrent && <span className="ml-auto shrink-0 rounded-full bg-amber-200/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-950 dark:bg-amber-400/20 dark:text-amber-100">Now</span>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">{formatDate(period.start)}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">{formatDate(period.end)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{period.durationYears.toFixed(2)} y</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <p className="p-6 text-center text-sm text-muted-foreground">No periods were returned for this birth chart.</p>}
      </div>
    </section>
  );
}

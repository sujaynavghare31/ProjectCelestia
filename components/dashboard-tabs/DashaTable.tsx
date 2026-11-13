"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { DashaPeriodNode, DashaSystem } from "@/lib/astrology/timing/DashaEngine";
import { createDashaSubperiods } from "@/lib/astrology/timing/period-expansion";

type FlatRow = { period: DashaPeriodNode; depth: number; key: string };

function makeKey(period: DashaPeriodNode, parent = "") {
  const key = `${period.lord}:${period.start}`;
  return parent ? `${parent}/${key}` : key;
}

function flatten(
  periods: DashaPeriodNode[],
  expanded: Set<string>,
  generated: Record<string, DashaPeriodNode[]>,
  depth = 0,
  parent = "",
): FlatRow[] {
  return periods.flatMap((period) => {
    const key = makeKey(period, parent);
    const row = { period, depth, key };
    const children = period.subPeriods.length ? period.subPeriods : generated[key] ?? [];
    if (!expanded.has(key) || !children.length) return [row];
    return [row, ...flatten(children, expanded, generated, depth + 1, key)];
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

const MAX_LEVEL: Record<DashaSystem, number> = {
  vimshottari: 4,
  ashtottari: 3,
  yogini: 3,
  chara: 2,
  kalachakra: 2,
};

function levelOf(period: DashaPeriodNode) {
  return period.name === "Maha Dasha" ? 1
    : period.name === "Antar Dasha" ? 2
      : period.name === "Pratyantar Dasha" ? 3 : 4;
}

export default function DashaTable({
  periods,
  title,
  system,
}: {
  periods: DashaPeriodNode[];
  title: string;
  system: DashaSystem;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [generated, setGenerated] = useState<Record<string, DashaPeriodNode[]>>({});
  const now = Date.now();
  const rows = useMemo(() => flatten(periods, expanded, generated), [periods, expanded, generated]);

  return (
    <section aria-label={`${title} periods`} className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {periods.length} major periods · Expand rows to inspect nested periods
          {system === "chara" || system === "kalachakra"
            ? "."
            : `; expand rows to calculate up to ${system === "vimshottari" ? "Sookshma" : "Pratyantar"} dates on demand.`}
        </p>
      </div>

      <div className="max-h-[min(62vh,680px)] overflow-auto rounded-lg border border-border bg-card">
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
              const children = period.subPeriods.length ? period.subPeriods : generated[key] ?? [];
              const canGenerateChildren = levelOf(period) < MAX_LEVEL[system] && system !== "chara" && system !== "kalachakra";
              const hasChildren = children.length > 0 || canGenerateChildren;
              const isExpanded = expanded.has(key);
              const nestedShade = ["", "bg-muted/20", "bg-muted/35", "bg-muted/50"][Math.min(depth, 3)];
              const role = system === "kalachakra" && depth === 0 && typeof period.details?.role === "string"
                ? `${period.details.role} · `
                : "";
              return (
                <tr
                  key={key}
                  aria-current={isCurrent ? "date" : undefined}
                  className={`border-t border-border/70 transition-colors ${isCurrent ? "bg-amber-50 text-amber-950 dark:bg-amber-900/20 dark:text-amber-100" : `${nestedShade} hover:bg-muted/60`}`}
                >
                  <td className="px-3 py-2">
                    <div className="flex min-w-0 items-center gap-1.5" style={{ paddingInlineStart: `${depth * 18}px` }}>
                      {hasChildren ? (
                        <button
                          type="button"
                          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${period.lord} ${period.name}${canGenerateChildren ? " to subperiods" : ""}`}
                          aria-expanded={isExpanded}
                          onClick={() => {
                            if (!isExpanded && canGenerateChildren && !generated[key]) {
                              setGenerated((current) => ({
                                ...current,
                                [key]: createDashaSubperiods(period, system),
                              }));
                            }
                            setExpanded((current) => {
                              const next = new Set(current);
                              if (next.has(key)) next.delete(key);
                              else next.add(key);
                              return next;
                            });
                          }}
                          className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          <ChevronDown className={`size-3.5 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                        </button>
                      ) : <span className="w-5 shrink-0" />}
                      <span className={`truncate ${depth ? "text-muted-foreground" : "font-semibold"}`}>{role}{period.lord}</span>
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

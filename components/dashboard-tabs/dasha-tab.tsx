"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { EphemerisResponse } from "@/lib/kundali-types";

type DashaSystem = "vimshottari" | "chara" | "ashtottari" | "yogini";
type DashaSeed = "moon" | "ascendant" | "sun";

function formatDashaDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function dashaProgress(period: EphemerisResponse["dashas"][number], now: number) {
  const start = new Date(period.start).getTime();
  const end = new Date(period.end).getTime();
  return end > start ? Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100)) : 0;
}

const DASHA_LEVELS = ["Maha", "Antar", "Pratyantar", "Sookshma", "Pran"];

function findDasha(periods: EphemerisResponse["dashas"], preferredStart: string, activeFallback = true) {
  return periods.find((period) => period.start === preferredStart) ??
    (activeFallback ? periods.find((period) => period.active) : undefined) ??
    periods[0];
}

function DashaLane({
  label,
  periods,
  selectedStart,
  onSelect,
  color,
}: {
  label: string;
  periods: EphemerisResponse["dashas"];
  selectedStart: string;
  onSelect: (period: EphemerisResponse["dashas"][number]) => void;
  color: "blue" | "purple" | "amber" | "emerald" | "rose";
}) {
  if (!periods.length) return null;
  const totalDuration = periods.reduce((sum, period) => sum + Math.max(0, new Date(period.end).getTime() - new Date(period.start).getTime()), 0);
  const segmentColors = {
    blue: "border-blue-300 bg-blue-100 text-blue-950 dark:border-blue-800 dark:bg-blue-900/50 dark:text-blue-100",
    purple: "border-purple-300 bg-purple-100 text-purple-950 dark:border-purple-800 dark:bg-purple-900/50 dark:text-purple-100",
    amber: "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-100",
    emerald: "border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100",
    rose: "border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-800 dark:bg-rose-900/50 dark:text-rose-100",
  };
  const selectedColor = {
    blue: "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500",
    purple: "border-purple-600 bg-purple-600 text-white dark:border-purple-500 dark:bg-purple-500",
    amber: "border-amber-600 bg-amber-600 text-white dark:border-amber-500 dark:bg-amber-500",
    emerald: "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500",
    rose: "border-rose-600 bg-rose-600 text-white dark:border-rose-500 dark:bg-rose-500",
  };
  return (
    <div className="grid grid-cols-[78px_minmax(0,1fr)] items-center gap-2">
      <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</p><p className="truncate text-xs text-slate-600">{formatDashaDate(periods[0].start)}–{formatDashaDate(periods[periods.length - 1].end)}</p></div>
      <div className="flex min-w-0 overflow-x-auto rounded-md bg-slate-200/80 dark:bg-slate-800">
        {periods.map((period) => {
          const duration = Math.max(0, new Date(period.end).getTime() - new Date(period.start).getTime());
          const selected = selectedStart === period.start;
          const elapsed = period.active ? dashaProgress(period, Date.now()) : 0;
          const tooltipId = `dasha-${period.lord}-${period.start}`;
          return (
            <div key={`${period.lord}-${period.start}`} className="group/segment relative min-w-[42px] flex-1" style={{ flexBasis: totalDuration ? `${duration / totalDuration * 100}%` : `${100 / periods.length}%`, flexGrow: 0 }}>
              <button type="button" aria-describedby={tooltipId} aria-pressed={selected} title={`${period.lord} ${label} · ${formatDashaDate(period.start)} – ${formatDashaDate(period.end)}${period.active ? ` · NOW ${Math.round(elapsed)}%` : ""}`} onClick={() => onSelect(period)} className={`relative h-7 w-full overflow-hidden border-r px-1 text-xs font-semibold transition-colors ${selected ? selectedColor[color] : segmentColors[color]}`}>
                {period.active && <span className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${elapsed}%` }} />}
                <span className="relative">{period.lord}{period.active ? " · NOW" : ""}</span>
              </button>
              <span id={tooltipId} role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-56 -translate-x-1/2 rounded-lg border border-slate-300 bg-slate-950 px-2.5 py-2 text-left text-[11px] leading-4 text-white shadow-xl group-hover/segment:block group-focus-within/segment:block">
                <span className="block font-semibold">{period.lord} {label}</span>
                <span className="block text-slate-300">Start: {formatDashaDate(period.start)}</span>
                <span className="block text-slate-300">End: {formatDashaDate(period.end)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type FlattenedDashaRow = {
  period: EphemerisResponse["dashas"][number];
  depth: number;
  key: string;
};

function dashaRowKey(period: EphemerisResponse["dashas"][number], parentKey = "") {
  const key = `${period.lord}:${period.start}`;
  return parentKey ? `${parentKey}/${key}` : key;
}

function activeDashaBranches(
  periods: EphemerisResponse["dashas"],
  parentKey = "",
  expanded = new Set<string>(),
) {
  for (const period of periods) {
    if (!period.active || !period.periods?.length) continue;
    const key = dashaRowKey(period, parentKey);
    expanded.add(key);
    activeDashaBranches(period.periods, key, expanded);
  }
  return expanded;
}

function flattenDashaRows(
  periods: EphemerisResponse["dashas"],
  expanded: Set<string>,
  depth = 0,
  parentKey = "",
): FlattenedDashaRow[] {
  return periods.flatMap((period) => {
    const key = dashaRowKey(period, parentKey);
    const row = { period, depth, key };
    return expanded.has(key)
      ? [row, ...flattenDashaRows(period.periods ?? [], expanded, depth + 1, key)]
      : [row];
  });
}

function DashaTimeline({ data }: { data: EphemerisResponse }) {
  const [majorStart, setMajorStart] = useState("");
  const [antarStart, setAntarStart] = useState("");
  const [pratyantarStart, setPratyantarStart] = useState("");
  const [sookshmaStart, setSookshmaStart] = useState("");
  const [expandedRows, setExpandedRows] = useState(() => activeDashaBranches(data.dashas));
  const [scrollTop, setScrollTop] = useState(0);
  const currentMajor = findDasha(data.dashas, majorStart);
  const currentAntar = currentMajor ? findDasha(currentMajor.periods ?? [], antarStart) : undefined;
  const currentPratyantar = currentAntar ? findDasha(currentAntar.periods ?? [], pratyantarStart) : undefined;
  const currentSookshma = currentPratyantar ? findDasha(currentPratyantar.periods ?? [], sookshmaStart) : undefined;
  const timeline = useMemo(
    () => data.dashas.filter((period) => period.start && new Date(period.end).getTime() > new Date(data.dashas[0]?.start ?? 0).getTime()),
    [data.dashas],
  );
  const rows = useMemo(() => flattenDashaRows(timeline, expandedRows), [timeline, expandedRows]);
  const rowHeight = 36;
  const overscan = 6;
  const viewportHeight = 360;
  const firstVisible = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const lastVisible = Math.min(rows.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
  useEffect(() => {
    const activeMajor = data.dashas.find((period) => period.active);
    const activeAntar = activeMajor?.periods?.find((period) => period.active);
    const activePratyantar = activeAntar?.periods?.find((period) => period.active);
    const activeSookshma = activePratyantar?.periods?.find((period) => period.active);
    setMajorStart(activeMajor?.start ?? "");
    setAntarStart(activeAntar?.start ?? "");
    setPratyantarStart(activePratyantar?.start ?? "");
    setSookshmaStart(activeSookshma?.start ?? "");
  }, [data.dashas]);
  useEffect(() => {
    setExpandedRows(activeDashaBranches(data.dashas));
    setScrollTop(0);
  }, [data.dashas]);
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-cyan-200 bg-cyan-50/70 p-3 dark:border-cyan-900/60 dark:bg-cyan-950/25">
        <div className="mb-2 flex items-center justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-800 dark:text-cyan-300">Interactive Vimshottari timeline</p><p className="mt-0.5 text-xs text-slate-600">Select any segment to inspect the next level · elapsed progress is shaded</p></div><span className="shrink-0 rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-900 dark:bg-cyan-400/10 dark:text-cyan-200">NOW · {currentMajor?.lord ?? "—"}</span></div>
        <div className="space-y-2.5">
          <DashaLane label="Maha Dasha" periods={timeline} selectedStart={currentMajor?.start ?? ""} onSelect={(period) => { setMajorStart(period.start); setAntarStart(""); setPratyantarStart(""); setSookshmaStart(""); }} color="blue" />
          {currentMajor && <DashaLane label={`${currentMajor.lord} Antar`} periods={currentMajor.periods ?? []} selectedStart={currentAntar?.start ?? ""} onSelect={(period) => { setAntarStart(period.start); setPratyantarStart(""); setSookshmaStart(""); }} color="purple" />}
          {currentAntar && <DashaLane label={`${currentAntar.lord} Pratyantar`} periods={currentAntar.periods ?? []} selectedStart={currentPratyantar?.start ?? ""} onSelect={(period) => { setPratyantarStart(period.start); setSookshmaStart(""); }} color="amber" />}
          {currentPratyantar && <DashaLane label={`${currentPratyantar.lord} Sookshma`} periods={currentPratyantar.periods ?? []} selectedStart={currentSookshma?.start ?? ""} onSelect={(period) => setSookshmaStart(period.start)} color="emerald" />}
        </div>
      </div>
      <div className="max-h-[360px] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800" onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
        <div role="table" aria-label="Vimshottari Dasha periods" aria-rowcount={rows.length + 1} className="min-w-[560px] text-xs">
          <div role="rowgroup" className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wider text-slate-600 dark:bg-slate-900">
            <div role="row" className="grid h-9 grid-cols-[minmax(120px,1fr)_60px_86px_86px_100px] items-center">
              {["Level", "Lord", "Start", "End", "Status"].map((heading) => <div role="columnheader" key={heading} className="px-2 font-medium">{heading}</div>)}
            </div>
          </div>
          <div role="rowgroup">
            <div aria-hidden="true" style={{ height: firstVisible * rowHeight }} />
            {rows.slice(firstVisible, lastVisible).map(({ period, depth, key }, visibleIndex) => {
              const nestedPeriods = period.periods ?? [];
              const expanded = expandedRows.has(key);
              return (
                <div key={key} role="row" aria-rowindex={firstVisible + visibleIndex + 2} className={`grid h-9 grid-cols-[minmax(120px,1fr)_60px_86px_86px_100px] items-center border-t border-slate-100 dark:border-slate-800 ${period.active ? "bg-cyan-50/80 dark:bg-cyan-950/25" : "hover:bg-slate-50 dark:hover:bg-slate-800/30"}`}>
                  <div role="cell" className="truncate px-2 font-medium" style={{ paddingLeft: `${8 + depth * 14}px` }}>
                    <button
                      type="button"
                      disabled={!nestedPeriods.length}
                      aria-expanded={nestedPeriods.length ? expanded : undefined}
                      onClick={() => setExpandedRows((current) => {
                        const next = new Set(current);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      })}
                      className="inline-flex items-center gap-1.5 disabled:cursor-default"
                    >
                      {nestedPeriods.length ? <ChevronDown className={`size-3 text-slate-600 transition ${expanded ? "" : "-rotate-90"}`} /> : <span className="w-3" />}
                      <span>{DASHA_LEVELS[depth] ?? "Period"}</span>
                    </button>
                  </div>
                  <div role="cell" className="truncate px-2 font-semibold">{period.lord}</div>
                  <div role="cell" className="truncate px-2 text-slate-600">{formatDashaDate(period.start)}</div>
                  <div role="cell" className="truncate px-2 text-slate-600">{formatDashaDate(period.end)}</div>
                  <div role="cell" className="truncate px-2">{period.active ? <span className="rounded bg-cyan-100 px-1.5 py-0.5 text-[10px] font-bold text-cyan-900 dark:bg-cyan-400/10 dark:text-cyan-200">NOW · {Math.round(dashaProgress(period, Date.now()))}%</span> : <span className="text-slate-400">—</span>}</div>
                </div>
              );
            })}
            <div aria-hidden="true" style={{ height: Math.max(0, rows.length - lastVisible) * rowHeight }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashaTab({
  data,
  system,
  onSystemChange,
  seed,
  onSeedChange,
}: {
  data: EphemerisResponse | null;
  system: DashaSystem;
  onSystemChange: (value: DashaSystem) => void;
  seed: DashaSeed;
  onSeedChange: (value: DashaSeed) => void;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5" aria-labelledby="dasha-heading">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h3 id="dasha-heading" className="text-sm font-semibold">Vimshottari Dasha</h3><p className="mt-1 text-xs text-muted-foreground">Maha · Antar · Pratyantar · Sookshma</p></div>
        <div className="flex gap-2">
          <label className="text-xs text-muted-foreground">System<select value={system} onChange={(event) => onSystemChange(event.target.value as DashaSystem)} className="mt-1 h-8 rounded-lg border border-input bg-card px-2 text-xs text-card-foreground"><option value="vimshottari">Vimshottari</option><option value="chara">Chara Dasha</option><option value="ashtottari">Ashtottari</option><option value="yogini">Yogini</option></select></label>
          <label className="text-xs text-muted-foreground">Calculation seed<select value={seed} onChange={(event) => onSeedChange(event.target.value as DashaSeed)} className="mt-1 h-8 rounded-lg border border-input bg-card px-2 text-xs text-card-foreground"><option value="moon">Moon</option><option value="ascendant">Ascendant</option><option value="sun">Sun</option></select></label>
        </div>
      </header>
      {system !== "vimshottari" && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">The current ephemeris engine provides Vimshottari periods. {system[0].toUpperCase() + system.slice(1)} is selected as a view preference, but its period calculations are not represented as Vimshottari.</p>}
      {data && system === "vimshottari"
        ? <DashaTimeline data={data} />
        : <div className="grid h-32 place-items-center text-xs text-slate-600">{data ? "Select Vimshottari to display calculated periods." : "Dasha timeline appears after calculation."}</div>}
    </section>
  );
}

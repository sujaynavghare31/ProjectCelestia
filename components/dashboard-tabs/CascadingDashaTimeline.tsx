"use client";

import { useEffect, useMemo, useRef } from "react";
import type { DashaPeriodNode, DashaSystem } from "@/lib/astrology/timing/DashaEngine";
import { createDashaSubperiods } from "@/lib/astrology/timing/period-expansion";
import { DASHA_LORDS } from "@/lib/astrology/timing/sequences";

const TRACKS: Record<DashaSystem, string[]> = {
  vimshottari: ["Maha", "Antar", "Pratyantar", "Sookshma"],
  ashtottari: ["Maha", "Antar", "Pratyantar"],
  yogini: ["Maha", "Antar", "Pratyantar"],
  chara: ["Maha", "Antar"],
  kalachakra: ["Deha/Jeeva Maha", "Antar"],
};

// AI WARNING: Dasha graph color coding is user-locked. Do not edit this shared desktop/mobile palette without explicit user approval.
// Use the user-approved pastel palette from portal_theme.docx.
const PLANET_COLORS: Record<string, string> = {
  Sun: "bg-orange-100 text-orange-950 border-orange-200 dark:bg-orange-950/50 dark:text-orange-100 dark:border-orange-800",
  Moon: "bg-sky-100 text-sky-950 border-sky-200 dark:bg-sky-950/50 dark:text-sky-100 dark:border-sky-800",
  Mars: "bg-pink-100 text-pink-950 border-pink-200 dark:bg-pink-950/50 dark:text-pink-100 dark:border-pink-800",
  Mercury: "bg-green-100 text-green-950 border-green-200 dark:bg-green-950/50 dark:text-green-100 dark:border-green-800",
  Jupiter: "bg-yellow-100 text-yellow-950 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-100 dark:border-yellow-800",
  Venus: "bg-rose-100 text-rose-950 border-rose-200 dark:bg-rose-950/50 dark:text-rose-100 dark:border-rose-800",
  Saturn: "bg-[#EFE0D2] text-[#593A28] border-[#D8C0A8] dark:bg-[#4A3425] dark:text-[#F4E7DA] dark:border-[#795C43]",
  Rahu: "bg-purple-100 text-purple-950 border-purple-200 dark:bg-purple-950/50 dark:text-purple-100 dark:border-purple-800",
  Ketu: "bg-cyan-100 text-cyan-950 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-100 dark:border-cyan-800",
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

function mobileColorClassesFor(period: DashaPeriodNode, system: DashaSystem) {
  const planet = system === "chara" || system === "kalachakra"
    ? SIGN_RULERS[period.lord]
    : YOGINI_PLANETS[period.lord] ?? period.lord;
  return PLANET_COLORS[planet ?? ""] ?? PLANET_COLORS.Saturn;
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

function mahaSiblings(period: DashaPeriodNode) {
  const activeIndex = DASHA_LORDS.findIndex(({ lord }) => lord === period.lord);
  if (activeIndex < 0) return [period];

  const yearMs = (period.yearLengthDays || 365.2425) * 86_400_000;
  const currentBounds = periodBounds(period);
  const cycleStart = currentBounds.start -
    DASHA_LORDS.slice(0, activeIndex).reduce((years, item) => years + item.years, 0) * yearMs;
  let elapsedYears = 0;

  return DASHA_LORDS.map(({ lord, years }) => {
    const start = cycleStart + elapsedYears * yearMs;
    elapsedYears += years;
    const end = cycleStart + elapsedYears * yearMs;
    return {
      ...period,
      id: `maha:${lord}:${new Date(start).toISOString()}`,
      lord,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      durationYears: years,
      details: undefined,
      subPeriods: [],
    };
  });
}

function formatChipDuration(period: DashaPeriodNode) {
  const days = durationInDays(period);
  const years = days / (period.yearLengthDays || 365.2425);
  return years < 1 ? `${Math.max(1, Math.round(days))}d` : `${Math.round(years)}y`;
}

function mobileSelectionPath(
  activePath: DashaPeriodNode[],
  period: DashaPeriodNode,
  level: number,
  system: DashaSystem,
  activeTime: number,
) {
  const path = [...activePath.slice(0, level), period];
  let selected = period;
  for (let depth = level + 1; depth < TRACKS[system].length; depth += 1) {
    const children = getTimelineChildren(selected, system);
    const child = children.find((candidate) => isActiveAt(candidate, activeTime)) ?? children[0];
    if (!child) break;
    path.push(child);
    selected = child;
  }
  return path;
}

function MobileVimshottariTimeline({
  activeTime,
  activePath,
  selectedPath,
  onSelectPath,
}: {
  activeTime: number;
  activePath: DashaPeriodNode[];
  selectedPath: DashaPeriodNode[] | null;
  onSelectPath: (path: DashaPeriodNode[]) => void;
}) {
  const labels = TRACKS.vimshottari;
  const rows = useMemo(() => labels.map((label, level) => {
    const activePeriod = activePath[level];
    const parent = activePath[level - 1];
    const siblings = level === 0 && activePeriod
      ? mahaSiblings(activePeriod)
      : parent ? getTimelineChildren(parent, "vimshottari") : [];
    return { label, level, siblings, activePeriod };
  }), [activePath, labels]);
  const activeIds = rows.map(({ activePeriod }) => activePeriod?.id ?? "").join("|");
  const activeChipRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const siblingStripRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    activeChipRefs.current.forEach((element, level) => {
      const strip = siblingStripRefs.current[level];
      if (!element || !strip) return;
      const sidePadding = Math.max(0, (strip.clientWidth - element.offsetWidth) / 2);
      strip.style.paddingInline = `${sidePadding}px`;
      element.scrollIntoView({ inline: "center", block: "nearest" });
    });
  }, [activeIds]);

  const summary = activePath.length
    ? `Current dasha is ${activePath.map(({ lord }) => lord).join(" > ")}`
    : "Current dasha is outside the calculated period range";

  return (
    <section aria-label="Dasha timeline" className="space-y-4 rounded-xl border border-border bg-card px-3 py-4 text-card-foreground">
      <header className="space-y-2 text-center">
        <h3 className="text-sm font-semibold leading-5">{summary}</h3>
        <span className="inline-flex rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-foreground">Now</span>
      </header>

      <div className="space-y-4">
        {rows.map(({ label, level, siblings, activePeriod }) => {
          if (!activePeriod) return null;
          const bounds = periodBounds(activePeriod);
          const progress = percentageAt(activeTime, bounds.start, bounds.end);
          const elapsed = formatElapsedRemaining(activePeriod, activeTime)
            .replace(" | ", " · ")
            .replace(" to go", " left");
          const selectedId = selectedPath?.[level]?.id ?? activePath[level]?.id;

          return (
            <section key={label} aria-label={`${label} dasha periods`} className="min-w-0 space-y-2">
              <div className="flex min-w-0 items-baseline justify-between gap-2">
                <h4 className="min-w-0 truncate text-xs font-semibold">
                  <span className="uppercase tracking-wide">{label}</span> · {activePeriod.lord}
                </h4>
                <span className="shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{elapsed}</span>
              </div>

              <div
                role="progressbar"
                aria-label={`${label} ${activePeriod.lord} elapsed`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                className="relative h-2.5 rounded-full bg-muted"
              >
                <span className="absolute inset-y-0 left-0 rounded-full bg-[#C05A3A]" style={{ width: `${progress}%` }} />
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-[#C05A3A]"
                  style={{ left: `${progress}%` }}
                />
              </div>
              <p className="text-right text-[9px] tabular-nums text-muted-foreground">{Math.round(progress)}% elapsed</p>

              <div
                ref={(element) => { siblingStripRefs.current[level] = element; }}
                className="no-scrollbar flex gap-1.5 overflow-x-auto py-1"
              >
                {siblings.map((period) => {
                  const isActive = period.id === activePeriod.id ||
                    (level === 0 && period.lord === activePeriod.lord && isActiveAt(period, activeTime));
                  const isSelected = period.id === selectedId || (level === 0 && isActive && selectedId === activePath[0]?.id);
                  return (
                    <button
                      key={period.id}
                      ref={isActive ? (element) => { activeChipRefs.current[level] = element; } : undefined}
                      type="button"
                      aria-pressed={isSelected}
                      aria-current={isActive ? "time" : undefined}
                      onClick={() => onSelectPath(mobileSelectionPath(activePath, period, level, "vimshottari", activeTime))}
                      className={`min-h-11 shrink-0 min-w-[70px] rounded-lg border px-2.5 py-1.5 text-center text-xs leading-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/50 ${
                        isSelected
                          ? "border-[#C05A3A] bg-[#C05A3A]/10 font-semibold text-[#C05A3A]"
                          : mobileColorClassesFor(period, "vimshottari")
                      }`}
                    >
                      {PLANET_ABBREVIATIONS[period.lord] ?? period.lord.slice(0, 2)} · {formatChipDuration(period)}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export default function CascadingDashaTimeline({
  periods,
  system,
  activeDate,
  selectedPath,
  onSelectPath,
}: {
  periods: DashaPeriodNode[];
  system: DashaSystem;
  activeDate: Date | number;
  selectedPath?: DashaPeriodNode[] | null;
  onSelectPath?: (path: DashaPeriodNode[]) => void;
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
    <>
      {system === "vimshottari" && onSelectPath && (
        <div className="md:hidden">
          <MobileVimshottariTimeline
            activeTime={activeTime}
            activePath={activePath}
            selectedPath={selectedPath ?? null}
            onSelectPath={onSelectPath}
          />
        </div>
      )}
      <div className={system === "vimshottari" ? "hidden md:block" : undefined}>
        <section aria-label="Dasha timeline" className="space-y-3 rounded-xl border border-border bg-card px-3 py-4 sm:px-4">
          <div className="text-center">
            <h3 className="text-sm font-semibold">{summary}</h3>
            <div className="mt-1 flex items-center justify-center gap-2">
              <p className="text-[10px] text-muted-foreground">Maha window · active parent subperiods</p>
              <span className="rounded bg-accent px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-accent-foreground">Now</span>
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
                            <span className="absolute -top-6 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-muted-foreground">
                              {durationLabel}
                            </span>
                            <div className={`flex h-full w-full items-center justify-center overflow-hidden border-r px-0.5 text-xs font-medium transition-colors duration-200 ${colorClassesFor(period, system)} ${active ? "ring-1 ring-inset ring-current/40" : ""}`}>
                              <span className="truncate">
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
                        className="pointer-events-none absolute bottom-0 top-0 z-10 border-l border-dashed border-primary"
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
      </div>
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarClock } from "lucide-react";
import type { EphemerisResponse } from "@/lib/kundali-types";
import { localDateTimeToUtc } from "@/lib/astrology/timezone";
import { GRAHAS } from "@/lib/astrology/avastha/types";
import type { Graha } from "@/lib/astrology/avastha/types";
import { SIGN_LORDS } from "@/lib/astrology/avastha/graha";
import { addDashaHorizon, calculateDashaSystem } from "@/lib/astrology/timing/DashaEngine";
import type { DashaEngineResult, DashaPeriodNode, DashaSystem } from "@/lib/astrology/timing/DashaEngine";
import { hasTimingBoundaryOverlap } from "@/lib/astrology/timing/boundaries";
import type { DashaSeed, TimingInput } from "@/lib/astrology/timing/types";
import { createDashaSubperiods } from "@/lib/astrology/timing/period-expansion";
import { readSavedAstrologyConfig } from "@/lib/astrology/config-storage";
import DashaControlBar, { type DashaLagnaMode } from "./DashaControlBar";
import CascadingDashaTimeline from "./CascadingDashaTimeline";
import DashaLagnaChart from "./DashaLagnaChart";
import DashaSummaryCards from "./DashaSummaryCards";
import DashaTable from "./DashaTable";

const SYSTEM_LABELS: Record<DashaSystem, string> = {
  vimshottari: "Vimshottari",
  ashtottari: "Ashtottari",
  yogini: "Yogini",
  chara: "Chara Dasha",
  kalachakra: "Kalachakra",
};

const VISIBLE_LEVELS: Record<DashaSystem, number> = {
  vimshottari: 4,
  ashtottari: 3,
  yogini: 3,
  chara: 2,
  kalachakra: 2,
};

function makeTimingInput(data: EphemerisResponse, seed: DashaSeed): TimingInput {
  const planets = data.planets
    .filter(({ name }) => GRAHAS.includes(name as Graha))
    .map(({ name, longitude, speed }) => ({ planet: name as Graha, longitude, speed }));
  if (planets.length !== GRAHAS.length) throw new Error("The calculated chart is missing one or more of the nine grahas.");
  const birth = localDateTimeToUtc(data.input.date, data.input.time, data.input.timezone);
  const config = readSavedAstrologyConfig();
  return {
    birthDateTimeUTC: birth.toISOString(),
    timezone: data.input.timezone,
    planets,
    ascendantLongitude: data.ascendant.longitude,
    dashaSeed: seed,
    ...(data.input.gender === "male" || data.input.gender === "female" ? { gender: data.input.gender } : {}),
    fromDate: birth.toISOString(),
    ...(config ? { config: config.timing } : {}),
  };
}

function activePath(periods: DashaPeriodNode[], system: DashaSystem, now: number) {
  const path: DashaPeriodNode[] = [];
  let candidates = periods;
  for (let depth = 0; depth < VISIBLE_LEVELS[system]; depth += 1) {
    const active = candidates.find((period) => Date.parse(period.start) <= now && now < Date.parse(period.end));
    if (!active) break;
    path.push(active);
    candidates = active.subPeriods.length ? active.subPeriods : createDashaSubperiods(active, system);
  }
  return path;
}

function hasBoundaryOverlap(data: EphemerisResponse, seed: DashaSeed) {
  const ascendantLord = SIGN_LORDS[data.ascendant.sign];
  const seedLongitude = seed === "ascendant"
    ? data.ascendant.longitude
    : seed === "sun" ? data.planets.find(({ name }) => name === "Sun")?.longitude
      : seed === "ascendant-lord" ? data.planets.find(({ name }) => name === ascendantLord)?.longitude
        : data.planets.find(({ name }) => name === "Moon")?.longitude;
  if (seedLongitude === undefined) return false;
  return hasTimingBoundaryOverlap({
    seed,
    seedLongitude,
    ascendantLongitude: data.ascendant.longitude,
    planetLongitudes: data.planets.map(({ longitude }) => longitude),
    houseCusps: data.houseCusps.map(({ longitude }) => longitude),
  });
}

function formatSeed(seed: DashaSeed) {
  return seed === "ascendant-lord" ? "Ascendant Lord" : seed[0].toUpperCase() + seed.slice(1);
}

export default function DashaDashboard({
  data,
  system,
  onSystemChange,
  seed,
  onSeedChange,
  lagnaMode,
  onLagnaModeChange,
}: {
  data: EphemerisResponse | null;
  system: DashaSystem;
  onSystemChange: (value: DashaSystem) => void;
  seed: DashaSeed;
  onSeedChange: (value: DashaSeed) => void;
  lagnaMode: DashaLagnaMode;
  onLagnaModeChange: (value: DashaLagnaMode) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const calculation = useMemo((): { result: DashaEngineResult | null; error: string } => {
    if (!data) return { result: null, error: "" };
    try {
      const input = addDashaHorizon(makeTimingInput(data, seed), system === "vimshottari" ? 120 : 100);
      return { result: calculateDashaSystem(system, input), error: "" };
    } catch (reason) {
      return {
        result: null,
        error: reason instanceof Error ? reason.message : `Could not calculate ${SYSTEM_LABELS[system]}.`,
      };
    }
  }, [data, seed, system]);

  const result = calculation.result;
  const currentPath = result ? activePath(result.periods, system, now) : [];
  const activeMaha = currentPath[0];
  const activeAntar = currentPath[1];
  const selectedLord = lagnaMode === "antar-lord" ? activeAntar?.lord : activeMaha?.lord;
  const dashaLagnaLord = lagnaMode === "natural" ? undefined : selectedLord;
  const boundaryWarning = data ? hasBoundaryOverlap(data, seed) : false;

  return (
    <section className="space-y-4 text-foreground" aria-labelledby="dasha-heading">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="dasha-heading" className="text-xl font-semibold tracking-tight">Dasha systems</h2>
          <p className="mt-1 text-xs text-muted-foreground">Local calculations from the chart’s Swiss Ephemeris positions.</p>
        </div>
        {result && <p className="text-xs text-muted-foreground">{result.title} · {result.cycleYears}-year cycle</p>}
      </header>

      <DashaControlBar
        system={system}
        seed={seed}
        lagnaMode={lagnaMode}
        onSystemChange={onSystemChange}
        onSeedChange={onSeedChange}
        onLagnaModeChange={onLagnaModeChange}
      />

      {!data && (
        <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center">
          <div>
            <CalendarClock className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">Calculate a birth chart to view Dasha periods</p>
            <p className="mt-1 text-xs text-muted-foreground">The selected system will run locally using the saved birth-chart positions.</p>
          </div>
        </div>
      )}

      {calculation.error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{calculation.error}</span>
        </div>
      )}

      {boundaryWarning && (
        <p role="status" className="rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          The {formatSeed(seed)} seed or a natal house placement is near a sign, nakshatra, or house boundary. If the recorded birth time is uncertain by 5–10 minutes, the selected calculation or house assignment may shift.
        </p>
      )}

      {result?.notices?.map((notice) => (
        <p key={notice} role="status" className="rounded-lg border border-sky-300/80 bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
          {notice}
        </p>
      ))}

      {result && (
        <div className={`grid items-start gap-4 ${system === "vimshottari" ? "lg:grid-cols-[minmax(0,1.8fr)_minmax(285px,1fr)]" : "grid-cols-1"}`}>
          <div className="min-w-0 space-y-4">
            {result.nakshatra && (
              <p className="text-[11px] text-muted-foreground">
                {formatSeed(seed)} in {result.nakshatra.name} · {(result.nakshatra.progress * 100).toFixed(2)}% elapsed · {(result.nakshatra.remaining * 100).toFixed(2)}% remaining
              </p>
            )}
            <CascadingDashaTimeline periods={result.periods} system={system} activeDate={now} />
            <DashaSummaryCards system={system} activePath={currentPath} />
            <DashaTable key={`${system}-${seed}-${data?.calculatedAt}`} periods={result.periods} title={result.title} system={system} />
          </div>
          {system === "vimshottari" && data && (
            <aside className="space-y-3 lg:sticky lg:top-4">
              <DashaLagnaChart data={data} activeLord={dashaLagnaLord} />
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {dashaLagnaLord ? `${dashaLagnaLord}’s natal sign is treated as the first house.` : "The natal Ascendant remains the first house."}
              </p>
            </aside>
          )}
        </div>
      )}
    </section>
  );
}

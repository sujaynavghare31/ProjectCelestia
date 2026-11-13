"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CalendarClock, RefreshCw } from "lucide-react";
import type { EphemerisResponse } from "@/lib/kundali-types";
import { localDateTimeToUtc } from "@/lib/astrology/timezone";
import { GRAHAS } from "@/lib/astrology/avastha/types";
import type { Graha } from "@/lib/astrology/avastha/types";
import type { NadiEngineResult, DashaEngineResult, DashaPeriodNode, DashaSystem } from "@/lib/astrology/timing/DashaEngine";
import type { TimingInput } from "@/lib/astrology/timing/types";
import { readSavedAstrologyConfig } from "@/lib/astrology/config-storage";
import ActivePeriodCard from "./ActivePeriodCard";
import DashaTable from "./DashaTable";

const SYSTEM_OPTIONS: Array<{ id: DashaSystem | "nadi"; label: string; cycle: string }> = [
  { id: "vimshottari", label: "Vimshottari", cycle: "120-year cycle" },
  { id: "yogini", label: "Yogini", cycle: "36-year cycle" },
  { id: "ashtottari", label: "Ashtottari", cycle: "108-year cycle" },
  { id: "chara", label: "Chara Dasha", cycle: "Sign-based" },
  { id: "nadi", label: "Nadi Progression", cycle: "Annual progression" },
];

type DashaViewSystem = DashaSystem | "nadi";
type DashaResult = DashaEngineResult | NadiEngineResult;

function isDashaResult(value: unknown): value is DashaResult {
  if (!value || typeof value !== "object" || !("system" in value) || !("title" in value)) return false;
  const result = value as { system?: unknown; title?: unknown; periods?: unknown; timeline?: unknown; progressedPlanets?: unknown };
  if (typeof result.title !== "string") return false;
  if (result.system === "nadi") return Array.isArray(result.timeline) && Array.isArray(result.progressedPlanets);
  return ["vimshottari", "yogini", "ashtottari", "chara"].includes(String(result.system)) && Array.isArray(result.periods);
}

function makeTimingInput(data: EphemerisResponse): TimingInput {
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
    ...(data.input.gender === "male" || data.input.gender === "female" ? { gender: data.input.gender } : {}),
    fromDate: birth.toISOString(),
    ...(config ? { config: config.timing } : {}),
  };
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function findCurrent(periods: DashaPeriodNode[], now: number): DashaPeriodNode[] {
  const current = periods.find((period) => Date.parse(period.start) <= now && now < Date.parse(period.end));
  if (!current) return [];
  return [current, ...findCurrent(current.subPeriods, now)];
}

function NadiProgressionVisualizer({ result }: { result: NadiEngineResult }) {
  const currentYear = result.timeline.find(({ ageYear }) => ageYear === Math.floor(result.ageYears) + 1);
  const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  const planetColors: Record<"Jupiter" | "Saturn" | "Rahu" | "Ketu", string> = {
    Jupiter: "#2563eb",
    Saturn: "#475569",
    Rahu: "#7c3aed",
    Ketu: "#0f766e",
  };
  const progresses = result.progressedPlanets.filter(
    (planet): planet is typeof planet & { planet: keyof typeof planetColors } => planet.planet in planetColors,
  );
  const centers: Record<number, [number, number]> = {
    1: [180, 78], 2: [88, 42], 3: [42, 90], 4: [84, 180], 5: [42, 270], 6: [88, 318],
    7: [180, 282], 8: [272, 318], 9: [318, 270], 10: [276, 180], 11: [318, 90], 12: [272, 42],
  };
  const housePolygons: Record<number, string> = {
    1: "180,10 265,95 180,180 95,95",
    2: "10,10 180,10 95,95 10,180",
    3: "10,10 95,95 10,180",
    4: "10,180 95,95 180,180 95,265",
    5: "10,180 95,265 10,350",
    6: "10,350 95,265 180,350",
    7: "180,180 265,265 180,350 95,265",
    8: "180,350 265,265 350,350",
    9: "350,350 265,265 350,180",
    10: "350,180 265,265 180,180 265,95",
    11: "350,180 265,95 350,10",
    12: "350,10 265,95 180,10",
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
        <figure className="rounded-xl border border-border bg-muted/20 p-3">
          <figcaption className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">Nadi sign progression</span>
            <span className="text-[10px] tabular-nums text-muted-foreground">Age {result.ageYears.toFixed(1)}</span>
          </figcaption>
          <svg viewBox="0 0 360 360" role="img" aria-labelledby="nadi-chart-title nadi-chart-description" className="mx-auto block w-full max-w-[340px]">
            <title id="nadi-chart-title">North Indian Nadi progression chart</title>
            <desc id="nadi-chart-description">A twelve-house diamond chart showing Jupiter, Saturn, Rahu, and Ketu progressed one sign per twelve years from the natal ascendant.</desc>
            <rect x="10" y="10" width="340" height="340" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--chart-grid))" strokeWidth="1" />
            {Array.from({ length: 12 }, (_, index) => {
              const house = index + 1;
              return (
                <polygon
                  key={`house-${house}`}
                  points={housePolygons[house]}
                  fill={house === result.activeBcpHouse ? "rgb(245 158 11 / 0.13)" : "transparent"}
                />
              );
            })}
            <path d="M10 10 350 350M350 10 10 350M180 10 350 180 180 350 10 180 180 10" fill="none" stroke="hsl(var(--chart-grid))" strokeWidth="1" />
            {Array.from({ length: 12 }, (_, index) => {
              const house = index + 1;
              const sign = ((result.lagnaSign - 1 + house - 1) % 12) + 1;
              const [x, y] = centers[house];
              const bodies = progresses.filter(({ progressedHouse }) => progressedHouse === house);
              return (
                <g key={`labels-${house}`}>
                  <text x={x} y={y - 11} textAnchor="middle" fill={house === 1 ? "hsl(var(--champagne-gold))" : "hsl(var(--muted-foreground))"} fontSize="8">
                    H{house} · {signs[sign - 1].toUpperCase()}
                  </text>
                  {bodies.map(({ planet }, index) => (
                    <text key={planet} x={x} y={y + 6 + index * 12} textAnchor="middle" fill={planetColors[planet]} fontSize="10" fontWeight="700">
                      {planet}
                      <title>{`${planet}, progressed to house ${house}`}</title>
                    </text>
                  ))}
                </g>
              );
            })}
          </svg>
          <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
            {progresses.map(({ planet }) => <span key={planet} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><span className="size-2 rounded-full" style={{ backgroundColor: planetColors[planet] }} />{planet}</span>)}
          </div>
        </figure>

        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Annual house activation</p>
              <p className="mt-1 text-lg font-semibold">House {result.activeBcpHouse}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Bhrigu Chakra Paddhati advances one house each year.</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Planetary progression</p>
              <p className="mt-1 text-lg font-semibold">+{result.ageYears.toFixed(1)}° from natal</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Longitude advances at 1° per year; the chart placement advances one sign per 12 years.</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[460px] text-left text-xs">
              <thead className="bg-muted text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-3 py-2 font-semibold">Planet</th><th className="px-3 py-2 font-semibold">Progressed longitude</th><th className="px-3 py-2 font-semibold">Sign at 12-year rate</th><th className="px-3 py-2 text-right font-semibold">House</th></tr>
              </thead>
              <tbody>
                {progresses.map((planet) => (
                  <tr key={planet.planet} className="border-t border-border/70">
                    <th scope="row" className="px-3 py-2 font-medium">{planet.planet}</th>
                    <td className="px-3 py-2 tabular-nums">{Math.floor(planet.progressedLongitude / 30) + 1} · {planet.progressedDegree.toFixed(2)}°</td>
                    <td className="px-3 py-2 tabular-nums">Sign {planet.signAtOnePerTwelveYears}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{planet.progressedHouse}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {currentYear && (
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              Current annual cycle: {formatDate(currentYear.start)}–{formatDate(currentYear.end)}
              {currentYear.bcp ? ` · ${currentYear.bcp.signLord} rules activated house ${currentYear.bcp.activatedHouse}` : ""}
              {currentYear.transitEvents.length + currentYear.bhriguBinduHits.length > 0
                ? ` · ${currentYear.transitEvents.length + currentYear.bhriguBinduHits.length} transit activation${currentYear.transitEvents.length + currentYear.bhriguBinduHits.length === 1 ? "" : "s"}`
                : " · no sampled BNN or Bhrigu Bindu hits"}
            </p>
          )}
        </div>
      </div>
      <details className="rounded-lg border border-border px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium">How to read these progressions</summary>
        <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-muted-foreground">
          The two rates in the specification describe separate tracks: natal longitudes advance one degree per year, while the sign ring advances one sign per twelve years. BCP is shown separately as a one-house-per-year cycle. Transit events are sampled by the server-side Swiss Ephemeris provider and are listed only for the current annual period.
        </p>
      </details>
    </div>
  );
}

function LoadingPanel({ system }: { system: DashaViewSystem }) {
  const label = SYSTEM_OPTIONS.find(({ id }) => id === system)?.label ?? system;
  return (
    <div role="status" className="space-y-3 rounded-xl border border-border p-4" aria-label={`Loading ${label}`}>
      <div className="h-4 w-44 animate-pulse rounded bg-muted" />
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="h-24 animate-pulse rounded-lg bg-muted/60" />
        <div className="h-24 animate-pulse rounded-lg bg-muted/60" />
        <div className="h-24 animate-pulse rounded-lg bg-muted/60" />
      </div>
      <div className="h-44 animate-pulse rounded-lg bg-muted/40" />
    </div>
  );
}

export default function DashaDashboard({
  data,
  system,
  onSystemChange,
}: {
  data: EphemerisResponse | null;
  system: DashaViewSystem;
  onSystemChange: (value: DashaViewSystem) => void;
}) {
  const [result, setResult] = useState<DashaResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestNumber, setRequestNumber] = useState(0);
  const title = SYSTEM_OPTIONS.find(({ id }) => id === system)?.label ?? "Dasha Systems";
  const cycle = SYSTEM_OPTIONS.find(({ id }) => id === system)?.cycle;
  const displayTitle = result?.title ?? title;

  useEffect(() => {
    if (!data) {
      setResult(null);
      setError("");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      setResult(null);
      try {
        const response = await fetch(`/api/astrology/dasha-engine/${system}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(makeTimingInput(data)),
          signal: controller.signal,
        });
        const body = await response.json() as unknown;
        if (!response.ok) {
          const message = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : `Could not calculate ${title}.`;
          throw new Error(message);
        }
        if (!isDashaResult(body) || body.system !== system) throw new Error(`The server returned an invalid ${title} timeline.`);
        setResult(body);
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : `Could not calculate ${title}.`);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [data, system, requestNumber, title]);

  const retry = () => setRequestNumber((number) => number + 1);
  const isNadi = result?.system === "nadi";
  const periods = result && result.system !== "nadi" ? result.periods : [];
  const currentDasha = periods.length ? findCurrent(periods, Date.now()) : [];
  const current = isNadi
    ? result.timeline.find(({ ageYear }) => ageYear === Math.floor(result.ageYears) + 1)
    : undefined;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5" aria-labelledby="dasha-heading">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 id="dasha-heading" className="text-lg font-semibold tracking-tight">{displayTitle}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {cycle ?? "Choose a Dasha system"}{result?.system === "nadi" ? ` · current BCP house ${result.activeBcpHouse}` : ""}
          </p>
        </div>
        <label className="grid gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Dasha system
          <select
            aria-label="Dasha system"
            value={system}
            onChange={(event) => onSystemChange(event.target.value as DashaViewSystem)}
            className="h-9 min-w-48 rounded-lg border border-input bg-card px-3 text-xs font-medium normal-case tracking-normal text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/40"
          >
            {SYSTEM_OPTIONS.map(({ id, label: option }) => <option key={id} value={id}>{option}</option>)}
          </select>
        </label>
      </header>

      {!data && (
        <div className="grid min-h-40 place-items-center rounded-lg border border-dashed border-border bg-muted/20 px-4 text-center">
          <div><CalendarClock className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-sm font-medium">Calculate a birth chart to view Dasha periods</p><p className="mt-1 text-xs text-muted-foreground">Your selected system will generate its timeline from the saved birth details.</p></div>
        </div>
      )}
      {data && loading && <LoadingPanel system={system} />}
      {data && error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
          <span className="inline-flex items-start gap-2"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</span>
          <button type="button" onClick={retry} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-current/20 px-2.5 font-medium hover:bg-black/5 dark:hover:bg-white/5"><RefreshCw className="size-3.5" /> Retry</button>
        </div>
      )}
      {data && result && !isNadi && (
        <>
          {result.nakshatra && (
            <p className="text-[11px] text-muted-foreground">
              Moon in {result.nakshatra.name} · {(result.nakshatra.progress * 100).toFixed(2)}% elapsed · {(result.nakshatra.remaining * 100).toFixed(2)}% remaining
            </p>
          )}
          <ActivePeriodCard periods={periods} system={result.system} />
          <DashaTable key={`${system}-${data.calculatedAt}`} periods={periods} title={result.title} system={result.system} />
        </>
      )}
      {data && result?.system === "nadi" && (
        <>
          <div className="rounded-lg bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            Age {result.ageYears.toFixed(1)} · activated house {result.activeBcpHouse}
            {current?.bcp ? ` · ${current.bcp.signLord} is current annual lord` : ""}
          </div>
          <NadiProgressionVisualizer result={result} />
        </>
      )}
      {data && result && !isNadi && currentDasha.length > 0 && (
        <p className="sr-only" aria-live="polite">
          Current periods: {currentDasha.map(({ lord, name }) => `${name} ${lord}`).join(", ")}.
        </p>
      )}
    </section>
  );
}

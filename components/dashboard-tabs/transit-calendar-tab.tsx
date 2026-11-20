"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Sparkles, Sun } from "lucide-react";
import type { BirthProfile } from "@/lib/kundali-store";
import type { NodeType, PlanetPosition, ZodiacMode } from "@/lib/kundali-types";
import { CALENDAR_BODIES, deriveTransitEvents, fetchTransitSamples, getCachedTransitSamples, type TransitSample } from "@/lib/astrology/transit-calendar";
import EphemerisLoader from "@/components/dashboard-tabs/ephemeris-loader";

const YEARS = [2025, 2026, 2027] as const;
const PLANET_COLORS: Record<string, string> = {
  Sun: "text-amber-700", Moon: "text-slate-500", Mars: "text-red-700", Mercury: "text-emerald-700",
  Jupiter: "text-orange-700", Venus: "text-pink-700", Saturn: "text-indigo-700", Rahu: "text-stone-700",
  Ketu: "text-stone-600", Uranus: "text-sky-700", Neptune: "text-blue-700", Pluto: "text-violet-700",
};
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function getMonth(date: string) {
  return Number(date.slice(5, 7)) - 1;
}

function latestByPlanet(samples: TransitSample[]) {
  const latest = new Map<string, { date: string; planet: PlanetPosition }>();
  samples.forEach((sample) => sample.planets.forEach((planet) => {
    if (CALENDAR_BODIES.includes(planet.name as typeof CALENDAR_BODIES[number])) latest.set(planet.name, { date: sample.date, planet });
  }));
  return latest;
}

function MonthlyCard({
  month,
  events,
  sample,
}: {
  month: number;
  events: ReturnType<typeof deriveTransitEvents>;
  sample: TransitSample | undefined;
}) {
  const activeRetrogrades = sample?.planets.filter((planet) => CALENDAR_BODIES.includes(planet.name as typeof CALENDAR_BODIES[number]) && planet.motion === "R") ?? [];
  const combustBodies = sample?.planets.filter((planet) => {
    if (planet.name === "Sun" || !CALENDAR_BODIES.includes(planet.name as typeof CALENDAR_BODIES[number])) return false;
    const sun = sample.planets.find((candidate) => candidate.name === "Sun");
    if (!sun) return false;
    const distance = Math.abs(planet.longitude - sun.longitude);
    return Math.min(distance, 360 - distance) <= 8;
  }) ?? [];

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <h3 className="font-serif text-xl tracking-wide text-stone-900">{MONTH_NAMES[month]}</h3>
        <span className="text-[10px] uppercase tracking-[0.16em] text-stone-400">3 ephemeris points</span>
      </div>
      <div className="divide-y divide-stone-100">
        {events.length ? events.map((event) => (
          <div key={`${event.date}-${event.planet}-${event.type}`} className={`flex items-start gap-3 py-4 ${event.combust ? "opacity-50" : ""}`}>
            <div className={`mt-1 size-2 shrink-0 rounded-full bg-current ${PLANET_COLORS[event.planet] ?? "text-stone-600"}`} />
            <div className="min-w-0 flex-1">
              <p className={`font-serif text-base leading-6 ${PLANET_COLORS[event.planet] ?? "text-stone-700"}`}>
                {event.type === "ingress" ? `${event.planet} enters ${event.signName}` : `${event.planet} ${event.retrograde ? "stations retrograde" : "turns direct"}`}
              </p>
              <p className="mt-1 text-xs tracking-wide text-stone-500">{formatDate(event.date)}{event.combust ? " · Combust within 8° of Sun" : ""}</p>
            </div>
            {event.retrograde && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/50 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-amber-800"><RotateCcw className="size-3" /> Vakri</span>}
            {event.personalHit && <Sparkles className="mt-1 size-4 shrink-0 text-[#C05A3A]" aria-label="Personal Hit: natal sign activation" />}
          </div>
        )) : (
          <p className="py-5 text-sm leading-6 text-stone-500">No sign ingress or motion station detected in the sampled dates.</p>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
        {activeRetrogrades.map((planet) => <span key={`retro-${planet.id}`} className="rounded-full bg-amber-100/50 px-2.5 py-1 text-[10px] text-amber-800">{planet.name} retrograde</span>)}
        {combustBodies.map((planet) => <span key={`combust-${planet.id}`} className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] text-stone-500">{planet.name} combust</span>)}
      </div>
    </article>
  );
}

export default function TransitCalendarTab({
  natalPlanets,
  active,
  profile,
  ayanamsa,
  zodiacMode,
  customAyanamsaDegrees,
  nodeType,
}: {
  natalPlanets: PlanetPosition[];
  active: boolean;
  profile: Pick<BirthProfile, "lat" | "lng" | "timezone" | "city">;
  ayanamsa: string;
  zodiacMode: ZodiacMode;
  customAyanamsaDegrees: number;
  nodeType: NodeType;
}) {
  const [year, setYear] = useState<number>(new Date().getFullYear() >= 2025 && new Date().getFullYear() <= 2027 ? new Date().getFullYear() : 2026);
  const [samples, setSamples] = useState<TransitSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedKey = useRef<string | null>(null);
  const requestKey = JSON.stringify([year, profile.lat, profile.lng, profile.timezone, ayanamsa, zodiacMode, customAyanamsaDegrees, nodeType]);

  useEffect(() => {
    if (!active || loadedKey.current === requestKey) return;
    const settings = { ayanamsa, zodiacMode, customAyanamsaDegrees, nodeType };
    const cachedSamples = getCachedTransitSamples(year, profile, settings);
    if (cachedSamples) {
      loadedKey.current = requestKey;
      setSamples(cachedSamples);
      setError(null);
      setLoading(false);
      return;
    }

    let isRequestActive = true;
    setLoading(true);
    setError(null);
    fetchTransitSamples(year, profile, settings)
      .then((nextSamples) => {
        if (isRequestActive) {
          loadedKey.current = requestKey;
          setSamples(nextSamples);
        }
      })
      .catch((requestError: unknown) => {
        if (isRequestActive) setError(requestError instanceof Error ? requestError.message : "Unable to load transit calendar.");
      })
      .finally(() => {
        if (isRequestActive) setLoading(false);
      });
    return () => {
      isRequestActive = false;
    };
  }, [active, ayanamsa, customAyanamsaDegrees, nodeType, profile, requestKey, year, zodiacMode]);

  const events = useMemo(() => deriveTransitEvents(samples, natalPlanets), [natalPlanets, samples]);
  const latest = useMemo(() => latestByPlanet(samples), [samples]);

  return (
    <section className="space-y-6 rounded-[1.5rem] bg-[#FDFBF7] p-5 text-stone-800 sm:p-7" aria-labelledby="transit-calendar-heading">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 id="transit-calendar-heading" className="font-serif text-2xl tracking-wide text-stone-900 sm:text-3xl">Cosmic Transit Calendar</h2><p className="mt-2 max-w-[62ch] text-sm leading-6 text-stone-600">A sampled ephemeris ledger for sign ingress, Vakri stations, combustion, and natal-sign activations.</p></div>
        <div className="flex items-center gap-2 text-xs text-stone-500"><Sun className="size-4 text-[#C05A3A]" /> 12 bodies · 36 samples</div>
      </header>
      <div className="inline-flex rounded-full border border-stone-200 bg-white/80 p-1 shadow-sm" role="tablist" aria-label="Transit calendar year">
        {YEARS.map((option) => <button key={option} type="button" role="tab" aria-selected={year === option} onClick={() => setYear(option)} className={`rounded-full px-4 py-2 text-xs tracking-wide transition ${year === option ? "bg-[#C05A3A] text-white shadow-md" : "text-stone-500 hover:text-stone-900"}`}>{option}</button>)}
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {loading ? (
        <EphemerisLoader
          title={`Mapping the ${year} sky`}
          description="Sampling planetary positions across 36 ephemeris points…"
          detail={`${profile.city || "Mumbai"} · ${ayanamsa.toLowerCase() === "lahiri" ? "Lahiri" : ayanamsa} ayanamsa`}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {MONTH_NAMES.map((_, month) => <MonthlyCard key={month} month={month} events={events.filter((event) => getMonth(event.date) === month)} sample={samples.find((item) => getMonth(item.date) === month)} />)}
        </div>
      )}
      <div className="border-t border-stone-200 pt-5">
        <h3 className="font-serif text-lg tracking-wide text-stone-900">Latest sampled positions</h3>
        <div className="mt-3 flex flex-wrap gap-2">{CALENDAR_BODIES.map((body) => {
          const entry = latest.get(body);
          return <span key={body} className={`rounded-full bg-white px-3 py-1.5 text-xs shadow-sm ${entry?.planet.motion === "R" ? "italic" : ""} ${PLANET_COLORS[body]}`}>{body} · {entry?.planet.signName ?? "—"}{entry?.planet.motion === "R" ? " · R" : ""}</span>;
        })}</div>
      </div>
      <p className="text-center text-[11px] leading-5 tracking-wide text-stone-500">Transit dates are derived from three monthly ephemeris samples and are intended for reflective timing, not certainty.</p>
    </section>
  );
}

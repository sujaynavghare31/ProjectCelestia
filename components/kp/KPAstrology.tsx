"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BirthProfile } from "@/lib/kundali-store";
import type { CelestialLanguage, EphemerisResponse, PlanetPosition, ViewPreferences } from "@/lib/kundali-types";
import type { ChartStyle } from "@/lib/kundali-types";
import { horaryNumberToLongitude } from "@/lib/astrology/kp-calculations";

type ChartRendererProps = {
  style: ChartStyle;
  ascendant: PlanetPosition;
  planets: PlanetPosition[];
  varga: number;
  houseBasedPlacement?: boolean;
  referenceHouse?: number;
  overlay?: PlanetPosition[];
  points?: PlanetPosition[];
  houseCusps?: EphemerisResponse["houseCusps"];
  language?: CelestialLanguage;
  preferences?: ViewPreferences;
};

type KPAstrologyProps = {
  profile: BirthProfile;
  language: CelestialLanguage;
  viewPreferences: ViewPreferences;
  ChartRenderer: React.ComponentType<ChartRendererProps>;
};

const PLANET_COLORS: Record<string, string> = {
  Sun: "text-amber-700", Moon: "text-slate-500", Mars: "text-red-700", Mercury: "text-emerald-700",
  Jupiter: "text-yellow-700", Venus: "text-pink-700", Saturn: "text-indigo-700", Rahu: "text-violet-700", Ketu: "text-orange-700",
};

function secondsTime(time: string) {
  return /^\d{2}:\d{2}:\d{2}$/.test(time) ? time : `${time}:00`;
}

function localNow(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${read("year")}-${read("month")}-${read("day")}`, time: `${read("hour")}:${read("minute")}:${read("second")}` };
}

function degree(longitude: number) {
  const normalized = ((longitude % 360) + 360) % 360;
  const signDegree = normalized % 30;
  const degrees = Math.floor(signDegree);
  const minutes = Math.floor((signDegree - degrees) * 60);
  const seconds = Math.round((((signDegree - degrees) * 60) - minutes) * 60);
  return `${String(degrees).padStart(2, "0")}°${String(minutes).padStart(2, "0")}′${String(seconds).padStart(2, "0")}″`;
}

function longitude(longitude: number) {
  return `${longitude.toFixed(6)}°`;
}

async function fetchKp(profile: BirthProfile, date: string, time: string) {
  const response = await fetch("/api/ephemeris", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date,
      time: secondsTime(time),
      lat: profile.lat,
      lng: profile.lng,
      timezone: profile.timezone,
      ayanamsa: "krishnamurti",
      zodiacMode: "sidereal",
      calculationMode: "kp",
      kp: true,
      nodeType: "true",
      nameFirstLetter: profile.name,
      gender: profile.sex,
    }),
  });
  const payload = await response.json() as EphemerisResponse | { error?: string };
  if (!response.ok) throw new Error("error" in payload ? payload.error ?? "KP calculation failed." : "KP calculation failed.");
  return payload as EphemerisResponse;
}

function LordBadge({ lord, strong = false }: { lord: string; strong?: boolean }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${strong ? "ring-1 ring-[#C05A3A]/60" : ""} ${PLANET_COLORS[lord] ?? "text-foreground"} bg-stone-100`}>{lord}</span>;
}

function LoadingRows({ count = 6 }: { count?: number }) {
  return <div className="space-y-2 p-4" aria-busy="true">{Array.from({ length: count }, (_, index) => <div key={index} className="h-9 animate-pulse rounded-lg bg-stone-100" />)}</div>;
}

export default function KPAstrology({ profile, language, viewPreferences, ChartRenderer }: KPAstrologyProps) {
  const [data, setData] = useState<EphemerisResponse | null>(null);
  const [currentData, setCurrentData] = useState<EphemerisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [horaryNumber, setHoraryNumber] = useState("");
  const [horaryLongitude, setHoraryLongitude] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const current = localNow(profile.timezone);
      const [birthResult, currentResult] = await Promise.all([
        fetchKp(profile, profile.date, profile.time),
        fetchKp(profile, current.date, current.time),
      ]);
      setData(birthResult);
      setCurrentData(currentResult);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to calculate KP data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [profile.date, profile.time, profile.lat, profile.lng, profile.timezone]);

  const kpPreferences = useMemo(() => ({ ...viewPreferences, showBhavaCusps: false }), [viewPreferences]);
  const planets = data?.planets.filter((planet) => ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"].includes(planet.name)) ?? [];
  const ownedHouses = (lord: string) => data?.houseCusps.filter((cusp) => cusp.kp?.signLord === lord).map((cusp) => cusp.house) ?? [];
  const houseSignificators = useMemo(() => planets.map((planet) => {
    const starLordHouse = planets.find((candidate) => candidate.name === planet.kp?.starLord)?.house;
    return {
      planet,
      levelA: starLordHouse ? [starLordHouse] : [],
      levelB: [planet.house],
      levelC: ownedHouses(planet.kp?.starLord ?? ""),
      levelD: ownedHouses(planet.name),
    };
  }), [data, planets]);

  const setHorary = (value: string) => {
    setHoraryNumber(value);
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1 || number > 249) {
      setHoraryLongitude(null);
      return;
    }
    setHoraryLongitude(horaryNumberToLongitude(number));
  };

  return (
    <section className="space-y-4 rounded-2xl bg-[#FDFBF7] p-1">
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-[#C05A3A]"><Sparkles className="size-4" /><span className="text-xs font-semibold uppercase tracking-[0.18em]">Krishnamurti Paddhati</span></div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">KP Astrology</h2>
          <p className="mt-1 text-sm text-stone-500">KP Ayanamsa · Indian chart cusps · exact sub-lord analysis</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#C05A3A] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#A84930] disabled:opacity-60"><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh KP data</button>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {loading && <LoadingRows count={8} />}
      {!loading && data && (
        <Tabs defaultValue="base" className="space-y-4">
          <TabsList aria-label="KP analysis sections" className="grid h-auto w-full grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-white p-2 shadow-sm sm:grid-cols-3">
            <TabsTrigger value="base" className="h-10 justify-center rounded-lg px-3 text-xs text-stone-600 after:hidden data-[state=active]:bg-[#C05A3A] data-[state=active]:text-white data-[state=active]:shadow-sm sm:text-sm">Base charts & tables</TabsTrigger>
            <TabsTrigger value="significators" className="h-10 justify-center rounded-lg px-3 text-xs text-stone-600 after:hidden data-[state=active]:bg-[#C05A3A] data-[state=active]:text-white data-[state=active]:shadow-sm sm:text-sm">Significators</TabsTrigger>
            <TabsTrigger value="ruling" className="h-10 justify-center rounded-lg px-3 text-xs text-stone-600 after:hidden data-[state=active]:bg-[#C05A3A] data-[state=active]:text-white data-[state=active]:shadow-sm sm:text-sm">Ruling planets & horary</TabsTrigger>
          </TabsList>

          <TabsContent value="base" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm"><h3 className="mb-2 text-sm font-semibold text-stone-800">Rasi chart · KP sidereal</h3><div className="relative isolate aspect-square min-h-0 w-full overflow-hidden rounded-lg"><ChartRenderer style="diamond" ascendant={data.ascendant} planets={planets} points={[]} houseCusps={data.houseCusps} varga={1} language={language} preferences={kpPreferences} /></div></div>
              <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm"><h3 className="mb-2 text-sm font-semibold text-stone-800">KP Bhava Chalit · South Indian</h3><div className="relative isolate aspect-square min-h-0 w-full overflow-hidden rounded-lg"><ChartRenderer style="south" ascendant={data.ascendant} planets={data.bhavChalitPlanets.filter((planet) => planets.some(({ id }) => id === planet.id))} points={[]} houseCusps={data.houseCusps} varga={1} houseBasedPlacement language={language} preferences={kpPreferences} /></div></div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
              <h3 className="border-b border-stone-200 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-800">Planetary KP details</h3>
              <table className="w-full min-w-[800px] text-left text-xs"><thead><tr className="border-b border-stone-200 text-[10px] uppercase tracking-wider text-stone-500">{["Planet", "Longitude", "R/D", "Sign lord", "Star lord", "Sub lord", "Sub-sub lord"].map((heading, index) => <th key={heading} className={`${index === 0 ? "sticky left-0 z-20 bg-stone-100" : ""} px-3 py-2 font-semibold`}>{heading}</th>)}</tr></thead><tbody>{planets.map((planet) => <tr key={planet.id} className="border-b border-stone-100 last:border-0"><td className={`sticky left-0 z-10 bg-white px-3 py-2.5 font-semibold ${PLANET_COLORS[planet.name] ?? "text-stone-800"}`}>{planet.name}</td><td className="px-3 py-2.5 font-mono">{longitude(planet.longitude)} <span className="text-stone-400">({degree(planet.longitude)})</span></td><td className="px-3 py-2.5 font-semibold">{planet.motion}</td><td className="px-3 py-2.5"><LordBadge lord={planet.kp?.signLord ?? "—"} /></td><td className="px-3 py-2.5"><LordBadge lord={planet.kp?.starLord ?? "—"} /></td><td className="px-3 py-2.5"><LordBadge lord={planet.kp?.subLord ?? "—"} /></td><td className="px-3 py-2.5"><LordBadge lord={planet.kp?.subSubLord ?? "—"} /></td></tr>)}</tbody></table>
            </div>
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
              <h3 className="border-b border-stone-200 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-800">House cusp table · Vedic cusps</h3>
              <table className="w-full min-w-[680px] text-left text-xs"><thead><tr className="border-b border-stone-200 text-[10px] uppercase tracking-wider text-stone-500">{["Cusp", "Longitude", "Sign lord", "Star lord", "Sub lord", "Sub-sub lord"].map((heading, index) => <th key={heading} className={`${index === 0 ? "sticky left-0 z-20 bg-stone-100" : ""} px-3 py-2 font-semibold`}>{heading}</th>)}</tr></thead><tbody>{data.houseCusps.map((cusp, index) => <tr key={cusp.house} className={index % 2 ? "bg-stone-50" : ""}><td className={`sticky left-0 z-10 px-3 py-2.5 font-semibold text-stone-700 ${index % 2 ? "bg-stone-50" : "bg-white"}`}>Cusp {cusp.house}</td><td className="px-3 py-2.5 font-mono">{longitude(cusp.longitude)} <span className="text-stone-400">({degree(cusp.longitude)})</span></td><td className="px-3 py-2.5"><LordBadge lord={cusp.kp?.signLord ?? "—"} /></td><td className="px-3 py-2.5"><LordBadge lord={cusp.kp?.starLord ?? "—"} /></td><td className="px-3 py-2.5"><LordBadge lord={cusp.kp?.subLord ?? "—"} /></td><td className="px-3 py-2.5"><LordBadge lord={cusp.kp?.subSubLord ?? "—"} /></td></tr>)}</tbody></table>
            </div>
          </TabsContent>

          <TabsContent value="significators" className="space-y-4">
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"><h3 className="text-sm font-semibold text-stone-800">Planet as significator</h3><p className="mt-1 text-xs text-stone-500">A: star lord’s occupied house · B: planet’s occupied house · C: star lord ownership · D: planet ownership.</p><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{houseSignificators.map(({ planet, levelA, levelB, levelC, levelD }) => <div key={planet.id} className="rounded-lg border border-stone-100 bg-stone-50/60 p-3"><div className={`text-sm font-semibold ${PLANET_COLORS[planet.name] ?? "text-stone-800"}`}>{planet.name} <span className="text-xs font-normal text-stone-500">· {planet.kp?.starLord ?? "—"} star</span></div><div className="mt-2 grid grid-cols-4 gap-1 text-[10px]"><span>A {levelA.join(", ") || "—"}</span><span>B {levelB.join(", ") || "—"}</span><span>C {levelC.join(", ") || "—"}</span><span>D {levelD.join(", ") || "—"}</span></div></div>)}</div></div>
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"><h3 className="text-sm font-semibold text-stone-800">House significators</h3><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 12 }, (_, index) => { const house = index + 1; const matches = houseSignificators.filter((item) => [item.levelA, item.levelB, item.levelC, item.levelD].some((level) => level.includes(house))); return <div key={house} className="rounded-lg bg-stone-50 p-3"><p className="text-xs font-semibold text-stone-700">House {house}</p><div className="mt-2 flex flex-wrap gap-1">{matches.map(({ planet, levelA }) => <LordBadge key={planet.id} lord={planet.name} strong={levelA.includes(house)} />)}{!matches.length && <span className="text-[11px] text-stone-400">None</span>}</div></div>; })}</div></div>
          </TabsContent>

          <TabsContent value="ruling" className="space-y-4">
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold text-stone-800">Current ruling planets</h3><p className="mt-1 text-xs text-stone-500">Calculated for the current moment at the chart location.</p></div><button type="button" onClick={() => void load()} className="text-xs font-semibold text-[#C05A3A] hover:underline">Refresh</button></div><div className="mt-3 flex flex-wrap gap-2">{[["Ascendant star", currentData?.ascendant.kp?.starLord], ["Ascendant sign", currentData?.ascendant.kp?.signLord], ["Moon star", currentData?.planets.find((planet) => planet.name === "Moon")?.kp?.starLord], ["Moon sign", currentData?.planets.find((planet) => planet.name === "Moon")?.kp?.signLord], ["Day lord", ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"][new Date().getDay()]]].map(([label, lord]) => <div key={label} className="rounded-lg bg-stone-50 px-3 py-2"><p className="text-[10px] uppercase tracking-wider text-stone-500">{label}</p><p className="mt-1 text-sm font-semibold text-[#C05A3A]">{lord ?? "—"}</p></div>)}</div></div>
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"><h3 className="text-sm font-semibold text-stone-800">KP Horary · 1–249</h3><p className="mt-1 text-xs text-stone-500">Enter a number to map the question to its KP sub-lord zone.</p><div className="mt-3 flex flex-wrap items-end gap-3"><label className="text-xs font-medium text-stone-700">Question number<input value={horaryNumber} onChange={(event) => setHorary(event.target.value)} inputMode="numeric" min={1} max={249} type="number" className="mt-1 block h-10 w-40 rounded-lg border border-stone-200 bg-[#FDFBF7] px-3 font-mono text-sm outline-none focus:border-[#C05A3A]" /></label>{horaryLongitude !== null && <div className="rounded-lg bg-stone-50 px-3 py-2 text-xs"><span className="text-stone-500">Horary ascendant</span><strong className="ml-2 text-[#C05A3A]">{longitude(horaryLongitude)} · {degree(horaryLongitude)}</strong></div>}</div>{horaryNumber && !horaryLongitude && <p className="mt-2 text-xs text-red-700">Use a whole number between 1 and 249.</p>}</div>
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}

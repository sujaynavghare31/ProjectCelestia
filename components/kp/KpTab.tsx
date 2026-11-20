"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import EphemerisLoader from "@/components/dashboard-tabs/ephemeris-loader";
import type { BirthProfile } from "@/lib/kundali-store";
import type { CelestialLanguage, EphemerisResponse, PlanetPosition, ViewPreferences } from "@/lib/kundali-types";
import type { ChartStyle } from "@/lib/kundali-types";

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

type KpTabProps = {
  profile: BirthProfile;
  language: CelestialLanguage;
  viewPreferences: ViewPreferences;
  ChartRenderer: React.ComponentType<ChartRendererProps>;
};

type EnginePlanet = {
  body: string;
  abbr: string;
  sign: string;
  retrograde: boolean;
  degreeText: string;
  signLord: string;
  starLord: string;
  subLord: string;
  subSubLord: string;
  occupies: number;
  owns: number[];
  significators: number[];
  levels: { a: number[]; b: number[]; c: number[]; d: number[] };
  nadi: number[];
  starLordOfCusps: number[];
  subLordOfCusps: number[];
  conjunctOrAspectedBy: string[];
  aspectsTo: Array<string>;
  selfStar: boolean;
  noPlanetInStar: boolean;
};

type EngineCusp = {
  house: number;
  roman: string;
  longitude: number;
  sign: string;
  degreeText: string;
  signLord: string;
  starLord: string;
  subLord: string;
  subSubLord: string;
  significators: string[];
  a: string[];
  b: string[];
  c: string[];
  d: string[];
  aspectedBy: string[];
  cuspalAspect: string[];
};

type EngineRuling = {
  dayLord: string | null;
  moon: { sign: string; star: string; sub: string };
  asc: { sign: string; star: string; sub: string };
  nodes: string[];
  all: string[];
};

type DashaPeriod = { lords: string[]; start: Date; end: Date };

type EngineChart = {
  planets: EnginePlanet[];
  cusps: EngineCusp[];
  nadi: Array<{ planet: string; mark: string; significators: number[]; starLord: string; starLordSignificators: number[]; subLord: string; subLordSignificators: number[] }>;
  ruling: EngineRuling;
  bhavaChalit: Record<number, string[]>;
  dasha: { balance: { lord: string; text: string }; periods: DashaPeriod[] } | null;
};

type HoraryEntry = {
  number: number;
  startText: string;
  endText: string;
  signLord: string;
  starLord: string;
  subLord: string;
};

type HoraryChart = EngineChart & {
  horary: { number: number; entry: HoraryEntry; ascendant: number; actualAscendantText: string };
  judgement: { question: string; cusp: number; subLord: string; subLordSignificators: number[]; favourableFound: number[]; negativeFound: number[]; verdict: string; timing: string } | null;
};

type TransitRow = { body: string; sign: string; degreeText: string; signLord: string; starLord: string; subLord: string; retrograde: boolean; natalHouse: number };
type HoraryQuestionKey = "marriage" | "job" | "business" | "promotion" | "children" | "property" | "foreign" | "education" | "litigation" | "recovery" | "money" | "lost";

const LORD_ABBR: Record<string, string> = {
  Sun: "SUN", Moon: "MON", Mars: "MAR", Mercury: "MER", Jupiter: "JUP", Venus: "VEN", Saturn: "SAT", Rahu: "RAH", Ketu: "KET",
};

const PLANET_COLORS: Record<string, string> = {
  Sun: "text-amber-700", Moon: "text-slate-600", Mars: "text-red-700", Mercury: "text-emerald-700",
  Jupiter: "text-yellow-700", Venus: "text-pink-700", Saturn: "text-indigo-700", Rahu: "text-violet-700", Ketu: "text-orange-700",
  Uranus: "text-fuchsia-700", Neptune: "text-fuchsia-700", Pluto: "text-fuchsia-700",
};

function secondsTime(time: string) {
  return /^\d{2}:\d{2}:\d{2}$/.test(time) ? time : `${time}:00`;
}

function timezoneHours(date: string, time: string, timezone: string) {
  try {
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute, second = 0] = time.split(":").map(Number);
    const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(localAsUtc));
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
    const zonedAsUtc = Date.UTC(read("year"), read("month") - 1, read("day"), read("hour"), read("minute"), read("second"));
    return (zonedAsUtc - localAsUtc) / 3600000;
  } catch {
    return 5.5;
  }
}

function localNow(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${read("year")}-${read("month")}-${read("day")}`, time: `${read("hour")}:${read("minute")}:${read("second")}` };
}

async function fetchEphemeris(profile: BirthProfile, date: string, time: string) {
  const response = await fetch("/api/ephemeris", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date, time: secondsTime(time), lat: profile.lat, lng: profile.lng, timezone: profile.timezone,
      ayanamsa: "krishnamurti", zodiacMode: "sidereal", calculationMode: "kp", kp: true,
      nodeType: "true", nameFirstLetter: profile.name, gender: profile.sex,
    }),
  });
  const payload = await response.json() as EphemerisResponse | { error?: string };
  if (!response.ok) throw new Error("error" in payload ? payload.error ?? "KP calculation failed." : "KP calculation failed.");
  return payload as EphemerisResponse;
}

function LordBadge({ lord, strong = false }: { lord: string; strong?: boolean }) {
  return <span className={`inline-flex min-w-8 justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${strong ? "ring-1 ring-[#C05A3A]/60" : ""} ${PLANET_COLORS[lord] ?? "text-foreground"} bg-stone-100`}>{LORD_ABBR[lord] ?? lord}</span>;
}

function LazySection({ children, height = 240, label }: { children: React.ReactNode; height?: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "240px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} aria-label={label}>{visible ? children : <div className="animate-pulse rounded-xl border border-stone-200 bg-stone-50" style={{ minHeight: height }} />}</div>;
}

function abbrList(values: Array<string>) {
  return values.map((value) => LORD_ABBR[value] ?? value).join(" ");
}

function houseList(values: number[]) {
  return values.length ? values.join(" ") : "—";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

export default function KpTab({ profile, language, viewPreferences, ChartRenderer }: KpTabProps) {
  const [mode, setMode] = useState<"natal" | "horary">("natal");
  const [data, setData] = useState<EphemerisResponse | null>(null);
  const [currentData, setCurrentData] = useState<EphemerisResponse | null>(null);
  const [chart, setChart] = useState<EngineChart | null>(null);
  const [horaryChart, setHoraryChart] = useState<HoraryChart | null>(null);
  const [transit, setTransit] = useState<TransitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [engineLoading, setEngineLoading] = useState(false);
  const [error, setError] = useState("");
  const [horaryNumber, setHoraryNumber] = useState("123");
  const [questionKey, setQuestionKey] = useState<HoraryQuestionKey>("marriage");
  const [question, setQuestion] = useState("");
  const [momentDate, setMomentDate] = useState(profile.date);
  const [momentTime, setMomentTime] = useState(profile.time);
  const [show249, setShow249] = useState(false);
  const [kp249, setKp249] = useState<Array<{ number: number; startText: string; endText: string; signLord: string; starLord: string; subLord: string }> | null>(null);
  const [expandedDasha, setExpandedDasha] = useState<string | null>(null);
  const [sookshma, setSookshma] = useState<DashaPeriod[] | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const now = localNow(profile.timezone);
      const [birthResult, currentResult] = await Promise.all([
        fetchEphemeris(profile, profile.date, profile.time),
        fetchEphemeris(profile, now.date, now.time),
      ]);
      setData(birthResult);
      setCurrentData(currentResult);
      setMomentDate(now.date);
      setMomentTime(now.time);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to calculate KP data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [profile.date, profile.time, profile.lat, profile.lng, profile.timezone]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    setEngineLoading(true);
    void import("@/src/lib/kp").then((kp) => {
      if (cancelled) return;
      const planets: Record<string, number | { longitude: number; speed: number; retrograde: boolean }> = {};
      data.planets.forEach((planet) => {
        if (["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Uranus", "Neptune", "Pluto"].includes(planet.name)) {
          planets[planet.name] = { longitude: planet.longitude, speed: planet.speed, retrograde: planet.motion === "R" };
        }
      });
      const cusps = data.houseCusps.map((cusp) => cusp.longitude);
      const result = kp.kpChart({
        planets: {
          ...planets,
          Sun: planets.Sun as number | { longitude: number; speed: number; retrograde: boolean },
          Moon: planets.Moon as number | { longitude: number; speed: number; retrograde: boolean },
          Rahu: planets.Rahu as number | { longitude: number; speed: number; retrograde: boolean },
        },
        cusps,
        birth: { date: profile.date, time: secondsTime(profile.time), tzHours: Number(profile.timezone.match(/([+-]\d+(?:\.\d+)?)/)?.[1] ?? 5.5), latitude: profile.lat, longitude: profile.lng },
        ayanamsa: data.ayanamsa.degrees,
      }) as unknown as EngineChart;
      setChart(result);
      setEngineLoading(false);
      if (currentData) {
        const transitPlanets: Record<string, number | { longitude: number; speed: number; retrograde: boolean }> = {};
        currentData.planets.forEach((planet) => {
          if (["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Uranus", "Neptune", "Pluto"].includes(planet.name)) {
            transitPlanets[planet.name] = { longitude: planet.longitude, speed: planet.speed, retrograde: planet.motion === "R" };
          }
        });
        setTransit(kp.kpTransit(transitPlanets as never, cusps) as unknown as TransitRow[]);
      }
    }).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the KP engine.");
      setEngineLoading(false);
    });
    return () => { cancelled = true; };
  }, [data, currentData, profile]);

  useEffect(() => {
    if (mode !== "horary" || !data) return;
    const number = Number(horaryNumber);
    if (!Number.isInteger(number) || number < 1 || number > 249) {
      setHoraryChart(null);
      return;
    }
    let cancelled = false;
    setEngineLoading(true);
    void import("@/src/lib/kp/horary").then((horary) => {
      if (cancelled) return;
      const planets: Record<string, number | { longitude: number; speed: number; retrograde: boolean }> = {};
      data.planets.forEach((planet) => {
        if (["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Uranus", "Neptune", "Pluto"].includes(planet.name)) {
          planets[planet.name] = { longitude: planet.longitude, speed: planet.speed, retrograde: planet.motion === "R" };
        }
      });
      const result = horary.kpHorary({
        number,
        moment: { date: momentDate, time: secondsTime(momentTime), tzHours: 5.5, latitude: profile.lat, longitude: profile.lng },
        ayanamsa: data.ayanamsa.degrees,
        planets: {
          ...planets,
          Sun: planets.Sun as number | { longitude: number; speed: number; retrograde: boolean },
          Moon: planets.Moon as number | { longitude: number; speed: number; retrograde: boolean },
          Rahu: planets.Rahu as number | { longitude: number; speed: number; retrograde: boolean },
        },
        sunrise: "06:55",
        question,
        questionKey: questionKey as "marriage",
      }) as unknown as HoraryChart;
      setHoraryChart(result);
      setEngineLoading(false);
    }).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to calculate the horary chart.");
      setEngineLoading(false);
    });
    return () => { cancelled = true; };
  }, [mode, horaryNumber, questionKey, question, momentDate, momentTime, data, profile.lat, profile.lng]);

  useEffect(() => {
    if (mode !== "horary" || !show249 || kp249) return;
    void import("@/src/lib/kp/horary").then((module) => setKp249(module.KP249 as unknown as typeof kp249));
  }, [mode, show249, kp249]);

  useEffect(() => {
    if (mode !== "natal") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [mode, profile]);

  const activeChart = mode === "horary" ? horaryChart : chart;
  const kpPreferences = useMemo(() => ({ ...viewPreferences, showBhavaCusps: false }), [viewPreferences]);
  const planets = activeChart?.planets ?? [];
  const rulingRows: Array<[string, EngineRuling | null | undefined]> = [
    ["Natal / moment", chart?.ruling],
    ...(mode === "natal"
      ? [["Current transit", activeChart?.ruling] as [string, EngineRuling | null | undefined]]
      : [["Horary moment", horaryChart?.ruling] as [string, EngineRuling | null | undefined]]),
  ];

  const open249 = async () => {
    setShow249(true);
    if (!kp249) {
      const module = await import("@/src/lib/kp/horary");
      setKp249(module.KP249 as unknown as typeof kp249);
    }
  };

  const toggleSookshma = async (period: DashaPeriod) => {
    const key = period.lords.join("-");
    if (expandedDasha === key) {
      setExpandedDasha(null);
      setSookshma(null);
      return;
    }
    setExpandedDasha(key);
    setSookshma(null);
    if (!data) return;
    const moon = data.planets.find((planet) => planet.name === "Moon");
    if (!moon) return;
    const kp = await import("@/src/lib/kp");
    const birthMs = Date.UTC(
      Number(profile.date.slice(0, 4)), Number(profile.date.slice(5, 7)) - 1, Number(profile.date.slice(8, 10)),
      Number(profile.time.slice(0, 2)), Number(profile.time.slice(3, 5)), Number(profile.time.slice(6, 8) || "0"),
    ) - 5.5 * 3600000;
    const result = kp.vimshottari(moon.longitude, birthMs, 4);
    setSookshma(result.periods.filter((item) =>
      item.lords.slice(0, period.lords.length).join("-") === period.lords.join("-") &&
      item.lords.length === 4
    ) as unknown as DashaPeriod[]);
  };

  return (
    <section className="space-y-4 rounded-2xl bg-[#FDFBF7] p-1">
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-[#C05A3A]"><Sparkles className="size-4" /><span className="text-xs font-semibold uppercase tracking-[0.18em]">Krishnamurti Paddhati</span></div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">KP Astrology</h1>
          <p className="mt-1 text-sm text-stone-500">KP New ayanamsa · Placidus cusps · sub-lord analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMode("natal")} className={`h-9 rounded-lg px-3 text-xs font-semibold transition ${mode === "natal" ? "bg-[#C05A3A] text-white" : "border border-stone-200 bg-white text-stone-600"}`}>Natal</button>
          <button type="button" onMouseEnter={() => void import("@/src/lib/kp/horary")} onClick={() => setMode("horary")} className={`h-9 rounded-lg px-3 text-xs font-semibold transition ${mode === "horary" ? "bg-[#C05A3A] text-white" : "border border-stone-200 bg-white text-stone-600"}`}>Horary (Prashna)</button>
        </div>
      </header>

      {mode === "horary" && (
        <div className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm lg:grid-cols-[180px_220px_1fr_190px]">
          <label className="text-xs font-semibold text-stone-700">KP number
            <input value={horaryNumber} onChange={(event) => setHoraryNumber(event.target.value)} inputMode="numeric" type="number" min={1} max={249} className="mt-1 h-10 w-full rounded-lg border border-stone-200 bg-[#FDFBF7] px-3 text-sm outline-none focus:border-[#C05A3A]" />
          </label>
          <label className="text-xs font-semibold text-stone-700">Question type
            <select value={questionKey} onChange={(event) => setQuestionKey(event.target.value as HoraryQuestionKey)} className="mt-1 h-10 w-full rounded-lg border border-stone-200 bg-[#FDFBF7] px-3 text-sm outline-none focus:border-[#C05A3A]">
              {["marriage","job","business","promotion","children","property","foreign","education","litigation","recovery","money","lost"].map((key) => <option key={key} value={key}>{key[0].toUpperCase() + key.slice(1)}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-stone-700">Question
            <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Will I marry this year?" className="mt-1 h-10 w-full rounded-lg border border-stone-200 bg-[#FDFBF7] px-3 text-sm outline-none focus:border-[#C05A3A]" />
          </label>
          <div className="flex items-end"><button type="button" onMouseEnter={() => void open249()} onClick={() => void open249()} className="h-10 w-full rounded-lg border border-[#C05A3A]/30 text-xs font-semibold text-[#C05A3A]">Open KP 249 table</button></div>
          <label className="text-xs font-semibold text-stone-700">Judgment date<input type="date" value={momentDate} onChange={(event) => setMomentDate(event.target.value)} className="mt-1 h-10 rounded-lg border border-stone-200 bg-[#FDFBF7] px-3 text-sm" /></label>
          <label className="text-xs font-semibold text-stone-700">Judgment time<input type="time" step={1} value={momentTime} onChange={(event) => setMomentTime(event.target.value)} className="mt-1 h-10 rounded-lg border border-stone-200 bg-[#FDFBF7] px-3 text-sm" /></label>
        </div>
      )}

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {(loading || engineLoading) && <EphemerisLoader title="Calculating KP astrology" description="Preparing cusps, significators and ruling planets…" detail={`${profile.city || "Birth chart"} · KP ayanamsa`} />}

      {!loading && !engineLoading && data && activeChart && (
        <>
          {mode === "horary" && horaryChart?.judgement && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Horary No. {horaryChart.horary.number}</p>
                <p className="mt-1 text-sm text-stone-800">Lagna {horaryChart.horary.entry.startText} · Actual Lagna {horaryChart.horary.actualAscendantText}</p>
                <p className="mt-1 text-xs text-stone-500">Cusp {horaryChart.judgement.cusp} sub lord <strong>{horaryChart.judgement.subLord}</strong> · significators {houseList(horaryChart.judgement.subLordSignificators)}</p>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${horaryChart.judgement.verdict.startsWith("YES") ? "bg-emerald-100 text-emerald-800" : horaryChart.judgement.verdict.startsWith("NO") ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"}`}>{horaryChart.judgement.verdict}</span>
            </div>
          )}

          <LazySection label="KP charts" height={520}>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm"><h2 className="mb-2 text-sm font-semibold text-stone-800">Birth chart · South Indian</h2><div className="aspect-square overflow-hidden rounded-lg"><ChartRenderer style="south" ascendant={data.ascendant} planets={planets as unknown as PlanetPosition[]} points={[]} houseCusps={data.houseCusps} varga={1} houseBasedPlacement language={language} preferences={kpPreferences} /></div></div>
              <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm"><h2 className="mb-2 text-sm font-semibold text-stone-800">Rasi chart · North Indian</h2><div className="aspect-square overflow-hidden rounded-lg"><ChartRenderer style="diamond" ascendant={data.ascendant} planets={planets as unknown as PlanetPosition[]} points={[]} houseCusps={data.houseCusps} varga={1} language={language} preferences={kpPreferences} /></div></div>
              <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm"><h2 className="mb-2 text-sm font-semibold text-stone-800">Bhav-Chalit chart</h2><div className="aspect-square overflow-hidden rounded-lg"><ChartRenderer style="diamond" ascendant={data.ascendant} planets={data.bhavChalitPlanets.filter((planet) => planets.some((row) => row.abbr === planet.symbol))} points={[]} houseCusps={data.houseCusps} varga={1} houseBasedPlacement language={language} preferences={kpPreferences} /></div></div>
            </div>
          </LazySection>

          <LazySection label="Ruling planets" height={180}>
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
              <h2 className="border-b border-stone-200 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-800">Ruling planets</h2>
              <table className="w-full min-w-[720px] text-left text-xs"><thead><tr className="border-b border-stone-200 text-[10px] uppercase tracking-wider text-stone-500"><th className="px-4 py-2">Period</th><th className="px-4 py-2">Day lord</th><th className="px-4 py-2">Moon · sign / star / sub</th><th className="px-4 py-2">Asc · sign / star / sub</th><th className="px-4 py-2">Nodes</th><th className="px-4 py-2">All ruling planets</th></tr></thead><tbody>
                {rulingRows.map(([label, ruling]) => ruling && <tr key={label} className="border-b border-stone-100 last:border-0"><td className="px-4 py-3 font-semibold text-stone-700">{label}</td><td className="px-4 py-3"><LordBadge lord={ruling.dayLord ?? "—"} /></td><td className="px-4 py-3"><LordBadge lord={ruling.moon.sign} /><LordBadge lord={ruling.moon.star} /><LordBadge lord={ruling.moon.sub} /></td><td className="px-4 py-3"><LordBadge lord={ruling.asc.sign} /><LordBadge lord={ruling.asc.star} /><LordBadge lord={ruling.asc.sub} /></td><td className="px-4 py-3">{ruling.nodes.map((node) => <LordBadge key={node} lord={node} />)}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-1">{ruling.all.map((lord) => <LordBadge key={lord} lord={lord} strong />)}</div></td></tr>)}
              </tbody></table>
            </div>
          </LazySection>

          <LazySection label="Planets and cusps" height={620}>
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
              <h2 className="border-b border-stone-200 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-800">Planets and cusps details · Natal and significators</h2>
              <table className="w-full min-w-[1100px] text-left text-xs"><thead><tr className="border-b border-stone-200 text-[10px] uppercase tracking-wider text-stone-500"><th className="sticky left-0 z-20 bg-stone-100 px-3 py-2">PLANETS</th><th className="px-3 py-2">Sign</th><th className="px-3 py-2">Degrees</th><th className="px-3 py-2 bg-[#FFF59D]">Sign lord</th><th className="px-3 py-2 bg-[#BDE8F6]">Star lord</th><th className="px-3 py-2 bg-[#C8F2C2]">Sub lord</th><th className="px-3 py-2 bg-[#D7DCF5]">SSL</th><th className="px-3 py-2">Significators</th><th className="px-3 py-2">Cusp lord</th><th className="px-3 py-2">OCCU</th><th className="px-3 py-2">Star lord of</th><th className="px-3 py-2">Sub lord of</th><th className="px-3 py-2">Conjunct/Asp by</th><th className="px-3 py-2">Asp to</th></tr></thead><tbody>{activeChart.planets.map((planet) => <tr key={planet.body} className="border-b border-stone-100 last:border-0"><td className={`sticky left-0 z-10 bg-white px-3 py-2.5 font-semibold ${PLANET_COLORS[planet.body] ?? "text-stone-800"}`}>{planet.body}{planet.selfStar ? "#" : planet.noPlanetInStar ? "*" : ""}</td><td className="px-3 py-2.5">{planet.signLord}</td><td className="px-3 py-2.5 font-mono">{planet.degreeText}</td><td className="px-3 py-2.5 bg-[#FFF59D]/70"><LordBadge lord={planet.signLord} /></td><td className="px-3 py-2.5 bg-[#BDE8F6]/70"><LordBadge lord={planet.starLord} /></td><td className="px-3 py-2.5 bg-[#C8F2C2]/70"><LordBadge lord={planet.subLord} /></td><td className="px-3 py-2.5 bg-[#D7DCF5]/70"><LordBadge lord={planet.subSubLord} /></td><td className="px-3 py-2.5">{houseList(planet.significators)}</td><td className="px-3 py-2.5">{houseList(planet.owns)}</td><td className="px-3 py-2.5">{planet.occupies}</td><td className="px-3 py-2.5">{houseList(planet.starLordOfCusps)}</td><td className="px-3 py-2.5">{houseList(planet.subLordOfCusps)}</td><td className="px-3 py-2.5">{abbrList(planet.conjunctOrAspectedBy)}</td><td className="px-3 py-2.5">{planet.aspectsTo.join(" ")}</td></tr>)}</tbody></table>
            </div>
            <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
              <h2 className="border-b border-stone-200 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-800">Cusps significators</h2>
              <table className="w-full min-w-[1050px] text-left text-xs"><thead><tr className="border-b border-stone-200 text-[10px] uppercase tracking-wider text-stone-500"><th className="sticky left-0 z-20 bg-stone-100 px-3 py-2">CUSPS</th><th className="px-3 py-2">Sign</th><th className="px-3 py-2">Degrees</th><th className="px-3 py-2 bg-[#FFF59D]">Sign lord</th><th className="px-3 py-2 bg-[#BDE8F6]">Star lord</th><th className="px-3 py-2 bg-[#C8F2C2]">Sub lord</th><th className="px-3 py-2 bg-[#D7DCF5]">SSL</th><th className="px-3 py-2">Significators</th><th className="px-3 py-2">A-Planet's STL</th><th className="px-3 py-2">B-OCCU</th><th className="px-3 py-2">C-In CL's star</th><th className="px-3 py-2">D-Lord</th><th className="px-3 py-2">Asp by</th><th className="px-3 py-2">Cuspal-Asp</th></tr></thead><tbody>{activeChart.cusps.map((cusp) => <tr key={cusp.house} className="border-b border-stone-100 last:border-0"><td className="sticky left-0 z-10 bg-white px-3 py-2.5 font-semibold">Cusp {cusp.roman}</td><td className="px-3 py-2.5">{cusp.sign}</td><td className="px-3 py-2.5 font-mono">{cusp.degreeText}</td><td className="px-3 py-2.5 bg-[#FFF59D]/70"><LordBadge lord={cusp.signLord} /></td><td className="px-3 py-2.5 bg-[#BDE8F6]/70"><LordBadge lord={cusp.starLord} /></td><td className="px-3 py-2.5 bg-[#C8F2C2]/70"><LordBadge lord={cusp.subLord} /></td><td className="px-3 py-2.5 bg-[#D7DCF5]/70"><LordBadge lord={cusp.subSubLord} /></td><td className="px-3 py-2.5">{abbrList(cusp.significators)}</td><td className="px-3 py-2.5">{abbrList(cusp.a)}</td><td className="px-3 py-2.5">{abbrList(cusp.b)}</td><td className="px-3 py-2.5">{abbrList(cusp.c)}</td><td className="px-3 py-2.5">{abbrList(cusp.d)}</td><td className="px-3 py-2.5">{abbrList(cusp.aspectedBy)}</td><td className="px-3 py-2.5">{abbrList(cusp.cuspalAspect)}</td></tr>)}</tbody></table>
            </div>
          </LazySection>

          <LazySection label="Nadi and transit" height={420}>
            <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"><h2 className="text-sm font-semibold text-stone-800">Nadi significators</h2><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{activeChart.nadi.map((row) => <div key={row.planet} className="rounded-lg border border-stone-100 bg-stone-50 p-3"><div className="flex items-center justify-between"><strong className={PLANET_COLORS[row.planet]}>{row.planet} {row.mark}</strong><span className="text-xs text-stone-500">{houseList(row.significators)}</span></div><div className="mt-2 grid grid-cols-2 gap-2 text-[11px]"><div><span className="text-stone-500">Star</span> {LORD_ABBR[row.starLord] ?? row.starLord}<br />{houseList(row.starLordSignificators)}</div><div><span className="text-stone-500">Sub</span> {LORD_ABBR[row.subLord] ?? row.subLord}<br />{houseList(row.subLordSignificators)}</div></div></div>)}</div></div>
              {mode === "natal" && <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm"><h2 className="border-b border-stone-200 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-800">Planets details · Transit</h2><table className="w-full min-w-[650px] text-left text-xs"><thead><tr className="border-b border-stone-200 text-[10px] uppercase tracking-wider text-stone-500"><th className="px-3 py-2">Planet</th><th className="px-3 py-2">Sign</th><th className="px-3 py-2">Degrees</th><th className="bg-[#FFF59D] px-3 py-2">Sign lord</th><th className="bg-[#BDE8F6] px-3 py-2">Star lord</th><th className="bg-[#C8F2C2] px-3 py-2">Sub lord</th><th className="px-3 py-2">Cusp(N)</th></tr></thead><tbody>{transit.map((row) => <tr key={row.body} className="border-b border-stone-100"><td className={`px-3 py-2.5 font-semibold ${PLANET_COLORS[row.body]}`}>{row.body}{row.retrograde ? "®" : ""}</td><td className="px-3 py-2.5">{row.sign}</td><td className="px-3 py-2.5 font-mono">{row.degreeText}</td><td className="bg-[#FFF59D]/70 px-3 py-2.5"><LordBadge lord={row.signLord} /></td><td className="bg-[#BDE8F6]/70 px-3 py-2.5"><LordBadge lord={row.starLord} /></td><td className="bg-[#C8F2C2]/70 px-3 py-2.5"><LordBadge lord={row.subLord} /></td><td className="px-3 py-2.5 font-semibold">{row.natalHouse}</td></tr>)}</tbody></table></div>}
            </div>
          </LazySection>

          {mode === "natal" && chart?.dasha && (
            <LazySection label="Vimshottari dasha" height={420}>
              <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
                <h2 className="border-b border-stone-200 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-800">{chart.dasha.balance.lord} · Dasa Balance: {chart.dasha.balance.text}</h2>
                <table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-stone-200 text-[10px] uppercase tracking-wider text-stone-500"><th className="px-3 py-2">Dasa</th><th className="px-3 py-2">Bhukti</th><th className="px-3 py-2">Antara</th><th className="px-3 py-2">Dasa start</th><th className="px-3 py-2">Dasa end</th></tr></thead><tbody>{chart.dasha.periods.map((period) => {
                  const now = Date.now();
                  const active = period.start.getTime() <= now && now < period.end.getTime();
                  const key = period.lords.join("-");
                  return <tr key={key} className={`border-b border-stone-100 ${active ? "bg-[#FDF2EC]" : ""}`}><td className="px-3 py-2.5 font-semibold">{period.lords[0]}</td><td className="px-3 py-2.5">{period.lords[1] ?? "—"}</td><td className="px-3 py-2.5">{period.lords[2] ?? "—"}</td><td className="px-3 py-2.5 font-mono">{formatDate(period.start)}</td><td className="px-3 py-2.5"><button type="button" onClick={() => void toggleSookshma(period)} className="font-mono text-[#C05A3A]">{formatDate(period.end)} · {expandedDasha === key ? "−" : "+"}</button></td></tr>;
                })}</tbody></table>
                {expandedDasha && sookshma && <div className="border-t border-stone-200 p-4"><p className="mb-2 text-xs font-semibold text-stone-700">Sookshma periods · {expandedDasha}</p><div className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{sookshma.map((period) => <div key={period.lords.join("-")} className="rounded-lg bg-stone-50 px-3 py-2 text-[11px]"><strong>{period.lords.join(" · ")}</strong><span className="block text-stone-500">{formatDate(period.start)} — {formatDate(period.end)}</span></div>)}</div></div>}
              </div>
            </LazySection>
          )}
        </>
      )}

      {show249 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4" role="dialog" aria-modal="true" aria-label="KP 249 table">
          <div className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3"><h2 className="text-sm font-semibold">KP 249 horary table</h2><button type="button" onClick={() => setShow249(false)} className="h-8 rounded-lg border border-stone-200 px-3 text-xs">Close</button></div>
            <div className="overflow-y-auto p-2"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-stone-100"><tr><th className="px-3 py-2">No.</th><th className="px-3 py-2">Range</th><th className="px-3 py-2">Sign / Star / Sub</th></tr></thead><tbody>{kp249?.map((row) => <tr key={row.number} className="cursor-pointer border-b border-stone-100 hover:bg-[#FDF2EC]" onClick={() => { setHoraryNumber(String(row.number)); setShow249(false); }}><td className="px-3 py-2 font-semibold">{row.number}</td><td className="px-3 py-2">{row.startText} — {row.endText}</td><td className="px-3 py-2">{row.signLord} / {row.starLord} / {row.subLord}</td></tr>)}</tbody></table></div>
          </div>
        </div>
      )}
    </section>
  );
}

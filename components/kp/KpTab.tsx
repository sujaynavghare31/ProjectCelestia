"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import EphemerisLoader from "@/components/dashboard-tabs/ephemeris-loader";
import type { BirthProfile } from "@/lib/kundali-store";
import type { CelestialLanguage, EphemerisResponse, PlanetPosition, ViewPreferences } from "@/lib/kundali-types";
import type { ChartStyle } from "@/lib/kundali-types";
import type { ChartBody, ChartPoint, KpChartModel, SayanaPlanets } from "@/src/lib/kp/chartModel";
import type { HoraryQuestionKey } from "@/src/lib/kp/horaryQuestions";

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
  aspectsTo: string[];
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
  sign: string;
  signLord: string;
  starLord: string;
  subLord: string;
};

type HoraryJudgement = {
  question: string;
  cusp: number;
  subLord: string;
  subLordSignificators: number[];
  favourableFound: number[];
  negativeFound: number[];
  secondary: null | {
    cusp: number;
    subLord: string;
    significators: number[];
    favourableFound: number[];
    negativeFound: number[];
  };
  verdict: string;
  timing: string;
  timingPlanets: string[];
};

type HoraryChart = EngineChart & {
  horary: {
    number: number;
    entry: HoraryEntry;
    ascendant: number;
    actualAscendantText: string;
  };
  judgement: HoraryJudgement | null;
};

type TransitRow = { body: string; sign: string; degreeText: string; signLord: string; starLord: string; subLord: string; retrograde: boolean; natalHouse: number };
type QuestionGroup = { group: string; questions: Array<{ key: HoraryQuestionKey; label: string }> };
type AyanamsaKind = "KP_NEW" | "KP_OLD";

const LORD_ABBR: Record<string, string> = {
  Sun: "SUN", Moon: "MON", Mars: "MAR", Mercury: "MER", Jupiter: "JUP", Venus: "VEN", Saturn: "SAT", Rahu: "RAH", Ketu: "KET",
};

const PLANET_COLORS: Record<string, string> = {
  Sun: "text-amber-700", Moon: "text-slate-600", Mars: "text-red-700", Mercury: "text-emerald-700",
  Jupiter: "text-yellow-700", Venus: "text-pink-700", Saturn: "text-indigo-700", Rahu: "text-violet-700", Ketu: "text-orange-700",
  Uranus: "text-fuchsia-700", Neptune: "text-fuchsia-700", Pluto: "text-fuchsia-700",
};

const SIGN_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const BODY_NAMES = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu", "Uranus", "Neptune", "Pluto"] as const;
const AYANAMSA_SETTING = "project-celestia:settings:kp-ayanamsa";
const DASHA_LEVELS = ["Maha", "Antar", "Pratyantar", "Sookshma"];
const YEAR_MS = 365.2425 * 86400000;

function secondsTime(time: string) {
  return /^\d{2}:\d{2}:\d{2}$/.test(time) ? time : `${time}:00`;
}

function timezoneHours(date: string, time: string, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = secondsTime(time).split(":").map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(localAsUtc));
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const zonedAsUtc = Date.UTC(read("year"), read("month") - 1, read("day"), read("hour"), read("minute"), read("second"));
  return (zonedAsUtc - localAsUtc) / 3600000;
}

function localMoment(date: string, time: string, profile: BirthProfile) {
  const tzHours = timezoneHours(date, time, profile.timezone);
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = secondsTime(time).split(":").map(Number);
  return {
    date,
    time: secondsTime(time),
    tzHours,
    latitude: profile.lat,
    longitude: profile.lng,
    instant: new Date(Date.UTC(year, month - 1, day, hour, minute, second) - tzHours * 3600000),
  };
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
      ayanamsa: "lahiri", zodiacMode: "tropical", calculationMode: "standard",
      nodeType: "true", nameFirstLetter: profile.name, gender: profile.sex,
    }),
  });
  const payload = await response.json() as EphemerisResponse | { error?: string };
  if (!response.ok) throw new Error("error" in payload ? payload.error ?? "KP calculation failed." : "KP calculation failed.");
  return payload as EphemerisResponse;
}

function sayanaPlanetsFromData(data: EphemerisResponse): SayanaPlanets {
  const result: SayanaPlanets = {};
  for (const body of BODY_NAMES) {
    const position = data.planets.find((planet) => planet.name === body);
    if (position) {
      result[body] = {
        longitude: position.longitude,
        speed: position.speed,
        retrograde: position.motion === "R",
      };
    }
  }
  return result;
}

function enginePlanets(model: KpChartModel) {
  return Object.fromEntries(
    model.bodies
      .filter((body) => body.key !== "Asc")
      .map((body) => [body.key, { longitude: body.nirayana, retrograde: body.retrograde }]),
  );
}

function rendererPosition(
  body: ChartBody | ChartPoint,
  source: PlanetPosition | undefined,
): PlanetPosition {
  const name = body.key === "Asc" ? "Ascendant" : body.key === "Fortuna" ? "Part of Fortune" : body.key;
  const sign = body.signIndex;
  const degree = body.nirayana - sign * 30;
  const motion = body.retrograde ? "R" : "D";
  return {
    ...(source ?? {
      id: name.toLowerCase(),
      name,
      symbol: body.abbr,
      longitude: body.nirayana,
      sign,
      signName: SIGN_NAMES[sign],
      degree,
      speed: 0,
      motion,
      declination: 0,
      nakshatra: 1,
      nakshatraName: "",
      pada: 1,
      nakshatraLord: "",
      house: body.bhava,
      dignity: "—",
    }),
    name,
    symbol: body.abbr,
    longitude: body.nirayana,
    sign,
    signName: SIGN_NAMES[sign],
    degree,
    motion,
    house: body.bhava,
  };
}

function rendererData(model: KpChartModel, data: EphemerisResponse) {
  const sourceFor = (key: string) => key === "Asc"
    ? data.ascendant
    : data.planets.find((planet) => planet.name === key);
  const ascendant = model.bodies.find((body) => body.key === "Asc");
  if (!ascendant) throw new Error("KP chart model is missing the Ascendant.");
  return {
    ascendant: rendererPosition(ascendant, sourceFor("Asc")),
    planets: model.bodies
      .filter((body) => body.key !== "Asc")
      .map((body) => rendererPosition(body, sourceFor(body.key))),
    points: model.points.map((point) => rendererPosition(point, undefined)),
    houseCusps: model.cusps.map((cusp) => ({
      house: cusp.house,
      longitude: cusp.nirayana,
      sign: cusp.signIndex,
      signName: SIGN_NAMES[cusp.signIndex],
    })),
  };
}

function LordBadge({ lord, strong = false }: { lord: string; strong?: boolean }) {
  return <span className={`inline-flex min-w-8 justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${strong ? "ring-1 ring-[#C05A3A]/60" : ""} ${PLANET_COLORS[lord] ?? "text-foreground"} bg-stone-100`}>{LORD_ABBR[lord] ?? lord}</span>;
}

function LazySection({ children, height = 240, label }: { children: React.ReactNode; height?: number; label: string }) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return <div ref={setNode} aria-label={label}>{visible ? children : <div className="animate-pulse rounded-xl border border-stone-200 bg-stone-50" style={{ minHeight: height }} />}</div>;
}

function abbrList(values: string[]) {
  return values.map((value) => LORD_ABBR[value] ?? value).join(" ");
}

function houseList(values: number[]) {
  return values.length ? values.join(" ") : "—";
}

function formatDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: timezone,
  }).format(date);
}

function formatDuration(start: Date, end: Date) {
  const years = (end.getTime() - start.getTime()) / YEAR_MS;
  if (years >= 1) return `${years.toFixed(2)} y`;
  const totalDays = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
  const months = Math.floor(totalDays / (365.2425 / 12));
  const days = Math.floor(totalDays - months * (365.2425 / 12));
  return `${months} m ${days} d`;
}

function splitDashaPeriod(
  period: DashaPeriod,
  order: string[],
  years: Record<string, number>,
): DashaPeriod[] {
  const parentLord = period.lords.at(-1);
  if (!parentLord || order.length !== 9) return [];
  const parentIndex = order.indexOf(parentLord);
  if (parentIndex < 0) return [];
  const parentYears = (period.end.getTime() - period.start.getTime()) / YEAR_MS;
  let cursor = period.start.getTime();
  return order.map((_, offset) => {
    const lord = order[(parentIndex + offset) % order.length];
    const duration = parentYears * (years[lord] ?? 0) / 120 * YEAR_MS;
    const end = offset === order.length - 1 ? period.end.getTime() : cursor + duration;
    const child = { lords: [...period.lords, lord], start: new Date(cursor), end: new Date(end) };
    cursor = end;
    return child;
  });
}

function DashaRows({
  periods,
  level,
  timezone,
  order,
  years,
}: {
  periods: DashaPeriod[];
  level: number;
  timezone: string;
  order: string[];
  years: Record<string, number>;
}) {
  return periods.map((period) => (
    <DashaRow
      key={`${period.lords.join("-")}-${period.start.getTime()}`}
      period={period}
      level={level}
      timezone={timezone}
      order={order}
      years={years}
    />
  ));
}

function DashaRow({
  period,
  level,
  timezone,
  order,
  years,
}: {
  period: DashaPeriod;
  level: number;
  timezone: string;
  order: string[];
  years: Record<string, number>;
}) {
  const now = Date.now();
  const active = period.start.getTime() <= now && now < period.end.getTime();
  const [expanded, setExpanded] = useState(active && level < 4);
  const children = useMemo(
    () => expanded && level < 4 ? splitDashaPeriod(period, order, years) : [],
    [expanded, level, order, period, years],
  );
  const lord = period.lords.at(-1) ?? "—";
  const canExpand = level < 4 && order.length === 9;
  return (
    <>
      <tr className={`border-b border-stone-100 ${active ? "bg-[#FFF8E1]" : ""}`}>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1" style={{ paddingLeft: `${(level - 1) * 18}px` }}>
            {canExpand ? (
              <button
                type="button"
                aria-label={`${expanded ? "Collapse" : "Expand"} ${lord} ${DASHA_LEVELS[level - 1]}`}
                aria-expanded={expanded}
                onClick={() => setExpanded((value) => !value)}
                className="rounded p-0.5 text-stone-500 hover:bg-stone-100"
              >
                {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              </button>
            ) : <span className="inline-block w-4" />}
            <span className="font-semibold">{lord}</span>
            <span className="text-stone-500">{DASHA_LEVELS[level - 1]}</span>
            {active && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">NOW</span>}
          </div>
        </td>
        <td className="px-3 py-2.5 font-mono">{formatDate(period.start, timezone)}</td>
        <td className="px-3 py-2.5 font-mono">{formatDate(period.end, timezone)}</td>
        <td className="px-3 py-2.5">{formatDuration(period.start, period.end)}</td>
      </tr>
      {expanded && children.length > 0 && (
        <DashaRows periods={children} level={level + 1} timezone={timezone} order={order} years={years} />
      )}
    </>
  );
}

function DashaTable({
  periods,
  timezone,
  order,
  years,
}: {
  periods: DashaPeriod[];
  timezone: string;
  order: string[];
  years: Record<string, number>;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
      <h2 className="border-b border-stone-200 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-800">Vimshottari Dasha</h2>
      <table className="w-full min-w-[620px] text-left text-xs">
        <thead><tr className="border-b border-stone-200 text-[10px] uppercase tracking-wider text-stone-500">
          <th className="px-3 py-2">Period</th><th className="px-3 py-2">Start</th><th className="px-3 py-2">End</th><th className="px-3 py-2">Duration</th>
        </tr></thead>
        <tbody><DashaRows periods={periods} level={1} timezone={timezone} order={order} years={years} /></tbody>
      </table>
    </div>
  );
}

function BhavaChalitChart({ model, showOuterPlanets, showFortune }: {
  model: KpChartModel;
  showOuterPlanets: boolean;
  showFortune: boolean;
}) {
  const centers: Record<number, [number, number]> = {
    1: [180, 78], 2: [88, 42], 3: [42, 90], 4: [84, 180], 5: [42, 270], 6: [88, 318],
    7: [180, 282], 8: [272, 318], 9: [318, 270], 10: [276, 180], 11: [318, 90], 12: [272, 42],
  };
  const ascendant = model.bodies.find((body) => body.key === "Asc");
  return (
    <svg viewBox="0 0 360 360" className="h-full w-full rounded-xl" role="img" aria-label="KP Bhava-Chalit North Indian chart">
      <rect x="10" y="10" width="340" height="340" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--chart-grid))" strokeWidth="1.5" />
      <path d="M10 10 350 350M350 10 10 350M180 10 350 180 180 350 10 180 180 10" fill="none" stroke="hsl(var(--chart-grid))" strokeWidth="1" />
      {Array.from({ length: 12 }, (_, index) => {
        const house = index + 1;
        const [x, y] = centers[house];
        const bodies = model.bodies.filter((body) =>
          body.key !== "Asc"
          && body.bhava === house
          && (showOuterPlanets || !["Uranus", "Neptune", "Pluto"].includes(body.key)),
        );
        const points = showFortune ? model.points.filter((point) => point.bhava === house) : [];
        const labels = [
          ...(house === 1 && ascendant ? [ascendant.abbr] : []),
          ...bodies.map((body) => `${body.abbr}${body.retrograde ? "R" : ""}`),
          ...points.map((point) => point.abbr),
        ];
        return (
          <g key={house}>
            <text x={x} y={y - 10} fill="hsl(var(--muted-foreground))" fontSize="9" fontWeight="600" textAnchor="middle">{house}</text>
            <text x={x} y={y + 2} fill="hsl(var(--foreground))" fontSize="8" fontWeight="700" textAnchor="middle">
              {labels.map((label, index) => <tspan key={`${house}-${label}`} x={x} dy={index === 0 ? 0 : 10}>{label}</tspan>)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function KpTab({ profile, language, viewPreferences, ChartRenderer }: KpTabProps) {
  const [mode, setMode] = useState<"natal" | "horary">("natal");
  const [ayanamsaKind, setAyanamsaKind] = useState<AyanamsaKind>("KP_NEW");
  const [data, setData] = useState<EphemerisResponse | null>(null);
  const [currentData, setCurrentData] = useState<EphemerisResponse | null>(null);
  const [chart, setChart] = useState<EngineChart | null>(null);
  const [chartModel, setChartModel] = useState<KpChartModel | null>(null);
  const [horaryData, setHoraryData] = useState<EphemerisResponse | null>(null);
  const [horaryChart, setHoraryChart] = useState<HoraryChart | null>(null);
  const [horaryModel, setHoraryModel] = useState<KpChartModel | null>(null);
  const [transit, setTransit] = useState<TransitRow[]>([]);
  const [horaryTransit, setHoraryTransit] = useState<TransitRow[]>([]);
  const [currentRuling, setCurrentRuling] = useState<EngineRuling | null>(null);
  const [questionGroups, setQuestionGroups] = useState<QuestionGroup[]>([]);
  const [dashaConfig, setDashaConfig] = useState<{ order: string[]; years: Record<string, number> }>({ order: [], years: {} });
  const [loading, setLoading] = useState(true);
  const [natalEngineLoading, setNatalEngineLoading] = useState(false);
  const [horaryEngineLoading, setHoraryEngineLoading] = useState(false);
  const [error, setError] = useState("");
  const [horaryNumber, setHoraryNumber] = useState("45");
  const [questionKey, setQuestionKey] = useState<HoraryQuestionKey | "">("");
  const [question, setQuestion] = useState("");
  const [momentDate, setMomentDate] = useState(profile.date);
  const [momentTime, setMomentTime] = useState(profile.time);
  const [show249, setShow249] = useState(false);
  const [kp249, setKp249] = useState<Array<{ number: number; startText: string; endText: string; signLord: string; starLord: string; subLord: string }> | null>(null);

  const load = useCallback(async () => {
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
  }, [profile]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const stored = window.localStorage.getItem(AYANAMSA_SETTING);
    if (stored === "KP_NEW" || stored === "KP_OLD") setAyanamsaKind(stored);
    void import("@/src/lib/kp/horaryQuestions").then(({ HORARY_QUESTION_GROUPS: groups }) => {
      setQuestionGroups(groups.map(({ group, questions }) => ({
        group,
        questions: questions.map(({ key, label }) => ({ key, label })),
      })));
    }).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load horary questions.");
    });
  }, []);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    setNatalEngineLoading(true);
    void Promise.all([
      import("@/src/lib/kp"),
      import("@/src/lib/kp/ayanamsa"),
      import("@/src/lib/kp/chartModel"),
    ]).then(([kp, ayanamsa, chartModelModule]) => {
      if (cancelled) return;
      const moment = localMoment(profile.date, profile.time, profile);
      const value = ayanamsa.kpAyanamsaAt(moment.instant, ayanamsaKind);
      const model = chartModelModule.buildChartModel({
        mode: "natal",
        sayanaPlanets: sayanaPlanetsFromData(data),
        sayanaCusps: data.houseCusps.map(({ longitude }) => longitude),
        ayanamsa: { kind: ayanamsaKind, value, text: ayanamsa.formatAyanamsa(value), at: moment.instant.toISOString() },
        lagnaSayana: data.ascendant.longitude,
      });
      if (model.bodies.length < 10) throw new Error(`KP chart has only ${model.bodies.length} bodies; expected at least 10.`);
      const planets = enginePlanets(model);
      const result = kp.kpChart({
        planets: planets as Parameters<typeof kp.kpChart>[0]["planets"],
        cusps: model.cusps.map(({ nirayana }) => nirayana),
        birth: moment,
        ayanamsa: value,
        sunrise: "06:55",
      }) as unknown as EngineChart;

      setChartModel(model);
      setChart(result);
      setDashaConfig({ order: kp.DASHA_ORDER, years: kp.DASHA_YEARS });
      setError("");
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to calculate the KP chart.");
    }).finally(() => {
      if (!cancelled) setNatalEngineLoading(false);
    });
    return () => { cancelled = true; };
  }, [data, profile, ayanamsaKind]);

  useEffect(() => {
    if (!currentData) {
      setTransit([]);
      setCurrentRuling(null);
      return;
    }
    let cancelled = false;
    void Promise.all([
      import("@/src/lib/kp"),
      import("@/src/lib/kp/ayanamsa"),
      import("@/src/lib/kp/chartModel"),
    ]).then(([kp, ayanamsa, chartModelModule]) => {
      if (cancelled) return;
      const moment = localMoment(currentData.input.date, currentData.input.time, profile);
      const value = ayanamsa.kpAyanamsaAt(moment.instant, ayanamsaKind);
      const model = chartModelModule.buildChartModel({
        mode: "natal",
        sayanaPlanets: sayanaPlanetsFromData(currentData),
        sayanaCusps: currentData.houseCusps.map(({ longitude }) => longitude),
        ayanamsa: { kind: ayanamsaKind, value, text: ayanamsa.formatAyanamsa(value), at: moment.instant.toISOString() },
        lagnaSayana: currentData.ascendant.longitude,
      });
      const currentChart = kp.kpChart({
        planets: enginePlanets(model) as Parameters<typeof kp.kpChart>[0]["planets"],
        cusps: model.cusps.map(({ nirayana }) => nirayana),
        birth: moment,
        ayanamsa: value,
        sunrise: "06:55",
      });
      const transitRows = kp.kpTransit(
        enginePlanets(model) as Parameters<typeof kp.kpTransit>[0],
        chartModel?.cusps.map(({ nirayana }) => nirayana) ?? model.cusps.map(({ nirayana }) => nirayana),
      ) as unknown as TransitRow[];
      setTransit(transitRows);
      setCurrentRuling(currentChart.ruling as EngineRuling);
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to calculate current KP transits.");
    });
    return () => { cancelled = true; };
  }, [currentData, profile, ayanamsaKind, chartModel]);

  useEffect(() => {
    if (mode !== "horary") return;
    const number = Number(horaryNumber);
    if (!Number.isInteger(number) || number < 1 || number > 249) {
      setHoraryChart(null);
      setHoraryModel(null);
      setHoraryData(null);
      setHoraryEngineLoading(false);
      return;
    }
    let cancelled = false;
    setHoraryEngineLoading(true);
    setHoraryChart(null);
    setHoraryModel(null);
    setHoraryData(null);
    setError("");
    void (async () => {
      const [ephemeris, kp, horary, ayanamsa, chartModelModule] = await Promise.all([
        fetchEphemeris(profile, momentDate, momentTime),
        import("@/src/lib/kp"),
        import("@/src/lib/kp/horary"),
        import("@/src/lib/kp/ayanamsa"),
        import("@/src/lib/kp/chartModel"),
      ]);
      if (cancelled) return;
      const moment = localMoment(momentDate, momentTime, profile);
      const value = ayanamsa.kpAyanamsaAt(moment.instant, ayanamsaKind);
      const kpMoment = {
        date: moment.date,
        time: moment.time,
        tzHours: moment.tzHours,
        latitude: moment.latitude,
        longitude: moment.longitude,
      };
      const horaryAsc = horary.horaryCusps(number, kpMoment, value);
      const model = chartModelModule.buildChartModel({
        mode: "horary",
        sayanaPlanets: sayanaPlanetsFromData(ephemeris),
        sayanaCusps: horaryAsc.cusps.map((cusp) => cusp + value),
        ayanamsa: { kind: ayanamsaKind, value, text: ayanamsa.formatAyanamsa(value), at: moment.instant.toISOString() },
        lagnaSayana: horaryAsc.cusps[0] + value,
      });
      if (model.bodies.length < 10) throw new Error(`KP horary chart has only ${model.bodies.length} bodies; expected at least 10.`);
      const transitRows = kp.kpTransit(
        enginePlanets(model) as Parameters<typeof kp.kpTransit>[0],
        model.cusps.map(({ nirayana }) => nirayana),
      ) as unknown as TransitRow[];
      if (cancelled) return;
      setHoraryData(ephemeris);
      setHoraryModel(model);
      setHoraryTransit(transitRows);
      setDashaConfig({ order: kp.DASHA_ORDER, years: kp.DASHA_YEARS });
    })().catch((loadError: unknown) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to calculate the horary chart.");
    }).finally(() => {
      if (!cancelled) setHoraryEngineLoading(false);
    });
    return () => { cancelled = true; };
  }, [mode, horaryNumber, momentDate, momentTime, profile, ayanamsaKind]);

  useEffect(() => {
    if (mode !== "horary" || !horaryData || !horaryModel) return;
    let cancelled = false;
    setHoraryEngineLoading(true);
    void import("@/src/lib/kp/horary").then((horary) => {
      if (cancelled) return;
      const moment = localMoment(momentDate, momentTime, profile);
      const result = horary.kpHorary({
        number: Number(horaryNumber),
        moment: {
          date: moment.date,
          time: moment.time,
          tzHours: moment.tzHours,
          latitude: moment.latitude,
          longitude: moment.longitude,
        },
        cusps: horaryModel.cusps.map(({ nirayana }) => nirayana),
        ayanamsa: horaryModel.ayanamsa.value,
        planets: enginePlanets(horaryModel) as Parameters<typeof horary.kpHorary>[0]["planets"],
        sunrise: "06:55",
        question,
        ...(questionKey ? { questionKey } : {}),
      }) as unknown as HoraryChart;
      setHoraryChart(result);
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to calculate horary significators.");
    }).finally(() => {
      if (!cancelled) setHoraryEngineLoading(false);
    });
    return () => { cancelled = true; };
  }, [mode, horaryNumber, questionKey, question, momentDate, momentTime, profile, horaryData, horaryModel]);

  useEffect(() => {
    if (mode !== "natal") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [mode, load]);

  const activeChart = mode === "horary" ? horaryChart : chart;
  const activeModel = mode === "horary" ? horaryModel : chartModel;
  const activeEphemeris = mode === "horary" ? horaryData : data;
  const activeTransit = mode === "horary" ? horaryTransit : transit;
  const activeRendererData = useMemo(
    () => activeModel && activeEphemeris ? rendererData(activeModel, activeEphemeris) : null,
    [activeModel, activeEphemeris],
  );
  const kpPreferences = useMemo(() => ({
    ...viewPreferences,
    showBhavaCusps: false,
    showHouseLabels: true,
    showSignNumbers: false,
  }), [viewPreferences]);
  const engineLoading = mode === "horary" ? horaryEngineLoading : natalEngineLoading;
  const ayanamsaInfo = activeModel?.ayanamsa;
  const rulingRows: Array<[string, EngineRuling | null | undefined]> = mode === "horary"
    ? [["Horary moment", horaryChart?.ruling]]
    : [["Birth moment", chart?.ruling], ["Current transit", currentRuling]];

  const setAyanamsa = (kind: AyanamsaKind) => {
    setAyanamsaKind(kind);
    window.localStorage.setItem(AYANAMSA_SETTING, kind);
  };

  const handleQuestionChange = (text: string) => {
    setQuestion(text);
    setQuestionKey("");
    void import("@/src/lib/kp/horaryQuestions").then(({ detectQuestionCategory }) => {
      const detected = detectQuestionCategory(text);
      if (detected) setQuestionKey(detected);
    }).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to detect the horary question.");
    });
  };

  const open249 = async () => {
    setShow249(true);
    if (!kp249) {
      try {
        const module = await import("@/src/lib/kp/horary");
        setKp249(module.KP249);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load the KP 249 table.");
      }
    }
  };

  const activeBodyCount = activeModel?.bodies.length ?? 0;
  const ayanamsaDateText = ayanamsaInfo
    ? new Intl.DateTimeFormat("en-GB", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
      timeZone: profile.timezone,
    }).format(new Date(ayanamsaInfo.at))
    : null;

  return (
    <section className="space-y-4 rounded-2xl bg-[#FDFBF7] p-1">
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-[#C05A3A]"><Sparkles className="size-4" /><span className="text-xs font-semibold uppercase tracking-[0.18em]">Krishnamurti Paddhati</span></div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">KP Astrology</h1>
          <p className="mt-1 text-sm text-stone-500">KP ayanamsa · Placidus cusps · sub-lord analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMode("natal")} className={`h-9 rounded-lg px-3 text-xs font-semibold transition ${mode === "natal" ? "bg-[#C05A3A] text-white" : "border border-stone-200 bg-white text-stone-600"}`}>Natal</button>
          <button type="button" onMouseEnter={() => void import("@/src/lib/kp/horary")} onClick={() => setMode("horary")} className={`h-9 rounded-lg px-3 text-xs font-semibold transition ${mode === "horary" ? "bg-[#C05A3A] text-white" : "border border-stone-200 bg-white text-stone-600"}`}>Horary (Prashna)</button>
          <button type="button" onClick={() => void load()} aria-label="Recalculate KP chart" className="grid size-9 place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"><RefreshCw className="size-4" /></button>
        </div>
      </header>

      {mode === "horary" && (
        <div className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm lg:grid-cols-[150px_240px_1fr_180px]">
          <label className="text-xs font-semibold text-stone-700">KP number
            <input value={horaryNumber} onChange={(event) => setHoraryNumber(event.target.value)} inputMode="numeric" type="number" min={1} max={249} className="mt-1 h-10 w-full rounded-lg border border-stone-200 bg-[#FDFBF7] px-3 text-sm outline-none focus:border-[#C05A3A]" />
          </label>
          <label className="text-xs font-semibold text-stone-700">Question type
            <select value={questionKey} onChange={(event) => setQuestionKey(event.target.value as HoraryQuestionKey | "")} className="mt-1 h-10 w-full rounded-lg border border-stone-200 bg-[#FDFBF7] px-3 text-sm outline-none focus:border-[#C05A3A]">
              <option value="">Choose a question type</option>
              {questionGroups.map(({ group, questions }) => (
                <optgroup key={group} label={group}>
                  {questions.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-stone-700">Question
            <input value={question} onChange={(event) => handleQuestionChange(event.target.value)} placeholder="Will I win the case?" className="mt-1 h-10 w-full rounded-lg border border-stone-200 bg-[#FDFBF7] px-3 text-sm outline-none focus:border-[#C05A3A]" />
          </label>
          <div className="flex items-end"><button type="button" onMouseEnter={() => void open249()} onClick={() => void open249()} className="h-10 w-full rounded-lg border border-[#C05A3A]/30 text-xs font-semibold text-[#C05A3A]">Open KP 249 table</button></div>
          <label className="text-xs font-semibold text-stone-700">Judgment date<input type="date" value={momentDate} onChange={(event) => setMomentDate(event.target.value)} className="mt-1 h-10 rounded-lg border border-stone-200 bg-[#FDFBF7] px-3 text-sm" /></label>
          <label className="text-xs font-semibold text-stone-700">Judgment time<input type="time" step={1} value={momentTime} onChange={(event) => setMomentTime(event.target.value)} className="mt-1 h-10 rounded-lg border border-stone-200 bg-[#FDFBF7] px-3 text-sm" /></label>
        </div>
      )}

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {(loading || engineLoading) && <EphemerisLoader title="Calculating KP astrology" description="Preparing cusps, significators and ruling planets…" detail={`${profile.city || "Chart"} · KP ayanamsa`} />}

      {!loading && !engineLoading && activeChart && activeModel && activeRendererData && (
        <>
          {activeBodyCount < 10 && (
            <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
              KP chart model contains only {activeBodyCount} bodies. The charts are unavailable until the planetary positions load correctly.
            </div>
          )}

          {mode === "horary" && horaryChart && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Horary No. {horaryChart.horary.number}</p>
                <p className="mt-1 text-sm text-stone-800">
                  Lagna {horaryChart.horary.entry.startText} ({horaryChart.horary.entry.signLord} / {horaryChart.horary.entry.starLord} / {horaryChart.horary.entry.subLord})
                </p>
                {horaryChart.judgement && (
                  <>
                    <p className="mt-1 text-xs text-stone-500">
                      Cusp {horaryChart.judgement.cusp} sub lord <strong>{horaryChart.judgement.subLord}</strong>
                      {" · signifies "}{houseList(horaryChart.judgement.subLordSignificators)}
                      {" · favourable "}{houseList(horaryChart.judgement.favourableFound)}
                      {" · negative "}{houseList(horaryChart.judgement.negativeFound)}
                    </p>
                    {horaryChart.judgement.secondary && (
                      <p className="mt-1 text-xs text-stone-500">
                        Secondary cusp {horaryChart.judgement.secondary.cusp} sub lord {horaryChart.judgement.secondary.subLord}
                        {" · favourable "}{houseList(horaryChart.judgement.secondary.favourableFound)}
                        {" · negative "}{houseList(horaryChart.judgement.secondary.negativeFound)}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-stone-500">Event likely in the period of significators that are also Ruling Planets.</p>
                  </>
                )}
                {!horaryChart.judgement && <p className="mt-1 text-xs text-stone-500">Choose or type a question to view the KP judgement.</p>}
              </div>
              {horaryChart.judgement && <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${horaryChart.judgement.verdict.startsWith("YES") ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{horaryChart.judgement.verdict}</span>}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-sm">
            <label htmlFor="kp-ayanamsa" className="font-semibold text-stone-800">KP Ayanamsa</label>
            <select id="kp-ayanamsa" value={ayanamsaKind} onChange={(event) => setAyanamsa(event.target.value as AyanamsaKind)} className="h-9 rounded-lg border border-stone-200 bg-[#FDFBF7] px-3 text-sm font-medium">
              <option value="KP_NEW">KP New</option>
              <option value="KP_OLD">KP Old</option>
            </select>
            <span className="font-mono font-semibold text-stone-900">{ayanamsaInfo?.text ?? "—"}</span>
            {ayanamsaDateText && <span className="text-xs text-stone-500">(for {ayanamsaDateText} {profile.timezone})</span>}
          </div>

          <LazySection label="KP charts" height={520}>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-stone-800">{mode === "horary" ? "Horary chart" : "Birth chart"} · South Indian</h2>
                <div className="aspect-square overflow-hidden rounded-lg"><ChartRenderer style="south" ascendant={activeRendererData.ascendant} planets={activeRendererData.planets} points={activeRendererData.points} houseCusps={activeRendererData.houseCusps} varga={1} language={language} preferences={kpPreferences} /></div>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-stone-800">Rasi chart · North Indian</h2>
                <div className="aspect-square overflow-hidden rounded-lg"><ChartRenderer style="diamond" ascendant={activeRendererData.ascendant} planets={activeRendererData.planets} points={activeRendererData.points} houseCusps={activeRendererData.houseCusps} varga={1} language={language} preferences={kpPreferences} /></div>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-stone-800">Bhav-Chalit chart</h2>
                <div className="aspect-square overflow-hidden rounded-lg"><BhavaChalitChart model={activeModel} showOuterPlanets={viewPreferences.showOuterPlanets} showFortune /></div>
              </div>
            </div>
          </LazySection>

          <LazySection label="Ruling planets" height={180}>
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
              <h2 className="border-b border-stone-200 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-800">
                Ruling planets{mode === "horary" && horaryChart ? ` · Actual Lagna ${horaryChart.horary.actualAscendantText}` : ""}
              </h2>
              <table className="w-full min-w-[720px] text-left text-xs"><thead><tr className="border-b border-stone-200 text-[10px] uppercase tracking-wider text-stone-500"><th className="px-4 py-2">Period</th><th className="px-4 py-2">Day lord</th><th className="px-4 py-2">Moon · sign / star / sub</th><th className="px-4 py-2">Asc · sign / star / sub</th><th className="px-4 py-2">Nodes</th><th className="px-4 py-2">All ruling planets</th></tr></thead><tbody>
                {rulingRows.map(([label, ruling]) => ruling && <tr key={label} className="border-b border-stone-100 last:border-0"><td className="px-4 py-3 font-semibold text-stone-700">{label}</td><td className="px-4 py-3"><LordBadge lord={ruling.dayLord ?? "—"} /></td><td className="px-4 py-3"><LordBadge lord={ruling.moon.sign} /><LordBadge lord={ruling.moon.star} /><LordBadge lord={ruling.moon.sub} /></td><td className="px-4 py-3"><LordBadge lord={ruling.asc.sign} /><LordBadge lord={ruling.asc.star} /><LordBadge lord={ruling.asc.sub} /></td><td className="px-4 py-3">{ruling.nodes.map((node) => <LordBadge key={node} lord={node} />)}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-1">{ruling.all.map((lord) => <LordBadge key={lord} lord={lord} strong />)}</div></td></tr>)}
              </tbody></table>
            </div>
          </LazySection>

          <LazySection label="Planets and cusps" height={620}>
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
              <h2 className="border-b border-stone-200 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-800">Planets and cusps details · {mode === "horary" ? "Horary" : "Natal"} and significators</h2>
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
              <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm"><h2 className="border-b border-stone-200 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-800">Planets details · Transit</h2><table className="w-full min-w-[650px] text-left text-xs"><thead><tr className="border-b border-stone-200 text-[10px] uppercase tracking-wider text-stone-500"><th className="px-3 py-2">Planet</th><th className="px-3 py-2">Sign</th><th className="px-3 py-2">Degrees</th><th className="bg-[#FFF59D] px-3 py-2">Sign lord</th><th className="bg-[#BDE8F6] px-3 py-2">Star lord</th><th className="bg-[#C8F2C2] px-3 py-2">Sub lord</th><th className="px-3 py-2">Cusp(N)</th></tr></thead><tbody>{activeTransit.map((row) => <tr key={row.body} className="border-b border-stone-100"><td className={`px-3 py-2.5 font-semibold ${PLANET_COLORS[row.body]}`}>{row.body}{row.retrograde ? "®" : ""}</td><td className="px-3 py-2.5">{row.sign}</td><td className="px-3 py-2.5 font-mono">{row.degreeText}</td><td className="bg-[#FFF59D]/70 px-3 py-2.5"><LordBadge lord={row.signLord} /></td><td className="bg-[#BDE8F6]/70 px-3 py-2.5"><LordBadge lord={row.starLord} /></td><td className="bg-[#C8F2C2]/70 px-3 py-2.5"><LordBadge lord={row.subLord} /></td><td className="px-3 py-2.5 font-semibold">{row.natalHouse}</td></tr>)}</tbody></table></div>
            </div>
          </LazySection>

          {activeChart.dasha && (
            <LazySection label="Vimshottari dasha" height={420}>
              <div className="mb-2 text-xs text-stone-500">{activeChart.dasha.balance.lord} Maha balance at the chart moment · {activeChart.dasha.balance.text}</div>
              <DashaTable
                periods={activeChart.dasha.periods}
                timezone={profile.timezone}
                order={dashaConfig.order}
                years={dashaConfig.years}
              />
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

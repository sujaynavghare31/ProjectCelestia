"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownUp,
  Bookmark,
  ChevronDown,
  Clock3,
  Compass,
  Crosshair,
  Eye,
  Globe2,
  Info,
  Languages,
  LoaderCircle,
  Maximize2,
  MapPin,
  Minimize2,
  Orbit,
  RefreshCw,
  Search,
  Settings2,
  Save,
  X,
  Sparkles,
} from "lucide-react";
import { SignInButton, useAuth } from "@clerk/nextjs";
import type { ChartStyle, CelestialLanguage, EphemerisResponse, PlanetPosition, ViewPreferences, ZodiacMode } from "@/lib/kundali-types";
import { getBirthDateTimeDefaults, useKundaliStore } from "@/lib/kundali-store";
import { planetName, signName } from "@/lib/astrology/localization";
import { MedicalAstrologyVisualizer } from "@/components/medical-astrology-visualizer";
import { dagdhaRashis } from "@/lib/astrology/dagdha-rashi";

const VARGAS = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60];
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const BODY_COLORS: Record<string, string> = {
  Ascendant: "text-gold-foreground",
  Uranus: "text-cyan-700 dark:text-cyan-400",
  Neptune: "text-cyan-700 dark:text-cyan-400",
  Pluto: "text-cyan-700 dark:text-cyan-400",
  Chiron: "text-violet-700 dark:text-violet-300",
  Lilith: "text-violet-700 dark:text-violet-300",
};

function degreeToDms(value: number) {
  const totalSeconds = Math.round(value * 3600);
  const degrees = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(degrees).padStart(2, "0")}° ${String(minutes).padStart(2, "0")}' ${String(seconds).padStart(2, "0")}"`;
}

function declinationToDms(value: number) {
  const hemisphere = value < 0 ? "S" : "N";
  return `${degreeToDms(Math.abs(value))} ${hemisphere}`;
}

function normalizeSign(sign: number) {
  return ((sign % 12) + 12) % 12;
}

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mars: "♂", Mercury: "☿", Jupiter: "♃", Venus: "♀",
  Saturn: "♄", Rahu: "☊", Ketu: "☋", Uranus: "♅", Neptune: "♆", Pluto: "♇",
  Ascendant: "ASC", Chiron: "⚷", Lilith: "⚸", "Part of Fortune": "⊗",
};
const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const SHORT_SIGNS = ["Ari", "Tau", "Gem", "Can", "Leo", "Vir", "Lib", "Sco", "Sag", "Cap", "Aqu", "Pis"];

function PlanetMark({ name, label, enabled }: { name: string; label: string; enabled: boolean }) {
  if (!enabled) return <>{label}</>;
  return <svg aria-label={name} role="img" viewBox="0 0 24 24" className="inline-block size-4 align-[-3px]"><text x="12" y="18" textAnchor="middle" fontSize="18" fill="currentColor">{PLANET_GLYPHS[name] ?? label}</text></svg>;
}

function SignMark({ sign, label, enabled }: { sign: number; label: string; enabled: boolean }) {
  if (!enabled) return <>{label}</>;
  return <svg aria-label={label} role="img" viewBox="0 0 24 24" className="inline-block size-4 align-[-3px]"><text x="12" y="18" textAnchor="middle" fontSize="18" fill="currentColor">{SIGN_GLYPHS[sign]}</text></svg>;
}

function chartPlanetDisplay(planet: PlanetPosition, language: CelestialLanguage, useIcons: boolean) {
  const fullName = planetName(planet.name, "en", planet.name);
  return useIcons ? `${PLANET_GLYPHS[planet.name] ?? ""} ${fullName}`.trim() : fullName;
}

function signDisplay(sign: number, language: CelestialLanguage, useIcons: boolean) {
  return useIcons ? SIGN_GLYPHS[sign] : signName(SIGNS[sign], language);
}

function chartSignDisplay(sign: number, language: CelestialLanguage, preferences: ViewPreferences) {
  if (!preferences.showSignNumbers) return signDisplay(sign, language, preferences.useSignIcons);
  return preferences.useSignIcons ? `${SIGN_GLYPHS[sign]} ${sign + 1}` : String(sign + 1);
}

function signColor(sign: number) {
  return ["#dc2626", "#65a30d", "#0284c7", "#0891b2", "#ea580c", "#16a34a", "#1d4ed8", "#0f766e", "#c026d3", "#78716c", "#4f46e5", "#0d9488"][sign];
}

function signFillClass(sign: number) {
  const classes = [
    "fill-rose-50/70 dark:fill-rose-950/25",
    "fill-lime-50/70 dark:fill-lime-950/25",
    "fill-sky-50/70 dark:fill-sky-950/25",
    "fill-cyan-50/70 dark:fill-cyan-950/25",
  ];
  return classes[sign % 4];
}

function formatBirthDate(date: string) {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
}

const TITHIS = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"];
const YOGAS = ["Vishkumbha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"];
const NAKSHATRA_SYLLABLES = [
  ["Chu", "Che", "Cho", "La"], ["Li", "Lu", "Le", "Lo"], ["A", "I", "U", "E"], ["O", "Va", "Vi", "Vu"],
  ["Ve", "Vo", "Ka", "Ki"], ["Ku", "Gha", "Nga", "Chha"], ["Ke", "Ko", "Ha", "Hi"], ["Hu", "He", "Ho", "Da"],
  ["Di", "Du", "De", "Do"], ["Ma", "Mi", "Mu", "Me"], ["Mo", "Ta", "Ti", "Tu"], ["Te", "To", "Pa", "Pi"],
  ["Pu", "Sha", "Na", "Tha"], ["Pe", "Po", "Ra", "Ri"], ["Ru", "Re", "Ro", "Ta"], ["Ti", "Tu", "Te", "To"],
  ["Na", "Ni", "Nu", "Ne"], ["No", "Ya", "Yi", "Yu"], ["Ye", "Yo", "Bha", "Bhi"], ["Bhu", "Dha", "Pha", "Dha"],
  ["Bhe", "Bho", "Ja", "Ji"], ["Ju", "Je", "Jo", "Gha"], ["Ga", "Gi", "Gu", "Ge"], ["Go", "Sa", "Si", "Su"],
  ["Se", "So", "Da", "Di"], ["Du", "Tha", "Jha", "Na"], ["De", "Do", "Cha", "Chi"],
];
const NAKSHATRA_AKSHARAS = [
  ["चू", "चे", "चो", "ला"], ["ली", "लू", "ले", "लो"], ["अ", "ई", "उ", "ए"], ["ओ", "वा", "वी", "वू"],
  ["वे", "वो", "का", "की"], ["कू", "घ", "ङ", "छ"], ["के", "को", "हा", "ही"], ["हू", "हे", "हो", "डा"],
  ["डी", "डू", "डे", "डो"], ["मा", "मी", "मू", "मे"], ["मो", "टा", "टी", "टू"], ["टे", "टो", "पा", "पी"],
  ["पू", "षा", "णा", "ठा"], ["पे", "पो", "रा", "री"], ["रू", "रे", "रो", "ता"], ["ती", "तू", "ते", "तो"],
  ["ना", "नी", "नू", "ने"], ["नो", "या", "यी", "यू"], ["ये", "यो", "भा", "भी"], ["भू", "धा", "फा", "ढा"],
  ["भे", "भो", "जा", "जी"], ["जू", "जे", "जो", "खा"], ["गा", "गी", "गु", "गे"], ["गो", "सा", "सी", "सू"],
  ["से", "सो", "दा", "दी"], ["दू", "थ", "झ", "ञ"], ["दे", "दो", "चा", "ची"],
];
const KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti"];

function getPanchang(date: string, planets: PlanetPosition[]) {
  const sun = planets.find((planet) => planet.name === "Sun");
  const moon = planets.find((planet) => planet.name === "Moon");
  if (!sun || !moon) return null;
  const elongation = ((moon.longitude - sun.longitude) % 360 + 360) % 360;
  const tithiIndex = Math.floor(elongation / 12);
  const paksha = tithiIndex < 15 ? "Shukla" : "Krishna";
  const tithiNumber = tithiIndex % 15;
  const tithi = tithiNumber === 14 ? (paksha === "Shukla" ? "Purnima" : "Amavasya") : `${paksha} ${TITHIS[tithiNumber]}`;
  const yogaIndex = Math.floor((((moon.longitude + sun.longitude) % 360 + 360) % 360) / (360 / 27));
  const karanaIndex = Math.floor(elongation / 6);
  const karana = karanaIndex === 0 ? "Kimstughna"
    : karanaIndex >= 57 ? ["Shakuni", "Chatushpada", "Naga"][karanaIndex - 57]
      : KARANAS[(karanaIndex - 1) % KARANAS.length];
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`) : null;
  const weekday = parsedDate && !Number.isNaN(parsedDate.getTime())
    ? parsedDate.toLocaleDateString("en", { weekday: "long" })
    : "—";
  return {
    weekday,
    tithi,
    nakshatra: `${moon.nakshatraName} · Pada ${moon.pada}`,
    yoga: YOGAS[yogaIndex],
    karana,
    syllable: `${NAKSHATRA_AKSHARAS[moon.nakshatra - 1]?.[moon.pada - 1] ?? "—"} (${NAKSHATRA_SYLLABLES[moon.nakshatra - 1]?.[moon.pada - 1] ?? "—"})`,
  };
}

function PanchangStrip({ date, planets }: { date: string; planets: PlanetPosition[] }) {
  const panchang = getPanchang(date, planets);
  const items = panchang ? [
    { label: "Weekday", value: panchang.weekday },
    { label: "Tithi", value: panchang.tithi },
    { label: "Nakshatra", value: panchang.nakshatra },
    { label: "Yoga", value: panchang.yoga },
    { label: "Karana", value: panchang.karana },
  ] : [];
  return (
    <section aria-label="Panchang" className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-2 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-300">Panchang</p>
        <p className="text-xs text-amber-800 dark:text-amber-200">{formatBirthDate(date)}</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {items.length ? items.map((item) => (
          <div key={item.label} className="min-w-0 rounded-lg bg-white/85 px-2.5 py-2 dark:bg-slate-900/70">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-600">{item.label}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-800 dark:text-slate-100" title={item.value}>{item.value}</p>
          </div>
        )) : <p className="col-span-2 rounded-lg bg-white/70 px-2.5 py-2 text-xs text-slate-600 sm:col-span-5 dark:bg-slate-900/50 dark:text-slate-400">Waiting for planetary positions…</p>}
      </div>
    </section>
  );
}

function BirthTimeAdjuster({ onAdjust }: { onAdjust: (seconds: number) => void }) {
  const adjustments = [
    { seconds: -300, label: "−5 min", style: "border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/40" },
    { seconds: -60, label: "−1 min", style: "border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" },
    { seconds: 60, label: "+1 min", style: "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/70 dark:text-emerald-300 dark:hover:bg-emerald-950/40" },
    { seconds: 300, label: "+5 min", style: "border-amber-200 text-amber-800 hover:bg-amber-50 dark:border-amber-900/70 dark:text-amber-300 dark:hover:bg-amber-950/40" },
  ];

  return (
    <fieldset className="col-span-2 flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1 dark:border-slate-800 dark:bg-slate-950/40 sm:col-span-3 xl:col-span-1">
      <legend className="sr-only">Birth time adjustment (BTR)</legend>
      <div className="flex shrink-0 items-center gap-1.5">
        <Clock3 className="size-3.5 text-amber-700 dark:text-amber-300" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200" title="Birth time rectification">BTR</span>
      </div>
      <div role="group" aria-label="Adjust birth time" className="flex min-w-0 gap-1">
        {adjustments.map(({ seconds, label, style }) => (
          <button key={seconds} type="button" onClick={() => onAdjust(seconds)} className={`h-8 rounded-md border bg-white px-1.5 text-[11px] font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 sm:px-2 dark:bg-slate-900 ${style}`} aria-label={`${seconds < 0 ? "Subtract" : "Add"} ${Math.abs(seconds) / 60} minute${Math.abs(seconds) === 60 ? "" : "s"}`}>
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function TransitOverview({
  planets,
  location,
  natalAscendantSign,
  loading,
  error,
  updatedAt,
  onOpen,
}: {
  planets: PlanetPosition[];
  location: string;
  natalAscendantSign?: number;
  loading: boolean;
  error: string | null;
  updatedAt: string;
  onOpen: () => void;
}) {
  const featuredPlanets = ["Sun", "Moon", "Mars", "Jupiter", "Saturn"]
    .map((name) => planets.find((planet) => planet.name === name))
    .filter((planet): planet is PlanetPosition => Boolean(planet));

  return (
    <section aria-label="Current planetary transits" className="flex min-w-0 flex-col gap-2 rounded-xl border border-cyan-200 bg-cyan-50/60 px-3 py-2 dark:border-cyan-900/60 dark:bg-cyan-950/20 sm:flex-row sm:items-center">
      <div className="flex shrink-0 items-center gap-2 sm:w-44">
        <Orbit className="size-3.5 text-cyan-700 dark:text-cyan-300" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Current transits</p>
          <p className="truncate text-xs text-slate-600 dark:text-slate-400" title={location}>{location || "Birth coordinates"}</p>
        </div>
      </div>
      <div aria-live="polite" className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {loading && !planets.length ? <span className="text-xs text-slate-600 dark:text-slate-400">Calculating the sky at this birthplace…</span>
          : error && !planets.length ? <span role="status" className="text-xs text-rose-700 dark:text-rose-300">{error}</span>
            : featuredPlanets.length ? featuredPlanets.map((planet) => (
              <span key={planet.id} title={`${planet.name} in ${planet.signName}${natalAscendantSign === undefined ? "" : `, natal house ${getSignHouse(planet.sign, natalAscendantSign)}`}`} className="shrink-0 rounded-md bg-white/90 px-2 py-1 text-xs dark:bg-slate-900/80">
                <span className="font-semibold text-slate-800 dark:text-slate-100">{planetName(planet.name, "en", planet.symbol)}</span>
                <span className="ml-1 text-slate-600 dark:text-slate-300">{planet.signName}</span>
                {natalAscendantSign !== undefined && <span className="ml-1 text-cyan-800 dark:text-cyan-300">H{getSignHouse(planet.sign, natalAscendantSign)}</span>}
              </span>
            )) : <span className="text-xs text-slate-600 dark:text-slate-400">Transit positions are not available yet.</span>}
      </div>
      <button type="button" onClick={onOpen} className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-cyan-200 bg-white px-2.5 text-xs font-semibold text-cyan-900 transition hover:border-cyan-400 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-cyan-900 dark:bg-slate-900 dark:text-cyan-200 dark:hover:bg-cyan-950/50">
        {loading && <span className="size-2 animate-pulse rounded-full bg-cyan-500" />}
        Transit chart <span aria-hidden="true">↓</span>
      </button>
      <span className="sr-only">Transit positions calculated at {updatedAt}</span>
    </section>
  );
}

function getBirthTithiNumber(planets: PlanetPosition[]) {
  const sun = planets.find((planet) => planet.name === "Sun");
  const moon = planets.find((planet) => planet.name === "Moon");
  if (!sun || !moon) return null;
  const elongation = ((moon.longitude - sun.longitude) % 360 + 360) % 360;
  return Math.floor(elongation / 12) + 1;
}

function getVargaSign(position: PlanetPosition, division: number) {
  if (division === 1) return position.sign;
  const segment = Math.min(division - 1, Math.floor(position.degree / (30 / division)));
  const sign = position.sign;
  if (division === 2) {
    const first = sign % 2 === 0 ? 4 : 3;
    return segment === 0 ? first : (first + 1) % 12;
  }
  if (division === 3) return normalizeSign(sign + segment * 4);
  if (division === 4) return normalizeSign(sign + segment * 3);
  if (division === 7) return normalizeSign((sign % 2 === 0 ? sign : sign + 6) + segment);
  if (division === 9) {
    const start = sign % 3 === 0 ? sign : sign % 3 === 1 ? sign + 8 : sign + 4;
    return normalizeSign(start + segment);
  }
  if (division === 10) return normalizeSign((sign % 2 === 0 ? sign : sign + 8) + segment);
  if (division === 12) return normalizeSign(sign + segment);
  if (division === 16) return normalizeSign(([0, 4, 8][sign % 3]) + segment);
  if (division === 20) return normalizeSign(([0, 8, 4][sign % 3]) + segment);
  if (division === 24) return normalizeSign((sign % 2 === 0 ? 4 : 3) + segment);
  if (division === 27) {
    const element = sign % 4;
    return normalizeSign(([0, 3, 6, 9][element]) + segment);
  }
  if (division === 30) {
    const oddTrimsamsa = [
      { limit: 5, sign: 0 },
      { limit: 10, sign: 9 },
      { limit: 18, sign: 8 },
      { limit: 25, sign: 2 },
      { limit: 30, sign: 1 },
    ];
    const evenTrimsamsa = [
      { limit: 5, sign: 1 },
      { limit: 12, sign: 5 },
      { limit: 20, sign: 8 },
      { limit: 25, sign: 10 },
      { limit: 30, sign: 7 },
    ];
    return (sign % 2 === 0 ? oddTrimsamsa : evenTrimsamsa).find(({ limit }) => position.degree < limit)?.sign ?? sign;
  }
  if (division === 40) return normalizeSign((sign % 2 === 0 ? 0 : 6) + segment);
  if (division === 45) return normalizeSign(([0, 4, 8][sign % 3]) + segment);
  return normalizeSign(sign * division + segment);
}

function getSignHouse(sign: number, ascendantSign: number) {
  return normalizeSign(sign - ascendantSign) + 1;
}

function getReferenceHouse(reference: string) {
  return reference === "Ascendant" ? 1 : Number(reference.slice("house:".length));
}

function chartPlanetVisible(planet: PlanetPosition, preferences: ViewPreferences) {
  if (["Uranus", "Neptune", "Pluto"].includes(planet.name) && !preferences.showOuterPlanets) return false;
  if (["Chiron", "Lilith"].includes(planet.name) && !preferences.showAsteroids) return false;
  return true;
}

function chartPointVisible(point: PlanetPosition, preferences: ViewPreferences) {
  if (point.name === "Part of Fortune") return preferences.showFortune;
  if (point.name === "Mandi" || point.name === "Gulika") return preferences.showUpagrahas;
  if (point.name === "Chiron" || point.name === "Lilith") return preferences.showAsteroids;
  return true;
}

function PlacidusWheel({
  ascendant,
  planets,
  points,
  cusps,
  referenceHouse,
  overlay,
  language,
  preferences,
}: {
  ascendant: PlanetPosition;
  planets: PlanetPosition[];
  points: PlanetPosition[];
  cusps: EphemerisResponse["houseCusps"];
  referenceHouse: number;
  overlay?: PlanetPosition[];
  language: CelestialLanguage;
  preferences: ViewPreferences;
}) {
  const center = 180;
  const referenceLongitude = cusps.find((cusp) => cusp.house === referenceHouse)?.longitude ?? ascendant.longitude;
  const wheelAngle = (longitude: number) => 180 + (((longitude - referenceLongitude) % 360 + 360) % 360);
  const point = (longitude: number, radius: number) => {
    const radians = wheelAngle(longitude) * Math.PI / 180;
    return { x: center + radius * Math.cos(radians), y: center - radius * Math.sin(radians) };
  };
  const visiblePlanets = planets.filter((planet) => chartPlanetVisible(planet, preferences));
  const visiblePoints = points.filter((planet) => chartPointVisible(planet, preferences));
  const transitPlanets = (overlay ?? []).filter((planet) => chartPlanetVisible(planet, preferences));
  const chartBodies = [
    ...visiblePlanets.map((planet) => ({ ...planet, transit: false })),
    ...visiblePoints.map((planet) => ({ ...planet, transit: false })),
    ...transitPlanets.map((planet) => ({ ...planet, transit: true })),
  ];
  const cuspsByHouse = [...cusps].sort((a, b) => a.house - b.house);

  return (
    <svg viewBox="0 0 360 360" className="mx-auto w-full max-w-[440px]" role="img" aria-label={`Placidus chart with ${referenceHouse === 1 ? "Ascendant" : `House ${referenceHouse}`} as reference lagna at nine o'clock`}>
      <circle cx={center} cy={center} r="166" fill="var(--chart-panel)" stroke="hsl(var(--chart-lines))" strokeWidth="1.5" />
      <circle cx={center} cy={center} r="126" fill="none" stroke="hsl(var(--chart-lines))" strokeWidth="1" />
      <circle cx={center} cy={center} r="82" fill="none" stroke="hsl(var(--chart-lines))" strokeWidth="1" />
      {preferences.showSignDivisions && Array.from({ length: 12 }, (_, sign) => {
        const boundary = point(sign * 30, 166);
        const inner = point(sign * 30, 126);
        const label = point(sign * 30 + 15, 145);
        return (
          <g key={`sign-${sign}`}>
            <line x1={inner.x} y1={inner.y} x2={boundary.x} y2={boundary.y} stroke="hsl(var(--chart-lines))" strokeWidth="1" />
            <text x={label.x} y={label.y + 3} fill={signColor(sign)} fontSize="8" textAnchor="middle">{chartSignDisplay(sign, language, preferences)}</text>
          </g>
        );
      })}
      {preferences.showEqualHouses && Array.from({ length: 12 }, (_, index) => {
        const cusp = point(ascendant.longitude + index * 30, 126);
        const inner = point(ascendant.longitude + index * 30, 82);
        return <line key={`equal-house-${index}`} x1={cusp.x} y1={cusp.y} x2={inner.x} y2={inner.y} stroke="var(--chart-transit)" strokeDasharray="2 2" strokeWidth="1.1" />;
      })}
      {cuspsByHouse.map((cusp, index) => {
        const next = cuspsByHouse[(index + 1) % cuspsByHouse.length];
        const edge = point(cusp.longitude, 126);
        const inner = point(cusp.longitude, 82);
        const arc = ((next.longitude - cusp.longitude) % 360 + 360) % 360;
        const label = point(cusp.longitude + arc / 2, 67);
        const displayedHouse = ((cusp.house - referenceHouse + 12) % 12) + 1;
        return (
          <g key={`cusp-${cusp.house}`}>
            <line x1={edge.x} y1={edge.y} x2={inner.x} y2={inner.y} stroke={cusp.house === 1 || cusp.house === 7 || cusp.house === 10 || cusp.house === 4 ? "hsl(var(--gold-foreground))" : "hsl(var(--chart-lines))"} strokeWidth={cusp.house === 1 || cusp.house === 7 || cusp.house === 10 || cusp.house === 4 ? "1.6" : "0.8"} />
            {preferences.showHouseLabels && <text x={label.x} y={label.y + 3} fill={displayedHouse === 1 ? "hsl(var(--gold-foreground))" : "hsl(var(--chart-lines))"} fontSize="8" textAnchor="middle">H{displayedHouse}</text>}
          </g>
        );
      })}
      <text x="20" y="185" fill="hsl(var(--gold-foreground))" fontSize="9" fontWeight="700">LAGNA</text>
      <text x="315" y="185" fill="var(--chart-muted)" fontSize="8">DSC</text>
      {cuspsByHouse[9] && (() => {
        const mc = point(cuspsByHouse[9].longitude, 158);
        const ic = point(cuspsByHouse[3]?.longitude ?? cuspsByHouse[9].longitude + 180, 158);
        return <g fill="hsl(var(--gold-accent))" fontSize="8" fontWeight="700" textAnchor="middle"><text x={mc.x} y={mc.y - 2}>MC</text><text x={ic.x} y={ic.y + 9}>IC</text></g>;
      })()}
      {chartBodies.map((body, index) => {
        const sameLongitudeBefore = chartBodies.slice(0, index).filter((other) => Math.abs((((other.longitude - body.longitude + 540) % 360) - 180)) < 4).length;
        const label = point(body.longitude, 104 + sameLongitudeBefore * 12);
        const color = body.transit ? "var(--chart-transit)" : ["Ascendant", "Sun", "Moon"].includes(body.name) ? "hsl(var(--gold-foreground))" : ["Uranus", "Neptune", "Pluto", "Chiron", "Lilith"].includes(body.name) ? "var(--cyan)" : "var(--chart-body)";
        const name = chartPlanetDisplay(body, language, preferences.usePlanetIcons);
        const retrograde = body.motion === "R";
        const vargottama = body.name !== "Ascendant" && body.sign === getVargaSign(body, 9);
        return (
          <g key={`${body.id}-${body.transit ? "transit" : "natal"}`}>
            {vargottama && <ellipse cx={label.x} cy={label.y} rx={name.length * 3.4 + (retrograde ? 5 : 0)} ry="9" fill="none" stroke="#7c3aed" strokeWidth="1.2" />}
            <text x={label.x} y={label.y + 3.5} fill={color} fontSize="10" fontWeight={body.name === "Ascendant" ? "700" : "600"} textAnchor="middle">
              {body.transit ? "T " : ""}{name}{retrograde && <tspan fill="#dc2626" fontWeight="800"> R</tspan>}
            </text>
          </g>
        );
      })}
      <text x="180" y="350" fill="var(--chart-muted)" fontSize="8" textAnchor="middle">PLACIDUS HOUSES · SIDEREAL LONGITUDES</text>
    </svg>
  );
}

function SvgChart({
  style,
  ascendant,
  planets,
  varga,
  referenceHouse = 1,
  overlay,
  points = [],
  houseCusps = [],
  language = "en",
  preferences = { showHouseLabels: true, showOuterPlanets: true, showAsteroids: false, showUpagrahas: false, showFortune: false, usePlanetIcons: false, useSignIcons: false, showEqualHouses: false, showSignDivisions: true, showSignNumbers: true, showBhavaCusps: false },
}: {
  style: ChartStyle;
  ascendant: PlanetPosition;
  planets: PlanetPosition[];
  varga: number;
  referenceHouse?: number;
  overlay?: PlanetPosition[];
  points?: PlanetPosition[];
  houseCusps?: EphemerisResponse["houseCusps"];
  language?: CelestialLanguage;
  preferences?: ViewPreferences;
}) {
  const ascSign = normalizeSign(getVargaSign(ascendant, varga) + referenceHouse - 1);
  const visiblePlanets = planets.filter((planet) => chartPlanetVisible(planet, preferences));
  const visiblePoints = points.filter((planet) => chartPointVisible(planet, preferences));
  const chartBodies = [ascendant, ...visiblePlanets, ...visiblePoints].map((planet) => ({
    ...planet,
    chartSign: getVargaSign(planet, varga),
    chartHouse: getSignHouse(getVargaSign(planet, varga), ascSign),
    isTransit: false,
  }));
  const transitBodies = (overlay ?? []).filter((planet) => chartPlanetVisible(planet, preferences)).map((planet) => ({
    ...planet,
    id: `transit-${planet.id}`,
    chartSign: getVargaSign(planet, varga),
    chartHouse: getSignHouse(getVargaSign(planet, varga), ascSign),
    isTransit: true,
  }));
  const houses = Array.from({ length: 12 }, (_, index) => {
    const sign = normalizeSign(ascSign + index);
    return {
      house: index + 1,
      sign,
      bodies: chartBodies.filter((body) => body.chartHouse === index + 1),
    };
  });

  if (style === "placidus") {
    const cusps = varga === 1 && houseCusps.length === 12
      ? houseCusps
      : Array.from({ length: 12 }, (_, index) => {
        const sign = normalizeSign(getVargaSign(ascendant, varga) + index);
        return {
          house: index + 1,
          longitude: sign * 30 + (index === 0 && varga === 1 ? ascendant.degree : 0),
          sign,
          signName: SIGNS[sign],
        };
      });
    return <PlacidusWheel ascendant={ascendant} planets={visiblePlanets} points={visiblePoints} cusps={cusps} referenceHouse={referenceHouse} overlay={overlay} language={language} preferences={preferences} />;
  }

  if (style === "circular") {
    const polar = (radius: number, angle: number) => {
      const radians = (angle - 90) * Math.PI / 180;
      return { x: 180 + radius * Math.cos(radians), y: 180 + radius * Math.sin(radians) };
    };
    return (
      <svg viewBox="0 0 360 360" className="mx-auto w-full max-w-[560px]" role="img" aria-label={`${varga === 1 ? "D1" : `D${varga}`} circular Rashi chart`}>
          <circle cx="180" cy="180" r="160" fill="var(--chart-panel)" stroke="hsl(var(--chart-lines))" strokeWidth="1.5" />
          <circle cx="180" cy="180" r="105" fill="none" stroke="hsl(var(--chart-lines))" strokeWidth="1" />
        {Array.from({ length: 12 }, (_, index) => {
          const point = polar(160, index * 30);
          const house = houses[index];
          const label = polar(133, index * 30 + 15);
          const contents = [...house.bodies, ...transitBodies.filter((body) => body.chartHouse === house.house)];
          return (
            <g key={house.house}>
              <line x1="180" y1="180" x2={point.x} y2={point.y} stroke="hsl(var(--chart-lines))" strokeWidth="1" />
              <text x={label.x} y={label.y - 5} fill={house.house === 1 ? "hsl(var(--gold-foreground))" : signColor(house.sign)} fontSize="9" textAnchor="middle">{preferences.showHouseLabels ? `${house.house} · ` : ""}{chartSignDisplay(house.sign, language, preferences)}</text>
              {contents.length ? contents.map((body, bodyIndex) => {
                const name = chartPlanetDisplay(body, language, preferences.usePlanetIcons);
                const y = label.y + 10 + bodyIndex * 12;
                const vargottama = body.name !== "Ascendant" && body.sign === getVargaSign(body, 9);
                return (
                  <g key={body.id}>
                    {vargottama && <ellipse cx={label.x} cy={y - 3} rx={name.length * 3.4 + (body.motion === "R" ? 5 : 0)} ry="8" fill="none" stroke="#7c3aed" strokeWidth="1.1" />}
                    <text x={label.x} y={y} fill={body.isTransit ? "var(--chart-transit)" : body.name === "Ascendant" ? "#a16207" : "var(--chart-body)"} fontSize="10" fontWeight="600" textAnchor="middle">
                      {body.isTransit ? "T " : ""}{name}{body.motion === "R" && <tspan fill="#dc2626" fontWeight="800"> R</tspan>}
                    </text>
                  </g>
                );
              }) : <text x={label.x} y={label.y + 10} fill="var(--chart-muted)" fontSize="9" textAnchor="middle">·</text>}
            </g>
          );
        })}
        <circle cx="180" cy="180" r="3" fill="hsl(var(--gold-accent))" />
        <text x="180" y="338" fill="#64748b" fontSize="9" textAnchor="middle">SIDEREAL · WHOLE SIGN</text>
      </svg>
    );
  }

  if (style === "south") {
    const signOrder = [11, 0, 1, 2, 10, -1, -1, 3, 9, -1, -1, 4, 8, 7, 6, 5];
    return (
      <div className="mx-auto grid aspect-square w-full max-w-[560px] grid-cols-4 grid-rows-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        {signOrder.map((sign, index) => {
          if (sign < 0) return <div key={`empty-${index}`} className="border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60" />;
          const signHouse = getSignHouse(sign, ascSign);
          const bodies = [...chartBodies, ...transitBodies].filter((body) => body.chartSign === sign);
          return (
            <div key={sign} className={`flex min-w-0 flex-col items-center justify-center gap-1 border border-slate-200 p-1 text-center dark:border-slate-700 ${signHouse === 1 ? "bg-amber-100/70 dark:bg-amber-400/10" : ""}`}>
              <span className="text-xs" style={{ color: signColor(sign) }}>{chartSignDisplay(sign, language, preferences)}{preferences.showHouseLabels ? ` · H${signHouse}` : ""}</span>
              <span className="flex flex-wrap justify-center gap-1 text-[11px] leading-4">
                {bodies.map((body) => {
                  const name = chartPlanetDisplay(body, language, preferences.usePlanetIcons);
                  const vargottama = body.name !== "Ascendant" && body.sign === getVargaSign(body, 9);
                  return (
                    <span key={body.id} title={body.name} className={`inline-flex items-center gap-0.5 whitespace-nowrap font-semibold ${vargottama ? "rounded-full border border-violet-500 px-1.5" : ""} ${body.isTransit ? "text-cyan-700 dark:text-cyan-300" : body.name === "Ascendant" || ["Sun", "Moon"].includes(body.name) ? "text-gold-foreground" : BODY_COLORS[body.name] ?? "text-slate-700 dark:text-slate-200"}`}>
                      {body.isTransit ? "T " : ""}{name}{body.motion === "R" && <span className="font-bold text-rose-600 dark:text-rose-400">R</span>}
                    </span>
                  );
                })}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  const centers: Record<number, [number, number]> = {
    1: [180, 78], 2: [88, 42], 3: [42, 90], 4: [84, 180], 5: [42, 270], 6: [88, 318],
    7: [180, 282], 8: [272, 318], 9: [318, 270], 10: [276, 180], 11: [318, 90], 12: [272, 42],
  };
  return (
    <svg viewBox="0 0 360 360" className="mx-auto w-full max-w-[560px] rounded-xl" role="img" aria-label={`${varga === 1 ? "D1" : `D${varga}`} North Indian diamond chart`}>
      <rect x="10" y="10" width="340" height="340" rx="8" fill="var(--chart-panel)" stroke="hsl(var(--chart-lines))" strokeWidth="1.5" />
      {houses.map((house) => {
        const polygonByHouse: Record<number, string> = {
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
        return <polygon key={`sign-fill-${house.house}`} points={polygonByHouse[house.house]} className={signFillClass(house.sign)} />;
      })}
      <path d="M10 10 350 350M350 10 10 350M180 10 350 180 180 350 10 180 180 10" fill="none" stroke="hsl(var(--chart-lines))" strokeWidth="1.15" />
      {houses.map((house) => {
        const [x, y] = centers[house.house];
        const isAscHouse = house.house === 1;
        return (
          <g key={house.house}>
            <text x={x} y={y - 15} fill={isAscHouse ? "hsl(var(--gold-foreground))" : signColor(house.sign)} fontSize="9" textAnchor="middle">{preferences.showHouseLabels ? isAscHouse ? "1ST HOUSE" : `H${house.house}` : ""}{preferences.showHouseLabels ? " · " : ""}{chartSignDisplay(house.sign, language, preferences).toUpperCase()}</text>
            {preferences.showBhavaCusps && houseCusps[house.house - 1] && <text x={x} y={y - 3} fill="var(--chart-transit)" fontSize="7" textAnchor="middle">C{house.house} {degreeToDms(houseCusps[house.house - 1].longitude % 30)}</text>}
            {[...house.bodies, ...transitBodies.filter((body) => body.chartHouse === house.house)].map((body, index, bodies) => {
              const row = Math.floor(index / 1);
              const bodyColor = body.isTransit ? "var(--chart-transit)" : ["Ascendant", "Sun", "Moon"].includes(body.name) ? "hsl(var(--gold-foreground))" : ["Uranus", "Neptune", "Pluto", "Chiron", "Lilith"].includes(body.name) ? "var(--cyan)" : "var(--chart-body)";
              const name = chartPlanetDisplay(body, language, preferences.usePlanetIcons);
              const bodyY = y + 10 + row * 13 - Math.max(0, bodies.length - 4) * 4;
              const vargottama = body.name !== "Ascendant" && body.sign === getVargaSign(body, 9);
              return (
                <g key={body.id}>
                  {vargottama && <ellipse cx={x} cy={bodyY - 3} rx={name.length * 3.4 + (body.motion === "R" ? 5 : 0)} ry="8" fill="none" stroke="#7c3aed" strokeWidth="1.1" />}
                  <text x={x} y={bodyY} fill={bodyColor} fontSize={bodies.length > 4 ? "9" : "10"} fontWeight={body.name === "Ascendant" ? "700" : "600"} textAnchor="middle">
                    {body.isTransit ? "T " : ""}{name}{body.motion === "R" && <tspan fill="#dc2626" fontWeight="800"> R</tspan>}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

function DegreeValue({ position, decimal }: { position: PlanetPosition; decimal: boolean }) {
  return <span className="font-mono tabular-nums">{decimal ? `${position.degree.toFixed(4)}°` : degreeToDms(position.degree)}</span>;
}

function dignityStyle(dignity: string) {
  if (dignity === "Own" || dignity === "Friend" || dignity === "Exalted") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400";
  if (dignity === "Enemy" || dignity === "Debilitated") return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400";
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
}

const JAIMINI_KARAKA_NAMES: Record<string, string> = {
  AK: "Atmakaraka",
  AmK: "Amatyakaraka",
  BK: "Bhratrikaraka",
  MK: "Matrikaraka",
  PK: "Putrakaraka",
  GK: "Gnatikaraka",
  DK: "Darakaraka",
};

function PlanetTable({
  data,
  decimal,
  language,
  preferences,
  nodeType,
  interceptedSigns,
}: {
  data: EphemerisResponse;
  decimal: boolean;
  language: CelestialLanguage;
  preferences: ViewPreferences;
  nodeType: "true" | "mean";
  interceptedSigns: number[];
}) {
  const tithiNumber = getBirthTithiNumber(data.planets);
  const dagdhaSigns = tithiNumber === null ? [] : dagdhaRashis(tithiNumber);
  const rows = [
    data.ascendant,
    ...data.planets.filter((planet) => chartPlanetVisible(planet, preferences)),
    ...data.points.filter((point) => chartPointVisible(point, preferences)),
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[690px] border-collapse text-left text-xs">
        <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-600 dark:bg-slate-900">
          <tr>{["Graha", "Sign", "Nakshatra", "Pada", "Longitude", "Motion", "Declination", "Jaimini karaka", "Dignity"].map((heading) => <th key={heading} className="whitespace-nowrap px-1.5 py-2 font-medium">{heading}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((position) => {
            const isAscendant = position.name === "Ascendant";
            const isGoldPosition = isAscendant || position.name === "Sun" || position.name === "Moon";
            const vargottama = position.name !== "Ascendant" && position.sign === getVargaSign(position, 9);
            return (
              <tr key={position.id} className={`transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/50 ${isAscendant ? "bg-amber-50 dark:bg-amber-400/[0.035]" : ""} ${isGoldPosition ? "text-gold-foreground" : "text-slate-700 dark:text-slate-300"}`}>
                <td className="min-w-[108px] px-1.5 py-1.5 font-semibold">
                  <span className="block whitespace-nowrap">{preferences.usePlanetIcons && <PlanetMark name={position.name} label={position.symbol} enabled />} {planetName(position.name, "en", position.name)}</span>
                  {vargottama && <span title="Rasi and Navamsha signs are the same" className="mt-0.5 inline-flex rounded bg-violet-100 px-1 py-0.5 text-[10px] font-medium leading-none text-violet-800 dark:bg-violet-400/10 dark:text-violet-300">Vargottam</span>}
                </td>
                <td className="whitespace-nowrap px-1.5 py-1.5">{preferences.useSignIcons ? <SignMark sign={position.sign} label={signName(position.signName, language)} enabled /> : signName(position.signName, language)}{dagdhaSigns.includes(position.sign) && <span title={`Dagdha Rashi for birth tithi ${tithiNumber}; common Muhurta convention.`} className="ml-1 rounded bg-rose-100 px-1 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-400/10 dark:text-rose-300">D</span>}{interceptedSigns.includes(position.sign) && <span title={`${position.signName} is intercepted: it does not appear on any Placidus house cusp.`} className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">[I]</span>}</td>
                <td className="whitespace-nowrap px-1.5 py-1.5">{position.nakshatraName}</td>
                <td className="px-1.5 py-1.5 text-center">{position.pada}</td>
                <td className="whitespace-nowrap px-1.5 py-1.5"><DegreeValue position={position} decimal={decimal} /></td>
                <td className="px-1.5 py-1.5">
                  {nodeType === "true" && (position.name === "Rahu" || position.name === "Ketu") && position.motion === "D"
                    ? <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300"><span>Direct</span><span role="img" aria-label="Rahu/Ketu is in direct motion for this specific ephemeris calculation time." title="Rahu/Ketu is in direct motion for this specific ephemeris calculation time."><Info className="size-4" /></span></span>
                    : <span className={`whitespace-nowrap ${position.motion === "R" ? "font-semibold text-blue-900 dark:text-blue-300" : "text-slate-600 dark:text-slate-400"}`}>{position.motion === "R" ? "Retrograde" : "Direct"}</span>}
                </td>
                <td className={`whitespace-nowrap px-1.5 py-1.5 font-mono ${Math.abs(position.declination) > 23.45 ? "font-semibold text-rose-700 dark:text-rose-300" : ""}`} title={Math.abs(position.declination) > 23.45 ? "Out of Bounds (OOB) Declination" : undefined}>{declinationToDms(position.declination)}</td>
                <td className="whitespace-nowrap px-1.5 py-1.5 font-semibold text-gold-foreground">{position.jaimini ? <abbr title={JAIMINI_KARAKA_NAMES[position.jaimini] ?? position.jaimini} className="no-underline">{JAIMINI_KARAKA_NAMES[position.jaimini] ?? position.jaimini}</abbr> : "—"}</td>
                <td className="whitespace-nowrap px-1.5 py-1.5"><span className={`rounded-full px-1.5 py-1 text-[10px] ${dignityStyle(position.dignity)}`}>{position.dignity}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AspectMatrix({ planets, ascendant, language, useSignIcons }: { planets: PlanetPosition[]; ascendant: PlanetPosition; language: CelestialLanguage; useSignIcons: boolean }) {
  const targets: Record<string, Record<number, string>> = {
    Mars: { 3: "4", 6: "7", 7: "8" },
    Jupiter: { 4: "5", 6: "7", 8: "9" },
    Saturn: { 2: "3", 6: "7", 9: "10" },
  };
  const aspectPlanets = planets.filter(({ name }) => ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].includes(name));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-center text-xs">
        <thead>
          <tr><th rowSpan={2} className="sticky left-0 bg-white px-2 py-2 text-left font-medium text-slate-600 dark:bg-slate-900">Planet</th>{Array.from({ length: 12 }, (_, index) => <th key={index} className="border-b border-slate-200 px-1 pt-2 font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300">H{index + 1}</th>)}</tr>
          <tr>{Array.from({ length: 12 }, (_, index) => {
            const sign = normalizeSign(ascendant.sign + index);
            return <th key={index} className="px-1 pb-2 font-normal text-slate-600">{useSignIcons ? <SignMark sign={sign} label={signName(SIGNS[sign], language)} enabled /> : language === "en" || language === "initials" ? SHORT_SIGNS[sign] : signName(SIGNS[sign], language)}</th>;
          })}</tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
          {aspectPlanets.map((planet) => (
            <tr key={planet.id}>
              <th className="sticky left-0 whitespace-nowrap bg-white px-2 py-2 text-left font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-300">{planetName(planet.name, language, planet.symbol)} <span className="text-slate-600">H{planet.house}</span></th>
              {Array.from({ length: 12 }, (_, index) => {
                const distance = (index + 1 - planet.house + 12) % 12;
                const marker = targets[planet.name]?.[distance] ?? (distance === 6 ? "7" : "");
                const special = marker && marker !== "7";
                return <td key={index} className={`h-7 border-l border-slate-200 dark:border-slate-800/70 ${marker ? special ? "font-semibold text-cyan-700 dark:text-cyan-400" : "font-semibold text-amber-700 dark:text-[#D4AF37]" : "text-slate-200 dark:text-slate-800"}`}>{marker || "·"}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Classical Parashari aspects · Mars 4/7/8 · Jupiter 5/7/9 · Saturn 3/7/10 · others 7</p>
    </div>
  );
}

const CHINESE_PLANET_ELEMENTS = [
  { planet: "Jupiter", element: "Wood" },
  { planet: "Mars", element: "Fire" },
  { planet: "Saturn", element: "Earth" },
  { planet: "Venus", element: "Metal" },
  { planet: "Mercury", element: "Water" },
] as const;

const WUXING_GENERATES = ["Fire", "Earth", "Metal", "Water", "Wood"] as const;
const WUXING_CONTROLS = ["Earth", "Metal", "Water", "Wood", "Fire"] as const;

function wuxingRelation(first: string, second: string) {
  const firstIndex = CHINESE_PLANET_ELEMENTS.findIndex(({ element }) => element === first);
  const secondIndex = CHINESE_PLANET_ELEMENTS.findIndex(({ element }) => element === second);
  if (first === second) return { label: "Same", className: "text-slate-600 dark:text-slate-300" };
  if (WUXING_GENERATES[firstIndex] === second) return { label: "Generates", className: "text-emerald-700 dark:text-emerald-300" };
  if (WUXING_CONTROLS[firstIndex] === second) return { label: "Controls", className: "text-rose-700 dark:text-rose-300" };
  if (WUXING_GENERATES[secondIndex] === first) return { label: "Generated by", className: "text-cyan-700 dark:text-cyan-300" };
  return { label: "Controlled by", className: "text-amber-700 dark:text-amber-300" };
}

function ChineseElementMatrix() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-center text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white px-2 py-2 text-left font-medium text-slate-600 dark:bg-slate-900">Five planets</th>
            {CHINESE_PLANET_ELEMENTS.map(({ planet, element }) => <th key={planet} className="px-1 py-2 font-medium text-slate-600 dark:text-slate-300">{planet}<span className="block font-normal text-slate-600 dark:text-slate-400">{element}</span></th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {CHINESE_PLANET_ELEMENTS.map(({ planet: firstPlanet, element: firstElement }) => (
            <tr key={firstPlanet}>
              <th className="sticky left-0 whitespace-nowrap bg-white px-2 py-2 text-left font-medium dark:bg-slate-900">{firstPlanet}<span className="ml-1 font-normal text-slate-600 dark:text-slate-400">{firstElement}</span></th>
              {CHINESE_PLANET_ELEMENTS.map(({ planet: secondPlanet, element: secondElement }) => {
                const relation = wuxingRelation(firstElement, secondElement);
                return <td key={secondPlanet} title={`${firstPlanet} ${relation.label.toLowerCase()} ${secondPlanet}`} className={`border-l border-slate-200 px-1 py-2 text-[10px] dark:border-slate-800 ${relation.className}`}>{relation.label}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Wu Xing relationships among the Five Planets; fixed classical correspondences, not longitude-based aspects.</p>
    </div>
  );
}

function AshtakavargaTable({ data, language, useSignIcons, ascendantSign }: { data: EphemerisResponse; language: CelestialLanguage; useSignIcons: boolean; ascendantSign: number }) {
  const [selectedSign, setSelectedSign] = useState(ascendantSign);
  const [selectedPlanet, setSelectedPlanet] = useState("Sarvashtakavarga");
  const selectedHouse = getSignHouse(selectedSign, ascendantSign);
  const selectedContributor = data.ashtakavarga.find((row) => row.planet === selectedPlanet);
  const selectedBindus = selectedContributor?.bindus[selectedSign] ?? data.sarvashtakavarga[selectedSign];

  useEffect(() => setSelectedSign(ascendantSign), [ascendantSign]);

  return (
    <div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-center text-xs">
        <thead className="border-b border-slate-200 text-slate-600 dark:border-slate-800">
          <tr>
            <th className="sticky left-0 bg-white px-2 py-2 text-left dark:bg-slate-900">Bindus</th>
            {Array.from({ length: 12 }, (_, sign) => {
              const house = getSignHouse(sign, ascendantSign);
              const label = useSignIcons ? signName(SIGNS[sign], language) : language === "en" || language === "initials" ? SHORT_SIGNS[sign] : signName(SIGNS[sign], language);
              return (
                <th key={sign} className={`px-1 py-1 ${selectedSign === sign ? "bg-cyan-50 dark:bg-cyan-950/40" : ""}`}>
                  <button type="button" aria-pressed={selectedSign === sign} aria-label={`${label}, House ${house}`} onClick={() => { setSelectedSign(sign); setSelectedPlanet("Sarvashtakavarga"); }} className="flex min-w-9 flex-col items-center rounded-md px-1 py-1 transition hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:hover:bg-cyan-900/50">
                    <span>{useSignIcons ? <SignMark sign={sign} label={label} enabled /> : label}</span>
                    <span className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">House {house}</span>
                  </button>
                </th>
              );
            })}
            <th className="px-2 py-2">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {data.ashtakavarga.map((row) => (
            <tr key={row.planet}>
              <th className="sticky left-0 bg-white px-2 py-2 text-left font-medium dark:bg-slate-900">{planetName(row.planet, language)}</th>
              {row.bindus.map((bindu, sign) => (
                <td key={sign} className={`px-1 py-1 tabular-nums ${selectedSign === sign ? "bg-cyan-50/70 text-cyan-950 dark:bg-cyan-950/35 dark:text-cyan-100" : "text-slate-700 dark:text-slate-300"}`}>
                  <button type="button" aria-label={`${planetName(row.planet, language)} bindus in ${signName(SIGNS[sign], language)}, House ${getSignHouse(sign, ascendantSign)}: ${bindu}`} onClick={() => { setSelectedSign(sign); setSelectedPlanet(row.planet); }} className="min-w-7 rounded px-1 py-1 transition hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:hover:bg-cyan-900/60">{bindu}</button>
                </td>
              ))}
              <td className="px-2 py-2 font-semibold text-amber-700 dark:text-amber-300">{row.total}</td>
            </tr>
          ))}
          <tr className="bg-amber-50/70 font-semibold text-amber-900 dark:bg-amber-400/5 dark:text-amber-200">
            <th className="sticky left-0 bg-amber-50 px-2 py-2 text-left dark:bg-slate-900">Sarvashtakavarga</th>
            {data.sarvashtakavarga.map((bindu, sign) => (
              <td key={sign} className={`px-1 py-1 tabular-nums ${selectedSign === sign ? "bg-cyan-100/70 dark:bg-cyan-900/50" : ""}`}>
                <button type="button" aria-label={`Sarvashtakavarga bindus in ${signName(SIGNS[sign], language)}, House ${getSignHouse(sign, ascendantSign)}: ${bindu}`} onClick={() => { setSelectedSign(sign); setSelectedPlanet("Sarvashtakavarga"); }} className="min-w-7 rounded px-1 py-1 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:hover:bg-amber-900/40">{bindu}</button>
              </td>
            ))}
            <td className="px-2 py-2">{data.sarvashtakavarga.reduce((sum, value) => sum + value, 0)}</td>
          </tr>
        </tbody>
      </table>
      </div>
      <p aria-live="polite" className="mt-2 text-xs text-slate-600 dark:text-slate-400">
        {selectedPlanet === "Sarvashtakavarga" ? "Sarvashtakavarga" : planetName(selectedPlanet, language)} · {signName(SIGNS[selectedSign], language)} · House {selectedHouse} · {selectedBindus} bindus
      </p>
    </div>
  );
}

const WESTERN_ASPECTS = [
  { name: "Conjunction", angle: 0, orb: 8, symbol: "☌", color: "text-violet-700 dark:text-violet-300" },
  { name: "Semi-sextile", angle: 30, orb: 2, symbol: "⚺", color: "text-slate-600 dark:text-slate-400" },
  { name: "Sextile", angle: 60, orb: 5, symbol: "⚹", color: "text-cyan-700 dark:text-cyan-300" },
  { name: "Square", angle: 90, orb: 6, symbol: "□", color: "text-rose-700 dark:text-rose-300" },
  { name: "Trine", angle: 120, orb: 6, symbol: "△", color: "text-emerald-700 dark:text-emerald-300" },
  { name: "Sesquiquadrate", angle: 135, orb: 2.5, symbol: "⚼", color: "text-rose-700 dark:text-rose-300" },
  { name: "Quincunx", angle: 150, orb: 3, symbol: "⚻", color: "text-amber-700 dark:text-amber-300" },
  { name: "Opposition", angle: 180, orb: 8, symbol: "☍", color: "text-violet-700 dark:text-violet-300" },
] as const;

function findWesternAspect(first: PlanetPosition, second: PlanetPosition) {
  const rawDifference = Math.abs(first.longitude - second.longitude) % 360;
  const separation = Math.min(rawDifference, 360 - rawDifference);
  const candidates = WESTERN_ASPECTS
    .map((aspect) => ({ aspect, orb: Math.abs(separation - aspect.angle) }))
    .filter(({ aspect, orb }) => orb <= aspect.orb)
    .sort((a, b) => a.orb - b.orb);
  return candidates[0] ?? null;
}

function WesternAspectGrid({
  planets,
  language,
}: {
  planets: PlanetPosition[];
  language: CelestialLanguage;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-center text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white px-2 py-2 text-left font-medium text-slate-600 dark:bg-slate-900">Planet</th>
            {planets.map((planet) => <th key={planet.id} className="min-w-10 px-1 py-2 font-medium text-slate-600" title={planet.name}>{planetName(planet.name, language, planet.symbol)}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
          {planets.map((planet, rowIndex) => (
            <tr key={planet.id}>
              <th className="sticky left-0 whitespace-nowrap bg-white px-2 py-2 text-left font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-300">{planetName(planet.name, language, planet.symbol)}</th>
              {planets.map((other, columnIndex) => {
                if (columnIndex >= rowIndex) return <td key={other.id} className="border-l border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700">·</td>;
                const match = findWesternAspect(planet, other);
                return (
                  <td key={other.id} title={match ? `${planet.name} ${match.aspect.name} ${other.name} · ${match.orb.toFixed(2)}° orb` : undefined} className={`border-l border-slate-200 font-semibold dark:border-slate-800 ${match?.aspect.color ?? "text-slate-300 dark:text-slate-700"}`}>
                    {match ? <><span className="text-sm">{match.aspect.symbol}</span><span className="block text-xs font-normal">{match.orb.toFixed(1)}°</span></> : "·"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Major and minor aspects · standard maximum orbs 2°–8° · staircase shows each pair once</p>
    </div>
  );
}

const ELEMENT_ROWS = [
  { name: "Fire", translation: "Agni / अग्नि", signs: [0, 4, 8], className: "text-rose-700 dark:text-rose-300" },
  { name: "Earth", translation: "Prithvi / पृथ्वी / पृथ्वी", signs: [1, 5, 9], className: "text-emerald-700 dark:text-emerald-300" },
  { name: "Air", translation: "Vayu / वायु / वायू", signs: [2, 6, 10], className: "text-sky-700 dark:text-sky-300" },
  { name: "Water", translation: "Jal / जल / जल", signs: [3, 7, 11], className: "text-cyan-700 dark:text-cyan-300" },
] as const;

const MODALITY_COLUMNS = [
  { name: "Cardinal", translation: "Chara / चर / चर", signs: [0, 3, 6, 9] },
  { name: "Fixed", translation: "Sthira / स्थिर / स्थिर", signs: [1, 4, 7, 10] },
  { name: "Mutable", translation: "Dwiswabhava / द्विस्वभाव / द्विस्वभाव", signs: [2, 5, 8, 11] },
] as const;

function ElementalMatrix({
  planets,
  language,
}: {
  planets: PlanetPosition[];
  language: CelestialLanguage;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left text-xs">
        <thead>
          <tr>
            <th className="px-2 py-2 text-slate-600">Element · तत्व</th>
            {MODALITY_COLUMNS.map((modality) => <th key={modality.name} className="px-2 py-2 font-medium text-slate-600 dark:text-slate-300">{modality.name}<span className="ml-1 font-normal text-slate-600">({modality.translation})</span></th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {ELEMENT_ROWS.map((element) => (
            <tr key={element.name}>
              <th className={`whitespace-nowrap px-2 py-2 font-semibold ${element.className}`}>{element.name}<span className="ml-1 font-normal">({element.translation})</span></th>
              {MODALITY_COLUMNS.map((modality) => {
                const occupants = planets.filter((planet) => element.signs.some((sign) => sign === planet.sign) && modality.signs.some((sign) => sign === planet.sign));
                return (
                  <td key={modality.name} className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      {occupants.length ? occupants.map((planet) => <span key={planet.id} title={`${planet.name} · ${signName(planet.signName, language)}`} className="rounded-md bg-slate-100 px-1.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{planetName(planet.name, language, planet.symbol)}</span>) : <span className="text-slate-300 dark:text-slate-700">—</span>}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GrahaAvasthaPanel({ data, language }: { data: EphemerisResponse; language: CelestialLanguage }) {
  const reports = data.grahaAvasthas.filter((report) => report.jagradadi && report.shayanadi);
  return (
    <section className={PANEL_CLASS}>
      <div className="mb-3">
        <p className="text-xs font-semibold">Graha Avasthas</p>
        <p className="mt-0.5 text-pretty text-xs text-slate-600 dark:text-slate-400">Jagradadi consciousness · BPHS Shayanadi states · birth Ghati from Swiss sunrise</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="text-xs uppercase tracking-wider text-slate-600"><tr>{["Graha", "Sign", "Dignity", "Jagradadi", "Shayanadi", "Trace"].map((heading) => <th key={heading} className="px-2 py-2 font-medium">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {reports.map((report) => (
              <tr key={report.planet}>
                <td className="whitespace-nowrap px-2 py-2 font-medium">{planetName(report.planet, language)}</td>
                <td className="px-2 py-2">{signName(report.sign, language)}</td>
                <td className="px-2 py-2">{report.dignity}</td>
                <td className="px-2 py-2 text-cyan-800 dark:text-cyan-300" title={report.jagradadi?.explanation}>{report.jagradadi?.state}</td>
                <td className="px-2 py-2 text-amber-800 dark:text-amber-300">{report.shayanadi?.state} · {report.shayanadi?.remainder}</td>
                <td className="px-2 py-2">
                  <details className="group">
                    <summary className="cursor-pointer list-none text-cyan-700 underline decoration-dotted underline-offset-2 dark:text-cyan-300">View trace</summary>
                    <pre className="absolute z-10 mt-2 max-h-64 max-w-[min(90vw,540px)] overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 shadow-xl dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">{JSON.stringify(report.calculationTrace, null, 2)}</pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Avasthas apply to the seven classical grahas; the API includes an explicit applicability trace for other points. Formula traces are provided for review; independent JHora validation has not been performed.</p>
    </section>
  );
}

function formatDashaDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function dashaProgress(period: EphemerisResponse["dashas"][number], now: number) {
  const start = new Date(period.start).getTime();
  const end = new Date(period.end).getTime();
  return end > start ? Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100)) : 0;
}

const DASHA_LEVELS = ["Maha", "Antar", "Pratyantar", "Sookshma"];

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
  color: "cyan" | "indigo" | "amber" | "emerald";
}) {
  if (!periods.length) return null;
  const totalDuration = periods.reduce((sum, period) => sum + Math.max(0, new Date(period.end).getTime() - new Date(period.start).getTime()), 0);
  const segmentColors = {
    cyan: "border-cyan-300 bg-cyan-100 text-cyan-950 dark:border-cyan-800 dark:bg-cyan-900/70 dark:text-cyan-100",
    indigo: "border-indigo-300 bg-indigo-100 text-indigo-950 dark:border-indigo-800 dark:bg-indigo-900/70 dark:text-indigo-100",
    amber: "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-800 dark:bg-amber-900/70 dark:text-amber-100",
    emerald: "border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-100",
  };
  const selectedColor = {
    cyan: "border-cyan-600 bg-cyan-100 text-cyan-950 dark:border-cyan-500 dark:bg-cyan-500 dark:text-cyan-950",
    indigo: "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-600",
    amber: "border-amber-600 bg-amber-100 text-amber-950 dark:border-amber-500 dark:bg-amber-500 dark:text-amber-950",
    emerald: "border-emerald-600 bg-emerald-100 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950",
  };
  return (
    <div className="grid grid-cols-[78px_minmax(0,1fr)] items-center gap-2">
      <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</p><p className="truncate text-xs text-slate-600">{formatDashaDate(periods[0].start)}–{formatDashaDate(periods[periods.length - 1].end)}</p></div>
      <div className="flex min-w-0 overflow-x-auto rounded-md bg-slate-200/80 dark:bg-slate-800">
        {periods.map((period) => {
          const duration = Math.max(0, new Date(period.end).getTime() - new Date(period.start).getTime());
          const selected = selectedStart === period.start;
          const elapsed = period.active ? dashaProgress(period, Date.now()) : 0;
          return (
            <button key={`${period.lord}-${period.start}`} type="button" aria-pressed={selected} title={`${period.lord} ${label} · ${formatDashaDate(period.start)} – ${formatDashaDate(period.end)}${period.active ? ` · NOW ${Math.round(elapsed)}%` : ""}`} onClick={() => onSelect(period)} className={`relative h-7 min-w-[42px] flex-1 overflow-hidden border-r px-1 text-xs font-semibold transition-colors ${selected ? selectedColor[color] : segmentColors[color]}`} style={{ flexBasis: totalDuration ? `${duration / totalDuration * 100}%` : `${100 / periods.length}%`, flexGrow: 0 }}>
              {period.active && <span className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${elapsed}%` }} />}
              <span className="relative">{period.lord}{period.active ? " · NOW" : ""}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DashaTableRows({ period, depth }: { period: EphemerisResponse["dashas"][number]; depth: number }) {
  const [expanded, setExpanded] = useState(period.active);
  const nestedPeriods = period.periods ?? [];
  return (
    <>
      <tr className={period.active ? "bg-cyan-50/80 dark:bg-cyan-950/25" : "hover:bg-slate-50 dark:hover:bg-slate-800/30"}>
        <td className="whitespace-nowrap px-2 py-2 font-medium" style={{ paddingLeft: `${8 + depth * 18}px` }}>
          <button type="button" disabled={!nestedPeriods.length} onClick={() => setExpanded((open) => !open)} className="inline-flex items-center gap-1.5 disabled:cursor-default">
            {nestedPeriods.length ? <ChevronDown className={`size-3 text-slate-600 transition ${expanded ? "" : "-rotate-90"}`} /> : <span className="w-3" />}
            <span>{DASHA_LEVELS[depth] ?? "Period"}</span>
          </button>
        </td>
        <td className="px-2 py-2 font-semibold">{period.lord}</td>
        <td className="whitespace-nowrap px-2 py-2 text-slate-600">{formatDashaDate(period.start)}</td>
        <td className="whitespace-nowrap px-2 py-2 text-slate-600">{formatDashaDate(period.end)}</td>
        <td className="px-2 py-2">{period.active ? <span className="rounded bg-cyan-100 px-1.5 py-0.5 text-xs font-bold text-cyan-900 dark:bg-cyan-400/10 dark:text-cyan-200">NOW · {Math.round(dashaProgress(period, Date.now()))}%</span> : <span className="text-slate-400">—</span>}</td>
      </tr>
      {expanded && nestedPeriods.map((nested) => <DashaTableRows key={`${nested.lord}-${nested.start}`} period={nested} depth={depth + 1} />)}
    </>
  );
}

function DashaTimeline({ data, onMajorSelect }: { data: EphemerisResponse; onMajorSelect?: (period: EphemerisResponse["dashas"][number]) => void }) {
  const [majorStart, setMajorStart] = useState("");
  const [antarStart, setAntarStart] = useState("");
  const [pratyantarStart, setPratyantarStart] = useState("");
  const [sookshmaStart, setSookshmaStart] = useState("");
  const currentMajor = findDasha(data.dashas, majorStart);
  const currentAntar = currentMajor ? findDasha(currentMajor.periods ?? [], antarStart) : undefined;
  const currentPratyantar = currentAntar ? findDasha(currentAntar.periods ?? [], pratyantarStart) : undefined;
  const currentSookshma = currentPratyantar ? findDasha(currentPratyantar.periods ?? [], sookshmaStart) : undefined;
  const timeline = data.dashas.filter((period) => period.start && new Date(period.end).getTime() > new Date(data.dashas[0]?.start ?? 0).getTime());
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
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-cyan-200 bg-cyan-50/70 p-3 dark:border-cyan-900/60 dark:bg-cyan-950/25">
        <div className="mb-2 flex items-center justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-800 dark:text-cyan-300">Interactive Vimshottari timeline</p><p className="mt-0.5 text-xs text-slate-600">Select any segment to inspect the next level · elapsed progress is shaded</p></div><span className="shrink-0 rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-900 dark:bg-cyan-400/10 dark:text-cyan-200">NOW · {currentMajor?.lord ?? "—"}</span></div>
        <div className="space-y-2.5">
          <DashaLane label="Maha Dasha" periods={timeline} selectedStart={currentMajor?.start ?? ""} onSelect={(period) => { setMajorStart(period.start); setAntarStart(""); setPratyantarStart(""); setSookshmaStart(""); onMajorSelect?.(period); }} color="cyan" />
          {currentMajor && <DashaLane label={`${currentMajor.lord} Antar`} periods={currentMajor.periods ?? []} selectedStart={currentAntar?.start ?? ""} onSelect={(period) => { setAntarStart(period.start); setPratyantarStart(""); setSookshmaStart(""); }} color="indigo" />}
          {currentAntar && <DashaLane label={`${currentAntar.lord} Pratyantar`} periods={currentAntar.periods ?? []} selectedStart={currentPratyantar?.start ?? ""} onSelect={(period) => { setPratyantarStart(period.start); setSookshmaStart(""); }} color="amber" />}
          {currentPratyantar && <DashaLane label={`${currentPratyantar.lord} Sookshma`} periods={currentPratyantar.periods ?? []} selectedStart={currentSookshma?.start ?? ""} onSelect={(period) => setSookshmaStart(period.start)} color="emerald" />}
        </div>
      </div>
      <div className="max-h-[360px] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[540px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wider text-slate-600 dark:bg-slate-900"><tr>{["Level", "Lord", "Start", "End", "Status"].map((heading) => <th key={heading} className="px-2 py-2 font-medium">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{timeline.map((maha) => <DashaTableRows key={`${maha.lord}-${maha.start}`} period={maha} depth={0} />)}</tbody>
        </table>
      </div>
    </div>
  );
}

type AuxiliaryType = "divisional" | "transit" | "solar" | "tajika" | "progressions";
type DashaSystem = "vimshottari" | "chara" | "ashtottari" | "yogini";

interface GeocodeResult {
  label: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

const CONTROL_CLASS = "h-9 rounded-lg border border-input bg-card px-2.5 text-xs text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
const PANEL_CLASS = "min-w-0 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm";

interface SavedChartRecord {
  id: string;
  chartName: string | null;
  fullName: string;
  dateOfBirth: string;
  timeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: string;
  city: string | null;
}

export function KundaliDashboard() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const profile = useKundaliStore((state) => state.profile);
  const chartStyle = useKundaliStore((state) => state.chartStyle);
  const varga = useKundaliStore((state) => state.varga);
  const decimalDegrees = useKundaliStore((state) => state.decimalDegrees);
  const nodeType = useKundaliStore((state) => state.nodeType);
  const ayanamsa = useKundaliStore((state) => state.ayanamsa);
  const zodiacMode = useKundaliStore((state) => state.zodiacMode);
  const customAyanamsaDegrees = useKundaliStore((state) => state.customAyanamsaDegrees);
  const language = useKundaliStore((state) => state.language);
  const viewPreferences = useKundaliStore((state) => state.viewPreferences);
  const setProfile = useKundaliStore((state) => state.setProfile);
  const setChartStyle = useKundaliStore((state) => state.setChartStyle);
  const setVarga = useKundaliStore((state) => state.setVarga);
  const setDecimalDegrees = useKundaliStore((state) => state.setDecimalDegrees);
  const setNodeType = useKundaliStore((state) => state.setNodeType);
  const setAyanamsa = useKundaliStore((state) => state.setAyanamsa);
  const setZodiacMode = useKundaliStore((state) => state.setZodiacMode);
  const setCustomAyanamsaDegrees = useKundaliStore((state) => state.setCustomAyanamsaDegrees);
  const setLanguage = useKundaliStore((state) => state.setLanguage);
  const setViewPreference = useKundaliStore((state) => state.setViewPreference);
  const adjustTime = useKundaliStore((state) => state.adjustTime);
  const [data, setData] = useState<EphemerisResponse | null>(null);
  const [transitData, setTransitData] = useState<EphemerisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitLoading, setTransitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitError, setTransitError] = useState<string | null>(null);
  const [requestNumber, setRequestNumber] = useState(0);
  const [referenceName, setReferenceName] = useState("Ascendant");
  const [auxiliaryReferenceName, setAuxiliaryReferenceName] = useState("Ascendant");
  const [overlayTransits, setOverlayTransits] = useState(false);
  const [chartMaximized, setChartMaximized] = useState(false);
  const [auxiliaryType, setAuxiliaryType] = useState<AuxiliaryType>("divisional");
  const [targetAge, setTargetAge] = useState(30);
  const [ageMode, setAgeMode] = useState<"completed" | "ongoing">("completed");
  const [nadiProgressions, setNadiProgressions] = useState(false);
  const [bhriguProgressions, setBhriguProgressions] = useState(false);
  const [dashaSystem, setDashaSystem] = useState<DashaSystem>("vimshottari");
  const [dashaSeed, setDashaSeed] = useState<"moon" | "ascendant" | "sun">("moon");
  const [selectedMahaDashaStart, setSelectedMahaDashaStart] = useState("");
  const [savedProfiles, setSavedProfiles] = useState<SavedChartRecord[]>([]);
  const [savedProfileId, setSavedProfileId] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [chartNameDraft, setChartNameDraft] = useState("");
  const [savingChart, setSavingChart] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [chartMode, setChartMode] = useState<"transit" | "birth">("transit");
  const [locationSearch, setLocationSearch] = useState(profile.city);
  const [locationResults, setLocationResults] = useState<GeocodeResult[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [coordinateTimezoneError, setCoordinateTimezoneError] = useState<string | null>(null);

  useEffect(() => {
    const defaults = getBirthDateTimeDefaults(profile);
    if (defaults) setProfile(defaults);
  }, [profile.date, profile.time, setProfile]);

  useEffect(() => {
    if (!authLoaded) return;
    const abortController = new AbortController();
    void fetch("/api/profiles", { signal: abortController.signal })
      .then(async (response) => {
        const result = await response.json() as { profiles?: SavedChartRecord[]; error?: string };
        if (response.status === 401) {
          setAuthRequired(true);
          return;
        }
        if (!response.ok || !Array.isArray(result.profiles)) throw new Error(result.error ?? `Saved chart request failed (${response.status}).`);
        setAuthRequired(false);
        setSavedProfiles(result.profiles);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        console.error("[kundali] Unable to load saved charts", requestError);
        setSaveError(requestError instanceof Error ? requestError.message : "Unable to load saved charts.");
      });
    return () => abortController.abort();
  }, [authLoaded, isSignedIn]);

  useEffect(() => {
    setLocationSearch(profile.city);
  }, [profile.city]);

  useEffect(() => {
    const query = locationSearch.trim();
    if (query.length < 3 || query === profile.city) {
      setLocationResults([]);
      setLocationError(null);
      setLocationLoading(false);
      return;
    }

    const abortController = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLocationLoading(true);
      setLocationError(null);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal: abortController.signal });
        const result = await response.json() as { results?: GeocodeResult[]; error?: string };
        if (!response.ok || result.error) throw new Error(result.error ?? `Place search failed (${response.status}).`);
        if (!Array.isArray(result.results)) throw new Error("Place search returned an invalid result.");
        setLocationResults(result.results);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setLocationError(requestError instanceof Error ? requestError.message : "Unable to search for this location.");
      } finally {
        if (!abortController.signal.aborted) setLocationLoading(false);
      }
    }, 850);
    return () => {
      window.clearTimeout(timeout);
      abortController.abort();
    };
  }, [locationSearch, profile.city]);

  useEffect(() => {
    if (!Number.isFinite(profile.lat) || !Number.isFinite(profile.lng)) return;
    const abortController = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/geocode?lat=${encodeURIComponent(profile.lat)}&lng=${encodeURIComponent(profile.lng)}`, { signal: abortController.signal });
        const result = await response.json() as { timezone?: string; error?: string };
        if (!response.ok || !result.timezone) throw new Error(result.error ?? `Time zone lookup failed (${response.status}).`);
        setCoordinateTimezoneError(null);
        if (result.timezone !== profile.timezone) setProfile({ timezone: result.timezone });
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setCoordinateTimezoneError(requestError instanceof Error ? requestError.message : "Could not update the birth place time zone.");
      }
    }, 350);
    return () => {
      window.clearTimeout(timeout);
      abortController.abort();
    };
  }, [profile.lat, profile.lng]);

  useEffect(() => {
    if (!profile.date || !profile.time) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/ephemeris", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            date: profile.date,
            time: profile.time,
            lat: profile.lat,
            lng: profile.lng,
            timezone: profile.timezone,
            ayanamsa,
            zodiacMode,
            customAyanamsaDegrees,
            nodeType,
            dashaSeed,
            ...(auxiliaryType === "solar" || auxiliaryType === "tajika" ? { targetAge, ageMode } : {}),
          }),
        });
        const result = await response.json() as EphemerisResponse | { error: string };
        if (!response.ok || "error" in result) throw new Error("error" in result ? result.error : `Ephemeris request failed (${response.status}).`);
        setData(result);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Unable to calculate this chart.");
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    }, 100);
    return () => {
      window.clearTimeout(timeout);
      abortController.abort();
    };
  }, [profile.date, profile.time, profile.lat, profile.lng, profile.timezone, ayanamsa, zodiacMode, customAyanamsaDegrees, nodeType, dashaSeed, auxiliaryType, targetAge, ageMode, requestNumber]);

  useEffect(() => {
    const abortController = new AbortController();
    const timeout = window.setTimeout(async () => {
      setTransitLoading(true);
      setTransitError(null);
      const now = new Date();
      try {
        const response = await fetch("/api/ephemeris", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            date: now.toISOString().slice(0, 10),
            time: now.toISOString().slice(11, 19),
            lat: profile.lat,
            lng: profile.lng,
            timezone: "UTC",
            ayanamsa,
            zodiacMode,
            customAyanamsaDegrees,
            nodeType,
            dashaSeed: "moon",
          }),
        });
        const result = await response.json() as EphemerisResponse | { error: string };
        if (!response.ok || "error" in result) throw new Error("error" in result ? result.error : `Transit request failed (${response.status}).`);
        setTransitData(result);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setTransitError(requestError instanceof Error ? requestError.message : "Unable to calculate current transits.");
      } finally {
        if (!abortController.signal.aborted) setTransitLoading(false);
      }
    }, 160);
    return () => {
      window.clearTimeout(timeout);
      abortController.abort();
    };
  }, [profile.lat, profile.lng, ayanamsa, zodiacMode, customAyanamsaDegrees, nodeType]);

  const saveChart = () => {
    setChartNameDraft(profile.name.trim());
    setSaveError(null);
    setSaveDialogOpen(true);
  };
  const submitSaveChart = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chartNameDraft.trim()) {
      setSaveError("Enter a Chart Name to continue.");
      return;
    }
    setSavingChart(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chartName: chartNameDraft,
          fullName: profile.name,
          date: profile.date,
          time: profile.time,
          lat: profile.lat,
          lng: profile.lng,
          timezone: profile.timezone,
          city: profile.city,
        }),
      });
      const result = await response.json() as { profile?: SavedChartRecord; error?: string };
      if (!response.ok || !result.profile) {
        if (response.status === 401) setAuthRequired(true);
        throw new Error(result.error ?? `Chart save failed (${response.status}).`);
      }
      const saved = result.profile;
      setSavedProfiles((current) => [saved, ...current]);
      setSavedProfileId(saved.id);
      setAuthRequired(false);
      setSaveDialogOpen(false);
    } catch (requestError) {
      setSaveError(requestError instanceof Error ? requestError.message : "Chart could not be saved.");
    } finally {
      setSavingChart(false);
    }
  };
  const openSavedChart = () => {
    const selected = savedProfiles.find((item) => item.id === savedProfileId);
    if (selected) {
      setChartMode("birth");
      setProfile({
        id: selected.id,
        name: selected.fullName,
        date: selected.dateOfBirth.slice(0, 10),
        time: selected.timeOfBirth,
        lat: selected.latitude,
        lng: selected.longitude,
        timezone: selected.timezone,
        city: selected.city ?? "",
      });
    }
  };
  const chooseLocation = (location: GeocodeResult) => {
    setProfile({
      city: location.city,
      lat: location.latitude,
      lng: location.longitude,
      timezone: location.timezone,
    });
    setLocationSearch(location.city);
    setLocationResults([]);
    setLocationError(null);
  };

  const displayData = chartMode === "transit" ? transitData : data;
  const displayLoading = chartMode === "transit" ? transitLoading : loading;
  const displayError = chartMode === "transit" ? transitError : error;
  const referenceHouseNumber = getReferenceHouse(referenceName);
  const auxiliaryReferenceHouseNumber = getReferenceHouse(auxiliaryReferenceName);
  const auxiliaryChart = auxiliaryType === "transit" ? transitData
    : auxiliaryType === "solar" || auxiliaryType === "tajika" ? data?.solarReturn
      : displayData;
  const auxiliaryAscendant = auxiliaryType === "solar" || auxiliaryType === "tajika"
    ? data?.solarReturn?.ascendant
    : auxiliaryChart?.ascendant;
  const auxiliaryPlanets = auxiliaryType === "solar" || auxiliaryType === "tajika"
    ? data?.solarReturn?.planets
    : auxiliaryChart?.planets;
  const auxiliaryPoints = auxiliaryType === "solar" || auxiliaryType === "tajika" ? [] : auxiliaryType === "transit" ? transitData?.points : displayData?.points;
  const auxiliaryCusps = auxiliaryType === "solar" || auxiliaryType === "tajika" ? [] : auxiliaryType === "transit" ? transitData?.houseCusps : displayData?.houseCusps;
  const auxiliaryVarga = auxiliaryType === "divisional" ? varga : 1;
  const currentTransitLabel = transitData ? new Date(transitData.calculatedAt).toLocaleTimeString() : "—";
  const activeMahaDasha = (selectedMahaDashaStart ? data?.dashas.find((period) => period.start === selectedMahaDashaStart) : undefined)
    ?? data?.dashas.find((period) => period.active)
    ?? data?.dashas[0];
  const activeDashaLord = activeMahaDasha ? data?.planets.find((planet) => planet.name === activeMahaDasha.lord) : undefined;
  const dashaAscendant = data && activeDashaLord
    ? { ...data.ascendant, sign: activeDashaLord.sign, signName: activeDashaLord.signName, house: 1 }
    : undefined;

  return (
    <div id="kundali-dashboard" className="relative min-w-0 space-y-4 bg-background text-foreground">
      <div className="mx-auto max-w-[1750px] space-y-4">
        <section aria-label="Birth chart controls" className="rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div id="saved-charts" className="flex items-center gap-2 scroll-mt-4">
              <span className="grid size-7 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"><Orbit className="size-4" /></span>
              <div><p className="text-xs font-semibold">Birth chart profile</p><p className="text-xs text-slate-600 dark:text-slate-400">Used when Birth is selected · Transit opens first</p></div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={saveChart} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-medium transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:border-slate-700 dark:hover:border-amber-800 dark:hover:bg-amber-950/30 dark:hover:text-amber-200"><Save className="size-3.5" /> Save chart</button>
              <select aria-label="Saved charts" value={savedProfileId} onChange={(event) => setSavedProfileId(event.target.value)} className={`${CONTROL_CLASS} h-8 max-w-44 text-xs`}>
                <option value="">Saved charts ({savedProfiles.length})</option>
                {savedProfiles.map((saved) => <option key={saved.id} value={saved.id}>{saved.chartName ?? saved.fullName} · {saved.dateOfBirth.slice(0, 10)}</option>)}
              </select>
              <button type="button" onClick={openSavedChart} disabled={!savedProfileId} aria-label="Open Saved Chart" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"><Bookmark className="size-3.5" /> Open</button>
            </div>
          </div>
          {authRequired && <p className="mb-2 text-xs text-slate-600">Sign in to save or open charts across sessions.</p>}
          <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-3 xl:grid-cols-[minmax(132px,0.9fr)_minmax(132px,0.9fr)_minmax(210px,1.5fr)_minmax(112px,0.75fr)_minmax(112px,0.75fr)_minmax(288px,1.8fr)]">
            <label className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-400">Birth date
              <input aria-label="Birth date" type="date" value={profile.date} onChange={(event) => setProfile({ date: event.target.value })} className={`${CONTROL_CLASS} mt-1 h-9 w-full px-2 text-xs`} />
            </label>
            <label className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-400">Birth time
              <input aria-label="Time of birth" type="time" step={1} value={profile.time} onChange={(event) => {
                const time = event.target.value;
                if (time) setProfile({ time: time.length === 5 ? `${time}:00` : time });
              }} className={`${CONTROL_CLASS} mt-1 h-9 w-full px-2 font-mono text-xs`} />
            </label>
            <div className="relative min-w-0 text-xs font-medium text-slate-600 dark:text-slate-400">
              <label htmlFor="birth-city-search">Birth city</label>
              <span className="relative mt-1 block">
                <MapPin className="pointer-events-none absolute left-2 top-2 size-3.5 text-slate-400" />
                <input id="birth-city-search" aria-label="Birth city; search anywhere" type="search" value={locationSearch} onChange={(event) => setLocationSearch(event.target.value)} placeholder="Search city or place…" autoComplete="off" aria-autocomplete="list" aria-expanded={locationResults.length > 0} className={`${CONTROL_CLASS} h-9 w-full px-2 pl-7 text-xs`} />
                {locationLoading && <Search className="absolute right-2 top-2 size-3.5 animate-pulse text-cyan-600" />}
              </span>
              {locationError && <p role="status" className="absolute z-10 mt-1 rounded bg-white px-1 text-xs text-rose-700 dark:bg-slate-900 dark:text-rose-300">{locationError}</p>}
              {locationResults.length > 0 && (
                <ul role="listbox" aria-label="Location search results" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  {locationResults.map((location) => <li key={`${location.label}-${location.latitude}-${location.longitude}`} role="option" aria-selected={false}><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseLocation(location)} className="w-full rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"><span className="block truncate text-xs font-medium text-slate-800 dark:text-slate-100">{location.city}</span><span className="mt-0.5 block truncate text-xs text-slate-600">{location.label} · {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)} · {location.timezone}</span></button></li>)}
                </ul>
              )}
            </div>
            <label className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-400">Latitude
              <input aria-label="Latitude" type="number" step="0.0001" min="-90" max="90" value={Number.isFinite(profile.lat) ? profile.lat : ""} onChange={(event) => setProfile({ lat: event.target.value === "" ? Number.NaN : Number(event.target.value) })} className={`${CONTROL_CLASS} mt-1 h-9 w-full px-2 text-xs tabular-nums`} />
            </label>
            <label className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-400">Longitude
              <input aria-label="Longitude" type="number" step="0.0001" min="-180" max="180" value={Number.isFinite(profile.lng) ? profile.lng : ""} onChange={(event) => setProfile({ lng: event.target.value === "" ? Number.NaN : Number(event.target.value) })} className={`${CONTROL_CLASS} mt-1 h-9 w-full px-2 text-xs tabular-nums`} />
            </label>
            <BirthTimeAdjuster onAdjust={adjustTime} />
          </div>
          <p role={coordinateTimezoneError ? "status" : undefined} className={`mt-1.5 truncate text-[11px] ${coordinateTimezoneError ? "text-rose-700 dark:text-rose-300" : "text-slate-600 dark:text-slate-400"}`}>{coordinateTimezoneError ?? `Time zone · ${profile.timezone || "Select a birth city"}`}</p>
        </section>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300"><Orbit className="size-3.5" /> {zodiacMode === "sidereal" ? "Sidereal (Nirayana)" : "Tropical (Sayana)"} {chartMode === "transit" ? "transit chart" : "birth chart"}</div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Kundali &amp; Charts</h2>
            <p title={chartMode === "transit" ? `Current transit · ${transitData?.calculatedAt ?? "calculating"} · ${profile.city}` : `${profile.name || "New profile"} · ${profile.date || "Date not set"} · ${profile.time} · ${profile.city}`} className="mt-1 min-w-0 truncate text-xs text-slate-600 dark:text-slate-400">
              {chartMode === "transit" ? `Current transit · ${transitData ? new Date(transitData.calculatedAt).toLocaleString() : "calculating"} · ${profile.city}` : `${profile.name || "New profile"} · ${profile.date || "Date not set"} · ${profile.time} · ${profile.city}`}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <span className={`size-1.5 rounded-full ${displayLoading ? "animate-pulse bg-amber-400" : displayError ? "bg-rose-400" : "bg-emerald-400"}`} />
            {displayLoading ? "Calculating ephemeris…" : displayError ? "Calculation error" : displayData?.engine ?? "Ready"}
            <button type="button" onClick={() => setRequestNumber((number) => number + 1)} className="ml-1 rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Refresh chart"><RefreshCw className={`size-3 ${displayLoading ? "animate-spin" : ""}`} /></button>
          </div>
        </div>

        {displayError && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{displayError}</span></div>}
        <div id="kundali-charts" className="grid grid-cols-1 items-start gap-4 scroll-mt-4 xl:grid-cols-2 xl:gap-6">
          <div className="min-w-0">
            <section className={PANEL_CLASS} aria-label="Primary D1 chart">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div><p className="text-xs font-semibold">Primary chart · D1</p><p className="mt-0.5 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">{chartMode === "transit" ? "Current transit · whole sign" : "Birth chart · whole sign"}</p></div>
                <div className="flex items-center gap-2">
                  <div role="group" aria-label="D1 chart source" className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-950">
                    {(["transit", "birth"] as const).map((mode) => (
                      <button key={mode} type="button" aria-pressed={chartMode === mode} onClick={() => setChartMode(mode)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${chartMode === mode ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"}`}>
                        {mode === "transit" ? "Current transit" : "Birth chart"}
                      </button>
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800 dark:bg-amber-400/10 dark:text-amber-300"><Crosshair className="size-3" /> {displayData?.ascendant.signName ?? "—"} rising</span>
                  <button type="button" onClick={() => setChartMaximized(true)} aria-label="Maximize D1 chart" title="View chart full screen" className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-cyan-400 hover:text-cyan-700 dark:border-slate-700 dark:text-slate-300 dark:hover:text-cyan-300"><Maximize2 className="size-4" /></button>
                </div>
              </div>
              <details className="group mb-3 rounded-lg border border-slate-200 px-3 dark:border-slate-800">
                <summary className="flex h-9 cursor-pointer list-none items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                  <Settings2 className="size-3.5 text-cyan-700 dark:text-cyan-300" /> Chart settings <ChevronDown className="ml-auto size-3.5 transition group-open:rotate-180" />
                </summary>
                <div className="space-y-3 pb-3">
              <div className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-2">
                <label className="flex h-10 min-w-0 flex-col text-xs font-medium text-slate-600 dark:text-slate-400">Reference Lagna
                  <select aria-label="D1 reference lagna" value={referenceName} onChange={(event) => setReferenceName(event.target.value)} className={`${CONTROL_CLASS} mt-0.5 h-7 w-full py-0 text-xs`}>
                    <option value="Ascendant">Ascendant</option>
                    <optgroup label="House reference">
                      {Array.from({ length: 12 }, (_, index) => <option key={index} value={`house:${index + 1}`}>House {index + 1}</option>)}
                    </optgroup>
                  </select>
                </label>
                <label className="flex h-10 min-w-0 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700">
                    <span className="flex min-w-0 items-center gap-2 truncate"><Eye className="size-3.5 shrink-0 text-cyan-700 dark:text-cyan-300" /> Overlay current transits</span>
                    <input type="checkbox" checked={overlayTransits} disabled={chartMode === "transit"} onChange={(event) => setOverlayTransits(event.target.checked)} className="size-4 accent-cyan-600 disabled:opacity-40" />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-y border-slate-100 py-2.5 dark:border-slate-800">
                <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-950">
                  {([["diamond", "Diamond"], ["circular", "Circular"], ["south", "South"], ["placidus", "Placidus Wheel"]] as const).map(([style, label]) => <button key={style} type="button" onClick={() => setChartStyle(style)} className={`rounded-md px-2.5 py-1.5 text-xs transition ${chartStyle === style ? "bg-amber-500 text-amber-950 shadow-sm" : "text-slate-600 hover:text-slate-900 dark:hover:text-slate-200"}`}>{label}</button>)}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <select aria-label="Zodiac system" value={zodiacMode} onChange={(event) => setZodiacMode(event.target.value as ZodiacMode)} className={`${CONTROL_CLASS} h-8 text-xs`}>
                    <option value="sidereal">Sidereal (Nirayana)</option><option value="tropical">Tropical (Sayana)</option>
                  </select>
                  <select aria-label="Ayanamsa" value={ayanamsa} onChange={(event) => setAyanamsa(event.target.value)} disabled={zodiacMode === "tropical"} className={`${CONTROL_CLASS} h-8 text-xs disabled:opacity-50`}>
                    <option value="lahiri">Lahiri</option><option value="raman">B.V. Raman</option><option value="krishnamurti">Krishnamurti</option><option value="fagan-bradley">Fagan–Bradley</option><option value="yukteshwar">Yukteshwar</option><option value="custom">Custom Ayanamsa</option>
                  </select>
                  {zodiacMode === "sidereal" && ayanamsa === "custom" && <label className="text-xs text-slate-600">Degrees<input aria-label="Custom ayanamsa degrees" type="number" step="0.0001" min="-360" max="360" value={customAyanamsaDegrees} onChange={(event) => setCustomAyanamsaDegrees(Number(event.target.value))} className={`${CONTROL_CLASS} h-8 w-24 text-xs`} /></label>}
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <Languages className="size-3.5" />
                    <select aria-label="Planet and sign language" value={language} onChange={(event) => setLanguage(event.target.value as CelestialLanguage)} className={`${CONTROL_CLASS} h-8 text-xs`}>
                      <option value="en">English</option><option value="hi">Hindi</option><option value="mr">Marathi</option><option value="initials">English - Initials</option>
                    </select>
                  </label>
                  <details className="group relative">
                    <summary className="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                      <Settings2 className="size-3.5" /> View preferences <ChevronDown className="size-3 transition group-open:rotate-180" />
                    </summary>
                    <fieldset className="absolute left-0 top-full z-50 mt-1 min-w-56 space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl sm:left-auto sm:right-0 dark:border-slate-700 dark:bg-slate-900">
                      <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Display options</legend>
                      {([
                        ["showHouseLabels", "House labels (H1–H12)"],
                        ["showSignNumbers", "Sign numbers (1–12)"],
                        ["showBhavaCusps", "D1 Bhava cusp labels"],
                        ["showOuterPlanets", "Outer planets (Uranus, Neptune, Pluto)"],
                        ["showAsteroids", "Asteroids / points (Lilith, Chiron)"],
                        ["showUpagrahas", "Upagrahas (Mandi, Gulika)"],
                        ["showFortune", "Part of Fortune (Fortuna)"],
                        ["usePlanetIcons", "Use Planet Icons"],
                        ["useSignIcons", "Use Sign Icons"],
                        ["showEqualHouses", "30 Degree Houses (Equal House System)"],
                        ["showSignDivisions", "30 Degree Signs overlay"],
                      ] as const).map(([key, label]) => <label key={key} className="flex cursor-pointer items-start gap-2 text-xs text-slate-700 dark:text-slate-200"><input type="checkbox" checked={viewPreferences[key]} onChange={(event) => setViewPreference(key, event.target.checked)} className="mt-0.5 size-3.5 accent-cyan-600" /><span>{label}</span></label>)}
                      <p className="border-t border-slate-200 pt-2 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:text-slate-400">Gulika uses the start and Mandi the midpoint of Saturn’s 1/8 day-or-night segment. Sign numbers follow Aries=1 through Pisces=12.</p>
                    </fieldset>
                  </details>
                </div>
              </div>
                </div>
              </details>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/50">
                {displayData ? <SvgChart style={chartStyle} ascendant={displayData.ascendant} planets={displayData.planets} points={displayData.points} houseCusps={displayData.houseCusps} varga={1} referenceHouse={referenceHouseNumber} overlay={chartMode === "birth" && overlayTransits ? transitData?.planets : undefined} language={language} preferences={viewPreferences} /> : <div className="grid aspect-square place-items-center text-xs text-slate-600">{displayLoading ? <LoaderCircle className="size-5 animate-spin text-cyan-500" /> : "Chart unavailable"}</div>}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><span className={`size-2 rounded-full ${chartMode === "transit" ? "bg-cyan-600 dark:bg-cyan-400" : "bg-amber-600 dark:bg-amber-400"}`} /> {chartMode === "transit" ? "Current transit" : "Birth chart"}</span>
                <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-full border border-violet-600" /> Vargottam</span>
                <span><span className="font-bold text-rose-600">R</span> = retrograde</span>
                <span>{chartStyle === "placidus" ? `${referenceName === "Ascendant" ? "Ascendant" : `House ${referenceHouseNumber}`} at 9 o’clock` : `${referenceName === "Ascendant" ? "Ascendant" : `House ${referenceHouseNumber}`} reference`}</span>
              </div>
              {chartMode === "transit" && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{transitLoading ? "Refreshing current sky…" : transitError ?? `Current sky · ${currentTransitLabel}`}</p>}
              {chartMode === "birth" && overlayTransits && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{transitLoading ? "Refreshing current sky…" : transitError ?? `Transit positions · ${currentTransitLabel}`}</p>}
            </section>
          </div>

          <div className="min-w-0">
            <section id="auxiliary-chart" className={PANEL_CLASS} aria-label="Auxiliary chart viewer">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-xs font-semibold">{auxiliaryType === "divisional" ? `D${varga} · ${varga === 9 ? "Navamsha" : "Divisional chart"}` : "Auxiliary chart viewer"}</p><p className="mt-0.5 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">{varga === 9 && auxiliaryType === "divisional" ? "D9 derived from the primary D1" : "Compare divisional, transit, return &amp; progression views"}</p></div>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">Auxiliary chart
                    <select aria-label="Auxiliary chart type" value={auxiliaryType} onChange={(event) => setAuxiliaryType(event.target.value as AuxiliaryType)} className={`${CONTROL_CLASS} max-w-56`}>
                      <option value="divisional">Divisional Charts (D2–D60)</option><option value="transit">Transit Chart</option><option value="solar">Solar Return (Varshaphala)</option><option value="tajika">Tajika</option><option value="progressions">Progressions</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">Reference Lagna
                    <select aria-label="Auxiliary reference lagna" value={auxiliaryReferenceName} onChange={(event) => setAuxiliaryReferenceName(event.target.value)} className={`${CONTROL_CLASS} min-w-36`}>
                      <option value="Ascendant">Ascendant</option>
                      {Array.from({ length: 12 }, (_, index) => <option key={index} value={`house:${index + 1}`}>House {index + 1}</option>)}
                    </select>
                  </label>
                </div>
              </div>
              {auxiliaryType === "divisional" && (
                <div className="mb-3 flex min-h-10 flex-wrap items-center gap-1.5 py-1.5">
                  {VARGAS.filter((division) => division !== 1).map((division) => <button key={division} type="button" onClick={() => setVarga(division)} className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${varga === division ? "border-amber-600 bg-amber-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"}`} aria-pressed={varga === division}>{`D${division}`}</button>)}
                </div>
              )}
              {(auxiliaryType === "solar" || auxiliaryType === "tajika") && (
                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Required age
                    <input type="number" min={0} max={120} value={targetAge} onChange={(event) => setTargetAge(Math.max(0, Math.min(120, Number(event.target.value))))} className={`${CONTROL_CLASS} mt-1 w-full`} />
                  </label>
                  <fieldset className="flex items-end gap-2 text-xs">
                    <legend className="sr-only">Age counting rule</legend>
                    {(["completed", "ongoing"] as const).map((mode) => <label key={mode} className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 dark:border-slate-700"><input type="radio" name="age-mode" checked={ageMode === mode} onChange={() => setAgeMode(mode)} className="accent-amber-600" /> {mode === "completed" ? "Completed age" : "Ongoing age"}</label>)}
                  </fieldset>
                </div>
              )}
              {auxiliaryType === "progressions" && (
                <div className="mb-3 flex flex-wrap gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700"><input type="checkbox" checked={nadiProgressions} onChange={(event) => setNadiProgressions(event.target.checked)} className="accent-cyan-600" /> Nadi progression</label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700"><input type="checkbox" checked={bhriguProgressions} onChange={(event) => setBhriguProgressions(event.target.checked)} className="accent-cyan-600" /> Bhrigu progression</label>
                </div>
              )}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/50">
                {auxiliaryAscendant && auxiliaryPlanets
                    ? <SvgChart style={chartStyle} ascendant={auxiliaryAscendant} planets={auxiliaryPlanets} points={auxiliaryPoints} houseCusps={auxiliaryCusps} varga={auxiliaryVarga} referenceHouse={auxiliaryReferenceHouseNumber} language={language} preferences={viewPreferences} />
                  : <div className="grid aspect-square place-items-center px-6 text-center text-xs text-slate-600">{auxiliaryType === "solar" || auxiliaryType === "tajika" ? loading ? "Calculating exact solar return…" : "Solar return data is not available." : auxiliaryType === "transit" && transitLoading ? "Calculating current transits…" : auxiliaryType === "progressions" ? "Choose a progression method to configure this view." : "Calculating chart…"}</div>}
              </div>
              {auxiliaryType === "solar" || auxiliaryType === "tajika"
                ? <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Exact sidereal solar return · {data?.solarReturn?.utc ? new Date(data.solarReturn.utc).toLocaleString() + " UTC" : "Awaiting calculation"} · {auxiliaryReferenceName === "Ascendant" ? "Ascendant" : `House ${auxiliaryReferenceHouseNumber}`} reference</p>
                : auxiliaryType === "transit" ? <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Current sky at chart coordinates · {currentTransitLabel} · {auxiliaryReferenceName === "Ascendant" ? "Ascendant" : `House ${auxiliaryReferenceHouseNumber}`} reference</p>
                  : auxiliaryType === "progressions" ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Progression controls are saved in this view, but progression calculations are not yet provided by the ephemeris engine. Reference lagna: {auxiliaryReferenceName === "Ascendant" ? "Ascendant" : `House ${auxiliaryReferenceHouseNumber}`}.</p>
                    : <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">D{varga} divisional placements · whole-sign houses · {auxiliaryReferenceName === "Ascendant" ? "Ascendant" : `House ${auxiliaryReferenceHouseNumber}`} reference</p>}
            </section>
          </div>

          <section className={`${PANEL_CLASS} min-w-0 xl:col-span-2`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-semibold">Planetary positions</p><p className="mt-0.5 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">Swiss Ephemeris · sidereal · Jaimini karakas</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">Node
                  <select aria-label="Rahu Ketu node mode" value={nodeType} onChange={(event) => setNodeType(event.target.value as "true" | "mean")} className={`${CONTROL_CLASS} h-8 text-xs`}><option value="true">True Node</option><option value="mean">Mean Node</option></select>
                </label>
                <div role="group" aria-label="Longitude display format" className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-950">
                  {([["dms", false], ["decimal", true]] as const).map(([label, decimal]) => <button key={label} type="button" aria-pressed={decimalDegrees === decimal} onClick={() => setDecimalDegrees(decimal)} className={`rounded-md px-2 py-1.5 text-xs ${decimalDegrees === decimal ? "bg-white font-semibold text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-600"}`}>{label === "dms" ? "DMS" : "Decimal"}</button>)}
                </div>
              </div>
            </div>
            {displayData?.unavailableBodies.map((body) => <p key={body.name} role="status" className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">{body.name} is unavailable because its Swiss Ephemeris data file is not installed; other chart calculations remain active.</p>)}
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              {displayData ? <PlanetTable data={displayData} decimal={decimalDegrees} language={language} preferences={viewPreferences} nodeType={nodeType} interceptedSigns={displayData.interceptedSigns} /> : <div className="grid h-60 place-items-center text-xs text-slate-600">{displayLoading ? <span className="inline-flex items-center gap-2"><LoaderCircle className="size-4 animate-spin text-cyan-500" /> Calculating positions</span> : "No planetary data"}</div>}
            </div>
            {displayData && (
              <details className="group mt-3 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs marker:content-none">
                  <Crosshair className="size-3.5 text-amber-700 dark:text-amber-300" />
                  <span className="font-medium">Bhava Chalit cusps</span><span className="text-slate-600">· {displayData.houseCuspSystem}</span>
                  <ChevronDown className="ml-auto size-3.5 text-slate-600 transition group-open:rotate-180" />
                </summary>
                <div className="grid grid-cols-3 gap-1.5 border-t border-slate-200 p-2 sm:grid-cols-4 lg:grid-cols-6 dark:border-slate-800">
                  {displayData.houseCusps.map((cusp) => <div key={cusp.house} className="rounded-md bg-white px-2 py-1.5 dark:bg-slate-900"><p className="text-xs uppercase text-slate-600">House {cusp.house}</p><p className="mt-0.5 truncate font-mono text-xs">{cusp.signName} {degreeToDms(cusp.longitude % 30)}</p></div>)}
                </div>
              </details>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Ascendant", value: displayData?.ascendant.signName ?? "—", icon: Compass, color: "text-amber-700 dark:text-amber-300" },
                { label: "Ayanamsa", value: displayData ? `${displayData.ayanamsa.degrees.toFixed(4)}°` : "—", icon: Orbit, color: "text-cyan-700 dark:text-cyan-300" },
                { label: "Node mode", value: `${nodeType === "true" ? "True" : "Mean"} Node`, icon: ArrowDownUp, color: "text-cyan-700 dark:text-cyan-300" },
                { label: "House system", value: `Whole Sign + ${displayData?.houseCuspSystem ?? "Bhava"}`, icon: Globe2, color: "text-slate-600" },
              ].map(({ label, value, icon: Icon, color }) => <div key={label} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-950/50"><Icon className={`size-3.5 shrink-0 ${color}`} /><div className="min-w-0"><p className="text-xs uppercase tracking-wider text-slate-600">{label}</p><p className="truncate text-xs">{value}</p></div></div>)}
            </div>
          </section>
        </div>

        <section id="dasha-timeline" className={PANEL_CLASS}>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div><p className="text-xs font-semibold">Vimshottari Dasha</p><p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Maha · Antar · Pratyantar · Sookshma</p></div>
            <div className="flex gap-2">
              <label className="text-xs text-slate-600">System<select value={dashaSystem} onChange={(event) => setDashaSystem(event.target.value as DashaSystem)} className={`${CONTROL_CLASS} mt-1 h-8 text-xs`}><option value="vimshottari">Vimshottari</option><option value="chara">Chara Dasha</option><option value="ashtottari">Ashtottari</option><option value="yogini">Yogini</option></select></label>
              <label className="text-xs text-slate-600">Calculation seed<select value={dashaSeed} onChange={(event) => setDashaSeed(event.target.value as "moon" | "ascendant" | "sun")} className={`${CONTROL_CLASS} mt-1 h-8 text-xs`}><option value="moon">Moon</option><option value="ascendant">Ascendant</option><option value="sun">Sun</option></select></label>
            </div>
          </div>
          {dashaSystem !== "vimshottari" && <p role="status" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">The current ephemeris engine provides Vimshottari periods. {dashaSystem[0].toUpperCase() + dashaSystem.slice(1)} is selected as a view preference, but its period calculations are not represented as Vimshottari.</p>}
          {data && dashaSystem === "vimshottari" ? (
            <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(190px,0.65fr)]">
              <DashaTimeline data={data} onMajorSelect={(period) => setSelectedMahaDashaStart(period.start)} />
              <div className="min-w-0 border-t border-slate-200 pt-3 dark:border-slate-800 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold">Mahadasha lagna</p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{activeMahaDasha?.lord ?? "—"} natal sign as reference ascendant</p>
                  </div>
                  {activeMahaDasha && <span className="shrink-0 rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-900 dark:bg-cyan-400/10 dark:text-cyan-200">{activeMahaDasha.active ? "NOW" : "SELECTED"}</span>}
                </div>
                {dashaAscendant ? (
                  <div className="mx-auto max-w-[220px]" title={`Dasha lagna uses ${activeMahaDasha?.lord}'s natal sign, ${dashaAscendant.signName}, as house one.`}>
                    <SvgChart style="diamond" ascendant={dashaAscendant} planets={data.planets} points={[]} houseCusps={[]} varga={1} language={language} preferences={viewPreferences} />
                  </div>
                ) : <p className="py-8 text-center text-xs text-slate-600">Waiting for the active dasha lord’s natal placement.</p>}
                <p className="mt-1 text-center text-xs text-slate-600 dark:text-slate-400">Active period lord’s natal sign is set as House 1.</p>
              </div>
            </div>
          ) : <div className="grid h-32 place-items-center text-xs text-slate-600">{data ? "Select Vimshottari to display calculated periods." : "Dasha timeline appears after calculation."}</div>}
        </section>

        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <section className={PANEL_CLASS}>
            <div className="mb-2"><p className="text-xs font-semibold">Ashtakavarga · Bhinna Bindus</p><p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Eight contributors across the 12 signs · Sarvashtakavarga total</p></div>
            {displayData ? <AshtakavargaTable data={displayData} language={language} useSignIcons={viewPreferences.useSignIcons} ascendantSign={displayData.ascendant.sign} /> : <div className="grid h-20 place-items-center text-xs text-slate-600">Waiting for planetary positions</div>}
          </section>
          <section className={PANEL_CLASS}>
            <div className="mb-2"><p className="text-xs font-semibold">Element &amp; modality matrix</p><p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Planetary placements by zodiac element and modality</p></div>
            {displayData ? <ElementalMatrix planets={displayData.planets.filter((planet) => chartPlanetVisible(planet, viewPreferences))} language={language} /> : <div className="grid h-24 place-items-center text-xs text-slate-600">Waiting for planetary positions</div>}
          </section>
        </div>

        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <section className={PANEL_CLASS}>
            <div className="mb-3 flex items-center justify-between gap-2"><div><p className="text-xs font-semibold">Indian · Drishti</p><p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Parashari graha aspects mapped to whole-sign houses</p></div><Activity className="size-4 text-amber-600 dark:text-amber-300" /></div>
            {displayData ? <AspectMatrix planets={displayData.planets.filter((planet) => chartPlanetVisible(planet, viewPreferences))} ascendant={displayData.ascendant} language={language} useSignIcons={viewPreferences.useSignIcons} /> : <div className="grid h-40 place-items-center text-xs text-slate-600">Waiting for planetary positions</div>}
          </section>
          <section className={PANEL_CLASS}>
            <div className="mb-3"><p className="text-xs font-semibold">Chinese · Wu Xing relations</p><p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Five-planet generating and controlling relationships</p></div>
            <ChineseElementMatrix />
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className={PANEL_CLASS}>
            <div className="mb-3"><p className="text-xs font-semibold">Western aspect grid</p><p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Exact geocentric longitude separations · one cell per planetary pair</p></div>
            {displayData ? <WesternAspectGrid planets={displayData.planets.filter((planet) => chartPlanetVisible(planet, viewPreferences))} language={language} /> : <div className="grid h-32 place-items-center text-xs text-slate-600">Waiting for planetary positions</div>}
          </section>
          {data ? <GrahaAvasthaPanel data={data} language={language} /> : <section className={`${PANEL_CLASS} grid min-h-40 place-items-center text-xs text-slate-600`}>Avastha calculation appears after planetary positions load.</section>}
        </div>
        <PanchangStrip date={displayData?.input.date ?? profile.date} planets={displayData?.planets ?? []} />
        <TransitOverview
          planets={transitData?.planets ?? []}
          location={profile.city}
          natalAscendantSign={data?.ascendant.sign}
          loading={transitLoading}
          error={transitError}
          updatedAt={currentTransitLabel}
          onOpen={() => {
            setChartMode("transit");
            setAuxiliaryType("transit");
            document.getElementById("kundali-charts")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
        <MedicalAstrologyVisualizer
          natalAscendantSign={data?.ascendant.sign ?? null}
          natalHouseForSign={(sign) => data ? getSignHouse(sign, data.ascendant.sign) : null}
          transitPlanets={transitData?.planets ?? []}
          transitLoading={transitLoading}
          transitError={transitError}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5"><Sparkles className="size-3 text-amber-600 dark:text-amber-300" /> Swiss Ephemeris · Lahiri default · sidereal positions</span>
          <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3" /> Bhava cusps: Placidus · planetary houses: Whole Sign</span>
          {data && <span>Calculated {new Date(data.calculatedAt).toLocaleTimeString()}</span>}
        </div>
      </div>
      {saveDialogOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !savingChart) setSaveDialogOpen(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="save-chart-title" className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><h2 id="save-chart-title" className="text-sm font-semibold">Save birth chart</h2><p className="mt-1 text-xs text-slate-600">Choose a name to find this chart later.</p></div>
              <button type="button" aria-label="Close dialog" disabled={savingChart} onClick={() => setSaveDialogOpen(false)} className="rounded-md p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"><X className="size-4" /></button>
            </div>
            <form onSubmit={submitSaveChart} className="space-y-3">
              <label htmlFor="saved-chart-name" className="block text-xs font-medium text-slate-600 dark:text-slate-300">Chart Name</label>
              <input id="saved-chart-name" autoFocus maxLength={100} value={chartNameDraft} onChange={(event) => setChartNameDraft(event.target.value)} className={`${CONTROL_CLASS} w-full`} placeholder="e.g. Sujay — Birth Chart" />
              {authRequired && <p className="text-xs text-amber-700 dark:text-amber-300">Sign in before saving a chart.</p>}
              {saveError && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{saveError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" disabled={savingChart} onClick={() => setSaveDialogOpen(false)} className="h-9 rounded-lg border border-slate-200 px-3 text-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancel</button>
                {authRequired && <SignInButton mode="modal"><button type="button" className="h-9 rounded-lg border border-amber-300 px-3 text-xs font-semibold text-amber-900 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950/40">Sign in</button></SignInButton>}
                <button type="submit" disabled={savingChart || authRequired} className="inline-flex h-9 items-center gap-2 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50">{savingChart && <LoaderCircle className="size-3.5 animate-spin" />}Save chart</button>
              </div>
            </form>
          </section>
        </div>
      )}
      {chartMaximized && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-md sm:p-6" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setChartMaximized(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="maximized-chart-title" className="flex max-h-full w-full max-w-[min(96vw,1100px)] flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-5">
            <header className="mb-2 flex items-center justify-between gap-3">
              <div><h2 id="maximized-chart-title" className="text-sm font-semibold">D1 {chartMode === "transit" ? "Transit" : "Birth"} · {referenceName === "Ascendant" ? "Ascendant" : `House ${referenceHouseNumber}`} reference</h2><p className="text-xs text-slate-600">{chartMode === "transit" ? `${transitData ? new Date(transitData.calculatedAt).toLocaleString() : "Current sky"} · ${profile.city}` : `${profile.name} · ${formatBirthDate(profile.date)} · ${profile.city}`}</p></div>
              <button type="button" onClick={() => setChartMaximized(false)} aria-label="Close maximized chart" className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Minimize2 className="size-4" /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
              {displayData
                ? <div className="mx-auto w-full max-w-[min(88vh,1000px)] [&>div]:!max-w-none [&>svg]:!max-w-none"><SvgChart style={chartStyle} ascendant={displayData.ascendant} planets={displayData.planets} points={displayData.points} houseCusps={displayData.houseCusps} varga={1} referenceHouse={referenceHouseNumber} overlay={chartMode === "birth" && overlayTransits ? transitData?.planets : undefined} language={language} preferences={viewPreferences} /></div>
                : <div className="grid min-h-[50vh] place-items-center text-sm text-slate-600">{displayLoading ? "Calculating chart…" : "Chart is unavailable."}</div>}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"><span>{chartStyle === "placidus" ? "Placidus · Ascendant at 9 o’clock · MC above IC" : `${chartStyle} · D1 Rasi`}</span><span>{chartMode === "transit" ? "Current transit placements" : overlayTransits ? "Cyan placements are current transits" : "Birth chart placements"}</span></div>
          </section>
        </div>
      )}
    </div>
  );
}

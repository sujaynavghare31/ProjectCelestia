"use client";

import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Activity,
  AlertCircle,
  ArrowDownUp,
  ArrowRight,
  ChevronDown,
  Clock3,
  Compass,
  Crosshair,
  Globe2,
  Info,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Orbit,
  Save,
  X,
} from "lucide-react";
import type { CarterZodiac, ChartSettings, ChartStyle, CelestialLanguage, CuspSystem, EphemerisResponse, HouseSystem, MidpointPreferences, PlanetPosition, ViewPreferences } from "@/lib/kundali-types";
import PlacidusWheel from "@/components/PlacidusWheel";
import ChartControls, { CoreCalculationControls } from "@/components/ChartControls";
import { getBirthDateTimeDefaults, getCurrentBirthDateTime, useKundaliStore, type BirthProfile } from "@/lib/kundali-store";
import { PROFILE_DRAFT_STORAGE_KEY } from "@/lib/astrology/profile-draft";
import { formatPlanetDegree, planetChartDisplayName, planetName, signName } from "@/lib/astrology/localization";
import { splitHouseBodies } from "@/lib/astrology/chart-layout";
import { dagdhaRashis } from "@/lib/astrology/dagdha-rashi";
import { getBirthDateTimeError } from "@/lib/astrology/ephemeris-input";
import { readSavedAstrologyConfig } from "@/lib/astrology/config-storage";
import { calculateCarterCusps, getCarterPlacementCusps, placeInCarterHouses } from "@/lib/astrology/carter-chart";
import { CUSP_SIGNS, cuspLabels, northCuspAnchor } from "@/lib/astrology/cusp-labels";
import { calculateArudhaPadas, type ArudhaPada } from "@/lib/astrology/arudha-padas";
import { calculateKharaPoints } from "@/lib/astrology/khara-points";
import { buildChartViewModel } from "@/src/lib/chart/bhava";
import { DEFAULT_PLACE, formatPlaceLabel, type Place } from "@/src/lib/geocode/place";
import dynamic from "next/dynamic";
import { readAnalysisPreferences, writeAnalysisPreferences } from "@/lib/astrology/analysis-preferences";
import { createMidpointReport, visibleMidpointRows, visibleMidpointTrees } from "@/lib/astrology/midpoint-chart";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import EphemerisLoader from "@/components/dashboard-tabs/ephemeris-loader";
import CelestiaLoader from "@/components/ui/CelestiaLoader";
import JamakkolTab from "@/components/dashboard-tabs/jamakkol-tab";
import {
  clearCachedSavedProfiles,
  consumeSelectedSavedProfileHandoff,
  fetchSavedProfiles,
  getCachedSavedProfiles,
  updateCachedSavedProfile,
  type SavedProfile,
} from "@/lib/saved-profiles-cache";

const ChartSettingsDrawer = dynamic(
  () => import("@/components/kundali-dashboard-dialogs").then((module) => module.ChartSettingsDrawer),
  { loading: () => <CelestiaLoader label="Loading Chart Settings…" compact tone="dashboard" /> },
);
const PlaceSearch = dynamic(() => import("@/src/components/place/PlaceSearch"), {
  loading: () => (
    <div className="min-w-0">
      <span className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Birth city</span>
      <div className="h-11 animate-pulse rounded-lg border border-input bg-muted/40 xl:h-9" aria-hidden="true" />
    </div>
  ),
});
const SaveChartDialog = dynamic(
  () => import("@/components/kundali-dashboard-dialogs").then((module) => module.SaveChartDialog),
  { loading: () => <CelestiaLoader label="Loading saved chart form…" compact tone="dashboard" /> },
);
const DashaTab = dynamic(() => import("@/components/dashboard-tabs/DashaDashboard"), {
  loading: () => <CelestiaLoader label="Preparing Dasha Systems…" sublabel="Loading planetary period calculations…" tone="dashboard" />,
});
const AspectsTab = dynamic(() => import("@/components/dashboard-tabs/aspects-tab"), {
  loading: () => <CelestiaLoader label="Mapping Drishti & Aspects…" sublabel="Preparing planetary aspect analysis…" tone="dashboard" />,
});
const AshtakavargaTab = dynamic(() => import("@/components/dashboard-tabs/ashtakavarga-tab"), {
  loading: () => <CelestiaLoader label="Calculating Ashtakavarga…" sublabel="Loading bindu tables and strengths…" tone="dashboard" />,
});
const StrengthAnalysisTab = dynamic(() => import("@/components/dashboard-tabs/strength-analysis-tab"), {
  loading: () => <CelestiaLoader label="Calculating planetary strength…" sublabel="Preparing Shadbala and Bhavabala tables…" tone="dashboard" />,
});
const MedicalTab = dynamic(() => import("@/components/dashboard-tabs/medical-tab"), {
  loading: () => <CelestiaLoader label="Preparing Medical Astrology…" sublabel="Loading chart indicators…" tone="dashboard" />,
});
const TransitCalendarTab = dynamic(() => import("@/components/dashboard-tabs/transit-calendar-tab"), {
  loading: () => <CelestiaLoader label="Loading Transit Calendar…" sublabel="Preparing planetary transit windows…" tone="calendar" />,
});
const MidpointsTab = dynamic(() => import("@/components/dashboard-tabs/midpoints-tab"), {
  loading: () => <CelestiaLoader label="Computing Midpoints…" sublabel="Mapping midpoint activations…" tone="dashboard" />,
});
const ShodashvargaTab = dynamic(() => import("@/components/dashboard-tabs/shodashvarga-tab"), {
  loading: () => <CelestiaLoader label="Preparing 16 Divisional Charts…" sublabel="Loading the Shodashvarga views…" tone="dashboard" />,
});
const CarterCuspsPanel = dynamic(() => import("@/components/dashboard-tabs/carter-cusps-panel"), {
  loading: () => <CelestiaLoader label="Preparing Carter Cusps…" sublabel="Loading house cusp analysis…" compact tone="dashboard" />,
});
const JaiminiDashboard = dynamic(() => import("@/src/components/jaimini/JaiminiDashboard"), {
  loading: () => <CelestiaLoader label="Computing Jaimini Karakas…" sublabel="Preparing Chara Dasha analysis…" tone="dashboard" />,
});
const RetainedTab = memo(
  function RetainedTab({ active, children }: { active: boolean; children: ReactNode }) {
    return <div hidden={!active}>{children}</div>;
  },
  (previous, next) => !previous.active && !next.active,
);

const DIVISIONAL_CHARTS = {
  2: { name: "Hora", significance: "Wealth & Sustenance" },
  3: { name: "Drekkana", significance: "Siblings & Courage" },
  4: { name: "Chaturthamsha", significance: "Fortune, Real Estate & Comforts" },
  5: { name: "Panchamsha", significance: "Power & Authority" },
  6: { name: "Shashthamsha", significance: "Health & Enmities" },
  7: { name: "Saptamsha", significance: "Children & Progeny" },
  8: { name: "Ashtamsha", significance: "Unexpected Troubles & Longevity" },
  9: { name: "Navamsha", significance: "Marriage, Partnerships & Inner Self" },
  10: { name: "Dashamsha", significance: "Career, Profession & Status" },
  11: { name: "Rudramsha", significance: "Triumphs & Spiritual Battles" },
  12: { name: "Dwadashamsha", significance: "Parents & Ancestry" },
  16: { name: "Shodashamsha", significance: "Vehicles & Luxuries" },
  20: { name: "Vimshamsha", significance: "Spiritual Progress & Devotion" },
  24: { name: "Chaturvimshamsha", significance: "Education, Learning & Intellect" },
  27: { name: "Saptavimshamsha", significance: "Strengths & Weaknesses" },
  30: { name: "Trimshamsha", significance: "Misfortunes, Diseases & Hidden Enemies" },
  40: { name: "Khavedamsha", significance: "Auspicious/Inauspicious Effects" },
  45: { name: "Akshavedamsha", significance: "Paternal/Maternal Legacy" },
  60: { name: "Shashtiamsha", significance: "Past Life Karma" },
} as const;
type ChartOption = {
  id: string;
  label: string;
  description: string;
  group: "Primary" | "Divisional";
};

const KPAstrology = dynamic(() => import("@/components/kp/KpTab"), {
  loading: () => (
    <CelestiaLoader label="Computing KP Sub-Lords…" sublabel="Preparing Krishnamurti chart analysis…" tone="dashboard" />
  ),
});
const AUXILIARY_CHARTS: ChartOption[] = [
  { id: "D1", label: "D1 · Rashi", description: "Primary Birth Chart", group: "Primary" },
  { id: "BHAVA", label: "Bhava Chalit", description: "House Positions (Sripati/Placidus)", group: "Primary" },
  { id: "D2", label: "D2 · Hora", description: "Wealth & Sustenance", group: "Divisional" },
  { id: "D3", label: "D3 · Drekkana", description: "Siblings & Courage", group: "Divisional" },
  { id: "D4", label: "D4 · Chaturthamsha", description: "Fortune, Real Estate & Comforts", group: "Divisional" },
  { id: "D5", label: "D5 · Panchamsha", description: "Power & Authority", group: "Divisional" },
  { id: "D6", label: "D6 · Shashthamsha", description: "Health & Enmities", group: "Divisional" },
  { id: "D7", label: "D7 · Saptamsha", description: "Children & Progeny", group: "Divisional" },
  { id: "D8", label: "D8 · Ashtamsha", description: "Unexpected Troubles & Longevity", group: "Divisional" },
  { id: "D9", label: "D9 · Navamsha", description: "Marriage, Partnerships & Inner Self", group: "Divisional" },
  { id: "D10", label: "D10 · Dashamsha", description: "Career, Profession & Status", group: "Divisional" },
  { id: "D11", label: "D11 · Rudramsha", description: "Triumphs & Spiritual Battles", group: "Divisional" },
  { id: "D12", label: "D12 · Dwadashamsha", description: "Parents & Ancestry", group: "Divisional" },
  { id: "D16", label: "D16 · Shodashamsha", description: "Vehicles & Luxuries", group: "Divisional" },
  { id: "D20", label: "D20 · Vimshamsha", description: "Spiritual Progress & Devotion", group: "Divisional" },
  { id: "D24", label: "D24 · Chaturvimshamsha", description: "Education, Learning & Intellect", group: "Divisional" },
  { id: "D27", label: "D27 · Saptavimshamsha", description: "Strengths & Weaknesses", group: "Divisional" },
  { id: "D30", label: "D30 · Trimshamsha", description: "Misfortunes, Diseases & Hidden Enemies", group: "Divisional" },
  { id: "D40", label: "D40 · Khavedamsha", description: "Auspicious & Inauspicious Effects", group: "Divisional" },
  { id: "D45", label: "D45 · Akshavedamsha", description: "Paternal & Maternal Legacy", group: "Divisional" },
  { id: "D60", label: "D60 · Shashtiamsha", description: "Past Life Karma", group: "Divisional" },
];
const SHODASHVARGA_IDS = new Set(["D1", "D2", "D3", "D4", "D7", "D9", "D10", "D12", "D16", "D20", "D24", "D27", "D30", "D40", "D45", "D60"]);
const SHODASHVARGA_CHARTS = AUXILIARY_CHARTS.filter((chart) => SHODASHVARGA_IDS.has(chart.id));
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
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

function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

function planetAtLongitude(position: PlanetPosition, longitude: number): PlanetPosition {
  const normalized = normalizeDegrees(longitude);
  const sign = Math.floor(normalized / 30);
  return {
    ...position,
    longitude: normalized,
    sign,
    signName: CUSP_SIGNS[sign],
    degree: normalized - sign * 30,
  };
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
  const name = planetChartDisplayName(planet.name, language, useIcons, PLANET_GLYPHS[planet.name] ?? planet.symbol, planet.name);
  return `${name} - ${formatPlanetDegree(planet.degree)}`;
}

function signDisplay(sign: number, language: CelestialLanguage, useIcons: boolean) {
  return useIcons ? SIGN_GLYPHS[sign] : signName(SIGNS[sign], language);
}

function chartSignDisplay(sign: number, language: CelestialLanguage, preferences: ViewPreferences) {
  if (!preferences.showSignNumbers) return signDisplay(sign, language, preferences.useSignIcons);
  return preferences.useSignIcons ? `${SIGN_GLYPHS[sign]} ${sign + 1}` : String(sign + 1);
}

function signFillClass(sign: number) {
  const classes = [
    "fill-rose-50/70 dark:fill-rose-950/25",
    "fill-amber-50/80 dark:fill-amber-950/25",
    "fill-sky-50/80 dark:fill-sky-950/25",
    "fill-cyan-50/75 dark:fill-cyan-950/25",
  ];
  return classes[sign % 4];
}

function signHtmlFillClass(sign: number) {
  const classes = [
    "bg-rose-50/90 dark:bg-rose-950/30",
    "bg-amber-50/90 dark:bg-amber-950/25",
    "bg-sky-50/90 dark:bg-sky-950/25",
    "bg-cyan-50/90 dark:bg-cyan-950/25",
  ];
  return classes[sign % 4];
}

function signSvgFill(sign: number) {
  const colors = ["#fff1f2", "#fffbeb", "#e0f2fe", "#ecfeff"];
  return colors[sign % 4];
}

function formatBirthDate(date: string) {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
}

function formatBtrTime(time: string) {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  if (![hours, minutes, seconds].every(Number.isFinite)) return "—";
  const hour12 = hours % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

function AvasthaValue({ prefix, value, title }: { prefix: string; value: string; title: string }) {
  return (
    <span title={title} className="inline-flex items-baseline gap-1.5 rounded bg-muted/70 px-1.5 py-0.5">
      <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{prefix}</span>
      <span className="text-[10px] font-medium text-slate-800 dark:text-slate-200">{value}</span>
    </span>
  );
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

function PanchangStrip({ date, planets, houseSystem }: { date: string; planets: PlanetPosition[]; houseSystem: HouseSystem }) {
  const panchang = getPanchang(date, planets);
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`) : null;
  const formattedDate = parsedDate && !Number.isNaN(parsedDate.getTime())
    ? parsedDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : formatBirthDate(date);
  const houseSystemCaption = houseSystem === "carter" ? "Carter houses" : "Placidus houses";
  const items = panchang ? [
    { label: "Weekday", value: panchang.weekday },
    { label: "Tithi", value: panchang.tithi },
    { label: "Nakshatra", value: panchang.nakshatra },
    { label: "Yoga", value: panchang.yoga },
    { label: "Karana", value: panchang.karana },
  ] : [];
  return (
    <>
      <section aria-label="Panchang" className="hidden rounded-2xl border border-stone-200/80 bg-white px-5 py-3.5 text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.04)] md:block">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Panchang</p>
          <div className="flex flex-wrap items-center justify-end gap-x-2 text-xs font-medium text-slate-500">
            <span>{formattedDate}</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span>{houseSystemCaption}</span>
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-5 gap-2.5">
          {items.length ? items.map((item) => (
            <div key={item.label} className="min-w-0 rounded-xl border border-stone-200/60 bg-[#FAF8F5] px-3.5 py-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-500">{item.label}</p>
              <p className="mt-0.5 break-words text-[15px] font-bold leading-snug text-slate-900">{item.value}</p>
            </div>
          )) : (
            <p className="col-span-5 rounded-xl border border-stone-200/60 bg-[#FAF8F5] px-3.5 py-2.5 text-sm font-medium text-slate-500">Waiting for planetary positions…</p>
          )}
        </div>
      </section>
      <section aria-label="Panchang" className="col-span-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-[hsl(var(--foreground))] shadow-sm md:hidden xl:col-span-2">
        <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--foreground))]">Panchang</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{formatBirthDate(date)}</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {items.length ? items.map((item) => (
            <div key={item.label} className="min-w-0 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{item.label}</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-[hsl(var(--foreground))]" title={item.value}>{item.value}</p>
            </div>
          )) : <p className="col-span-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-2 text-xs text-[hsl(var(--muted-foreground))] sm:col-span-5">Waiting for planetary positions…</p>}
        </div>
      </section>
    </>
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
    const isOddZodiacSign = sign % 2 === 0;
    if (isOddZodiacSign) return segment === 0 ? 4 : 3;
    return segment === 0 ? 3 : 4;
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

function getReferenceHouse(reference: string, planets: PlanetPosition[] = []) {
  if (reference === "Ascendant") return 1;
  const referencePlanet = planets.find((planet) => planet.name === reference);
  if (referencePlanet) return referencePlanet.house;
  const houseNumber = reference.startsWith("house:") ? Number(reference.slice("house:".length)) : Number.NaN;
  return Number.isInteger(houseNumber) && houseNumber >= 1 && houseNumber <= 12 ? houseNumber : 1;
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

function arudhaPadaLabels(padas: ArudhaPada[], signIndex: number) {
  return padas.filter((pada) => pada.signIndex === signIndex);
}

type HouseOverflowGroup = {
  house: number;
  sign: number;
  bodies: Array<PlanetPosition & { isTransit?: boolean }>;
};

function ChartOverflowFrame({
  children,
  overflow,
  language,
  usePlanetIcons,
  onBodyEnter,
  onBodyLeave,
  arudhaPadas,
}: {
  children: React.ReactNode;
  overflow: HouseOverflowGroup[];
  language: CelestialLanguage;
  usePlanetIcons: boolean;
  onBodyEnter: (body: PlanetPosition) => void;
  onBodyLeave: () => void;
  arudhaPadas: ArudhaPada[];
}) {
  return (
    <div className="relative flex w-full flex-col">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl">
        {children}
      </div>
      {overflow.length > 0 && (
        <div role="group" aria-label="Bodies outside crowded houses" className="shrink-0 border-t border-border/70 bg-muted/10 px-1.5 py-1.5">
          <p className="mb-1 text-[9px] font-medium text-muted-foreground">Outside crowded houses</p>
          <div className="grid grid-cols-3 gap-1">
            {overflow.map(({ house, sign, bodies }) => (
              <div key={house} className="flex min-w-0 flex-wrap items-center gap-x-1 rounded bg-background/70 px-1 py-0.5 text-[9px]">
                <span className="shrink-0 font-semibold text-muted-foreground">H{house}</span>
                <ArrowRight aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
                {bodies.map((body) => {
                  const name = planetChartDisplayName(
                    body.name,
                    language,
                    usePlanetIcons,
                    PLANET_GLYPHS[body.name] ?? body.symbol,
                    body.name,
                  );
                  return (
                    <span
                      key={`${body.id}-${body.isTransit ? "transit" : "natal"}`}
                      title={`${body.name} · ${formatPlanetDegree(body.degree)}`}
                      aria-label={`${body.name} outside house ${house}`}
                      tabIndex={0}
                      onMouseEnter={() => onBodyEnter(body)}
                      onMouseLeave={onBodyLeave}
                      onFocus={() => onBodyEnter(body)}
                      onBlur={onBodyLeave}
                      className="shrink-0 whitespace-nowrap font-semibold text-foreground outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      {body.isTransit ? "T " : ""}{name}
                    </span>
                  );
                })}
                {arudhaPadas.length > 0 && (
                  <span className="ml-1 whitespace-nowrap font-semibold text-[#C05A3A] dark:text-amber-300">
                    {arudhaPadaLabels(arudhaPadas, sign).map((pada) => `${pada.label === "AL" || pada.label === "UL" ? `${pada.label}` : pada.label}`).join(" · ")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SvgChartComponent({
  style,
  ascendant,
  planets,
  varga,
  houseBasedPlacement = false,
  referenceHouse = 1,
  overlay,
  points = [],
  houseCusps = [],
  language = "en",
  showTransitLabels = false,
  preferences = { showHouseLabels: true, showOuterPlanets: true, showAsteroids: false, showUpagrahas: false, showFortune: true, usePlanetIcons: false, useSignIcons: false, showEqualHouses: false, showSignDivisions: true, showSignNumbers: true, showBhavaCusps: false, showArudhaPadas: false, arudhaPadaMode: "all" as const, cuspLabelSignStyle: "short", cuspLabelDegreeFormat: "dms", cuspLabelStyle: "line" },
}: {
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
  showTransitLabels?: boolean;
  preferences?: ViewPreferences;
}) {
  const hoveredPlanet = useKundaliStore((state) => state.hoveredPlanet);
  const setHoveredPlanet = useKundaliStore((state) => state.setHoveredPlanet);
  const ascSign = normalizeSign(getVargaSign(ascendant, varga) + referenceHouse - 1);
  const visiblePlanets = planets.filter((planet) => chartPlanetVisible(planet, preferences));
  const visiblePoints = points.filter((planet) => chartPointVisible(planet, preferences));
  const hasTwelveCusps = houseCusps.length === 12
    && houseCusps.every(({ longitude }) => Number.isFinite(longitude));
  const bhavaPlacement = varga === 1 && hasTwelveCusps && (
    houseBasedPlacement || style === "bhava" || (style === "diamond" && preferences.showBhavaCusps)
  );
  const sourceBodies = [
    ...[ascendant, ...visiblePlanets, ...visiblePoints].map((planet) => ({
      ...planet,
      isTransit: showTransitLabels && planet.name !== "Ascendant",
    })),
    ...(overlay ?? []).filter((planet) => chartPlanetVisible(planet, preferences)).map((planet) => ({
      ...planet,
      id: `transit-${planet.id}`,
      isTransit: true,
    })),
  ];
  const chartViewModel = buildChartViewModel(
    sourceBodies.map((planet) => ({
      ...planet,
      longitude: planet.longitude,
      signIndex: getVargaSign(planet, varga),
      wholeSignHouse: houseBasedPlacement && varga === 1
        ? normalizeSign(planet.house - referenceHouse) + 1
        : getSignHouse(getVargaSign(planet, varga), ascSign),
      retrograde: planet.motion === "R",
    })),
    houseCusps.map(({ longitude }) => longitude),
    bhavaPlacement ? "bhava" : "rasi",
  );
  const chartBodies = chartViewModel.bodies.map(({ source, signIndex, house }) => ({
    ...source,
    chartSign: signIndex,
    chartHouse: house,
  }));
  const transitBodies = chartBodies.filter((body) => body.isTransit);
  const birthBodies = chartBodies.filter((body) => !body.isTransit);
  let arudhaPadas: ArudhaPada[] = [];
  if (preferences.showArudhaPadas) {
    try {
      arudhaPadas = calculateArudhaPadas({
        lagnaSign: ascSign,
        planets: [
          { name: "Ascendant", sign: ascSign },
          ...visiblePlanets.map((planet) => ({ name: planet.name, sign: getVargaSign(planet, varga) })),
          ...visiblePoints.map((point) => ({ name: point.name, sign: getVargaSign(point, varga) })),
        ],
      }).filter((pada) =>
        preferences.arudhaPadaMode === "all"
        || pada.label === "AL"
        || pada.label === "UL",
      );
    } catch {
      arudhaPadas = [];
    }
  }
  const spotlightActive = hoveredPlanet !== null;
  const isHighlighted = (body: PlanetPosition, vargottama: boolean) =>
    !spotlightActive || body.name === hoveredPlanet || (hoveredPlanet === "Vargottama" && vargottama);
  const onBodyEnter = (body: PlanetPosition) => setHoveredPlanet(body.name);
  const houses = Array.from({ length: 12 }, (_, index) => {
    const cusp = houseCusps.find((item) => item.house === index + 1);
    const sign = bhavaPlacement && cusp
      ? normalizeSign(Math.floor(cusp.longitude / 30))
      : normalizeSign(ascSign + index);
    return {
      house: index + 1,
      sign,
      bodies: birthBodies.filter((body) => body.chartHouse === index + 1),
    };
  });
  const houseBodyGroups = houses.map((house) => {
    const bodies = [...house.bodies, ...transitBodies.filter((body) => body.chartHouse === house.house)];
    if (bhavaPlacement && houseCusps.length === 12) {
      const start = houseCusps.find((cusp) => cusp.house === house.house)!.longitude;
      const distanceFromCusp = (body: PlanetPosition) => normalizeDegrees(body.longitude - start);
      bodies.sort((a, b) => distanceFromCusp(a) - distanceFromCusp(b));
    }
    return { house: house.house, ...splitHouseBodies(bodies) };
  });
  const overflowGroups: HouseOverflowGroup[] = houseBodyGroups.flatMap(({ house, overflow }) => (
    overflow.length > 0 ? [{ house, sign: houses[house - 1].sign, bodies: overflow }] : []
  ));
  const cuspLabelResult = useMemo(() => {
    if (varga !== 1 || houseCusps.length !== 12) return null;
    return cuspLabels(
      houseCusps.map((cusp) => cusp.longitude),
      {
        signStyle: preferences.cuspLabelSignStyle,
        degreeFormat: preferences.cuspLabelDegreeFormat,
        showHouseNumber: true,
      },
      ascendant.longitude,
    );
  }, [ascendant.longitude, houseCusps, preferences.cuspLabelDegreeFormat, preferences.cuspLabelSignStyle, preferences.cuspLabelStyle, varga]);

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
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-xl">
        <PlacidusWheel ascendant={ascendant} planets={planets} points={points} cusps={cusps} referenceHouse={referenceHouse} overlay={overlay} labelPlanetsAsTransit={showTransitLabels} language={language} preferences={preferences} />
      </div>
    );
  }

  if (style === "east") {
    const eastCells = [
      { house: 1, polygon: "10,10 123,10 123,123 10,123", x: 66, y: 66 },
      { house: 2, polygon: "123,10 237,10 237,123 123,123", x: 180, y: 66 },
      { house: 3, polygon: "237,10 350,10 350,123 237,123", x: 294, y: 66 },
      { house: 4, polygon: "237,123 350,123 350,237 237,237", x: 294, y: 180 },
      { house: 5, polygon: "237,237 350,237 350,350 237,350", x: 294, y: 294 },
      { house: 6, polygon: "123,237 237,237 237,350 123,350", x: 180, y: 294 },
      { house: 7, polygon: "10,237 123,237 123,350 10,350", x: 66, y: 294 },
      { house: 8, polygon: "10,123 123,123 123,237 10,237", x: 66, y: 180 },
      { house: 9, polygon: "123,123 237,123 180,180", x: 180, y: 142 },
      { house: 10, polygon: "237,123 237,237 180,180", x: 218, y: 180 },
      { house: 11, polygon: "237,237 123,237 180,180", x: 180, y: 218 },
      { house: 12, polygon: "123,237 123,123 180,180", x: 142, y: 180 },
    ];
    return (
      <ChartOverflowFrame overflow={overflowGroups} language={language} usePlanetIcons={preferences.usePlanetIcons} onBodyEnter={onBodyEnter} onBodyLeave={() => setHoveredPlanet(null)} arudhaPadas={arudhaPadas}>
      <svg viewBox="0 0 360 360" className="absolute inset-0 h-full w-full object-contain rounded-xl" role="img" aria-label={`${varga === 1 ? "D1" : `D${varga}`} East Indian chart`}>
        <rect x="10" y="10" width="340" height="340" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--chart-grid))" strokeWidth="1.5" />
        {eastCells.map(({ house: houseNumber, polygon, x, y }) => {
          const house = houses[houseNumber - 1];
          const contents = houseBodyGroups[houseNumber - 1].inline;
          return (
            <g key={house.house}>
              <polygon
                points={polygon}
                fill={signSvgFill(house.sign)}
                className="dark:opacity-40"
                stroke={house.house === 1 ? "#D97706" : "hsl(var(--chart-grid))"}
                strokeWidth={house.house === 1 ? "2" : "1"}
              />
              <text x={x} y={y - 10} fill="hsl(var(--foreground))" fontSize="8" fontWeight="600" textAnchor="middle">
                {bhavaPlacement
                  ? `${preferences.showHouseLabels ? `H${house.house} · ` : ""}${chartSignDisplay(house.sign, language, preferences)}`
                  : `${preferences.showHouseLabels ? `H${house.house} · ` : ""}${chartSignDisplay(house.sign, language, preferences)}`}
              </text>
              {preferences.showBhavaCusps && cuspLabelResult && cuspLabelResult.bySign[house.sign].cusps.map((cusp, cuspIndex) => (
                <text key={`cusp-${cusp.house}`} x={x} y={y + 3 + cuspIndex * 10} fill={cusp.shifted ? "hsl(var(--champagne-gold))" : "hsl(var(--foreground))"} fontSize="7" fontWeight="600" textAnchor="middle" opacity={preferences.cuspLabelStyle === "line" ? 0.9 : 1}>
                  {cusp.label}
                </text>
              ))}
              {contents.map((body, bodyIndex) => {
                const name = chartPlanetDisplay(body, language, preferences.usePlanetIcons);
                const bodyBaseline = y + bodyIndex * 11 + 4;
                const labelWidth = name.length * 4.2 + (body.isTransit ? 8 : 0) + (body.motion === "R" ? 5 : 0) + 4;
                const vargottama = body.name !== "Ascendant" && body.sign === getVargaSign(body, 9);
                return (
                  <g key={body.id} opacity={isHighlighted(body, vargottama) ? 1 : 0.4} filter={isHighlighted(body, vargottama) && hoveredPlanet !== null ? "drop-shadow(0 0 6px hsl(var(--foreground)))" : undefined} onMouseEnter={() => onBodyEnter(body)} onMouseLeave={() => setHoveredPlanet(null)}>
                    {body.motion === "R" && <title>Retrograde Motion</title>}
                    {vargottama && <rect x={x - labelWidth / 2} y={bodyBaseline - 9} width={labelWidth} height="11" rx="4" fill="none" stroke="#C05A3A" strokeWidth="1" />}
                    <text x={x} y={bodyBaseline} fill="hsl(var(--foreground))" fontSize={houseNumber >= 9 && houseNumber <= 12 ? "7" : "8"} fontWeight="600" textAnchor="middle" textLength={name.length > 10 ? "48" : undefined} lengthAdjust={name.length > 10 ? "spacingAndGlyphs" : undefined}>
                      {body.isTransit ? "T " : ""}{name}{body.motion === "R" && <tspan fill="hsl(var(--foreground))" fontSize="8" fontWeight="800" dy="-3">ᴿ</tspan>}
                    </text>
                  </g>
                );
              })}
              {arudhaPadas.length > 0 && (
                <text x={x} y={y + 54} fill="#C05A3A" fontSize="9" fontWeight="500" textAnchor="middle">
                  {arudhaPadaLabels(arudhaPadas, house.sign).map((pada) => (
                    <tspan key={pada.label} fontWeight={pada.label === "AL" || pada.label === "UL" ? "700" : "500"} dx="2">{pada.label}</tspan>
                  ))}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      </ChartOverflowFrame>
    );
  }

  if (style === "south") {
    const signOrder = [11, 0, 1, 2, 10, -1, -1, 3, 9, -1, -1, 4, 8, 7, 6, 5];
    return (
      <ChartOverflowFrame overflow={overflowGroups} language={language} usePlanetIcons={preferences.usePlanetIcons} onBodyEnter={onBodyEnter} onBodyLeave={() => setHoveredPlanet(null)} arudhaPadas={arudhaPadas}>
      <div className="absolute inset-0 grid h-full w-full grid-cols-4 grid-rows-4 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        {signOrder.map((sign, index) => {
          if (sign < 0) return <div key={`empty-${index}`} className="border border-border bg-muted dark:bg-muted/60" />;
          const signHouse = getSignHouse(sign, ascSign);
          const bodies = [
            ...birthBodies.filter((body) => body.chartSign === sign),
            ...transitBodies.filter((body) => body.chartSign === sign),
          ];
          return (
            <div key={sign} className={`flex min-w-0 flex-col items-center justify-center gap-1 border border-slate-200 p-1 text-center dark:border-slate-700 ${signHtmlFillClass(sign)} ${signHouse === 1 ? "ring-2 ring-inset ring-amber-400/70" : ""}`}>
              <span className="text-xs text-foreground">{chartSignDisplay(sign, language, preferences)}{preferences.showHouseLabels ? ` · H${signHouse}` : ""}</span>
              {preferences.showBhavaCusps && cuspLabelResult && cuspLabelResult.bySign[sign].cusps.length > 0 && (
                <span className="flex flex-wrap justify-center gap-1">
                  {cuspLabelResult.bySign[sign].cusps.map((cusp) => (
                    <span key={`cusp-${cusp.house}`} title={`House ${cusp.house} starts in ${cusp.sign}`} className={`rounded px-1 text-[9px] font-semibold leading-4 ${preferences.cuspLabelStyle === "line" ? "bg-yellow-300/90 text-slate-900" : cusp.shifted ? "text-amber-700 dark:text-amber-300" : "text-foreground"}`}>
                      {cusp.label}
                    </span>
                  ))}
                </span>
              )}
              <span className="flex flex-wrap justify-center gap-1 text-[11px] leading-4">
                {bodies.map((body) => {
                  const name = chartPlanetDisplay(body, language, preferences.usePlanetIcons);
                  const vargottama = body.name !== "Ascendant" && body.sign === getVargaSign(body, 9);
                  const superscript = ["", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹", "¹⁰", "¹¹", "¹²"][body.chartHouse] ?? "";
                  const bodyLabel = `${name}${bhavaPlacement ? superscript : ""}`;
                  return (
                    <span key={body.id} title={`${body.name}${body.name === "Ascendant" && bhavaPlacement && body.chartHouse !== 1 ? " · Ascendant falls before cusp 1 in this house system" : ""}`} className={`inline-flex items-center gap-0.5 whitespace-nowrap font-semibold text-foreground ${vargottama ? "rounded-full border border-[#C05A3A] px-1" : ""}`}>
                      {body.isTransit ? "T " : ""}{bodyLabel}{body.motion === "R" && <span className="font-bold text-foreground">R</span>}
                    </span>
                  );
                })}
              </span>
              {arudhaPadas.length > 0 && (
                <span className="flex flex-wrap justify-center gap-1 text-[9px] font-medium leading-3 text-[#C05A3A] dark:text-amber-300">
                  {arudhaPadaLabels(arudhaPadas, sign).map((pada) => (
                    <span key={pada.label} className={pada.label === "AL" || pada.label === "UL" ? "font-bold" : ""}>{pada.label}</span>
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
      </ChartOverflowFrame>
    );
  }

  const centers: Record<number, [number, number]> = {
    1: [180, 78], 2: [88, 42], 3: [42, 90], 4: [84, 180], 5: [42, 270], 6: [88, 318],
    7: [180, 282], 8: [262, 318], 9: [318, 270], 10: [265, 180], 11: [318, 90], 12: [272, 42],
  };
  return (
    <ChartOverflowFrame overflow={overflowGroups} language={language} usePlanetIcons={preferences.usePlanetIcons} onBodyEnter={onBodyEnter} onBodyLeave={() => setHoveredPlanet(null)} arudhaPadas={arudhaPadas}>
    <svg viewBox="0 0 360 360" className="absolute inset-0 h-full w-full object-contain rounded-xl" role="img" aria-label={`${varga === 1 ? "D1" : `D${varga}`} North Indian diamond chart`}>
      <rect x="10" y="10" width="340" height="340" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--chart-grid))" strokeWidth="1" />
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
        return <polygon key={`sign-fill-${house.house}`} points={polygonByHouse[house.house]} className={bhavaPlacement ? "fill-background" : signFillClass(house.sign)} />;
      })}
      <path d="M10 10 350 350M350 10 10 350M180 10 350 180 180 350 10 180 180 10" fill="none" stroke="hsl(var(--chart-grid))" strokeWidth="1" />
      {houses.map((house) => {
        const [x, y] = centers[house.house];
        const isAscHouse = house.house === 1;
        const inlineBodies = houseBodyGroups[house.house - 1].inline;
        const compactBottomBodies = y >= 300 && inlineBodies.length >= 3;
        const bodyLineHeight = y >= 270 ? 10 : 13;
        const bodyStartY = compactBottomBodies ? y - 3 : y + 10;
        return (
          <g key={house.house}>
            {style === "bhava" && preferences.showHouseLabels && (
              <text x={x} y={y - 25} fill="hsl(var(--muted-foreground))" fontSize="7" fontWeight="600" textAnchor="middle">H{house.house}</text>
            )}
            <text x={x} y={y - 15} fill="hsl(var(--foreground))" fontSize="9" textAnchor="middle">
              {bhavaPlacement
                ? `${preferences.showHouseLabels && style !== "bhava" ? `H${house.house} · ` : ""}${chartSignDisplay(house.sign, language, preferences).toUpperCase()}`
                : `${preferences.showHouseLabels ? isAscHouse ? "1ST HOUSE · " : `H${house.house} · ` : ""}${chartSignDisplay(house.sign, language, preferences).toUpperCase()}`}
            </text>
            {preferences.showBhavaCusps && preferences.cuspLabelStyle === "box" && cuspLabelResult && cuspLabelResult.boxes[house.house - 1].cusps.map((cusp, cuspIndex) => (
              <text key={`cusp-${cusp.house}`} x={x} y={y - 3 + cuspIndex * 9} fill={cusp.shifted ? "hsl(var(--champagne-gold))" : "hsl(var(--foreground))"} fontSize="7" fontWeight="600" textAnchor="middle">
                {cusp.label}
              </text>
            ))}
            {inlineBodies.map((body, index) => {
              const row = Math.floor(index / 1);
              const bodyColor = "hsl(var(--foreground))";
              const name = chartPlanetDisplay(body, language, preferences.usePlanetIcons);
              const bodyY = bodyStartY + row * bodyLineHeight;
              const vargottama = body.name !== "Ascendant" && body.sign === getVargaSign(body, 9);
              const estimatedLabelWidth = name.length * 5 + (body.isTransit ? 8 : 0) + (body.motion === "R" ? 5 : 0) + 4;
              const availableLabelWidth = Math.max(0, 2 * Math.min(x - 13, 347 - x));
              const labelWidth = Math.min(estimatedLabelWidth, availableLabelWidth);
              return (
                <g key={body.id} opacity={isHighlighted(body, vargottama) ? 1 : 0.4} filter={isHighlighted(body, vargottama) && hoveredPlanet !== null ? "drop-shadow(0 0 6px hsl(var(--foreground)))" : undefined} onMouseEnter={() => onBodyEnter(body)} onMouseLeave={() => setHoveredPlanet(null)}>
                  <title>{`${body.name} · ${formatPlanetDegree(body.degree)}${body.motion === "R" ? " · Retrograde" : ""}${vargottama ? " · Vargottama" : ""}${body.name === "Ascendant" && bhavaPlacement && body.chartHouse !== 1 ? " · Ascendant falls before cusp 1 in this house system" : ""}`}</title>
                  {vargottama && <rect x={x - labelWidth / 2} y={bodyY - 9} width={labelWidth} height="12" rx="4" fill="none" stroke="#C05A3A" strokeWidth="1" />}
                  <text
                    x={x}
                    y={bodyY}
                    fill={bodyColor}
                    fontSize={compactBottomBodies ? "8" : "10"}
                    fontWeight={body.name === "Ascendant" ? "700" : "600"}
                    textAnchor="middle"
                    textLength={estimatedLabelWidth > availableLabelWidth ? labelWidth : undefined}
                    lengthAdjust="spacingAndGlyphs"
                  >
                    {body.isTransit ? "T " : ""}{name}{body.motion === "R" && <tspan fill="hsl(var(--foreground))" fontSize="8" fontWeight="800" dy="-3">ᴿ</tspan>}
                  </text>
                  {body.name === "Ascendant" && bhavaPlacement && body.chartHouse !== 1 && (
                    <g transform={`translate(${x + 14} ${bodyY - 7})`}>
                      <title>Ascendant falls before cusp 1 in this house system</title>
                      <circle r="4" fill="hsl(var(--card))" stroke="hsl(var(--muted-foreground))" />
                      <text y="2.5" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="6" fontWeight="700">i</text>
                    </g>
                  )}
                </g>
              );
            })}
            {arudhaPadas.length > 0 && (
              <text
                x={x}
                y={y >= 300 ? 342 : y + 10 + inlineBodies.length * bodyLineHeight + 8}
                fill="#C05A3A"
                className="dark:fill-amber-300"
                fontSize="9"
                textAnchor="middle"
              >
                {arudhaPadaLabels(arudhaPadas, house.sign).map((pada, index) => (
                  <tspan key={pada.label} dx={index ? 3 : 0} fontWeight={pada.label === "AL" || pada.label === "UL" ? "700" : "500"}>{pada.label}</tspan>
                ))}
              </text>
            )}
          </g>
        );
      })}
      {preferences.showBhavaCusps && preferences.cuspLabelStyle === "line" && cuspLabelResult?.cusps.map((cusp) => {
        const anchor = northCuspAnchor(cusp);
        const x = anchor.x + 10;
        const y = anchor.y + 10;
        return (
          <g key={`cusp-line-${cusp.house}`}>
            <title>House {cusp.house} starts in {cusp.sign}</title>
            <line x1={anchor.tick[0][0] + 10} y1={anchor.tick[0][1] + 10} x2={anchor.tick[1][0] + 10} y2={anchor.tick[1][1] + 10} stroke="hsl(var(--champagne-gold))" strokeWidth="1.5" />
            <g transform={`translate(${x} ${y}) rotate(${anchor.angle})`}>
              <text x="0" y="3" fill="hsl(var(--foreground))" stroke="hsl(var(--card))" strokeWidth="3" paintOrder="stroke" fontSize="7" fontWeight="700" textAnchor="middle" fontFamily="Segoe UI Symbol, Noto Sans Symbols 2, DejaVu Sans, sans-serif">{cusp.label}</text>
            </g>
          </g>
        );
      })}
    </svg>
    </ChartOverflowFrame>
  );
}

export const SvgChart = memo(SvgChartComponent);

function DegreeValue({ position, decimal }: { position: PlanetPosition; decimal: boolean }) {
  return <span className="font-mono tabular-nums">{decimal ? `${position.degree.toFixed(4)}°` : degreeToDms(position.degree)}</span>;
}

function dignityStyle(dignity: string) {
  if (["Own", "Friend", "Friendly", "Mitra", "Adhimitra", "Exalted", "Moolatrikona"].includes(dignity)) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300";
  if (["Enemy", "Debilitated", "Shatru", "Adhishatru"].includes(dignity)) return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300";
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
}

function motionStyle(motion: PlanetPosition["motion"]) {
  return motion === "R"
    ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
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

const PLANETARY_ROW_ZEBRA = [
  "bg-white dark:bg-card",
  "bg-[#FAF8F5] dark:bg-muted/20",
];

function PlanetTableComponent({
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
    <>
      <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[690px] text-left text-xs">
        <thead className="sticky top-0 bg-card text-xs uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
          <tr>{["Graha", "Jaimini karaka", "Sign", "Nakshatra", "Pada", "Longitude", "Motion", "Declination", "Dignity", "STATES (AVASTHAS)"].map((heading, index) => <th key={heading} className={`${index === 0 ? "sticky left-0 z-20 bg-card" : ""} ${[4, 5, 7].includes(index) ? "text-right font-mono tabular-nums" : ""} whitespace-nowrap px-1.5 py-2 font-medium`}>{heading}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
          {rows.map((position, index) => {
            const isAscendant = position.name === "Ascendant";
            const vargottama = position.name !== "Ascendant" && position.sign === getVargaSign(position, 9);
            const detailedAvastha = data.avasthaReport?.planets.find((report) => report.planet === position.name);
            const rowTone = PLANETARY_ROW_ZEBRA[index % PLANETARY_ROW_ZEBRA.length];
            return (
              <tr key={position.id} className={`${rowTone} text-slate-900 transition-colors hover:brightness-[0.98]`}>
                <td className={`sticky left-0 z-10 min-w-[108px] px-1.5 py-1.5 font-semibold ${rowTone}`}>
                  <span className="block whitespace-nowrap">{preferences.usePlanetIcons && <PlanetMark name={position.name} label={position.symbol} enabled />} {planetName(position.name, language, position.name)}</span>
                  {(detailedAvastha?.isCombust || vargottama) && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                      {detailedAvastha?.isCombust && <span title="Within its configured combustion orb from the Sun." className="inline-flex rounded bg-accent px-1 py-0.5 text-[11px] font-medium leading-none text-accent-foreground">Combusted</span>}
                      {vargottama && <span title="Rasi and Navamsha signs are the same" className="inline-flex rounded bg-accent px-1 py-0.5 text-[11px] font-medium leading-none text-accent-foreground">Vargottama</span>}
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-1.5 py-1.5 font-semibold text-slate-800">{position.jaimini ? <abbr title={JAIMINI_KARAKA_NAMES[position.jaimini] ?? position.jaimini} className="no-underline">{JAIMINI_KARAKA_NAMES[position.jaimini] ?? position.jaimini}</abbr> : "—"}</td>
                <td className="px-1.5 py-1.5">
                  <div className="whitespace-nowrap">
                    {preferences.useSignIcons ? <SignMark sign={position.sign} label={signName(position.signName, language)} enabled /> : signName(position.signName, language)}
                  </div>
                  {(dagdhaSigns.includes(position.sign) || interceptedSigns.includes(position.sign)) && (
                    <div className="mt-1 flex flex-col items-start gap-0.5">
                      {dagdhaSigns.includes(position.sign) && <span title={`Dagdha Rashi for birth tithi ${tithiNumber}; common Muhurta convention.`} className="rounded bg-rose-100 px-1 py-0.5 text-[11px] font-semibold leading-none text-rose-800 dark:bg-rose-400/10 dark:text-rose-300">Dagdha Rashi</span>}
                      {interceptedSigns.includes(position.sign) && <span title={`${position.signName} is intercepted: it does not appear on any Placidus house cusp.`} className="rounded bg-accent px-1 py-0.5 text-[11px] font-semibold leading-none text-accent-foreground">Intercepted Sign</span>}
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-1.5 py-1.5">{position.nakshatraName}</td>
                <td className="px-1.5 py-1.5 text-right font-mono tabular-nums">{position.pada}</td>
                <td className="whitespace-nowrap px-1.5 py-1.5 text-right text-slate-700"><DegreeValue position={position} decimal={decimal} /></td>
                <td className="px-1.5 py-1.5">
                  {nodeType === "true" && (position.name === "Rahu" || position.name === "Ketu") && position.motion === "D"
                    ? <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${motionStyle(position.motion)}`}><span>Direct</span><span role="img" aria-label="Rahu/Ketu is in direct motion for this specific ephemeris calculation time." title="Rahu/Ketu is in direct motion for this specific ephemeris calculation time."><Info className="size-4" /></span></span>
                    : <span className={`inline-flex whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${motionStyle(position.motion)}`}>{position.motion === "R" ? "Retrograde" : "Direct"}</span>}
                </td>
                <td className={`whitespace-nowrap px-1.5 py-1.5 text-right font-mono text-slate-700 ${Math.abs(position.declination) > 23.45 ? "font-semibold text-[hsl(var(--retrograde-crimson))]" : ""}`} title={Math.abs(position.declination) > 23.45 ? "Out of Bounds (OOB) Declination" : undefined}>
                  {declinationToDms(position.declination)}{Math.abs(position.declination) > 23.45 && <span className="ml-1 rounded bg-rose-100 px-1 py-0.5 align-middle text-[9px] font-semibold tracking-normal text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">OOB</span>}
                </td>
                <td className="whitespace-nowrap px-1.5 py-1.5"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${dignityStyle(position.dignity)}`}>{position.dignity}</span></td>
                <td className="px-1.5 py-1.5">
                  {detailedAvastha ? (
                    <div className="flex min-w-36 flex-wrap gap-1 text-[10px] text-slate-600 dark:text-slate-400">
                      <AvasthaValue prefix="Bal" value={detailedAvastha.baladi.state} title={`Baladi: ${detailedAvastha.baladi.state}`} />
                      <AvasthaValue prefix="Jag" value={detailedAvastha.jagradadi.state} title={`Jagradadi: ${detailedAvastha.jagradadi.state}. ${detailedAvastha.jagradadi.reasons.join(" ")}`} />
                      {detailedAvastha.shayanadi && <AvasthaValue prefix="Sha" value={detailedAvastha.shayanadi.state} title={`Shayanadi: ${detailedAvastha.shayanadi.state}`} />}
                      {!!detailedAvastha.lajjitadi?.length && <AvasthaValue prefix="Laj" value={detailedAvastha.lajjitadi.map(({ state }) => state).join(", ")} title={`Lajjitadi: ${detailedAvastha.lajjitadi.map(({ state }) => state).join(", ")}`} />}
                    </div>
                  ) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <div className="min-w-0 md:hidden">
        <p className="px-3 pb-2 text-[11px] text-muted-foreground">Swipe horizontally to see all planetary details.</p>
        <div role="region" aria-label="Planetary positions; scroll horizontally to view all columns" tabIndex={0} className="overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="sticky top-0 z-20 bg-card text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                {["Graha", "Jaimini karaka", "Sign", "Nakshatra · Pada", "Longitude", "Motion", "Declination", "Dignity", "States (Avasthas)"].map((heading, index) => (
                  <th key={heading} className={`${index === 0 ? "sticky left-0 z-30 bg-card" : ""} ${[4, 6].includes(index) ? "text-right font-mono tabular-nums" : ""} whitespace-nowrap px-3 py-2 font-semibold`}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((position, index) => {
                const vargottama = position.name !== "Ascendant" && position.sign === getVargaSign(position, 9);
                const detailedAvastha = data.avasthaReport?.planets.find((report) => report.planet === position.name);
                const motionLabel = nodeType === "true" && (position.name === "Rahu" || position.name === "Ketu") && position.motion === "D"
                  ? "Direct"
                  : position.motion === "R" ? "Retrograde" : "Direct";
                const rowTone = PLANETARY_ROW_ZEBRA[index % PLANETARY_ROW_ZEBRA.length];

                return (
                  <tr key={position.id} className={`${rowTone} border-t border-slate-900/5 text-foreground transition-colors hover:brightness-[0.98]`}>
                    <th scope="row" className={`sticky left-0 z-10 min-w-[110px] whitespace-nowrap px-3 py-2 text-left font-semibold ${rowTone}`}>
                      {preferences.usePlanetIcons && <PlanetMark name={position.name} label={position.symbol} enabled />}
                      {planetName(position.name, language, position.name)}
                      {(detailedAvastha?.isCombust || vargottama) && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {detailedAvastha?.isCombust && <span className="rounded bg-white/80 px-1 py-0.5 text-[10px] font-medium text-slate-800">Combusted</span>}
                          {vargottama && <span className="rounded bg-white/80 px-1 py-0.5 text-[10px] font-medium text-slate-800">Vargottama</span>}
                        </span>
                      )}
                    </th>
                    <td className="whitespace-nowrap px-3 py-2 font-medium">{JAIMINI_KARAKA_NAMES[position.jaimini ?? ""] ?? position.jaimini ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {preferences.useSignIcons ? <SignMark sign={position.sign} label={signName(position.signName, language)} enabled /> : signName(position.signName, language)}
                      {(dagdhaSigns.includes(position.sign) || interceptedSigns.includes(position.sign)) && (
                        <span className="mt-1 flex gap-1">
                          {dagdhaSigns.includes(position.sign) && <span className="rounded bg-rose-100 px-1 py-0.5 text-[10px] font-semibold text-rose-800">Dagdha</span>}
                          {interceptedSigns.includes(position.sign) && <span className="rounded bg-white/80 px-1 py-0.5 text-[10px] font-semibold text-slate-800">Intercepted</span>}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{position.nakshatraName} · {position.pada}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-mono"><DegreeValue position={position} decimal={decimal} /></td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className={`inline-flex rounded px-2 py-0.5 font-medium ${motionStyle(position.motion)}`}>{motionLabel}</span>
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2 text-right font-mono ${Math.abs(position.declination) > 23.45 ? "font-semibold text-[hsl(var(--retrograde-crimson))]" : ""}`} title={Math.abs(position.declination) > 23.45 ? "Out of Bounds (OOB) Declination" : undefined}>
                      {declinationToDms(position.declination)}{Math.abs(position.declination) > 23.45 && <span className="ml-1 rounded bg-rose-100 px-1 py-0.5 align-middle text-[9px] font-semibold tracking-normal text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">OOB</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2"><span className={`inline-flex rounded-full px-2 py-0.5 font-medium ${dignityStyle(position.dignity)}`}>{position.dignity}</span></td>
                    <td className="min-w-[220px] px-3 py-2 text-slate-700">
                      {detailedAvastha ? (
                        <div className="flex flex-wrap gap-1">
                          <AvasthaValue prefix="Bal" value={detailedAvastha.baladi.state} title={`Baladi: ${detailedAvastha.baladi.state}`} />
                          <AvasthaValue prefix="Jag" value={detailedAvastha.jagradadi.state} title={`Jagradadi: ${detailedAvastha.jagradadi.state}. ${detailedAvastha.jagradadi.reasons.join(" ")}`} />
                          {detailedAvastha.shayanadi && <AvasthaValue prefix="Sha" value={detailedAvastha.shayanadi.state} title={`Shayanadi: ${detailedAvastha.shayanadi.state}`} />}
                          {!!detailedAvastha.lajjitadi?.length && <AvasthaValue prefix="Laj" value={detailedAvastha.lajjitadi.map(({ state }) => state).join(", ")} title={`Lajjitadi: ${detailedAvastha.lajjitadi.map(({ state }) => state).join(", ")}`} />}
                        </div>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const PlanetTable = memo(PlanetTableComponent);

type AuxiliaryType = "divisional" | "transit" | "solar" | "tajika" | "progressions";
type DashaSystem = "vimshottari" | "chara" | "ashtottari" | "yogini" | "kalachakra";
type DashaSeed = "moon" | "ascendant" | "sun" | "ascendant-lord";
type DashaLagnaMode = "natural" | "maha-lord" | "antar-lord";
type DashboardTab = "core" | "kp" | "jaimini" | "dasha" | "aspects" | "midpoints" | "ashtakavarga" | "medical" | "transit-calendar" | "jamakkol" | "shodashvarga";
type DashboardNavigationRequest = { tab: "core" | "jamakkol"; id: number };

// All existing astrology views remain available; strength modules are now grouped with Ashtakavarga.
const DASHBOARD_TABS: Array<{ id: DashboardTab; label: string }> = [
  { id: "core", label: "Core Dashboard" },
  { id: "shodashvarga", label: "16 Kundalis" },
  { id: "kp", label: "KP Astrology" },
  { id: "jaimini", label: "Jaimini" },
  { id: "dasha", label: "Dasha Systems" },
  { id: "aspects", label: "Drishti & Aspects" },
  { id: "midpoints", label: "Midpoints" },
  { id: "ashtakavarga", label: "Ashtakavarga & Strength" },
  { id: "medical", label: "Medical Astrology" },
  { id: "transit-calendar", label: "Transit Calendar" },
];
const midpointReportCache = new Map<string, ReturnType<typeof createMidpointReport>>();

function dashboardTabFromLocation(): DashboardTab {
  const value = new URLSearchParams(window.location.search).get("tab");
  return value === "jamakkol" || DASHBOARD_TABS.some(({ id }) => id === value) ? value as DashboardTab : "core";
}

function SecondaryTabSkeleton() {
  return (
    <CelestiaLoader label="Preparing astrology analysis…" sublabel="Loading the selected chart and calculations…" tone="dashboard" />
  );
}

const CONTROL_CLASS = "h-9 rounded-lg border border-input bg-card px-2.5 text-xs text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40";
const PANEL_CLASS = "min-w-0 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm md:rounded-2xl md:border-stone-200/80 md:shadow-[0_1px_3px_rgba(15,23,42,0.04)]";
type CuspCalculator = typeof import("@/src/lib/chart/cusps");
type KpCuspResponse = { key: string; data?: EphemerisResponse; error?: string; loading: boolean };
type BhavaChartCalculation = {
  data: EphemerisResponse;
  ascendant: PlanetPosition;
  houseCusps: EphemerisResponse["houseCusps"];
  error: string | null;
  warning: string | null;
};

const CUSP_SYSTEMS = ["placidus", "kp", "sripati", "equal", "carter"] as const satisfies readonly CuspSystem[];
const CUSP_SYSTEM_LABELS: Record<CuspSystem, string> = {
  placidus: "Placidus",
  kp: "KP (Krishnamurti)",
  sripati: "Sripati",
  equal: "Equal",
  carter: "Carter",
};

function isCuspSystem(value: string | null): value is CuspSystem {
  return value !== null && CUSP_SYSTEMS.includes(value as CuspSystem);
}

async function readProfileApiResponse<T>(response: Response): Promise<T> {
  try {
    return await response.json() as T;
  } catch {
    const message = response.status >= 500
      ? "Saved charts are temporarily unavailable. Please try again."
      : `The saved charts service returned an invalid response (${response.status}).`;
    throw new Error(message);
  }
}

function parseProfileDraft(value: string): BirthProfile | null {
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== "object" || parsed === null) return null;
  const draft = parsed as Record<string, unknown>;
  if (
    typeof draft.name !== "string"
    || (draft.sex !== "male" && draft.sex !== "female" && draft.sex !== "not-applicable")
    || typeof draft.date !== "string"
    || typeof draft.time !== "string"
    || typeof draft.lat !== "number"
    || typeof draft.lng !== "number"
    || typeof draft.timezone !== "string"
    || typeof draft.city !== "string"
    || typeof draft.notes !== "string"
    || getBirthDateTimeError(draft.date, draft.time)
  ) return null;

  return {
    id: typeof draft.id === "string" ? draft.id : "",
    name: draft.name,
    sex: draft.sex,
    date: draft.date,
    time: draft.time,
    lat: draft.lat,
    lng: draft.lng,
    timezone: draft.timezone,
    city: draft.city,
    notes: draft.notes,
  };
}

export function KundaliDashboard({
  navigationRequest,
  isSignedIn = false,
}: {
  navigationRequest?: DashboardNavigationRequest | null;
  isSignedIn?: boolean;
}) {
  const { userId: clerkUserId } = useAuth();
  const profile = useKundaliStore((state) => state.profile);
  const chartStyle = useKundaliStore((state) => state.chartStyle);
  const houseSystem = useKundaliStore((state) => state.houseSystem);
  const carterZodiac = useKundaliStore((state) => state.carterZodiac);
  const midpointPreferences = useKundaliStore((state) => state.midpointPreferences);
  const varga = useKundaliStore((state) => state.varga);
  const decimalDegrees = useKundaliStore((state) => state.decimalDegrees);
  const nodeType = useKundaliStore((state) => state.nodeType);
  const ayanamsa = useKundaliStore((state) => state.ayanamsa);
  const zodiacMode = useKundaliStore((state) => state.zodiacMode);
  const customAyanamsaDegrees = useKundaliStore((state) => state.customAyanamsaDegrees);
  const language = useKundaliStore((state) => state.language);
  const viewPreferences = useKundaliStore((state) => state.viewPreferences);
  const setHoveredPlanet = useKundaliStore((state) => state.setHoveredPlanet);
  const setProfile = useKundaliStore((state) => state.setProfile);
  const setChartStyle = useKundaliStore((state) => state.setChartStyle);
  const setHouseSystem = useKundaliStore((state) => state.setHouseSystem);
  const setCarterZodiac = useKundaliStore((state) => state.setCarterZodiac);
  const setMidpointPreferences = useKundaliStore((state) => state.setMidpointPreferences);
  const setVarga = useKundaliStore((state) => state.setVarga);
  const setDecimalDegrees = useKundaliStore((state) => state.setDecimalDegrees);
  const setNodeType = useKundaliStore((state) => state.setNodeType);
  const setChartSettings = useKundaliStore((state) => state.setChartSettings);
  const setViewPreference = useKundaliStore((state) => state.setViewPreference);
  const adjustTime = useKundaliStore((state) => state.adjustTime);
  const [data, setData] = useState<EphemerisResponse | null>(null);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>("core");
  const [selectedDashboardTab, setSelectedDashboardTab] = useState<DashboardTab>("core");
  const [visitedTabs, setVisitedTabs] = useState<Set<DashboardTab>>(() => new Set(["core"]));
  const [isTabTransitionPending, startTabTransition] = useTransition();
  const [submittedProfile, setSubmittedProfile] = useState<BirthProfile | null>(null);
  const [profileCollapsed, setProfileCollapsed] = useState(false);
  const [transitData, setTransitData] = useState<EphemerisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitLoading, setTransitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitError, setTransitError] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState("Ascendant");
  const [cuspSystem, setCuspSystem] = useState<CuspSystem>("placidus");
  const [cuspCalculator, setCuspCalculator] = useState<CuspCalculator | null>(null);
  const [cuspModuleError, setCuspModuleError] = useState<string | null>(null);
  const [kpCuspResult, setKpCuspResult] = useState<KpCuspResponse | null>(null);
  const [auxiliaryReferenceName, setAuxiliaryReferenceName] = useState("Ascendant");
  const [overlayTransits, setOverlayTransits] = useState(false);
  const [transitRefreshKey, setTransitRefreshKey] = useState(0);
  const [chartMaximized, setChartMaximized] = useState(false);
  const [chartSettingsOpen, setChartSettingsOpen] = useState(false);
  const closeChartSettings = useCallback(() => setChartSettingsOpen(false), []);
  const applyChartSettings = useCallback((settings: ChartSettings) => {
    setChartSettings({
      ...settings,
      ayanamsa: useKundaliStore.getState().ayanamsa,
    });
  }, [setChartSettings]);
  const [auxiliaryType, setAuxiliaryType] = useState<AuxiliaryType>("divisional");
  const [auxiliaryChartId, setAuxiliaryChartId] = useState(`D${varga}`);
  const [targetAge, setTargetAge] = useState(30);
  const [ageMode, setAgeMode] = useState<"completed" | "ongoing">("completed");
  const [nadiProgressions, setNadiProgressions] = useState(false);
  const [bhriguProgressions, setBhriguProgressions] = useState(false);
  const [dashaSystem, setDashaSystem] = useState<DashaSystem>("vimshottari");
  const [dashaSeed, setDashaSeed] = useState<DashaSeed>("moon");
  const [dashaLagnaMode, setDashaLagnaMode] = useState<DashaLagnaMode>("maha-lord");
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [chartMode, setChartMode] = useState<"transit" | "birth">("transit");
  const [btrOffsetSeconds, setBtrOffsetSeconds] = useState(0);
  const [transitDate, setTransitDate] = useState(() => getCurrentBirthDateTime().date);
  const [transitTime, setTransitTime] = useState(() => getCurrentBirthDateTime().time);
  const [transitMode, setTransitMode] = useState<"current" | "specific">("current");
  const [savedProfileId, setSavedProfileId] = useState<string | null>(null);
  const previousSavedProfilesUserId = useRef<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogMode, setSaveDialogMode] = useState<"update" | "copy">("update");
  const [saveDialogName, setSaveDialogName] = useState("");
  const [saveDialogError, setSaveDialogError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [saveJustCompleted, setSaveJustCompleted] = useState(false);
  const saveToastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [profileActionError, setProfileActionError] = useState<string | null>(null);
  const [profileActionMessage, setProfileActionMessage] = useState<string | null>(null);
  const [placeSelectionInvalid, setPlaceSelectionInvalid] = useState(false);
  const [analysisPreferencesLoaded, setAnalysisPreferencesLoaded] = useState(false);
  const cuspCalculatorPromise = useRef<Promise<CuspCalculator> | null>(null);
  const initialProfileSubmitted = useRef(false);
  const openedSavedProfileId = useRef<string | null>(null);
  const jaiminiAutoloadKey = useRef<string | null>(null);

  useEffect(() => () => {
    if (saveToastTimeout.current) clearTimeout(saveToastTimeout.current);
  }, []);
  const chartSettings = useMemo<ChartSettings>(() => ({
    zodiacMode,
    ayanamsa,
    customAyanamsaDegrees,
    houseSystem,
    carterZodiac,
    language,
    viewPreferences,
  }), [zodiacMode, ayanamsa, customAyanamsaDegrees, houseSystem, carterZodiac, language, viewPreferences]);

  const profilePlace = useMemo<Place>(() => {
    if (
      profile.city === "Mumbai"
      && Math.abs(profile.lat - DEFAULT_PLACE.latitude) < 0.001
      && Math.abs(profile.lng - DEFAULT_PLACE.longitude) < 0.001
      && profile.timezone === DEFAULT_PLACE.timezone
    ) return DEFAULT_PLACE;
    return {
      name: profile.city || "Custom coordinates",
      country: "",
      latitude: profile.lat,
      longitude: profile.lng,
      timezone: profile.timezone,
      source: "custom",
    };
  }, [profile.city, profile.lat, profile.lng, profile.timezone]);

  const handlePlaceChange = useCallback((place: Place) => {
    setProfile({
      city: formatPlaceLabel(place),
      lat: place.latitude,
      lng: place.longitude,
      timezone: place.timezone,
    });
    setPlaceSelectionInvalid(false);
    setProfileActionError(null);
  }, [setProfile]);

  const loadCuspCalculator = useCallback(async () => {
    if (!cuspCalculatorPromise.current) cuspCalculatorPromise.current = import("@/src/lib/chart/cusps");
    try {
      const calculator = await cuspCalculatorPromise.current;
      setCuspCalculator(calculator);
      setCuspModuleError(null);
    } catch (caught) {
      console.error("[kundali] Unable to load Bhava Cusps calculations.", caught);
      cuspCalculatorPromise.current = null;
      setCuspModuleError("Bhava Cusps calculations could not be loaded. Refresh the page and try again.");
    }
  }, []);

  const replaceChartUrl = useCallback((style: ChartStyle, system: CuspSystem) => {
    const url = new URL(window.location.href);
    if (style === "bhava") {
      url.searchParams.set("chart", "bhava");
      url.searchParams.set("cusps", system);
    } else {
      url.searchParams.delete("chart");
      url.searchParams.delete("cusps");
    }
    window.history.replaceState(null, "", url);
  }, []);

  const handleChartStyleChange = useCallback((nextStyle: ChartStyle) => {
    setChartStyle(nextStyle);
    if (nextStyle === "bhava") {
      setReferenceName("Ascendant");
      void loadCuspCalculator();
    }
    replaceChartUrl(nextStyle, cuspSystem);
  }, [cuspSystem, loadCuspCalculator, replaceChartUrl, setChartStyle]);

  const handleCuspSystemChange = useCallback((nextSystem: CuspSystem) => {
    setCuspSystem(nextSystem);
    replaceChartUrl(chartStyle, nextSystem);
  }, [chartStyle, replaceChartUrl]);

  useEffect(() => {
    const state = useKundaliStore.getState();
    const saved = readAnalysisPreferences({
      houseSystem: state.houseSystem,
      carterZodiac: state.carterZodiac,
      chartStyle: state.chartStyle,
      cuspSystem: "placidus",
      midpointPreferences: state.midpointPreferences,
      showArudhaPadas: state.viewPreferences.showArudhaPadas,
      arudhaPadaMode: state.viewPreferences.arudhaPadaMode,
    });
    if (saved) {
      setHouseSystem(saved.houseSystem);
      setCarterZodiac(saved.carterZodiac);
      setChartStyle(saved.chartStyle);
      setCuspSystem(saved.cuspSystem);
      setMidpointPreferences(saved.midpointPreferences);
      setViewPreference("showArudhaPadas", saved.showArudhaPadas);
      setViewPreference("arudhaPadaMode", saved.arudhaPadaMode);
    }
    setAnalysisPreferencesLoaded(true);
  }, [setChartStyle, setHouseSystem, setCarterZodiac, setMidpointPreferences, setViewPreference]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("chart") !== "bhava") return;
    setChartStyle("bhava");
    const requestedSystem = params.get("cusps");
    if (isCuspSystem(requestedSystem)) setCuspSystem(requestedSystem);
    setReferenceName("Ascendant");
    void loadCuspCalculator();
  }, [loadCuspCalculator, setChartStyle]);

  useEffect(() => {
    if (!analysisPreferencesLoaded) return;
    writeAnalysisPreferences({
      houseSystem,
      carterZodiac,
      chartStyle,
      cuspSystem,
      midpointPreferences,
      showArudhaPadas: viewPreferences.showArudhaPadas,
      arudhaPadaMode: viewPreferences.arudhaPadaMode,
    });
  }, [analysisPreferencesLoaded, houseSystem, carterZodiac, chartStyle, cuspSystem, midpointPreferences, viewPreferences.showArudhaPadas, viewPreferences.arudhaPadaMode]);

  useEffect(() => {
    if (chartStyle === "bhava") void loadCuspCalculator();
  }, [chartStyle, loadCuspCalculator]);

  useEffect(() => {
    const syncTab = () => {
      const nextTab = dashboardTabFromLocation();
      setSelectedDashboardTab(nextTab);
      setVisitedTabs((visited) => new Set(visited).add(nextTab));
      startTabTransition(() => setDashboardTab(nextTab));
    };
    syncTab();
    window.addEventListener("popstate", syncTab);
    return () => window.removeEventListener("popstate", syncTab);
  }, []);

  useEffect(() => {
    if (!navigationRequest) return;
    setSelectedDashboardTab(navigationRequest.tab);
    setVisitedTabs((visited) => new Set(visited).add(navigationRequest.tab));
    startTabTransition(() => setDashboardTab(navigationRequest.tab));
  }, [navigationRequest]);

  useEffect(() => {
    const defaults = getBirthDateTimeDefaults(profile);
    if (defaults) setProfile(defaults);
  }, [profile.date, profile.time, setProfile]);

  useEffect(() => {
    const chartId = new URLSearchParams(window.location.search).get("chartId");
    if (!chartId || !clerkUserId || openedSavedProfileId.current === chartId) return;

    let isMounted = true;
    const openSavedProfile = async () => {
      let savedProfile = consumeSelectedSavedProfileHandoff(clerkUserId, chartId)
        ?? getCachedSavedProfiles(clerkUserId)?.find(({ id }) => id === chartId)
        ?? null;

      if (!savedProfile) {
        const savedProfiles = await fetchSavedProfiles(clerkUserId);
        savedProfile = savedProfiles.find(({ id }) => id === chartId) ?? null;
      }
      if (!isMounted) return;
      if (!savedProfile) {
        setProfileActionError("That chart is no longer in your saved library. Choose another chart and try again.");
        return;
      }

      openedSavedProfileId.current = chartId;
      const birthProfile: BirthProfile = {
        id: savedProfile.id,
        name: savedProfile.chartName || savedProfile.fullName,
        sex: savedProfile.sex,
        date: savedProfile.dateOfBirth,
        time: savedProfile.timeOfBirth,
        lat: savedProfile.latitude,
        lng: savedProfile.longitude,
        timezone: savedProfile.timezone,
        city: savedProfile.city ?? "",
        notes: savedProfile.notes,
      };

      setProfile(birthProfile);
      setBtrOffsetSeconds(0);
      setSavedProfileId(savedProfile.id);
      initialProfileSubmitted.current = true;
      setSubmittedProfile({ ...birthProfile, name: birthProfile.name.trim() || "Birth chart" });
      setProfileCollapsed(true);
      setChartMode("birth");
      setProfileActionError(null);
      setProfileActionMessage(`Loaded ${birthProfile.name || "saved chart"}. Choose Update chart to save changes.`);

      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("chartId");
      window.history.replaceState(
        window.history.state,
        "",
        `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
      );
    };

    void openSavedProfile().catch((requestError: unknown) => {
      if (isMounted) {
        setProfileActionError(
          requestError instanceof Error ? requestError.message : "The saved chart could not be opened.",
        );
      }
    });

    return () => {
      isMounted = false;
    };
  }, [clerkUserId, setProfile]);

  useEffect(() => {
    let draft: BirthProfile | null = null;
    try {
      const value = window.sessionStorage.getItem(PROFILE_DRAFT_STORAGE_KEY);
      if (!value) return;
      draft = parseProfileDraft(value);
      if (!draft) throw new Error("Saved chart details are invalid.");
      window.sessionStorage.removeItem(PROFILE_DRAFT_STORAGE_KEY);
    } catch {
      setProfileActionError("Your chart details could not be restored. Please re-enter them before saving.");
      return;
    }

    setProfile(draft);
    setBtrOffsetSeconds(0);
    setSavedProfileId(draft.id || null);
    initialProfileSubmitted.current = true;
    setSubmittedProfile({ ...draft, name: draft.name.trim() || "Birth chart" });
    setProfileCollapsed(true);
    setChartMode("birth");
    setProfileActionMessage(draft.id
      ? `Loaded ${draft.name || "saved chart"}. Choose Update chart to save changes.`
      : "Your chart details were restored. Choose Save chart to add them to your account.");
  }, [setProfile]);

  useEffect(() => {
    if (initialProfileSubmitted.current || !profile.date || !profile.time || !profile.timezone) return;
    if (!Number.isFinite(profile.lat) || !Number.isFinite(profile.lng)) return;
    initialProfileSubmitted.current = true;
    const initialTransitProfile = {
      ...profile,
      name: "Current transit",
    };
    setProfile({ name: initialTransitProfile.name });
    setSubmittedProfile(initialTransitProfile);
    setChartMode("transit");
  }, [profile.date, profile.time, profile.lat, profile.lng, profile.timezone, profile.name, profile.sex, setProfile]);

  useEffect(() => {
    if (!notesExpanded) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotesExpanded(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notesExpanded]);

  useEffect(() => {
    const previousUserId = previousSavedProfilesUserId.current;
    if (previousUserId && previousUserId !== clerkUserId) {
      clearCachedSavedProfiles(previousUserId);
      setProfileActionError(null);
    }
    previousSavedProfilesUserId.current = clerkUserId ?? null;
  }, [clerkUserId, isSignedIn]);

  useEffect(() => {
    if (!submittedProfile?.date || !submittedProfile.time) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/ephemeris", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: submittedProfile.date,
            time: submittedProfile.time,
            lat: submittedProfile.lat,
            lng: submittedProfile.lng,
            timezone: submittedProfile.timezone,
            ayanamsa,
            zodiacMode,
            customAyanamsaDegrees,
            nodeType,
            dashaSeed: "moon",
            avasthaConfig: readSavedAstrologyConfig()?.avastha,
            nameFirstLetter: submittedProfile.name,
            gender: submittedProfile.sex,
            ...(auxiliaryType === "solar" || auxiliaryType === "tajika" ? { targetAge, ageMode } : {}),
          }),
        });
        const responseText = await response.text();
        if (!isMounted) return;
        let result: EphemerisResponse | { error: string };
        try {
          result = JSON.parse(responseText) as EphemerisResponse | { error: string };
        } catch {
          throw new Error(`Ephemeris request failed (${response.status}): ${responseText.trim() || "The server returned an empty response."}`);
        }
        if (!response.ok || "error" in result) throw new Error("error" in result ? result.error : `Ephemeris request failed (${response.status}).`);
        setData(result);
      } catch (requestError) {
        if (!isMounted) return;
        setError(requestError instanceof Error ? requestError.message : "Unable to calculate this chart.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }, 100);
    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, [submittedProfile, ayanamsa, zodiacMode, customAyanamsaDegrees, nodeType, auxiliaryType, targetAge, ageMode]);

  useEffect(() => {
    let isMounted = true;
    const timeout = window.setTimeout(async () => {
      setTransitLoading(true);
      setTransitError(null);
      const selectedTransit = transitMode === "specific"
        ? { date: transitDate, time: transitTime }
        : getCurrentBirthDateTime();
      try {
        const response = await fetch("/api/ephemeris", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: selectedTransit.date,
            time: selectedTransit.time,
            lat: profile.lat,
            lng: profile.lng,
            timezone: profile.timezone,
            ayanamsa,
            zodiacMode,
            customAyanamsaDegrees,
            nodeType,
            dashaSeed: "moon",
            avasthaConfig: readSavedAstrologyConfig()?.avastha,
          }),
        });
        const responseText = await response.text();
        if (!isMounted) return;
        let result: EphemerisResponse | { error: string };
        try {
          result = JSON.parse(responseText) as EphemerisResponse | { error: string };
        } catch {
          throw new Error(`Transit request failed (${response.status}): ${responseText.trim() || "The server returned an empty response."}`);
        }
        if (!response.ok || "error" in result) throw new Error("error" in result ? result.error : `Transit request failed (${response.status}).`);
        setTransitData(result);
      } catch (requestError) {
        if (!isMounted) return;
        setTransitError(requestError instanceof Error ? requestError.message : "Unable to calculate current transits.");
      } finally {
        if (isMounted) setTransitLoading(false);
      }
    }, 160);
    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, [profile.lat, profile.lng, profile.timezone, transitDate, transitTime, transitMode, ayanamsa, zodiacMode, customAyanamsaDegrees, nodeType, transitRefreshKey]);

  const handleTransitOverlayChange = useCallback((checked: boolean) => {
    setOverlayTransits(checked);
    if (checked) setTransitRefreshKey((key) => key + 1);
  }, []);
  const handleTransitModeChange = useCallback((value: "current" | "specific") => {
    setTransitMode(value);
    setTransitRefreshKey((key) => key + 1);
  }, []);
  const calculateBirthChart = () => {
    const dateTimeError = getBirthDateTimeError(profile.date, profile.time);
    if (dateTimeError) {
      setError(dateTimeError);
      return;
    }
    if (!profile.date || !profile.time || !Number.isFinite(profile.lat) || !Number.isFinite(profile.lng) || profile.lat < -90 || profile.lat > 90 || profile.lng < -180 || profile.lng > 180 || !profile.timezone) {
      setError("Enter a valid birth date, time, and city before submitting.");
      return;
    }
    setSubmittedProfile({ ...profile, name: profile.name.trim() || "Birth chart" });
    setBtrOffsetSeconds(0);
    setProfileCollapsed(true);
    setChartMode("birth");
    setError(null);
  };
  useEffect(() => {
    if (chartMode === "birth") {
      jaiminiAutoloadKey.current = null;
      return;
    }
    if (dashboardTab !== "jaimini") return;
    const key = JSON.stringify([profile.date, profile.time, profile.timezone, profile.lat, profile.lng, profile.name, profile.sex]);
    if (jaiminiAutoloadKey.current === key) return;
    jaiminiAutoloadKey.current = key;
    calculateBirthChart();
  }, [chartMode, dashboardTab, profile.date, profile.time, profile.timezone, profile.lat, profile.lng, profile.name, profile.sex]);
  const submitBirthChart = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (placeSelectionInvalid) {
      setError("Choose a birth place from the suggestions or apply its coordinates.");
      return;
    }
    calculateBirthChart();
  };
  const redirectToSignIn = () => {
    try {
      window.sessionStorage.setItem(
        PROFILE_DRAFT_STORAGE_KEY,
        JSON.stringify({ ...profile, name: profile.name === "Current transit" ? "" : profile.name }),
      );
    } catch {
      setProfileActionError("Your browser couldn't keep this chart while you sign in. Copy your details and try again.");
      return;
    }
    window.location.assign(`/login?callbackUrl=${encodeURIComponent("/#kundali-charts")}`);
  };
  const saveProfile = async (targetId: string | null, chartName: string) => {
    setProfileActionError(null);
    setProfileActionMessage(null);
    setSaveDialogError(null);
    if (!profile.date || !profile.time || !profile.timezone) {
      setSaveDialogError("Add a birth date and time before saving this chart.");
      return false;
    }
    if (placeSelectionInvalid) {
      setSaveDialogError("Choose a birth place from the suggestions or apply its coordinates before saving.");
      return false;
    }

    setSavingProfile(true);
    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          name: chartName === "Current transit" ? "" : chartName,
          id: targetId,
        }),
      });
      if (response.status === 401) {
        redirectToSignIn();
        return false;
      }
      const result = await readProfileApiResponse<{ profile?: SavedProfile; error?: string }>(response);
      if (!response.ok || !result.profile) throw new Error(result.error ?? "Chart could not be saved.");
      if (previousSavedProfilesUserId.current !== clerkUserId) return false;
      const saved = result.profile;
      setSavedProfileId(saved.id);
      setBtrOffsetSeconds(0);
      if (clerkUserId) updateCachedSavedProfile(clerkUserId, saved);
      setSaveDialogName(saved.chartName || saved.fullName);
      setSaveToast(`${targetId ? "Updated" : "Saved"} "${saved.chartName || saved.fullName}"`);
      setSaveJustCompleted(true);
      if (saveToastTimeout.current) clearTimeout(saveToastTimeout.current);
      saveToastTimeout.current = setTimeout(() => {
        setSaveToast(null);
        setSaveJustCompleted(false);
      }, 2400);
      return true;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Chart could not be saved. Please try again.";
      setSaveDialogError(message);
      setProfileActionError(message);
      return false;
    } finally {
      setSavingProfile(false);
    }
  };
  const openSaveDialog = async () => {
    if (!isSignedIn) {
      redirectToSignIn();
      return;
    }

    setProfileActionError(null);
    setProfileActionMessage(null);
    setSaveDialogError(null);
    const enteredChartName = profile.name.trim() === "Current transit" ? "" : profile.name.trim();
    setSaveDialogMode("update");
    setSaveDialogName(enteredChartName);
    if (enteredChartName) {
      if (await saveProfile(savedProfileId, enteredChartName)) setSaveDialogOpen(false);
      return;
    }
    setSaveDialogOpen(true);
  };
  const confirmSaveProfile = async (mode: "update" | "copy", chartName: string) => {
    const targetId = mode === "update" ? savedProfileId : null;
    if (await saveProfile(targetId, chartName)) setSaveDialogOpen(false);
  };
  const adjustBirthTime = (seconds: number) => {
    if (!profile.date || !profile.time) return;
    adjustTime(seconds);
    const adjustedProfile = useKundaliStore.getState().profile;
    const baseProfile = submittedProfile ?? profile;
    const name = baseProfile.name === "Current transit" ? "Birth chart" : baseProfile.name.trim() || "Birth chart";
    setProfile({ name });
    setSubmittedProfile({
      ...baseProfile,
      date: adjustedProfile.date,
      time: adjustedProfile.time,
      name,
    });
    setBtrOffsetSeconds((current) => current + seconds);
    setChartMode("birth");
  };
  const selectDashboardTab = (nextTab: DashboardTab) => {
    setSelectedDashboardTab(nextTab);
    setVisitedTabs((visited) => new Set(visited).add(nextTab));
    const url = new URL(window.location.href);
    if (nextTab === "core") url.searchParams.delete("tab");
    else url.searchParams.set("tab", nextTab);
    window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
    startTabTransition(() => setDashboardTab(nextTab));
  };

  const sourceDisplayData = chartMode === "transit" ? transitData : data;
  const carterCalculation = useMemo(() => {
    if (!sourceDisplayData || houseSystem !== "carter") return null;
    try {
      return { result: calculateCarterCusps(sourceDisplayData), error: null };
    } catch (calculationError) {
      return {
        result: null,
        error: calculationError instanceof Error ? calculationError.message : "The Carter calculation failed.",
      };
    }
  }, [sourceDisplayData, houseSystem]);
  const carterResult = carterCalculation?.result ?? null;
  const carterError = carterCalculation?.error ?? null;
  const displayData = useMemo(() => {
    if (!sourceDisplayData || houseSystem !== "carter" || !carterResult) return sourceDisplayData;
    const cuspPositions = getCarterPlacementCusps(carterResult, carterZodiac);
    const cuspLongitudes = cuspPositions.map(({ longitude }) => longitude);
    const houseCusps = cuspPositions.map((position, index) => ({
      house: index + 1,
      longitude: position.longitude,
      sign: position.signIndex,
      signName: position.sign,
    }));
    const planets = placeInCarterHouses(sourceDisplayData.planets, cuspLongitudes);
    const points = placeInCarterHouses(sourceDisplayData.points, cuspLongitudes);
    return {
      ...sourceDisplayData,
      houseCusps,
      planets,
      points,
      bhavChalitPlanets: planets,
      bhavChalitPoints: points,
      houseCuspSystem: "Carter (Poli-Equatorial)",
    };
  }, [sourceDisplayData, houseSystem, carterResult, carterZodiac]);
  const kpCuspRequestKey = sourceDisplayData
    ? JSON.stringify([sourceDisplayData.input, "krishnamurti", "kp"])
    : "";
  useEffect(() => {
    if (chartStyle !== "bhava" || cuspSystem !== "kp" || !sourceDisplayData) return;
    const key = kpCuspRequestKey;
    const controller = new AbortController();
    setKpCuspResult({ key, loading: true });
    void (async () => {
      try {
        const response = await fetch("/api/ephemeris", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            ...sourceDisplayData.input,
            zodiacMode: "sidereal",
            ayanamsa: "krishnamurti",
            calculationMode: "kp",
            kp: true,
          }),
        });
        const payload = await response.json() as EphemerisResponse | { error?: string };
        if (!response.ok || !("ascendant" in payload)) {
          throw new Error("error" in payload ? payload.error ?? "KP cusps could not be calculated." : "KP cusps could not be calculated.");
        }
        if (!controller.signal.aborted) setKpCuspResult({ key, data: payload, loading: false });
      } catch (caught) {
        if (controller.signal.aborted) return;
        const message = caught instanceof Error ? caught.message : "KP cusps could not be calculated.";
        console.error("[kundali] KP cusp calculation failed.", caught);
        setKpCuspResult({ key, error: message, loading: false });
      }
    })();
    return () => controller.abort();
  }, [chartStyle, cuspSystem, kpCuspRequestKey, sourceDisplayData]);
  const kpCuspForChart = kpCuspResult?.key === kpCuspRequestKey ? kpCuspResult : null;
  const bhavaCalculation = useMemo<BhavaChartCalculation | null>(() => {
    if (chartStyle !== "bhava" || !cuspCalculator) return null;
    const cuspSource = cuspSystem === "kp" ? kpCuspForChart?.data : sourceDisplayData;
    if (!cuspSource) return null;
    try {
      const ayanamsaId = cuspSource.input.zodiacMode === "tropical" ? "tropical" : cuspSource.input.ayanamsa;
      const carterCusps = cuspSystem === "carter"
        ? getCarterPlacementCusps(
          calculateCarterCusps(cuspSource),
          cuspSource.input.zodiacMode === "tropical" ? "sayana" : carterZodiac,
        ).map((cusp) => cusp.longitude)
        : undefined;
      const cuspLongitudes = cuspCalculator.getBhavaCusps(cuspSystem, {
        ascendantLongitude: cuspSource.ascendant.longitude,
        midheavenLongitude: cuspSource.mc.longitude,
        placidusCusps: cuspSource.houseCusps.map((cusp) => cusp.longitude),
        kpCusps: cuspSystem === "kp" ? cuspSource.houseCusps.map((cusp) => cusp.longitude) : undefined,
        carterCusps,
        latitude: cuspSource.input.lat,
        ayanamsaId,
      }, {
        id: ayanamsaId,
        degrees: cuspSource.ayanamsa.degrees,
      });
      const houseCusps = cuspLongitudes.map((longitude, index) => {
        const sign = Math.floor(normalizeDegrees(longitude) / 30);
        return { house: index + 1, longitude, sign, signName: CUSP_SIGNS[sign] };
      });
      const ascendant = cuspSystem === "carter"
        ? planetAtLongitude(cuspSource.ascendant, cuspLongitudes[0])
        : cuspSource.ascendant;
      const warning = Math.abs(cuspSource.input.lat) >= 66 && (cuspSystem === "placidus" || cuspSystem === "kp")
        ? `${CUSP_SYSTEM_LABELS[cuspSystem]} is undefined above 66° latitude; Equal cusps are shown instead.`
        : null;
      return { data: cuspSource, ascendant, houseCusps, error: null, warning };
    } catch (caught) {
      return {
        data: cuspSource,
        ascendant: cuspSource.ascendant,
        houseCusps: [],
        error: caught instanceof Error ? caught.message : `${CUSP_SYSTEM_LABELS[cuspSystem]} cusps could not be calculated.`,
        warning: null,
      };
    }
  }, [chartStyle, cuspCalculator, cuspSystem, kpCuspForChart, sourceDisplayData, carterZodiac]);
  const displayLoading = chartMode === "transit" ? transitLoading : loading;
  const displayError = chartMode === "transit" ? transitError : error;
  const primaryChartData = chartStyle === "bhava"
    ? bhavaCalculation?.error ? null : bhavaCalculation?.data ?? null
    : displayData;
  const primaryChartAscendant = chartStyle === "bhava"
    ? bhavaCalculation?.error ? null : bhavaCalculation?.ascendant ?? null
    : displayData?.ascendant ?? null;
  const primaryChartCusps = chartStyle === "bhava"
    ? bhavaCalculation?.error ? [] : bhavaCalculation?.houseCusps ?? []
    : displayData?.houseCusps ?? [];
  const primaryChartError = chartStyle === "bhava"
    ? bhavaCalculation?.error ?? cuspModuleError ?? (cuspSystem === "kp" ? kpCuspForChart?.error ?? null : null) ?? (!sourceDisplayData ? displayError : null)
    : displayError;
  const primaryChartLoading = chartStyle === "bhava"
    ? !primaryChartData && !primaryChartError
    : displayLoading;
  const primaryChartWarning = chartStyle === "bhava" ? bhavaCalculation?.warning : null;
  const primaryChartPreferences: ViewPreferences = chartStyle === "bhava"
    ? { ...viewPreferences, showSignNumbers: false, useSignIcons: false, showBhavaCusps: true }
    : viewPreferences;
  const primaryChartLanguage = chartStyle === "bhava" ? "en" : language;
  const cuspDetailData = chartStyle === "bhava" ? primaryChartData : displayData;
  const cuspDetailCusps = chartStyle === "bhava" ? primaryChartCusps : displayData?.houseCusps ?? [];
  const cuspDetailAscendant = chartStyle === "bhava" ? primaryChartAscendant : displayData?.ascendant ?? null;
  const kharaPoints = useMemo(() => {
    if (dashboardTab !== "core" || !displayData) return [];
    const references = [
      { name: "Lagna", position: displayData.ascendant },
      ...displayData.planets
        .filter((planet) => planet.name === "Moon")
        .map((position) => ({ name: "Moon", position })),
    ];
    return references.map(({ name, position }) => ({
      name,
      ...calculateKharaPoints(position),
    }));
  }, [dashboardTab, displayData]);
  useEffect(() => {
    if (displayData && !displayLoading) setProfileCollapsed(true);
  }, [displayData, displayLoading]);
  const displayCuspLabels = useMemo(() => {
    if (!cuspDetailAscendant || cuspDetailCusps.length !== 12) return null;
    return cuspLabels(
      cuspDetailCusps.map((cusp) => cusp.longitude),
      {
        signStyle: viewPreferences.cuspLabelSignStyle,
        degreeFormat: viewPreferences.cuspLabelDegreeFormat,
      },
      cuspDetailAscendant.longitude,
    );
  }, [cuspDetailAscendant, cuspDetailCusps, viewPreferences.cuspLabelDegreeFormat, viewPreferences.cuspLabelSignStyle]);
  const midpointReport = useMemo(() => {
    if (dashboardTab !== "midpoints" || !displayData) return null;
    const cacheKey = JSON.stringify([
      displayData.input.date,
      displayData.input.time,
      displayData.input.lat,
      displayData.input.lng,
      displayData.input.timezone,
      displayData.input.ayanamsa,
      displayData.input.zodiacMode,
      displayData.input.customAyanamsaDegrees,
      displayData.input.nodeType,
      houseSystem,
      carterZodiac,
      midpointPreferences,
    ]);
    if (midpointReportCache.has(cacheKey)) return midpointReportCache.get(cacheKey) ?? null;
    const report = createMidpointReport(displayData, midpointPreferences);
    midpointReportCache.set(cacheKey, report);
    if (midpointReportCache.size > 16) {
      const oldestKey = midpointReportCache.keys().next().value;
      if (oldestKey) midpointReportCache.delete(oldestKey);
    }
    return report;
  }, [dashboardTab, displayData, houseSystem, carterZodiac, midpointPreferences]);
  const midpointRows = useMemo(
    () => midpointReport ? visibleMidpointRows(midpointReport, midpointPreferences) : [],
    [midpointReport, midpointPreferences],
  );
  const midpointTrees = useMemo(
    () => midpointReport ? visibleMidpointTrees(midpointReport, midpointPreferences.showAllTrees) : [],
    [midpointReport, midpointPreferences.showAllTrees],
  );
  const midpointUnavailableReason = !displayData
    ? "Load a chart to view its midpoint analysis."
    : displayData.input.zodiacMode === "tropical"
      ? "Midpoint analysis uses sidereal longitudes. Switch the chart to Nirayana · Sidereal in Chart Settings."
      : null;
  const activeBirthProfile = submittedProfile ?? profile;
  const normalizeChartName = (name: string) => name === "Current transit" ? "" : name.trim() || "Birth chart";
  const chartInputsChanged = Boolean(submittedProfile && (
    normalizeChartName(profile.name) !== normalizeChartName(submittedProfile.name)
    || profile.sex !== submittedProfile.sex
    || profile.date !== submittedProfile.date
    || profile.time !== submittedProfile.time
    || placeSelectionInvalid
    || profile.city !== submittedProfile.city
    || profile.lat !== submittedProfile.lat
    || profile.lng !== submittedProfile.lng
  ));
  const referenceHouseNumber = getReferenceHouse(referenceName, displayData?.planets ?? []);
  const primaryReferenceHouseNumber = chartStyle === "bhava" ? 1 : referenceHouseNumber;
  const referenceLabel = chartStyle === "bhava" || referenceName === "Ascendant"
    ? "Ascendant"
    : ["Sun", "Moon", "Jupiter"].includes(referenceName)
      ? `${referenceName} reference`
      : `House ${primaryReferenceHouseNumber}`;
  const auxiliaryReferenceHouseNumber = getReferenceHouse(auxiliaryReferenceName);
  const auxiliaryChart = auxiliaryType === "transit" ? transitData
    : auxiliaryType === "solar" || auxiliaryType === "tajika" ? data?.solarReturn
      : displayData;
  const auxiliaryAscendant = auxiliaryType === "solar" || auxiliaryType === "tajika"
    ? data?.solarReturn?.ascendant
    : auxiliaryChart?.ascendant;
  const isBhavaChalitChart = auxiliaryType === "divisional" && auxiliaryChartId === "BHAVA";
  const auxiliaryPlanets = auxiliaryType === "solar" || auxiliaryType === "tajika"
    ? data?.solarReturn?.planets
    : isBhavaChalitChart ? displayData?.bhavChalitPlanets
    : auxiliaryChart?.planets;
  const auxiliaryPoints = auxiliaryType === "solar" || auxiliaryType === "tajika" ? [] : auxiliaryType === "transit" ? transitData?.points : isBhavaChalitChart ? displayData?.bhavChalitPoints : displayData?.points;
  const auxiliaryCusps = auxiliaryType === "solar" || auxiliaryType === "tajika" ? [] : auxiliaryType === "transit" ? transitData?.houseCusps : displayData?.houseCusps;
  const selectedAuxiliaryChart = AUXILIARY_CHARTS.find((chart) => chart.id === auxiliaryChartId) ?? AUXILIARY_CHARTS[0];
  const auxiliaryVarga = auxiliaryType === "divisional" ? auxiliaryChartId === "BHAVA" ? 1 : Number(auxiliaryChartId.slice(1)) : 1;
  const solarReturnUtc = data?.solarReturn?.utc;
  const currentTransitLabel = transitData ? `${transitData.input.date} ${transitData.input.time}` : "—";
  const saveButtonLabel = savingProfile
    ? "Saving…"
    : saveJustCompleted
      ? "Saved"
      : savedProfileId
        ? "Update chart"
        : "Save chart";
  return (
    <div id="kundali-dashboard" className="relative min-w-0 space-y-4 bg-background text-foreground">
      {saveToast && (
        <div role="status" aria-live="polite" className="fixed right-4 top-4 z-[120] max-w-[calc(100vw-2rem)] rounded-lg border border-[#C05A3A]/20 bg-card px-4 py-3 text-sm font-medium text-card-foreground shadow-lg">
          {saveToast}
        </div>
      )}
      <div className="mx-auto w-full max-w-[1440px] space-y-4 2xl:max-w-[1600px]">
        <section aria-label="Birth chart controls" className="shrink-0 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm md:rounded-2xl md:border-stone-200/80 md:shadow-[0_1px_3px_rgba(15,23,42,0.04)] lg:p-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 xl:hidden">
            <div id="chart-profile" className="flex items-center gap-2 scroll-mt-4">
              <span className="grid size-7 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"><Orbit className="size-4" /></span>
              <p className="text-xs font-semibold">Chart profile</p>
            </div>
          </div>
          {profileCollapsed && (
            <div className="mb-2 flex min-h-11 items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-1.5 md:hidden">
              <p className="min-w-0 flex-1 break-words text-xs font-medium leading-5" title={`${activeBirthProfile.name} · ${formatBirthDate(activeBirthProfile.date)} · ${activeBirthProfile.time} · ${activeBirthProfile.city}`}>
                {activeBirthProfile.name} · {formatBirthDate(activeBirthProfile.date)} · {activeBirthProfile.time} · {activeBirthProfile.city}
              </p>
              <button
                type="button"
                onClick={() => setProfileCollapsed(false)}
                aria-label="Edit birth chart details"
                className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-xs font-semibold text-primary transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Edit
              </button>
            </div>
          )}
          <form onSubmit={submitBirthChart} className={`${profileCollapsed ? "hidden md:block" : ""} min-w-0 space-y-2`}>
            <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(100px,.85fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(190px,1.7fr)_minmax(135px,1.35fr)_minmax(112px,1.1fr)_minmax(110px,1fr)]">
              <label className="flex min-w-0 flex-col text-xs font-medium text-slate-700 dark:text-slate-300">
                Chart name
                <input aria-label="Chart name" type="text" maxLength={100} value={profile.name === "Current transit" ? "" : profile.name} placeholder="Enter Jataka's name" onChange={(event) => setProfile({ name: event.target.value })} className={`${CONTROL_CLASS} mt-1 h-11 w-full text-base placeholder:text-slate-600 dark:placeholder:text-slate-400 md:text-sm xl:h-9`} />
              </label>
              <label className="flex min-w-0 flex-col text-xs font-medium text-slate-700 dark:text-slate-300">Gender
                <span className="relative mt-1 block">
                  <select aria-label="Gender" value={profile.sex} onChange={(event) => setProfile({ sex: event.target.value as BirthProfile["sex"] })} className={`${CONTROL_CLASS} h-11 w-full min-w-0 appearance-none px-2 pr-8 text-base md:text-sm xl:h-9`}>
                    <option value="not-applicable">Not specified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                </span>
              </label>
              <div className="grid min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:contents">
                <label className="flex min-w-0 flex-col text-xs font-medium text-slate-700 dark:text-slate-300">Birth date
                  <input aria-label="Birth date" type="date" required value={profile.date} onChange={(event) => {
                    setBtrOffsetSeconds(0);
                    setProfile({ date: event.target.value });
                  }} className={`${CONTROL_CLASS} mt-1 box-border h-11 w-full min-w-0 max-w-full px-2 text-base md:text-sm xl:h-9`} />
                </label>
                <label className="flex min-w-0 flex-col text-xs font-medium text-slate-700 dark:text-slate-300">Birth time
                  <input aria-label="Time of birth" type="time" step={1} value={profile.time} onChange={(event) => {
                    const time = event.target.value;
                    setBtrOffsetSeconds(0);
                    setProfile({ time: time ? (time.length === 5 ? `${time}:00` : time) : "" });
                  }} required className={`${CONTROL_CLASS} mt-1 box-border h-11 w-full min-w-0 max-w-full px-2 text-base font-mono md:text-sm xl:h-9`} />
                </label>
              </div>
              <div className="min-w-0">
                <PlaceSearch
                  label="Birth city"
                  value={profilePlace}
                  onChange={handlePlaceChange}
                  onInvalidDraftChange={setPlaceSelectionInvalid}
                  compact
                />
              </div>
              <div className="relative min-w-0">
                <label htmlFor="chart-notes" className="block text-xs font-medium text-slate-700 dark:text-slate-300">Chart notes</label>
                  <span className="relative mt-1 block">
                    <input
                      id="chart-notes"
                      aria-label="Chart notes"
                      type="text"
                      maxLength={10000}
                      value={profile.notes}
                      onChange={(event) => setProfile({ notes: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.preventDefault();
                      }}
                      placeholder="Add chart notes..."
                      className={`${CONTROL_CLASS} h-11 w-full pr-10 text-base placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:border-[#C05A3A] focus:ring-2 focus:ring-[#C05A3A]/40 md:text-sm xl:h-9`}
                    />
                    <button
                      type="button"
                      onClick={() => setNotesExpanded(true)}
                      title="Expand notes"
                      aria-label="Expand notes"
                      aria-expanded={notesExpanded}
                      aria-controls={notesExpanded ? "chart-notes-editor" : undefined}
                      className="absolute right-0 top-0 grid size-11 place-items-center rounded-r-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40 xl:size-9"
                    >
                      <Maximize2 aria-hidden="true" className="size-4" />
                    </button>
                  </span>
                {notesExpanded && (
                  <div
                    className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/45 p-3 sm:p-6"
                    onPointerDown={(event) => {
                      if (event.target === event.currentTarget) setNotesExpanded(false);
                    }}
                  >
                    <section
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="chart-notes-heading"
                      className="max-h-[min(88dvh,42rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl sm:p-5"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h2 id="chart-notes-heading" className="text-sm font-semibold">Chart notes</h2>
                          <p className="mt-0.5 text-xs text-muted-foreground">Add context, events, or observations for this chart.</p>
                        </div>
                        <button type="button" onClick={() => setNotesExpanded(false)} aria-label="Close chart notes" className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40">
                          <X aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                      <textarea
                        id="chart-notes-editor"
                        autoFocus
                        maxLength={10000}
                        rows={8}
                        value={profile.notes}
                        onChange={(event) => setProfile({ notes: event.target.value })}
                        placeholder="Add chart notes..."
                        className="min-h-48 w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground focus:border-[#C05A3A] focus:ring-2 focus:ring-[#C05A3A]/40"
                      />
                      <p aria-live="polite" className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">{profile.notes.length.toLocaleString()}/10,000</p>
                    </section>
                  </div>
                )}
              </div>
              <button type="submit" className={`inline-flex h-11 w-full min-w-0 self-end items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-1 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 xl:h-9 ${chartInputsChanged ? "ring-2 ring-amber-400/60 ring-offset-1 ring-offset-card" : ""}`}>
                {chartInputsChanged ? "Update chart" : "Calculate chart"}
                {chartInputsChanged && <><span className="sr-only">Chart inputs changed since calculation</span><span aria-hidden="true" className="size-1.5 rounded-full bg-amber-200" /></>}
              </button>
              <button type="button" onClick={openSaveDialog} disabled={savingProfile} className="inline-flex h-11 w-full self-end items-center justify-center gap-1 rounded-xl bg-[#C05A3A] px-1 text-[11px] font-semibold text-white shadow-xs transition hover:bg-[#AA4C30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40 disabled:cursor-wait disabled:opacity-60 xl:h-9">
                <Save aria-hidden="true" className="size-3.5 shrink-0" />
                {saveButtonLabel}
              </button>
            </div>
          </form>
          {profileActionError && <p role="alert" className="mt-2 text-xs text-rose-800 dark:text-rose-200">{profileActionError}</p>}
          {profileActionMessage && <p role="status" className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">{profileActionMessage}</p>}
        </section>

        {saveDialogOpen && (
          <SaveChartDialog
            open={saveDialogOpen}
            saving={savingProfile}
            chartName={saveDialogName}
            chartSummary={`${formatBirthDate(profile.date)} · ${profile.time} · ${profile.city || "Coordinates"}`}
            existingChart={Boolean(savedProfileId)}
            mode={saveDialogMode}
            saveError={saveDialogError}
            onClose={() => setSaveDialogOpen(false)}
            onChartNameChange={setSaveDialogName}
            onModeChange={setSaveDialogMode}
            onSave={confirmSaveProfile}
          />
        )}

        {selectedDashboardTab !== "jamakkol" && (
          <nav role="tablist" aria-label="Kundali analysis" className="no-scrollbar flex w-full snap-x snap-mandatory gap-1 overflow-x-auto border-b border-border md:items-center md:gap-2">
            {DASHBOARD_TABS.map(({ id, label }) => (
              <button
                key={id}
                id={`kundali-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={selectedDashboardTab === id}
                aria-controls="kundali-tab-panel"
                onMouseEnter={() => {
                  if (id === "kp") void import("@/components/kp/KpTab");
                }}
                onClick={() => selectDashboardTab(id)}
                className={`relative min-h-11 shrink-0 snap-start whitespace-nowrap px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 after:absolute after:inset-x-2.5 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors md:px-3.5 md:py-2 md:text-sm ${selectedDashboardTab === id ? "font-semibold text-[#B84E2E] after:bg-[#C05A3A]" : "text-muted-foreground after:bg-transparent hover:text-foreground hover:after:bg-border"}`}
              >
                {label}
              </button>
            ))}
          </nav>
        )}

        <div
          id="kundali-tab-panel"
          role={selectedDashboardTab === "jamakkol" ? "region" : "tabpanel"}
          aria-label={selectedDashboardTab === "jamakkol" ? "Jamakkol analysis" : undefined}
          aria-labelledby={selectedDashboardTab === "jamakkol" ? "main-navigation-jamakkol" : `kundali-tab-${selectedDashboardTab}`}
          aria-busy={isTabTransitionPending}
          className="min-w-0"
        >
        {isTabTransitionPending && dashboardTab !== selectedDashboardTab && (
          <CelestiaLoader
            label={`Opening ${DASHBOARD_TABS.find(({ id }) => id === selectedDashboardTab)?.label ?? "Jamakkol"}…`}
            sublabel="Loading the selected chart and calculations…"
            tone="dashboard"
          />
        )}
        <div hidden={isTabTransitionPending && dashboardTab !== selectedDashboardTab}>
        <RetainedTab active={dashboardTab === "kp"}>
          {visitedTabs.has("kp") && (
            <KPAstrology
              profile={submittedProfile ?? profile}
              language={language}
              viewPreferences={viewPreferences}
              ChartRenderer={SvgChart}
            />
          )}
        </RetainedTab>
        <RetainedTab active={dashboardTab === "jaimini"}>
          {visitedTabs.has("jaimini") && (
            <JaiminiDashboard
              profile={submittedProfile ?? profile}
              data={chartMode === "birth" ? data : null}
              chartMode={chartMode}
              loading={loading}
              error={error}
              onCalculateBirthChart={calculateBirthChart}
              chartStyle={chartStyle}
              onChartStyleChange={handleChartStyleChange}
              viewPreferences={viewPreferences}
              language={language}
              ChartRenderer={SvgChart}
            />
          )}
        </RetainedTab>
        <RetainedTab active={dashboardTab === "jamakkol"}>
          {visitedTabs.has("jamakkol") && (
            <JamakkolTab
              profile={submittedProfile ?? profile}
              data={chartMode === "transit" ? transitData : data}
              chartMode={chartMode}
              transitDate={transitDate}
              transitTime={transitTime}
              transitMode={transitMode}
            />
          )}
        </RetainedTab>
        <RetainedTab active={dashboardTab === "shodashvarga"}>
          {visitedTabs.has("shodashvarga") && (
            <ShodashvargaTab
              data={displayData}
              charts={SHODASHVARGA_CHARTS}
              chartMode={chartMode}
              chartStyle={chartStyle}
              referenceHouse={referenceHouseNumber}
              language={language}
              preferences={viewPreferences}
              overlay={chartMode === "birth" && overlayTransits ? transitData?.planets : undefined}
              showTransitLabels={chartMode === "transit" && overlayTransits}
              loading={displayLoading}
              error={displayError}
              ChartRenderer={SvgChart}
            />
          )}
        </RetainedTab>
        <RetainedTab active={dashboardTab === "dasha"}>
          {visitedTabs.has("dasha") && (
            <DashaTab
              data={data}
              system={dashaSystem}
              onSystemChange={setDashaSystem}
              seed={dashaSeed}
              onSeedChange={setDashaSeed}
              lagnaMode={dashaLagnaMode}
              onLagnaModeChange={setDashaLagnaMode}
            />
          )}
        </RetainedTab>
        <RetainedTab active={dashboardTab === "aspects"}>
          {visitedTabs.has("aspects") && (
            <AspectsTab data={displayData} language={language} useSignIcons={viewPreferences.useSignIcons} />
          )}
        </RetainedTab>
        <RetainedTab active={dashboardTab === "midpoints"}>
          {visitedTabs.has("midpoints") && (
            <MidpointsTab
              report={midpointReport}
              preferences={midpointPreferences}
              onPreferencesChange={setMidpointPreferences}
              decimal={decimalDegrees}
              unavailableReason={midpointUnavailableReason}
            />
          )}
        </RetainedTab>
        <RetainedTab active={dashboardTab === "core"}>
          {visitedTabs.has("core") && (
        <div className="flex flex-col gap-4">
        {displayError && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{displayError}</span></div>}
        <div>
          <PanchangStrip date={displayData?.input.date ?? profile.date} planets={displayData?.planets ?? []} houseSystem={houseSystem} />
        </div>
        <section aria-label="Calculation and birth time rectification controls" className="rounded-2xl border border-stone-200/80 bg-white px-3 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:px-4 sm:py-2.5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
            <CoreCalculationControls ayanamsaDegrees={displayData?.ayanamsa.degrees} />
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-stone-200/70 pt-2 md:border-0 md:pt-0">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span title="Birth Time Rectification — nudge birth time to test Lagna & D9 shifts" className="inline-flex h-6 items-center rounded-md bg-[#FBE9E1] px-2 text-[10px] font-bold tracking-wide text-[#A9472A]">BTR</span>
                <span className="text-xs font-medium text-stone-700">Birth time rectification</span>
                <time className="font-mono text-xs font-semibold tabular-nums text-stone-900" dateTime={`${activeBirthProfile.date}T${activeBirthProfile.time}`}>
                  {formatBtrTime(activeBirthProfile.time)}
                </time>
                {btrOffsetSeconds !== 0 && (
                  <span aria-label={`Birth time offset ${btrOffsetSeconds > 0 ? "plus" : "minus"} ${Math.abs(btrOffsetSeconds) / 60} minutes`} className="inline-flex h-6 items-center rounded-full bg-[#FBE9E1] px-2 text-[10px] font-semibold tabular-nums text-[#A9472A]">
                    {btrOffsetSeconds > 0 ? "+" : "-"}{Math.abs(btrOffsetSeconds) / 60}m
                  </span>
                )}
              </div>
              <div role="group" aria-label="Birth time adjustment" className="flex shrink-0 items-center gap-1">
                {([
                  { seconds: -300, label: "-5m", title: "Subtract 5 minutes" },
                  { seconds: -60, label: "-1m", title: "Subtract 1 minute" },
                  { seconds: 60, label: "+1m", title: "Add 1 minute" },
                  { seconds: 300, label: "+5m", title: "Add 5 minutes" },
                ]).map(({ seconds, label, title }) => (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => adjustBirthTime(seconds)}
                    disabled={!activeBirthProfile.date || !activeBirthProfile.time}
                    title={title}
                    aria-label={title}
                    className="h-9 min-w-[42px] rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-semibold tabular-nums text-stone-700 transition-colors hover:border-[#D9A18B] hover:bg-[#FDF2EC] hover:text-[#A9472A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40 disabled:cursor-not-allowed disabled:opacity-50 md:h-8 md:min-w-0"
                  >
                    {label}
                  </button>
                ))}
                {btrOffsetSeconds !== 0 && (
                  <button
                    type="button"
                    onClick={() => adjustBirthTime(-btrOffsetSeconds)}
                    className="ml-1 h-9 rounded-lg px-2 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:h-8"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <div id="kundali-charts" className="grid w-full grid-cols-1 items-stretch gap-4 scroll-mt-4 lg:grid-cols-2 lg:gap-6">
          <div className="flex min-h-0 min-w-0 lg:col-start-1">
            <section className="relative flex h-full min-h-0 w-full flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm md:rounded-2xl md:border-stone-200/80 md:shadow-[0_1px_3px_rgba(15,23,42,0.04)]" aria-label="Primary D1 chart">
              <ChartControls
                chartMode={chartMode}
                chartStyle={chartStyle}
                onChartStyleChange={handleChartStyleChange}
                cuspSystem={cuspSystem}
                onCuspSystemChange={handleCuspSystemChange}
                onChartStylePrefetch={() => { void loadCuspCalculator(); }}
                overlayTransits={overlayTransits}
                onOverlayTransitsChange={handleTransitOverlayChange}
                ascendantLabel={primaryChartAscendant ? `${signName(primaryChartAscendant.signName, primaryChartLanguage)} rising` : primaryChartLoading ? "Calculating lagna" : "Lagna unavailable"}
                referenceName={referenceName}
                onReferenceNameChange={setReferenceName}
                onOpenSettings={() => setChartSettingsOpen(true)}
                onMaximize={() => setChartMaximized(true)}
                transitDate={transitDate}
                transitTime={transitTime}
                transitMode={transitMode}
                onTransitDateChange={setTransitDate}
                onTransitTimeChange={setTransitTime}
                onTransitModeChange={handleTransitModeChange}
              />
              <div className="relative w-full min-w-0 bg-card p-2 sm:p-4">
                <div className="relative mx-auto aspect-square w-full max-w-[460px]">
                  {primaryChartData && primaryChartAscendant ? <SvgChart style={chartStyle} ascendant={primaryChartAscendant} planets={primaryChartData.planets} points={primaryChartData.points} houseCusps={primaryChartCusps} varga={1} referenceHouse={primaryReferenceHouseNumber} overlay={chartMode === "birth" && overlayTransits ? transitData?.planets : undefined} showTransitLabels={chartMode === "transit" && overlayTransits} language={primaryChartLanguage} preferences={primaryChartPreferences} /> : primaryChartLoading ? <EphemerisLoader title={cuspSystem === "kp" && chartStyle === "bhava" ? "Calculating KP cusps" : "Calculating birth chart"} description="Finding planetary positions and house cusps…" detail={`${profile.city || "Birth chart"} · Swiss Ephemeris`} activity="Calculating chart" tone="dashboard" compact /> : <div role="alert" className="grid aspect-square w-full place-items-center px-6 text-center text-xs text-destructive">{primaryChartError ?? "Chart unavailable"}</div>}
                  {overlayTransits && transitLoading && (
                    <div role="status" aria-live="polite" className="absolute right-5 top-5 z-10 inline-flex items-center gap-2 rounded-full border border-stone-300 bg-card/95 px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm dark:border-stone-700 dark:text-stone-300">
                      <LoaderCircle className="size-3.5 animate-spin" />
                      Updating transit positions
                    </div>
                  )}
                </div>
              </div>
              <div className="mx-2 mt-3 flex flex-none flex-wrap items-center justify-between gap-x-4 gap-y-1 px-2 pb-3 text-[11px] text-slate-600 dark:text-slate-400 sm:text-xs">
                <span className="flex items-center gap-1.5"><span className={`size-2 rounded-full ${chartMode === "transit" ? "bg-cyan-600 dark:bg-cyan-400" : "bg-amber-600 dark:bg-amber-400"}`} /> {chartMode === "transit" ? `Transit · ${currentTransitLabel}` : "Birth chart"}</span>
                <button type="button" className="flex items-center gap-1.5 rounded px-1 transition hover:bg-[hsl(var(--input))]/50" onMouseEnter={() => setHoveredPlanet("Vargottama")} onMouseLeave={() => setHoveredPlanet(null)} onFocus={() => setHoveredPlanet("Vargottama")} onBlur={() => setHoveredPlanet(null)}><span className="inline-block size-3 rounded-full border border-[#C05A3A]" /> Vargottama</button>
                <span title="Retrograde Motion"><span className="font-bold text-rose-700 dark:text-rose-300">R</span> = retrograde</span>
                <span className="col-span-2 min-w-0 break-words text-right sm:col-span-1" title={chartStyle === "placidus" ? `${referenceLabel} at 9 o’clock` : referenceLabel}>{chartStyle === "placidus" ? `${referenceLabel} at 9 o’clock` : referenceLabel}</span>
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[10px] text-slate-600 dark:text-slate-400">
                <span>{chartMode === "transit" ? transitLoading ? "Refreshing current sky…" : transitError ?? "Live transit positions" : overlayTransits ? transitLoading ? "Refreshing transit sky…" : transitError ?? `Transit positions · ${currentTransitLabel}` : "Birth chart positions"}</span>
                <span aria-hidden="true">·</span>
                <span>House cusps: {chartStyle === "bhava" ? CUSP_SYSTEM_LABELS[cuspSystem] : houseSystem === "carter" ? "Carter (Poli-Equatorial)" : "Placidus"} · planetary houses: {chartStyle === "bhava" ? "selected cusps" : houseSystem === "carter" ? "Carter" : "Whole Sign"}</span>
                {primaryChartWarning && <span role="status">{primaryChartWarning}</span>}
                {data && <span className="inline-flex items-center gap-1"><Clock3 aria-hidden="true" className="size-3" /> Calculated {new Date(data.calculatedAt).toLocaleTimeString()}</span>}
              </p>
            </section>
          </div>

          <div className="flex min-h-0 min-w-0 lg:col-start-2 lg:row-start-1">
            <section id="auxiliary-chart" className="relative flex h-full min-h-0 w-full flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm md:rounded-2xl md:border-stone-200/80 md:shadow-[0_1px_3px_rgba(15,23,42,0.04)]" aria-label="Auxiliary chart viewer">
              <div className="flex flex-col gap-3 border-b border-border bg-muted/10 p-4 lg:min-h-[195px] lg:justify-between lg:gap-2 lg:p-3">
              <div className="grid flex-none grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:w-full lg:items-center lg:gap-3">
                  <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">Chart
                    <Select
                      value={auxiliaryType === "divisional" ? auxiliaryChartId : auxiliaryType}
                      onValueChange={(value) => {
                        if (value === "BHAVA" || value.startsWith("D")) {
                          setAuxiliaryType("divisional");
                          setAuxiliaryChartId(value);
                          setVarga(value === "BHAVA" ? 1 : Number(value.slice(1)));
                        } else {
                          setAuxiliaryType(value as AuxiliaryType);
                        }
                      }}
                    >
                      <SelectTrigger aria-label="Auxiliary chart" title={auxiliaryType === "divisional" ? selectedAuxiliaryChart.description : undefined} className="h-11 w-full min-w-0 bg-card pr-9 text-xs lg:h-9">
                        <SelectValue placeholder="Select a chart" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] !bg-card !text-foreground">
                        <SelectGroup>
                          <SelectLabel>Core charts</SelectLabel>
                          {AUXILIARY_CHARTS.filter((chart) => chart.group === "Primary").map((chart) => <SelectItem key={chart.id} value={chart.id} aria-label={`${chart.label}: ${chart.description}`}>{chart.label}</SelectItem>)}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Divisional charts</SelectLabel>
                          {AUXILIARY_CHARTS.filter((chart) => chart.group === "Divisional").map((chart) => <SelectItem key={chart.id} value={chart.id} aria-label={`${chart.label}: ${chart.description}`}>{chart.label}</SelectItem>)}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Other charts</SelectLabel>
                          <SelectItem value="transit">Transit chart</SelectItem>
                          <SelectItem value="solar">Solar Return (Varshaphala)</SelectItem>
                          <SelectItem value="tajika">Tajika</SelectItem>
                          <SelectItem value="progressions">Progressions</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">Reference Lagna
                    <span className="relative block">
                      <select aria-label="Auxiliary reference lagna" value={auxiliaryReferenceName} onChange={(event) => setAuxiliaryReferenceName(event.target.value)} className={`${CONTROL_CLASS} w-full appearance-none pr-8`}>
                        <option value="Ascendant">Ascendant</option>
                        {Array.from({ length: 12 }, (_, index) => <option key={index} value={`house:${index + 1}`}>House {index + 1}</option>)}
                      </select>
                      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    </span>
                  </label>
              </div>
              {kharaPoints.length > 0 && (
                <section aria-label="Khara positions" className="rounded-xl border border-stone-200/70 bg-stone-50/80 px-3 py-2">
                  <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <h2 className="text-[11px] font-semibold text-stone-800">Khara positions</h2>
                    <p className="text-[9px] text-stone-500">64th Navamsha &amp; 22nd Drekkana</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {kharaPoints.map((points) => (
                      <div key={points.name} className="min-w-0">
                        <h3 className="mb-1 text-[10px] font-semibold text-stone-700">{points.name}</h3>
                        <dl className="space-y-1">
                          {[
                            {
                              label: "64th Navamsha",
                              source: `8th from ${signName(SIGNS[points.navamsaSign], language)} D9`,
                              sign: points.sixtyFourthNavamsaSign,
                            },
                            {
                              label: "22nd Drekkana",
                              source: `8th from ${signName(SIGNS[points.drekkanaSign], language)} D3`,
                              sign: points.twentySecondDrekkanaSign,
                            },
                          ].map(({ label, source, sign }) => (
                            <div key={label} className="flex min-w-0 items-center justify-between gap-1">
                              <div className="min-w-0">
                                <dt className="truncate text-[9px] font-medium leading-tight text-stone-700">{label}</dt>
                                <dd className="truncate text-[8px] leading-tight text-stone-500" title={source}>{source}</dd>
                              </div>
                              <dd className="inline-flex shrink-0 rounded-full bg-[#FBE9E1] px-2 py-0.5 text-[9px] font-semibold text-[#A9472A]">
                                {signName(SIGNS[sign], language)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {(auxiliaryType === "solar" || auxiliaryType === "tajika") && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
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
                <div className="flex flex-wrap gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700"><input type="checkbox" checked={nadiProgressions} onChange={(event) => setNadiProgressions(event.target.checked)} className="accent-cyan-600" /> Nadi progression</label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700"><input type="checkbox" checked={bhriguProgressions} onChange={(event) => setBhriguProgressions(event.target.checked)} className="accent-cyan-600" /> Bhrigu progression</label>
                </div>
              )}
              </div>
              <div className="relative w-full min-w-0 bg-card p-2 sm:p-4">
                <div className="relative mx-auto aspect-square w-full max-w-[460px]">
                  {auxiliaryAscendant && auxiliaryPlanets
                    ? <SvgChart style={chartStyle} ascendant={auxiliaryAscendant} planets={auxiliaryPlanets} points={auxiliaryPoints ?? []} houseCusps={auxiliaryCusps ?? []} varga={auxiliaryVarga} houseBasedPlacement={isBhavaChalitChart} referenceHouse={auxiliaryReferenceHouseNumber} overlay={undefined} language={language} preferences={viewPreferences} />
                    : displayLoading ? <EphemerisLoader title="Preparing chart view" description="Applying the selected chart settings…" detail={selectedAuxiliaryChart.label} activity="Updating chart" tone="dashboard" compact /> : <div className="grid aspect-square w-full place-items-center px-6 text-center text-xs text-muted-foreground">Auxiliary chart unavailable</div>}
                </div>
              </div>
              {auxiliaryType === "solar" || auxiliaryType === "tajika"
                ? <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Exact sidereal solar return · {solarReturnUtc ? `${new Date(solarReturnUtc ?? "").toLocaleString()} UTC` : "Awaiting calculation"} · {auxiliaryReferenceName === "Ascendant" ? "Ascendant" : `House ${auxiliaryReferenceHouseNumber}`} reference</p>
                : auxiliaryType === "transit" ? <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Transit sky at chart coordinates · {currentTransitLabel} · {auxiliaryReferenceName === "Ascendant" ? "Ascendant" : `House ${auxiliaryReferenceHouseNumber}`} reference</p>
                  : auxiliaryType === "progressions" ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Progression controls are saved in this view, but progression calculations are not yet provided by the ephemeris engine. Reference lagna: {auxiliaryReferenceName === "Ascendant" ? "Ascendant" : `House ${auxiliaryReferenceHouseNumber}`}.</p>
                    : <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">D{varga} divisional placements · whole-sign houses · {auxiliaryReferenceName === "Ascendant" ? "Ascendant" : `House ${auxiliaryReferenceHouseNumber}`} reference</p>}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
                <button type="button" className="flex items-center gap-1.5 rounded px-1 transition hover:bg-[hsl(var(--input))]/50" onMouseEnter={() => setHoveredPlanet("Vargottama")} onMouseLeave={() => setHoveredPlanet(null)} onFocus={() => setHoveredPlanet("Vargottama")} onBlur={() => setHoveredPlanet(null)}><span className="inline-block size-3 rounded-full border border-[#C05A3A]" /> Vargottama</button>
                <span title="Retrograde Motion"><span className="font-bold text-rose-700 dark:text-rose-300">R</span> = retrograde</span>
              </div>
            </section>
          </div>

          <section className={`${PANEL_CLASS} order-3 min-w-0 xl:col-span-2 xl:row-start-2`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-semibold">Planetary positions</p><p className="mt-0.5 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">Swiss Ephemeris · {zodiacMode === "tropical" ? "Sayana (Tropical)" : "Nirayana (Sidereal)"} · Jaimini karakas</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">Node
                  <span className="relative inline-flex">
                    <select aria-label="Rahu Ketu node mode" value={nodeType} onChange={(event) => setNodeType(event.target.value as "true" | "mean")} className={`${CONTROL_CLASS} h-8 appearance-none pr-8 text-xs`}><option value="true">True Node</option><option value="mean">Mean Node</option></select>
                    <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  </span>
                </label>
                <div role="group" aria-label="Longitude display format" className="flex rounded-lg bg-muted p-1">
                  {([["dms", false], ["decimal", true]] as const).map(([label, decimal]) => <button key={label} type="button" aria-pressed={decimalDegrees === decimal} onClick={() => setDecimalDegrees(decimal)} className={`rounded-md px-2 py-1.5 text-xs ${decimalDegrees === decimal ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground"}`}>{label === "dms" ? "DMS" : "Decimal"}</button>)}
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              {displayData ? <PlanetTable data={displayData} decimal={decimalDegrees} language={language} preferences={viewPreferences} nodeType={nodeType} interceptedSigns={displayData.interceptedSigns} /> : <div className="grid h-60 place-items-center text-xs text-muted-foreground">{displayLoading ? <span className="inline-flex items-center gap-2"><LoaderCircle className="size-4 animate-spin text-primary" /> Calculating positions</span> : "No planetary data"}</div>}
            </div>
            {cuspDetailData && (
              <details className="group mt-3 rounded-lg border border-border bg-muted dark:bg-muted/40">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs marker:content-none">
                  <Crosshair className="size-3.5 text-amber-700 dark:text-amber-300" />
                  <span className="font-medium">{chartStyle === "bhava" ? "Selected Bhava cusps" : houseSystem === "carter" ? "Carter house cusps" : "Bhava Chalit cusps"}</span><span className="text-slate-600">· {chartStyle === "bhava" ? CUSP_SYSTEM_LABELS[cuspSystem] : displayData?.houseCuspSystem}</span>
                  <ChevronDown className="ml-auto size-3.5 text-slate-600 transition group-open:rotate-180" />
                </summary>
                <div className="grid grid-cols-2 gap-1.5 border-t border-slate-200 p-2 sm:grid-cols-3 lg:grid-cols-4 dark:border-slate-800">
                  {cuspDetailCusps.map((cusp, index) => {
                    const next = cuspDetailCusps[(index + 1) % 12];
                    const span = ((next.longitude - cusp.longitude + 360) % 360).toFixed(2);
                    return <div key={cusp.house} className="rounded-md bg-card px-2 py-1.5"><p className="text-xs uppercase text-muted-foreground">House {cusp.house}</p><p className="mt-0.5 truncate font-mono text-xs">{cusp.signName} {degreeToDms(((cusp.longitude % 30) + 30) % 30)}</p><p className="mt-0.5 text-[10px] text-muted-foreground">to {next.signName} · {span}° span</p></div>;
                  })}
                </div>
                {displayCuspLabels && (
                  <div className="border-t border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span><strong>Intercepted:</strong> {displayCuspLabels.interceptedSigns.length ? displayCuspLabels.interceptedSigns.join(", ") : "None"}</span>
                      <span><strong>Double-cusp signs:</strong> {displayCuspLabels.signsWithTwoCusps.length ? displayCuspLabels.signsWithTwoCusps.join(", ") : "None"}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{chartStyle === "bhava" ? "Each house spans its selected cusp to the next cusp." : "Bhava Chalit comparison is available from the chart selector; cusp houses use the start-to-next-cusp spans shown above."}</p>
                  </div>
                )}
              </details>
            )}
            {houseSystem === "carter" && (
              <Suspense fallback={<SecondaryTabSkeleton />}>
                <CarterCuspsPanel
                  result={carterResult}
                  error={carterError}
                  zodiacMode={carterZodiac}
                  onZodiacModeChange={setCarterZodiac}
                  decimal={decimalDegrees}
                />
              </Suspense>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Ascendant", value: displayData?.ascendant.signName ?? "—", icon: Compass, color: "text-amber-700 dark:text-amber-300" },
                { label: "Ayanamsa", value: displayData ? `${displayData.ayanamsa.degrees.toFixed(4)}°` : "—", icon: Orbit, color: "text-cyan-700 dark:text-cyan-300" },
                { label: "Node mode", value: `${nodeType === "true" ? "True" : "Mean"} Node`, icon: ArrowDownUp, color: "text-cyan-700 dark:text-cyan-300" },
                { label: "House system", value: chartStyle === "bhava" ? `Bhava Cusps · ${CUSP_SYSTEM_LABELS[cuspSystem]}` : houseSystem === "carter" ? "Carter (Poli-Equatorial)" : "Whole Sign + Placidus", icon: Globe2, color: "text-slate-600" },
              ].map(({ label, value, icon: Icon, color }) => <div key={label} className="flex items-center gap-2 rounded-lg border border-border bg-muted px-2.5 py-2"><Icon className={`size-3.5 shrink-0 ${color}`} /><div className="min-w-0"><p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p><p className="truncate text-xs">{value}</p></div></div>)}
            </div>
          </section>

        </div>

        </div>
          )}
        </RetainedTab>
        <RetainedTab active={dashboardTab === "ashtakavarga"}>
          {visitedTabs.has("ashtakavarga") && (
            <div className="space-y-5">
              <AshtakavargaTab data={displayData} language={language} useSignIcons={viewPreferences.useSignIcons} />
              <StrengthAnalysisTab data={displayData} />
            </div>
          )}
        </RetainedTab>
        <RetainedTab active={dashboardTab === "medical"}>
          {visitedTabs.has("medical") && (
            <MedicalTab
              data={data}
              transitData={transitData}
              chartMode={chartMode}
              transitLoading={transitLoading}
              transitError={transitError}
            />
          )}
        </RetainedTab>
        <RetainedTab active={dashboardTab === "transit-calendar"}>
          {visitedTabs.has("transit-calendar") && (
            <TransitCalendarTab
              natalPlanets={data?.planets ?? []}
              active={dashboardTab === "transit-calendar"}
              profile={profile}
              ayanamsa={ayanamsa}
              zodiacMode={zodiacMode}
              customAyanamsaDegrees={customAyanamsaDegrees}
              nodeType={nodeType}
            />
          )}
        </RetainedTab>
        </div>
        </div>
      </div>
      {chartSettingsOpen && (
        <ChartSettingsDrawer
          open={chartSettingsOpen}
          onClose={closeChartSettings}
          settings={chartSettings}
          chartStyle={chartStyle}
          onApply={applyChartSettings}
        />
      )}
      {chartMaximized && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#2A211E]/85 p-3 backdrop-blur-md sm:p-6" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setChartMaximized(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="maximized-chart-title" className="flex max-h-full w-full max-w-[min(96vw,1100px)] flex-col rounded-2xl border border-border bg-card p-3 shadow-2xl sm:p-5">
            <header className="mb-2 flex items-center justify-between gap-3">
              <div><h2 id="maximized-chart-title" className="text-sm font-semibold">D1 {chartMode === "transit" ? "Transit" : "Birth"} · {referenceLabel}</h2><p className="text-xs text-slate-600">{chartMode === "transit" ? `${currentTransitLabel} · ${profile.city}` : `${activeBirthProfile.name} · ${formatBirthDate(activeBirthProfile.date)} · ${activeBirthProfile.city}`}</p></div>
              <button type="button" onClick={() => setChartMaximized(false)} aria-label="Close maximized chart" className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Minimize2 className="size-4" /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-muted p-2">
              {primaryChartData && primaryChartAscendant
                ? <div className="relative mx-auto aspect-square w-full max-w-[min(88vh,1000px)] [&>div]:!max-w-none [&>svg]:!max-w-none"><SvgChart style={chartStyle} ascendant={primaryChartAscendant} planets={primaryChartData.planets} points={primaryChartData.points} houseCusps={primaryChartCusps} varga={1} referenceHouse={primaryReferenceHouseNumber} overlay={chartMode === "birth" && overlayTransits ? transitData?.planets : undefined} showTransitLabels={chartMode === "transit" && overlayTransits} language={primaryChartLanguage} preferences={primaryChartPreferences} /></div>
                : <div role={primaryChartError ? "alert" : "status"} className="grid min-h-[50vh] place-items-center px-6 text-center text-sm text-slate-600">{primaryChartError ?? (primaryChartLoading ? "Calculating chart…" : "Chart is unavailable.")}</div>}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"><span>{chartStyle === "bhava" ? `Bhava Cusps · ${CUSP_SYSTEM_LABELS[cuspSystem]}` : chartStyle === "placidus" ? "Placidus · Ascendant at 9 o’clock · MC above IC" : `${chartStyle} · D1 Rasi`}</span><span>{chartMode === "transit" ? "Current transit placements" : overlayTransits ? "Cyan placements are current transits" : "Birth chart placements"}</span></div>
          </section>
        </div>
      )}
    </div>
  );
}

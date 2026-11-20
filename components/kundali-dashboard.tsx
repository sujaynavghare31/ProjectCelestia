"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@clerk/nextjs";
import {
  Activity,
  AlertCircle,
  ArrowDownUp,
  ArrowRight,
  FolderOpen,
  ChevronDown,
  Clock3,
  Compass,
  Crosshair,
  Globe2,
  Info,
  LoaderCircle,
  MapPin,
  Minimize2,
  Orbit,
  Search,
  Save,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import type { CarterZodiac, ChartSettings, ChartStyle, CelestialLanguage, EphemerisResponse, HouseSystem, MidpointPreferences, PlanetPosition, ViewPreferences } from "@/lib/kundali-types";
import PlacidusWheel from "@/components/PlacidusWheel";
import ChartControls from "@/components/ChartControls";
import { getBirthDateTimeDefaults, getCurrentBirthDateTime, useKundaliStore, type BirthProfile } from "@/lib/kundali-store";
import { limitCoordinatePrecision, parseCoordinateDraft } from "@/lib/coordinate-input";
import { matchesSavedProfileQuery } from "@/lib/saved-profile-search";
import { formatPlanetDegree, planetChartDisplayName, planetName, signName } from "@/lib/astrology/localization";
import { splitHouseBodies } from "@/lib/astrology/chart-layout";
import { dagdhaRashis } from "@/lib/astrology/dagdha-rashi";
import { getBirthDateTimeError } from "@/lib/astrology/ephemeris-input";
import { readSavedAstrologyConfig } from "@/lib/astrology/config-storage";
import { calculateCarterCusps, getCarterPlacementCusps, placeInCarterHouses } from "@/lib/astrology/carter-chart";
import { cuspLabels, northCuspAnchor } from "@/lib/astrology/cusp-labels";
import { calculateArudhaPadas, type ArudhaPada } from "@/lib/astrology/arudha-padas";
import { calculateKharaPoints } from "@/lib/astrology/khara-points";
import dynamic from "next/dynamic";
import { readAnalysisPreferences, writeAnalysisPreferences } from "@/lib/astrology/analysis-preferences";
import { createMidpointReport, visibleMidpointRows, visibleMidpointTrees } from "@/lib/astrology/midpoint-chart";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import EphemerisLoader from "@/components/dashboard-tabs/ephemeris-loader";
import {
  clearCachedSavedProfiles,
  fetchSavedProfiles,
  getCachedSavedProfiles,
  removeCachedSavedProfile,
  SavedProfilesRequestError,
  SavedProfilesRequestSupersededError,
  updateCachedSavedProfile,
  type SavedProfile,
} from "@/lib/saved-profiles-cache";

const loadDashaTab = () => import("@/components/dashboard-tabs/DashaDashboard");
const loadAspectsTab = () => import("@/components/dashboard-tabs/aspects-tab");
const loadAshtakavargaTab = () => import("@/components/dashboard-tabs/ashtakavarga-tab");
const loadStrengthAnalysisTab = () => import("@/components/dashboard-tabs/strength-analysis-tab");
const loadMedicalTab = () => import("@/components/dashboard-tabs/medical-tab");
const loadTransitCalendarTab = () => import("@/components/dashboard-tabs/transit-calendar-tab");
const loadMidpointsTab = () => import("@/components/dashboard-tabs/midpoints-tab");
const loadJamakkolTab = () => import("@/components/dashboard-tabs/jamakkol-tab");
const loadShodashvargaTab = () => import("@/components/dashboard-tabs/shodashvarga-tab");
const loadCarterCuspsPanel = () => import("@/components/dashboard-tabs/carter-cusps-panel");
const loadJaiminiDashboard = () => import("@/src/components/jaimini/JaiminiDashboard");
const DashaTab = lazy(loadDashaTab);
const AspectsTab = lazy(loadAspectsTab);
const AshtakavargaTab = lazy(loadAshtakavargaTab);
const StrengthAnalysisTab = lazy(loadStrengthAnalysisTab);
const MedicalTab = lazy(loadMedicalTab);
const TransitCalendarTab = dynamic(loadTransitCalendarTab, {
  loading: () => <SecondaryTabSkeleton />,
});
const MidpointsTab = lazy(loadMidpointsTab);
const JamakkolTab = lazy(loadJamakkolTab);
const ShodashvargaTab = lazy(loadShodashvargaTab);
const CarterCuspsPanel = lazy(loadCarterCuspsPanel);
const JaiminiDashboard = lazy(loadJaiminiDashboard);

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

const KPAstrology = dynamic(() => import("@/components/kp/KPAstrology"), {
  loading: () => (
    <EphemerisLoader
      title="Opening KP Astrology"
      description="Preparing the KP chart and sub-lord analysis…"
      detail="Krishnamurti ayanamsa · KP"
    />
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

function BirthTimeAdjuster({ onAdjust }: { onAdjust: (seconds: number) => void }) {
  const adjustments = [
    { seconds: -300, label: "−5 min", description: "Subtract 5 minutes" },
    { seconds: -60, label: "−1 min", description: "Subtract 1 minute" },
    { seconds: 60, label: "+1 min", description: "Add 1 minute" },
    { seconds: 300, label: "+5 min", description: "Add 5 minutes" },
  ];

  return (
    <div role="group" aria-label="Birth time rectification" className="inline-flex h-[58px] shrink-0 items-center gap-1 rounded-lg border border-border bg-card p-1.5">
      <span className="px-1 text-[10px] font-semibold text-muted-foreground" title="Birth time rectification">BTR</span>
      <div className="flex h-full items-center gap-1">
        {adjustments.map(({ seconds, label, description }) => (
          <button key={seconds} type="button" onClick={() => onAdjust(seconds)} className="h-11 rounded-md px-2 text-[10px] font-semibold tabular-nums text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:h-10" aria-label={description} title={description}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

const CHART_STYLE_LABELS: Record<ChartStyle, string> = {
  diamond: "North",
  south: "South",
  east: "East",
  placidus: "Placidus",
};

type BooleanPreferenceKey = {
  [K in keyof ViewPreferences]-?: ViewPreferences[K] extends boolean ? K : never;
}[keyof ViewPreferences];

type PreferenceOption = {
  key: BooleanPreferenceKey;
  label: string;
  description?: string;
  disabledFor?: ChartStyle[];
};

const CHART_ELEMENT_OPTIONS: PreferenceOption[] = [
  { key: "showHouseLabels", label: "House labels", description: "Show house numbers around the chart." },
  { key: "showSignNumbers", label: "Sign numbers", description: "Use Aries = 1 through Pisces = 12." },
];

const CELESTIAL_BODY_OPTIONS: PreferenceOption[] = [
  { key: "showOuterPlanets", label: "Outer planets", description: "Include Uranus, Neptune, and Pluto." },
  { key: "showUpagrahas", label: "Upagrahas", description: "Include Mandi and Gulika; Mandi marks Saturn’s segment midpoint, while Gulika marks its start." },
  { key: "showAsteroids", label: "Asteroids & points", description: "Include Chiron and Lilith." },
  { key: "showFortune", label: "Part of Fortune", description: "Include the calculated Fortuna point." },
];

const VISUAL_STYLE_OPTIONS: PreferenceOption[] = [
  { key: "usePlanetIcons", label: "Planet glyphs", description: "Use astrological symbols instead of names." },
  { key: "useSignIcons", label: "Sign glyphs", description: "Use zodiac symbols instead of sign names." },
  { key: "showEqualHouses", label: "Equal-house guides", description: "Overlay 30° house divisions.", disabledFor: ["diamond", "south", "east"] },
  { key: "showSignDivisions", label: "Sign divisions", description: "Overlay 30° sign boundaries.", disabledFor: ["diamond", "south", "east"] },
];

function ChartSettingsDrawer({
  open,
  onClose,
  settings,
  chartStyle,
  showBirthTimeAdjuster,
  onAdjustTime,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  settings: ChartSettings;
  chartStyle: ChartStyle;
  showBirthTimeAdjuster: boolean;
  onAdjustTime: (seconds: number) => void;
  onApply: (settings: ChartSettings) => void;
}) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (!open) return;
    setDraft(settings);
    const activeElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), [role='combobox'], [tabindex]:not([tabindex='-1'])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (activeElement instanceof HTMLElement) activeElement.focus();
    };
  }, [onClose, open, settings]);

  if (!open || typeof document === "undefined") return null;

  const setPreference = <K extends keyof ViewPreferences>(key: K, value: ViewPreferences[K]) => {
    setDraft((current) => ({
      ...current,
      viewPreferences: { ...current.viewPreferences, [key]: value },
    }));
  };
  const renderPreferenceOptions = (options: PreferenceOption[]) => (
    <div className="grid gap-2 md:grid-cols-2">
      {options.map(({ key, label, description, disabledFor }) => {
        const unavailable = disabledFor?.includes(chartStyle) ?? false;
        const helperText = unavailable
          ? `Not available for ${CHART_STYLE_LABELS[chartStyle]} charts.`
          : description;
        return (
          <div key={key} className={`flex min-h-[72px] items-start justify-between gap-3 rounded-xl border border-border bg-card p-3 transition ${unavailable ? "" : "hover:border-stone-300 dark:hover:border-stone-600"}`}>
            <span className="min-w-0">
              <span className="block text-xs font-medium">{label}</span>
              {helperText && <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{helperText}</span>}
            </span>
            <Switch
              aria-label={label}
              checked={draft.viewPreferences[key]}
              disabled={unavailable}
              onCheckedChange={(checked) => setPreference(key, checked)}
              className="mt-0.5"
            />
          </div>
        );
      })}
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-[#46332B]/40 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chart-settings-title"
        className="flex h-full w-full flex-col border-l border-border bg-background text-foreground shadow-2xl sm:max-w-md xl:max-w-xl"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top, 0px))",
          paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
          paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
        }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-1 py-4 sm:px-2 sm:py-5">
          <div>
            <h2 id="chart-settings-title" className="text-base font-semibold">Chart Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tune calculations and chart labels.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close chart settings"
            onClick={onClose}
            className="grid size-11 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:size-9"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-1 py-5 sm:px-2 sm:py-6">
          <section aria-labelledby="general-settings-title">
            <h3 id="general-settings-title" className="border-b border-border pb-2 text-sm font-semibold">Core calculations</h3>
            <div className="mt-4 space-y-5">
              <fieldset>
                <legend className="mb-2 text-xs font-medium text-foreground">Zodiac system</legend>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {([
                    ["sidereal", "Sidereal · Nirayana", "Uses an ayanamsa offset."],
                    ["tropical", "Tropical · Sayana", "Uses the seasonal zodiac."],
                  ] as const).map(([mode, label, description]) => (
                    <label key={mode} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${draft.zodiacMode === mode ? "border-primary/30 bg-accent text-accent-foreground" : "border-border bg-card hover:border-primary/40"}`}>
                      <input
                        type="radio"
                        name="chart-zodiac-mode"
                        value={mode}
                        checked={draft.zodiacMode === mode}
                        onChange={() => setDraft((current) => ({ ...current, zodiacMode: mode }))}
                        className="mt-0.5 size-4 accent-primary"
                      />
                      <span>
                        <span className="block text-xs font-semibold">{label}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-medium text-foreground">
                  House cusp system
                  <Select
                    value={draft.houseSystem}
                    onValueChange={(value) => setDraft((current) => ({ ...current, houseSystem: value as HouseSystem }))}
                  >
                    <SelectTrigger aria-label="House cusp system" className="mt-1.5 h-11 w-full md:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[110] !bg-card !text-foreground shadow-md">
                      <SelectItem value="placidus">Placidus</SelectItem>
                      <SelectItem value="carter">Carter (Poli-Equatorial)</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label className="block text-xs font-medium text-foreground">
                  Ayanamsa
                  <Select
                    value={draft.ayanamsa}
                    onValueChange={(value) => setDraft((current) => ({ ...current, ayanamsa: value }))}
                    disabled={draft.zodiacMode === "tropical"}
                  >
                    <SelectTrigger aria-label="Ayanamsa" className="mt-1.5 h-11 w-full md:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[110] !bg-card !text-foreground shadow-md">
                      <SelectItem value="lahiri">Lahiri</SelectItem>
                      <SelectItem value="true-citra">True Citra</SelectItem>
                      <SelectItem value="ss-citra">S.S. Citra</SelectItem>
                      <SelectItem value="ss-revati">S.S. Revati</SelectItem>
                      <SelectItem value="true-revati">True Revati</SelectItem>
                      <SelectItem value="true-pushya">True Pushya</SelectItem>
                      <SelectItem value="true-mula">True Mula</SelectItem>
                      <SelectItem value="de-luce">De Luce</SelectItem>
                      <SelectItem value="usha-shashi">Usha/Shashi</SelectItem>
                      <SelectItem value="djwhal-khul">Djwhal Khul</SelectItem>
                      <SelectItem value="jn-bhasin">J.N. Bhasin</SelectItem>
                      <SelectItem value="babylonian-kugler-1">Babylonian/Kugler 1</SelectItem>
                      <SelectItem value="babylonian-kugler-2">Babylonian/Kugler 2</SelectItem>
                      <SelectItem value="babylonian-kugler-3">Babylonian/Kugler 3</SelectItem>
                      <SelectItem value="babylonian-huber">Babylonian/Huber</SelectItem>
                      <SelectItem value="babylonian-eta-piscium">Babylonian/Eta Piscium</SelectItem>
                      <SelectItem value="babylonian-aldebaran">Babylonian/Aldebaran 15 Tau</SelectItem>
                      <SelectItem value="hipparchos">Hipparchos</SelectItem>
                      <SelectItem value="sassanian">Sassanian</SelectItem>
                      <SelectItem value="galactic-center-0-sag">Galactic Center 0 Sagittarius</SelectItem>
                      <SelectItem value="j2000">J2000</SelectItem>
                      <SelectItem value="j1900">J1900</SelectItem>
                      <SelectItem value="b1950">B1950</SelectItem>
                      <SelectItem value="suryasiddhanta">Suryasiddhanta</SelectItem>
                      <SelectItem value="suryasiddhanta-mean-sun">Suryasiddhanta, mean Sun</SelectItem>
                      <SelectItem value="aryabhata">Aryabhata</SelectItem>
                      <SelectItem value="aryabhata-mean-sun">Aryabhata, mean Sun</SelectItem>
                      <SelectItem value="aryabhata-522">Aryabhata 522</SelectItem>
                      <SelectItem value="babylonian-britton">Babylonian/Britton</SelectItem>
                      <SelectItem value="vedic-sheoran">Vedic/Sheoran</SelectItem>
                      <SelectItem value="galactic-center-cochrane">Cochrane Galactic Center</SelectItem>
                      <SelectItem value="galactic-equator-fiorenza">Galactic Equator (Fiorenza)</SelectItem>
                      <SelectItem value="galactic-equator-iau1958">Galactic Equator (IAU1958)</SelectItem>
                      <SelectItem value="galactic-equator">Galactic Equator</SelectItem>
                      <SelectItem value="galactic-equator-mid-mula">Galactic Equator mid-Mula</SelectItem>
                      <SelectItem value="skydram">Skydram</SelectItem>
                      <SelectItem value="dhruva-galactic-center-mula">Dhruva/Galactic Center/Mula</SelectItem>
                      <SelectItem value="galactic-center-gil-brand">Galactic Center (Gil Brand)</SelectItem>
                      <SelectItem value="vettius-valens">Vettius Valens</SelectItem>
                      <SelectItem value="raman">B.V. Raman</SelectItem>
                      <SelectItem value="krishnamurti">Krishnamurti</SelectItem>
                      <SelectItem value="fagan-bradley">Fagan–Bradley</SelectItem>
                      <SelectItem value="yukteshwar">Yukteshwar</SelectItem>
                      <SelectItem value="custom">Custom Ayanamsa</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label className="block text-xs font-medium text-foreground">
                  Language &amp; initials
                  <Select
                    value={draft.language}
                    onValueChange={(value) => setDraft((current) => ({ ...current, language: value as CelestialLanguage }))}
                    disabled={draft.viewPreferences.usePlanetIcons}
                  >
                    <SelectTrigger aria-label="Chart language" className="mt-1.5 h-11 w-full md:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[110] !bg-card !text-foreground shadow-md">
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="mr">Marathi</SelectItem>
                      <SelectItem value="initials">English · initials</SelectItem>
                    </SelectContent>
                  </Select>
                  {draft.viewPreferences.usePlanetIcons && <span className="mt-1.5 block text-xs text-muted-foreground">Unavailable while planet glyphs are enabled.</span>}
                </label>
              </div>
              {draft.zodiacMode === "sidereal" && draft.ayanamsa === "custom" && (
                <label className="block max-w-sm text-xs font-medium text-foreground">
                  Custom ayanamsa degrees
                  <input
                    aria-label="Custom ayanamsa degrees"
                    type="number"
                    step="0.0001"
                    min="-360"
                    max="360"
                    value={draft.customAyanamsaDegrees}
                    onChange={(event) => setDraft((current) => ({ ...current, customAyanamsaDegrees: Number(event.target.value) }))}
                    className={`${CONTROL_CLASS} mt-1.5 h-11 w-full text-sm md:h-10`}
                  />
                </label>
              )}
            </div>
          </section>
          <section aria-labelledby="display-preferences-title">
            <h3 id="display-preferences-title" className="border-b border-border pb-2 text-sm font-semibold">Display preferences</h3>
            <p className="mt-2 text-xs text-muted-foreground">Choose which labels, bodies, and structural guides appear.</p>
            <div className="mt-3 space-y-5">
              <div>
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground">House and sign labels</h4>
                {renderPreferenceOptions(CHART_ELEMENT_OPTIONS)}
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">Bhava cusp labels</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Show each house cusp in the sign where it starts.</span>
                  </span>
                  <Switch
                    aria-label="Bhava cusp labels"
                    checked={draft.viewPreferences.showBhavaCusps}
                    onCheckedChange={(checked) => setPreference("showBhavaCusps", checked)}
                  />
                </div>
                <fieldset disabled={!draft.viewPreferences.showBhavaCusps} className="mt-3 grid gap-3 sm:grid-cols-3 disabled:opacity-50">
                  <label className="text-xs font-medium">
                    Cusp sign labels
                    <select
                      value={draft.viewPreferences.cuspLabelSignStyle}
                      onChange={(event) => setPreference("cuspLabelSignStyle", event.target.value as ChartSettings["viewPreferences"]["cuspLabelSignStyle"])}
                      className={`${CONTROL_CLASS} mt-1.5 h-11 w-full text-sm md:h-10`}
                    >
                      <option value="short">Short · Vi</option>
                      <option value="full">Full · Virgo</option>
                      <option value="number">Number · 6</option>
                      <option value="hindi">Hindi · कन्या</option>
                      <option value="glyph">Glyph · ♍︎</option>
                    </select>
                  </label>
                  <label className="text-xs font-medium">
                    Cusp degree format
                    <select
                      value={draft.viewPreferences.cuspLabelDegreeFormat}
                      onChange={(event) => setPreference("cuspLabelDegreeFormat", event.target.value as ChartSettings["viewPreferences"]["cuspLabelDegreeFormat"])}
                      className={`${CONTROL_CLASS} mt-1.5 h-11 w-full text-sm md:h-10`}
                    >
                      <option value="dms">DMS · 22°47′10″</option>
                      <option value="dm">Degrees/minutes</option>
                      <option value="decimal">Decimal · 22.79°</option>
                      <option value="compact">Compact</option>
                    </select>
                  </label>
                  <label className="text-xs font-medium">
                    Cusp placement
                    <select
                      value={draft.viewPreferences.cuspLabelStyle}
                      onChange={(event) => setPreference("cuspLabelStyle", event.target.value as ChartSettings["viewPreferences"]["cuspLabelStyle"])}
                      className={`${CONTROL_CLASS} mt-1.5 h-11 w-full text-sm md:h-10`}
                    >
                      <option value="line">On the line</option>
                      <option value="box">In the sign box</option>
                    </select>
                  </label>
                </fieldset>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Additional bodies</h4>
                {renderPreferenceOptions(CELESTIAL_BODY_OPTIONS)}
                <div className="mt-2 rounded-xl border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-xs font-medium">Arudha Padas</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Show Bhava Padas (AL, UL, A2–A11) calculated via Jaimini/Parashara rules.</span>
                    </span>
                    <Switch
                      aria-label="Arudha Padas"
                      checked={draft.viewPreferences.showArudhaPadas}
                      onCheckedChange={(checked) => setPreference("showArudhaPadas", checked)}
                      className="mt-0.5"
                    />
                  </div>
                  {draft.viewPreferences.showArudhaPadas && (
                    <div className="mt-3 inline-flex rounded-lg border border-border bg-muted p-1" role="radiogroup" aria-label="Arudha Pada display">
                      {([
                        ["all", "All 12 Padas"],
                        ["al_ul_only", "AL & UL only"],
                      ] as const).map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          role="radio"
                          aria-checked={draft.viewPreferences.arudhaPadaMode === mode}
                          onClick={() => setPreference("arudhaPadaMode", mode)}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${draft.viewPreferences.arudhaPadaMode === mode ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Visual style</h4>
                {renderPreferenceOptions(VISUAL_STYLE_OPTIONS)}
              </div>
            </div>
          </section>
          {showBirthTimeAdjuster && (
            <section aria-labelledby="birth-time-adjustments-title">
              <h3 id="birth-time-adjustments-title" className="border-b border-border pb-2 text-sm font-semibold">Birth time adjustments</h3>
              <p className="mt-2 text-xs text-muted-foreground">Adjust the birth time to compare nearby chart calculations.</p>
              <div className="mt-3"><BirthTimeAdjuster onAdjust={onAdjustTime} /></div>
            </section>
          )}
        </div>
        <footer className="flex flex-col gap-3 border-t border-border px-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-2">
          <p className="text-xs text-muted-foreground">Your changes stay pending until applied.</p>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={onClose} className="min-h-11 flex-1 rounded-lg border border-border px-3 text-xs font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:min-h-9 sm:flex-none">Cancel</button>
            <button type="button" onClick={() => { onApply(draft); onClose(); }} className="min-h-11 flex-1 rounded-lg bg-[#C64F30] px-3.5 text-xs font-semibold text-white transition hover:bg-[#A94025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C64F30]/40 focus-visible:ring-offset-2 sm:min-h-9 sm:flex-none">Apply Changes</button>
          </div>
        </footer>
      </aside>
    </div>,
    document.body,
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
      <div className="relative aspect-square w-full">
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

export function SvgChart({
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
  const chartHouseForPlanet = (planet: PlanetPosition) => houseBasedPlacement && varga === 1
    ? normalizeSign(planet.house - referenceHouse) + 1
    : getSignHouse(getVargaSign(planet, varga), ascSign);
  const visiblePlanets = planets.filter((planet) => chartPlanetVisible(planet, preferences));
  const visiblePoints = points.filter((planet) => chartPointVisible(planet, preferences));
  const chartBodies = [ascendant, ...visiblePlanets, ...visiblePoints].map((planet) => ({
    ...planet,
    chartSign: getVargaSign(planet, varga),
    chartHouse: chartHouseForPlanet(planet),
    isTransit: showTransitLabels && planet.name !== "Ascendant",
  }));
  const transitBodies = (overlay ?? []).filter((planet) => chartPlanetVisible(planet, preferences)).map((planet) => ({
    ...planet,
    id: `transit-${planet.id}`,
    chartSign: getVargaSign(planet, varga),
    chartHouse: chartHouseForPlanet(planet),
    isTransit: true,
  }));
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
    const sign = normalizeSign(ascSign + index);
    return {
      house: index + 1,
      sign,
      bodies: chartBodies.filter((body) => body.chartHouse === index + 1),
    };
  });
  const houseBodyGroups = houses.map((house) => ({
    house: house.house,
    ...splitHouseBodies([...house.bodies, ...transitBodies.filter((body) => body.chartHouse === house.house)]),
  }));
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
      <div className="relative aspect-square w-full">
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
              <polygon points={polygon} fill={house.house === 1 ? "hsl(var(--champagne-gold) / 0.12)" : "hsl(var(--card))"} stroke="hsl(var(--chart-grid))" strokeWidth="1" />
              <text x={x} y={y - 10} fill="hsl(var(--foreground))" fontSize="8" fontWeight="600" textAnchor="middle">{preferences.showHouseLabels ? `H${house.house} · ` : ""}{chartSignDisplay(house.sign, language, preferences)}</text>
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
                    <text x={x} y={bodyBaseline} fill="hsl(var(--foreground))" fontSize="8" fontWeight="600" textAnchor="middle">
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
          const bodies = houseBodyGroups[signHouse - 1].inline;
          return (
            <div key={sign} className={`flex min-w-0 flex-col items-center justify-center gap-1 border border-slate-200 p-1 text-center dark:border-slate-700 ${signHouse === 1 ? "bg-amber-100/70 dark:bg-amber-400/10" : ""}`}>
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
                  return (
                    <span key={body.id} title={body.name} className={`inline-flex items-center gap-0.5 whitespace-nowrap font-semibold text-foreground ${vargottama ? "rounded-full border border-[#C05A3A] px-1" : ""}`}>
                      {body.isTransit ? "T " : ""}{name}{body.motion === "R" && <span className="font-bold text-foreground">R</span>}
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
    7: [180, 282], 8: [272, 318], 9: [318, 270], 10: [276, 180], 11: [318, 90], 12: [272, 42],
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
        return <polygon key={`sign-fill-${house.house}`} points={polygonByHouse[house.house]} className={signFillClass(house.sign)} />;
      })}
      <path d="M10 10 350 350M350 10 10 350M180 10 350 180 180 350 10 180 180 10" fill="none" stroke="hsl(var(--chart-grid))" strokeWidth="1" />
      {houses.map((house) => {
        const [x, y] = centers[house.house];
        const isAscHouse = house.house === 1;
        const inlineBodies = houseBodyGroups[house.house - 1].inline;
        const compactBottomBodies = y >= 300 && inlineBodies.length >= 3;
        const bodyLineHeight = y >= 270 ? (compactBottomBodies ? 8 : 10) : 13;
        const bodyStartY = compactBottomBodies ? y - 2 : y + 10;
        return (
          <g key={house.house}>
            <text x={x} y={y - 15} fill="hsl(var(--foreground))" fontSize="9" textAnchor="middle">{preferences.showHouseLabels ? isAscHouse ? "1ST HOUSE" : `H${house.house}` : ""}{preferences.showHouseLabels ? " · " : ""}{chartSignDisplay(house.sign, language, preferences).toUpperCase()}</text>
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
              const labelWidth = name.length * 5 + (body.isTransit ? 8 : 0) + (body.motion === "R" ? 5 : 0) + 4;
              return (
                <g key={body.id} opacity={isHighlighted(body, vargottama) ? 1 : 0.4} filter={isHighlighted(body, vargottama) && hoveredPlanet !== null ? "drop-shadow(0 0 6px hsl(var(--foreground)))" : undefined} onMouseEnter={() => onBodyEnter(body)} onMouseLeave={() => setHoveredPlanet(null)}>
                  {body.motion === "R" && <title>Retrograde Motion</title>}
                  {vargottama && <rect x={x - labelWidth / 2} y={bodyY - 9} width={labelWidth} height="12" rx="4" fill="none" stroke="#C05A3A" strokeWidth="1" />}
                  <text x={x} y={bodyY} fill={bodyColor} fontSize={compactBottomBodies ? "8" : "10"} fontWeight={body.name === "Ascendant" ? "700" : "600"} textAnchor="middle">
                    {body.isTransit ? "T " : ""}{name}{body.motion === "R" && <tspan fill="hsl(var(--foreground))" fontSize="8" fontWeight="800" dy="-3">ᴿ</tspan>}
                  </text>
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
                      <span title={`Baladi: ${detailedAvastha.baladi.state}`} className="rounded bg-muted px-1.5 py-0.5"><strong>Bal</strong> {detailedAvastha.baladi.state}</span>
                      <span title={`Jagradadi: ${detailedAvastha.jagradadi.state}. ${detailedAvastha.jagradadi.reasons.join(" ")}`} className="rounded bg-muted px-1.5 py-0.5"><strong>Jag</strong> {detailedAvastha.jagradadi.state}</span>
                      {detailedAvastha.shayanadi && <span title={`Shayanadi: ${detailedAvastha.shayanadi.state}`} className="rounded bg-muted px-1.5 py-0.5"><strong>Sha</strong> {detailedAvastha.shayanadi.state}</span>}
                      {!!detailedAvastha.lajjitadi?.length && <span title={`Lajjitadi: ${detailedAvastha.lajjitadi.map(({ state }) => state).join(", ")}`} className="rounded bg-muted px-1.5 py-0.5"><strong>Laj</strong> {detailedAvastha.lajjitadi.map(({ state }) => state).join(", ")}</span>}
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
                          <span title={`Baladi: ${detailedAvastha.baladi.state}`} className="rounded bg-muted px-1.5 py-0.5"><strong>Bal</strong> {detailedAvastha.baladi.state}</span>
                          <span title={`Jagradadi: ${detailedAvastha.jagradadi.state}. ${detailedAvastha.jagradadi.reasons.join(" ")}`} className="rounded bg-muted px-1.5 py-0.5"><strong>Jag</strong> {detailedAvastha.jagradadi.state}</span>
                          {detailedAvastha.shayanadi && <span title={`Shayanadi: ${detailedAvastha.shayanadi.state}`} className="rounded bg-muted px-1.5 py-0.5"><strong>Sha</strong> {detailedAvastha.shayanadi.state}</span>}
                          {!!detailedAvastha.lajjitadi?.length && <span title={`Lajjitadi: ${detailedAvastha.lajjitadi.map(({ state }) => state).join(", ")}`} className="rounded bg-muted px-1.5 py-0.5"><strong>Laj</strong> {detailedAvastha.lajjitadi.map(({ state }) => state).join(", ")}</span>}
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

function dashboardTabFromLocation(): DashboardTab {
  const value = new URLSearchParams(window.location.search).get("tab");
  return value === "jamakkol" || DASHBOARD_TABS.some(({ id }) => id === value) ? value as DashboardTab : "core";
}

function preloadDashboardTab(tab: DashboardTab) {
  if (tab === "kp") return;
  const loaders = {
    dasha: loadDashaTab,
    aspects: loadAspectsTab,
    midpoints: loadMidpointsTab,
    ashtakavarga: () => Promise.all([loadAshtakavargaTab(), loadStrengthAnalysisTab()]),
    medical: loadMedicalTab,
    "transit-calendar": loadTransitCalendarTab,
    jamakkol: loadJamakkolTab,
    shodashvarga: loadShodashvargaTab,
    jaimini: loadJaiminiDashboard,
  };
  if (tab === "core") return;
  void loaders[tab]().catch((error: unknown) => {
    console.error(`[kundali] Unable to preload ${tab} tab`, error);
  });
}

function SecondaryTabSkeleton() {
  return (
    <EphemerisLoader
      title="Opening astrology analysis"
      description="Preparing the calculations and chart views…"
      detail="Kundali analysis"
      activity="Loading analysis"
      tone="dashboard"
    />
  );
}

interface GeocodeResult {
  label: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

const CONTROL_CLASS = "h-9 rounded-lg border border-input bg-card px-2.5 text-xs text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40";
const PANEL_CLASS = "min-w-0 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm md:rounded-2xl md:border-stone-200/80 md:shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

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

function SaveChartDialog({
  open,
  saving,
  chartName,
  chartSummary,
  existingChart,
  mode,
  saveError,
  onClose,
  onChartNameChange,
  onModeChange,
  onSave,
}: {
  open: boolean;
  saving: boolean;
  chartName: string;
  chartSummary: string;
  existingChart: boolean;
  mode: "update" | "copy";
  saveError: string | null;
  onClose: () => void;
  onChartNameChange: (name: string) => void;
  onModeChange: (mode: "update" | "copy") => void;
  onSave: (mode: "update" | "copy", name: string) => void;
}) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nameInputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open, saving]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[#46332B]/45 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-chart-dialog-title"
        className="w-full max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card text-card-foreground shadow-2xl sm:max-w-lg"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 id="save-chart-dialog-title" className="text-base font-semibold">
              {existingChart && mode === "update" ? "Update saved chart" : existingChart ? "Save a new copy" : "Name your chart"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {existingChart ? "Choose whether to update this chart or save a separate copy." : "Add a name so you can find this chart again."}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close save chart dialog"
            onClick={onClose}
            disabled={saving}
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(mode, chartName.trim());
          }}
        >
          <div className="space-y-4 px-5 py-5 sm:px-6">
            {saveError && (
              <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                {saveError}
              </p>
            )}
            {existingChart && (
              <fieldset className="grid gap-2 sm:grid-cols-2">
                <legend className="sr-only">Save action</legend>
                <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${mode === "update" ? "border-[#C05A3A]/40 bg-[#C05A3A]/5" : "border-border"}`}>
                  <input type="radio" name="save-action" value="update" checked={mode === "update"} onChange={() => onModeChange("update")} className="accent-[#C05A3A]" />
                  Update existing
                </label>
                <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${mode === "copy" ? "border-[#C05A3A]/40 bg-[#C05A3A]/5" : "border-border"}`}>
                  <input type="radio" name="save-action" value="copy" checked={mode === "copy"} onChange={() => onModeChange("copy")} className="accent-[#C05A3A]" />
                  Save as new copy
                </label>
              </fieldset>
            )}
            <label htmlFor="save-chart-name" className="block text-sm font-medium">
              Chart name
              <input
                ref={nameInputRef}
                id="save-chart-name"
                type="text"
                maxLength={100}
                required
                autoFocus
                value={chartName}
                onChange={(event) => onChartNameChange(event.target.value)}
                placeholder="e.g. My birth chart"
                className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus:border-[#C05A3A] focus:ring-2 focus:ring-[#C05A3A]/30 sm:text-sm"
                disabled={saving}
              />
            </label>
            <p className="truncate rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground" title={chartSummary}>
              {chartSummary}
            </p>
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving || !chartName.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#C05A3A] px-4 text-sm font-semibold text-white transition hover:bg-[#A94025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40 disabled:cursor-wait disabled:opacity-60">
              {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              {saving ? "Saving…" : existingChart && mode === "update" ? "Update existing" : existingChart ? "Save as new copy" : "Save chart"}
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}

function SavedChartsDialog({
  open,
  loading,
  profiles,
  query,
  deletingId,
  actionError,
  actionMessage,
  onQueryChange,
  onClose,
  onCreateFirstChart,
  onSelect,
  onDelete,
}: {
  open: boolean;
  loading: boolean;
  profiles: SavedProfile[];
  query: string;
  deletingId: string | null;
  actionError: string | null;
  actionMessage: string | null;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onCreateFirstChart: () => void;
  onSelect: (profile: SavedProfile) => void;
  onDelete: (profile: SavedProfile) => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    searchRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  const visibleProfiles = profiles.filter((profile) => matchesSavedProfileQuery(profile, query));

  return createPortal(
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center bg-[#46332B]/45 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-charts-dialog-title"
        className="flex max-h-[min(720px,calc(100vh-1.5rem))] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl sm:max-h-[min(760px,calc(100vh-3rem))]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#E8D3C5] bg-[#FCE9DC] px-5 py-4 text-[#563528] dark:border-[#59443B] dark:bg-[#382D29] dark:text-[#F7E5D9] sm:px-6">
          <div>
            <h2 id="saved-charts-dialog-title" className="text-lg font-semibold">All saved charts</h2>
            <p className="mt-1 text-sm text-[#714F3D] dark:text-[#E5C8B7]">Choose a profile to open in your chart workspace.</p>
          </div>
          <button type="button" aria-label="Close saved charts" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#D9BAA6] transition hover:bg-[#F6DAC8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6522B]/40 dark:border-[#70574B] dark:hover:bg-[#493A34] dark:focus-visible:ring-[#F2B993]/50">
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="border-b border-border bg-card p-4 sm:p-5">
          <label className="relative block">
            <span className="sr-only">Search saved charts</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search names, notes, birth date, time, or any detail"
              className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {actionError && <p role="alert" className="border-b border-border px-5 py-3 text-sm text-rose-800 dark:text-rose-200">{actionError}</p>}
          {actionMessage && <p role="status" className="border-b border-border px-5 py-3 text-sm text-emerald-700 dark:text-emerald-300">{actionMessage}</p>}
          {loading ? (
            <div role="status" aria-label="Loading saved charts" className="divide-y divide-border">
              <p className="flex items-center gap-2 px-5 py-3 text-xs text-muted-foreground">
                <LoaderCircle className="size-3.5 animate-spin text-primary" aria-hidden="true" />
                Loading your saved charts
              </p>
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} aria-hidden="true" className="flex items-center gap-3 px-5 py-4 sm:px-6">
                  <div className="size-10 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-44 max-w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
                    <div className="h-3 w-56 max-w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleProfiles.length ? (
            <ul className="divide-y divide-border">
              {visibleProfiles.map((saved) => (
                <li key={saved.id}>
                  <div className="flex items-center gap-2 px-5 py-4 sm:px-6">
                    <button type="button" onClick={() => onSelect(saved)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left transition hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <Orbit className="size-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{saved.chartName || saved.fullName}</span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">{saved.city || "Coordinates"} · {saved.dateOfBirth} · {saved.timeOfBirth}</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                    {confirmingDeleteId === saved.id ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onDelete(saved)}
                          disabled={deletingId !== null}
                          className="h-9 rounded-lg bg-rose-700 px-3 text-xs font-semibold text-white transition hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 disabled:cursor-wait disabled:opacity-60"
                        >
                          {deletingId === saved.id ? "Removing…" : "Remove"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(null)}
                          disabled={deletingId !== null}
                          className="h-9 rounded-lg border border-border px-3 text-xs font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(saved.id)}
                        disabled={deletingId !== null}
                        aria-label={`Remove ${saved.chartName || saved.fullName}`}
                        className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 disabled:opacity-60 dark:hover:border-rose-800 dark:hover:bg-rose-950/30 dark:hover:text-rose-200"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-12 text-center sm:px-6">
              <span className="mx-auto grid size-11 place-items-center rounded-full bg-[#F9E8DD] text-[#A6522B] dark:bg-[#45342D] dark:text-[#F2B993]">
                <Orbit className="size-6" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-medium">{profiles.length ? "No matching charts" : "You don’t have any saved charts yet"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{profiles.length ? "Try a different search." : "Save your first chart and continue your journey with Jyotishi."}</p>
              {!profiles.length && (
                <button
                  type="button"
                  onClick={onCreateFirstChart}
                  className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-[#C64F30] px-4 text-sm font-semibold text-white transition hover:bg-[#A94025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C64F30]/40 focus-visible:ring-offset-2"
                >
                  Save your first chart
                </button>
              )}
            </div>
          )}
        </div>

        <footer className="border-t border-border bg-muted/40 px-5 py-3 text-center text-xs text-muted-foreground sm:px-6">
          {profiles.length} {profiles.length === 1 ? "saved chart" : "saved charts"}
        </footer>
      </section>
    </div>,
    document.body,
  );
}

const PROFILE_DRAFT_STORAGE_KEY = "project-celestia:profile-draft";

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
  const [submittedProfile, setSubmittedProfile] = useState<BirthProfile | null>(null);
  const [profileCollapsed, setProfileCollapsed] = useState(false);
  const [transitData, setTransitData] = useState<EphemerisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitLoading, setTransitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitError, setTransitError] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState("Ascendant");
  const [auxiliaryReferenceName, setAuxiliaryReferenceName] = useState("Ascendant");
  const [overlayTransits, setOverlayTransits] = useState(false);
  const [transitRefreshKey, setTransitRefreshKey] = useState(0);
  const [chartMaximized, setChartMaximized] = useState(false);
  const [chartSettingsOpen, setChartSettingsOpen] = useState(false);
  const closeChartSettings = useCallback(() => setChartSettingsOpen(false), []);
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
  const notesPopoverRef = useRef<HTMLDivElement>(null);
  const [chartMode, setChartMode] = useState<"transit" | "birth">("transit");
  const [transitDate, setTransitDate] = useState(() => getCurrentBirthDateTime().date);
  const [transitTime, setTransitTime] = useState(() => getCurrentBirthDateTime().time);
  const [transitMode, setTransitMode] = useState<"current" | "specific">("current");
  const [savedProfileId, setSavedProfileId] = useState<string | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);
  const [savedProfilesOpen, setSavedProfilesOpen] = useState(false);
  const [savedProfilesLoading, setSavedProfilesLoading] = useState(false);
  const [savedProfilesQuery, setSavedProfilesQuery] = useState("");
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
  const [locationSearch, setLocationSearch] = useState(profile.city);
  const [useCoordinates, setUseCoordinates] = useState(false);
  const [latitudeDraft, setLatitudeDraft] = useState(profile.lat.toFixed(2));
  const [longitudeDraft, setLongitudeDraft] = useState(profile.lng.toFixed(2));
  const [analysisPreferencesLoaded, setAnalysisPreferencesLoaded] = useState(false);
  const [locationResults, setLocationResults] = useState<GeocodeResult[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [coordinateTimezoneError, setCoordinateTimezoneError] = useState<string | null>(null);
  const initialProfileSubmitted = useRef(false);
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

  useEffect(() => {
    const state = useKundaliStore.getState();
    const saved = readAnalysisPreferences({
      houseSystem: state.houseSystem,
      carterZodiac: state.carterZodiac,
      midpointPreferences: state.midpointPreferences,
      showArudhaPadas: state.viewPreferences.showArudhaPadas,
      arudhaPadaMode: state.viewPreferences.arudhaPadaMode,
    });
    if (saved) {
      setHouseSystem(saved.houseSystem);
      setCarterZodiac(saved.carterZodiac);
      setMidpointPreferences(saved.midpointPreferences);
      setViewPreference("showArudhaPadas", saved.showArudhaPadas);
      setViewPreference("arudhaPadaMode", saved.arudhaPadaMode);
    }
    setAnalysisPreferencesLoaded(true);
  }, [setHouseSystem, setCarterZodiac, setMidpointPreferences, setViewPreference]);

  useEffect(() => {
    if (!analysisPreferencesLoaded) return;
    writeAnalysisPreferences({
      houseSystem,
      carterZodiac,
      midpointPreferences,
      showArudhaPadas: viewPreferences.showArudhaPadas,
      arudhaPadaMode: viewPreferences.arudhaPadaMode,
    });
  }, [analysisPreferencesLoaded, houseSystem, carterZodiac, midpointPreferences, viewPreferences.showArudhaPadas, viewPreferences.arudhaPadaMode]);

  useEffect(() => {
    const syncTab = () => setDashboardTab(dashboardTabFromLocation());
    syncTab();
    window.addEventListener("popstate", syncTab);
    return () => window.removeEventListener("popstate", syncTab);
  }, []);

  useEffect(() => {
    if (navigationRequest) setDashboardTab(navigationRequest.tab);
  }, [navigationRequest]);

  useEffect(() => {
    const defaults = getBirthDateTimeDefaults(profile);
    if (defaults) setProfile(defaults);
  }, [profile.date, profile.time, setProfile]);

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
    setSavedProfileId(null);
    setLocationSearch(draft.city);
    setLatitudeDraft(draft.lat.toFixed(2));
    setLongitudeDraft(draft.lng.toFixed(2));
    setUseCoordinates(false);
    initialProfileSubmitted.current = true;
    setSubmittedProfile({ ...draft, name: draft.name.trim() || "Birth chart" });
    setProfileCollapsed(true);
    setChartMode("birth");
    setProfileActionMessage("Your chart details were restored. Choose Save chart to add them to your account.");
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
    setLocationSearch(profile.city);
  }, [profile.city]);

  useEffect(() => {
    if (profile.notes && window.matchMedia("(max-width: 1023px)").matches) setNotesExpanded(true);
  }, [profile.notes]);

  useEffect(() => {
    if (!notesExpanded) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (notesPopoverRef.current && !notesPopoverRef.current.contains(event.target as Node)) setNotesExpanded(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotesExpanded(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notesExpanded]);

  useEffect(() => {
    const query = locationSearch.trim();
    if (query.length < 3 || query === profile.city) {
      setLocationResults([]);
      setLocationError(null);
      setLocationLoading(false);
      return;
    }

    let isMounted = true;
    const timeout = window.setTimeout(async () => {
      setLocationLoading(true);
      setLocationError(null);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const result = await response.json() as { results?: GeocodeResult[]; error?: string };
        if (!isMounted) return;
        if (!response.ok || result.error) throw new Error(result.error ?? `Place search failed (${response.status}).`);
        if (!Array.isArray(result.results)) throw new Error("Place search returned an invalid result.");
        setLocationResults(result.results);
      } catch (requestError) {
        if (!isMounted) return;
        setLocationError(requestError instanceof Error ? requestError.message : "Unable to search for this location.");
      } finally {
        if (isMounted) setLocationLoading(false);
      }
    }, 850);
    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, [locationSearch, profile.city]);

  useEffect(() => {
    if (!Number.isFinite(profile.lat) || !Number.isFinite(profile.lng)) return;
    if (
      chartMode === "birth"
      && submittedProfile?.id
      && submittedProfile.lat === profile.lat
      && submittedProfile.lng === profile.lng
      && submittedProfile.timezone === profile.timezone
    ) return;

    let isMounted = true;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/geocode?lat=${encodeURIComponent(profile.lat)}&lng=${encodeURIComponent(profile.lng)}`);
        const result = await response.json() as { timezone?: string; error?: string };
        if (!isMounted) return;
        if (!response.ok || !result.timezone) throw new Error(result.error ?? `Time zone lookup failed (${response.status}).`);
        setCoordinateTimezoneError(null);
        if (result.timezone !== profile.timezone) setProfile({ timezone: result.timezone });
      } catch (requestError) {
        if (!isMounted) return;
        setCoordinateTimezoneError(requestError instanceof Error ? requestError.message : "Could not update the birth place time zone.");
      }
    }, 350);
    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, [profile.lat, profile.lng, profile.timezone, chartMode, submittedProfile]);

  useEffect(() => {
    const previousUserId = previousSavedProfilesUserId.current;
    if (previousUserId && previousUserId !== clerkUserId) {
      clearCachedSavedProfiles(previousUserId);
      setSavedProfiles([]);
      setSavedProfilesOpen(false);
      setSavedProfilesLoading(false);
      setProfileActionError(null);
    }
    previousSavedProfilesUserId.current = clerkUserId ?? null;

    if (!isSignedIn || !clerkUserId) {
      setSavedProfiles([]);
      return;
    }

    const cached = getCachedSavedProfiles(clerkUserId);
    if (cached) setSavedProfiles(cached);
    if (loading) return;

    let active = true;
    const timeout = window.setTimeout(() => {
      void fetchSavedProfiles(clerkUserId)
        .then((profiles) => {
          if (active) setSavedProfiles(profiles);
        })
        .catch((requestError: unknown) => {
          if (requestError instanceof SavedProfilesRequestSupersededError) return;
          console.warn("[saved-charts] Background prefetch failed", requestError);
        });
    }, 900);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [clerkUserId, isSignedIn, loading]);

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
    if (!useCoordinates && locationSearch.trim() !== profile.city.trim()) {
      setSaveDialogError("Choose a birth city from the search suggestions before saving.");
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
      setSavedProfiles((current) => [saved, ...current.filter(({ id }) => id !== saved.id)]);
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
    const savedProfile = savedProfiles.find(({ id }) => id === savedProfileId);
    const enteredChartName = profile.name.trim() === "Current transit" ? "" : profile.name.trim();
    setSaveDialogMode("update");
    setSaveDialogName(
      enteredChartName ||
      savedProfile?.chartName ||
      savedProfile?.fullName ||
      "",
    );
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
  const startFirstChartSave = () => {
    setSavedProfilesOpen(false);
    if (!isSignedIn) {
      redirectToSignIn();
      return;
    }
    setSaveDialogError(null);
    setSaveDialogMode("copy");
    setSaveDialogName("");
    setSaveDialogOpen(true);
  };
  const toggleSavedProfiles = async () => {
    setProfileActionError(null);
    setProfileActionMessage(null);
    if (savedProfilesOpen) {
      setSavedProfilesOpen(false);
      return;
    }

    if (!isSignedIn || !clerkUserId) {
      redirectToSignIn();
      return;
    }

    setSavedProfilesQuery("");
    setSavedProfilesOpen(true);
    const cached = getCachedSavedProfiles(clerkUserId);
    if (cached) setSavedProfiles(cached);
    setSavedProfilesLoading(!cached);
    try {
      const profiles = await fetchSavedProfiles(clerkUserId);
      if (previousSavedProfilesUserId.current === clerkUserId) setSavedProfiles(profiles);
    } catch (reason) {
      if (previousSavedProfilesUserId.current !== clerkUserId) return;
      if (reason instanceof SavedProfilesRequestSupersededError) return;
      if (reason instanceof SavedProfilesRequestError && reason.status === 401) {
        clearCachedSavedProfiles(clerkUserId);
        setSavedProfiles([]);
        redirectToSignIn();
        return;
      }
      if (cached) {
        console.warn("[saved-charts] Background refresh failed; showing cached charts", reason);
      } else {
        setProfileActionError(reason instanceof Error ? reason.message : "Saved charts could not be loaded. Please try again.");
      }
    } finally {
      if (previousSavedProfilesUserId.current === clerkUserId) setSavedProfilesLoading(false);
    }
  };
  const deleteSavedProfile = async (saved: SavedProfile) => {
    setProfileActionError(null);
    setProfileActionMessage(null);
    setDeletingProfileId(saved.id);
    try {
      const response = await fetch(`/api/profiles?id=${encodeURIComponent(saved.id)}`, { method: "DELETE" });
      if (response.status === 401) {
        redirectToSignIn();
        return;
      }
      const result = await readProfileApiResponse<{ id?: string; error?: string }>(response);
      if (!response.ok || result.id !== saved.id) throw new Error(result.error ?? "Chart could not be removed.");
      if (previousSavedProfilesUserId.current !== clerkUserId) return;
      setSavedProfiles((current) => current.filter(({ id }) => id !== saved.id));
      if (clerkUserId) removeCachedSavedProfile(clerkUserId, saved.id);
      if (savedProfileId === saved.id) setSavedProfileId(null);
      setProfileActionMessage(`${saved.chartName || saved.fullName} was removed from your saved charts.`);
    } catch (reason) {
      setProfileActionError(reason instanceof Error ? reason.message : "Chart could not be removed. Please try again.");
    } finally {
      setDeletingProfileId(null);
    }
  };
  const selectSavedProfile = (saved: SavedProfile) => {
    const nextProfile: BirthProfile = {
      id: saved.id,
      name: saved.chartName ?? saved.fullName,
      sex: saved.sex,
      date: saved.dateOfBirth,
      time: saved.timeOfBirth,
      lat: saved.latitude,
      lng: saved.longitude,
      timezone: saved.timezone,
      city: saved.city ?? "",
      notes: saved.notes,
    };
    setProfile(nextProfile);
    setSavedProfileId(saved.id);
    setLatitudeDraft(saved.latitude.toFixed(2));
    setLongitudeDraft(saved.longitude.toFixed(2));
    setLocationSearch(saved.city ?? "");
    setUseCoordinates(false);
    setSubmittedProfile({ ...nextProfile, name: nextProfile.name.trim() || "Birth chart" });
    setProfileCollapsed(true);
    setChartMode("birth");
    setData(null);
    setLoading(true);
    setError(null);
    setProfileActionMessage(`Loaded ${saved.chartName || saved.fullName}.`);
    setSavedProfilesOpen(false);
  };
  const chooseLocation = (location: GeocodeResult) => {
    setProfile({
      city: location.city,
      lat: location.latitude,
      lng: location.longitude,
      timezone: location.timezone,
    });
    setLatitudeDraft(location.latitude.toFixed(2));
    setLongitudeDraft(location.longitude.toFixed(2));
    setUseCoordinates(false);
    setLocationSearch(location.city);
    setLocationResults([]);
    setLocationError(null);
  };
  const useCurrentLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Location access is unavailable in this browser. Search for a city or enter coordinates instead.");
      return;
    }

    setCurrentLocationLoading(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const { latitude, longitude } = coords;
      void fetch(`/api/geocode?lat=${latitude}&lng=${longitude}&reverse=true`)
        .then(async (response) => {
          const result = await response.json() as { timezone?: string; city?: string; error?: string };
          if (!response.ok || !result.timezone || !result.city) {
            throw new Error(result.error ?? `Current location lookup failed (${response.status}).`);
          }
          chooseLocation({
            label: result.city,
            city: result.city,
            latitude,
            longitude,
            timezone: result.timezone,
          });
        })
        .catch((requestError: unknown) => {
          setLocationError(requestError instanceof Error ? requestError.message : "Unable to identify this location. Search for a city or enter coordinates instead.");
        })
        .finally(() => setCurrentLocationLoading(false));
    }, (error) => {
      const message = error.code === error.PERMISSION_DENIED
        ? "Location access was denied. Search for a city or enter coordinates instead."
        : error.code === error.TIMEOUT
          ? "Location lookup timed out. Search for a city or enter coordinates instead."
          : "Your device could not determine its location. Search for a city or enter coordinates instead.";
      setLocationError(message);
      setCurrentLocationLoading(false);
    }, { maximumAge: 600_000, timeout: 8_000 });
  };
  const adjustBirthTime = (seconds: number) => {
    adjustTime(seconds);
    const adjustedProfile = useKundaliStore.getState().profile;
    setSubmittedProfile((current) => current ? { ...current, date: adjustedProfile.date, time: adjustedProfile.time } : current);
  };
  const selectDashboardTab = (nextTab: DashboardTab) => {
    setDashboardTab(nextTab);
    const url = new URL(window.location.href);
    if (nextTab === "core") url.searchParams.delete("tab");
    else url.searchParams.set("tab", nextTab);
    window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
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
  const displayLoading = chartMode === "transit" ? transitLoading : loading;
  const displayError = chartMode === "transit" ? transitError : error;
  const kharaPoints = useMemo(() => {
    if (!displayData) return [];
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
  }, [displayData]);
  useEffect(() => {
    if (displayData && !displayLoading) setProfileCollapsed(true);
  }, [displayData, displayLoading]);
  const displayCuspLabels = useMemo(() => {
    if (!displayData || displayData.houseCusps.length !== 12) return null;
    return cuspLabels(
      displayData.houseCusps.map((cusp) => cusp.longitude),
      {
        signStyle: viewPreferences.cuspLabelSignStyle,
        degreeFormat: viewPreferences.cuspLabelDegreeFormat,
      },
      displayData.ascendant.longitude,
    );
  }, [displayData, viewPreferences.cuspLabelDegreeFormat, viewPreferences.cuspLabelSignStyle]);
  const midpointReport = useMemo(
    () => createMidpointReport(displayData, midpointPreferences),
    [displayData, midpointPreferences],
  );
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
      ? "Midpoint analysis uses sidereal longitudes. Switch the chart to Sidereal · Nirayana in Chart Settings."
      : null;
  const activeBirthProfile = submittedProfile ?? profile;
  const normalizeChartName = (name: string) => name === "Current transit" ? "" : name.trim() || "Birth chart";
  const chartInputsChanged = Boolean(submittedProfile && (
    normalizeChartName(profile.name) !== normalizeChartName(submittedProfile.name)
    || profile.sex !== submittedProfile.sex
    || profile.date !== submittedProfile.date
    || profile.time !== submittedProfile.time
    || locationSearch.trim() !== submittedProfile.city.trim()
    || profile.lat !== submittedProfile.lat
    || profile.lng !== submittedProfile.lng
  ));
  const referenceHouseNumber = getReferenceHouse(referenceName, displayData?.planets ?? []);
  const referenceLabel = referenceName === "Ascendant"
    ? "Ascendant"
    : ["Sun", "Moon", "Jupiter"].includes(referenceName)
      ? `${referenceName} reference`
      : `House ${referenceHouseNumber}`;
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
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 lg:hidden">
            <div id="chart-profile" className="flex items-center gap-2 scroll-mt-4">
              <span className="grid size-7 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"><Orbit className="size-4" /></span>
              <p className="text-xs font-semibold">Chart profile</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={openSaveDialog} disabled={savingProfile} className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition hover:border-primary/60 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-wait disabled:opacity-60">
                <Save aria-hidden="true" className="size-3.5" />
                {saveButtonLabel}
              </button>
              <button type="button" onClick={toggleSavedProfiles} aria-expanded={savedProfilesOpen} className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition hover:border-primary/60 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                <FolderOpen aria-hidden="true" className="size-3.5" />
                {savedProfilesOpen ? "Close saved" : "Load saved"}
              </button>
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
            <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-[minmax(100px,1.15fr)_minmax(74px,0.8fr)_minmax(125px,1fr)_minmax(125px,1fr)_minmax(180px,1.6fr)_minmax(100px,0.9fr)_minmax(100px,0.9fr)_minmax(140px,1.2fr)]">
              <label className="flex min-w-0 flex-col text-xs font-medium text-slate-700 dark:text-slate-300">
                Chart name
                <input aria-label="Chart name" type="text" maxLength={100} value={profile.name === "Current transit" ? "" : profile.name} placeholder="Enter Jataka's name" onChange={(event) => setProfile({ name: event.target.value })} className={`${CONTROL_CLASS} mt-1 h-11 w-full text-base placeholder:text-slate-600 dark:placeholder:text-slate-400 md:text-sm lg:h-9`} />
              </label>
              <label className="flex min-w-0 flex-col text-xs font-medium text-slate-700 dark:text-slate-300">Gender
                <select aria-label="Gender" value={profile.sex} onChange={(event) => setProfile({ sex: event.target.value as BirthProfile["sex"] })} className={`${CONTROL_CLASS} mt-1 h-11 w-full min-w-0 px-2 pr-9 text-base md:text-sm lg:h-9`}>
                  <option value="not-applicable">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>
              <div className="grid min-w-0 grid-cols-2 gap-2.5 md:contents">
                <label className="flex min-w-0 flex-col text-xs font-medium text-slate-700 dark:text-slate-300">Birth date
                  <input aria-label="Birth date" type="date" required value={profile.date} onChange={(event) => setProfile({ date: event.target.value })} className={`${CONTROL_CLASS} mt-1 box-border h-11 w-full min-w-0 max-w-full px-2 text-base md:text-sm lg:h-9`} />
                </label>
                <label className="flex min-w-0 flex-col text-xs font-medium text-slate-700 dark:text-slate-300">Birth time
                  <input aria-label="Time of birth" type="time" step={1} value={profile.time} onChange={(event) => {
                    const time = event.target.value;
                    setProfile({ time: time ? (time.length === 5 ? `${time}:00` : time) : "" });
                  }} required className={`${CONTROL_CLASS} mt-1 box-border h-11 w-full min-w-0 max-w-full px-2 text-base font-mono md:text-sm lg:h-9`} />
                </label>
              </div>
              <div className="relative min-w-0 text-xs font-medium text-slate-700 dark:text-slate-300">
                {!useCoordinates ? (
                  <>
                    <label htmlFor="birth-city-search">Birth city</label>
                    <span className="relative mt-1 block">
                      <MapPin className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                      <input id="birth-city-search" aria-label="Birth city; search anywhere" type="search" maxLength={160} value={locationSearch} onChange={(event) => setLocationSearch(event.target.value)} placeholder="Search city…" autoComplete="off" aria-autocomplete="list" aria-expanded={locationResults.length > 0} className={`${CONTROL_CLASS} h-11 w-full min-w-0 pl-8 pr-24 text-base md:text-sm lg:h-9 lg:pr-16`} />
                      {locationLoading && <Search className="absolute right-16 top-2.5 size-3.5 animate-pulse text-primary lg:right-14" />}
                      <button type="button" onClick={useCurrentLocation} disabled={currentLocationLoading} title={currentLocationLoading ? "Finding current location" : "Use current location"} aria-label={currentLocationLoading ? "Finding current location" : "Use current location"} className="absolute right-11 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-wait disabled:opacity-60 lg:right-8 lg:size-6">
                        {currentLocationLoading ? <LoaderCircle className="size-3.5 animate-spin" /> : <Crosshair className="size-3.5" />}
                      </button>
                      <button type="button" onClick={() => {
                        if (Number.isFinite(profile.lat)) setLatitudeDraft(profile.lat.toFixed(2));
                        if (Number.isFinite(profile.lng)) setLongitudeDraft(profile.lng.toFixed(2));
                        setUseCoordinates(true);
                        setLocationError(null);
                      }} title="Enter birth coordinates" aria-label="Enter birth coordinates" className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:right-1 lg:size-6"><MapPin className="size-3.5" /></button>
                    </span>
                    {locationError && <p role="status" className="absolute z-10 mt-1 rounded bg-rose-50 px-1 text-xs text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{locationError}</p>}
                    {locationResults.length > 0 && (
                      <ul role="listbox" aria-label="Location search results" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl">
                        {locationResults.map((location) => <li key={`${location.label}-${location.latitude}-${location.longitude}`} role="option" aria-selected={false}><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseLocation(location)} className="w-full rounded-lg px-2.5 py-2 text-left transition hover:bg-muted"><span className="block truncate text-xs font-medium text-foreground">{location.city}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{location.label} · {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)} · {location.timezone}</span></button></li>)}
                      </ul>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-end gap-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_1.5rem]">
                    <label className="min-w-0 truncate">Latitude
                      <input aria-label="Latitude" type="text" inputMode="decimal" autoComplete="off" value={latitudeDraft} onChange={(event) => {
                        const value = limitCoordinatePrecision(event.target.value);
                        setLatitudeDraft(value);
                        setProfile({ lat: parseCoordinateDraft(value) });
                      }} className={`${CONTROL_CLASS} mt-1 h-11 w-full min-w-0 px-1 text-base font-mono tabular-nums md:text-sm lg:h-9`} placeholder="28.66" />
                    </label>
                    <label className="min-w-0 truncate">Longitude
                      <input aria-label="Longitude" type="text" inputMode="decimal" autoComplete="off" value={longitudeDraft} onChange={(event) => {
                        const value = limitCoordinatePrecision(event.target.value);
                        setLongitudeDraft(value);
                        setProfile({ lng: parseCoordinateDraft(value) });
                      }} className={`${CONTROL_CLASS} mt-1 h-11 w-full min-w-0 px-1 text-base font-mono tabular-nums md:text-sm lg:h-9`} placeholder="72.87" />
                    </label>
                    <button type="button" onClick={() => {
                      setUseCoordinates(false);
                      setLocationError(null);
                    }} title="Search for a birth city" aria-label="Search for a birth city" className="grid size-11 place-items-center rounded-lg border border-input text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:size-9">
                      <MapPin className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <button type="submit" className={`inline-flex h-11 w-full min-w-0 self-end items-center justify-center gap-1.5 rounded-lg bg-[#C64F30] px-1 text-xs font-semibold text-white transition hover:bg-[#A94025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C64F30]/40 lg:h-9 ${chartInputsChanged ? "ring-2 ring-amber-400/60 ring-offset-1 ring-offset-card" : ""}`}>
                {chartInputsChanged ? "Update chart" : "Calculate chart"}
                {chartInputsChanged && <><span className="sr-only">Chart inputs changed since calculation</span><span aria-hidden="true" className="size-1.5 rounded-full bg-amber-200" /></>}
              </button>
              <button type="button" onClick={openSaveDialog} disabled={savingProfile} className="hidden min-h-11 w-full self-end items-center justify-center gap-1 rounded-lg border border-border bg-background px-1 text-[11px] font-medium text-foreground transition hover:border-primary/60 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-wait disabled:opacity-60 lg:inline-flex lg:min-h-9">
                <Save aria-hidden="true" className="size-3.5 shrink-0" />
                {saveButtonLabel}
              </button>
              <div className="hidden min-w-0 self-end gap-1 lg:flex">
                <div ref={notesPopoverRef} className="relative min-w-0">
                  <button
                    type="button"
                    onClick={() => setNotesExpanded((expanded) => !expanded)}
                    aria-expanded={notesExpanded}
                    aria-controls="chart-notes-desktop"
                    className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-lg border border-border bg-background px-2 text-[11px] font-medium text-foreground transition hover:border-primary/60 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:min-h-9"
                  >
                    <StickyNote aria-hidden="true" className="size-3.5 shrink-0" />
                    Notes
                    {profile.notes.trim() && <span aria-hidden="true" className="size-1.5 rounded-full bg-[#C64F30]" />}
                  </button>
                  {notesExpanded && (
                    <div className="absolute right-0 top-full z-[70] mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-3 text-card-foreground shadow-lg">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label htmlFor="chart-notes-desktop" className="text-xs font-semibold">Personal notes</label>
                        <button type="button" onClick={() => setNotesExpanded(false)} aria-label="Close personal notes" className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                          <X aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                      <textarea
                        id="chart-notes-desktop"
                        maxLength={10000}
                        rows={5}
                        value={profile.notes}
                        onChange={(event) => setProfile({ notes: event.target.value })}
                        placeholder="Add personal notes, life events, or reference details..."
                        className="min-h-28 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
                      />
                      <p aria-live="polite" className="mt-1 text-right text-[10px] tabular-nums text-muted-foreground">{profile.notes.length}/10,000</p>
                    </div>
                  )}
                </div>
                <button type="button" onClick={toggleSavedProfiles} aria-expanded={savedProfilesOpen} className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-border bg-background px-1 text-[11px] font-medium text-foreground transition hover:border-primary/60 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:min-h-9">
                  <FolderOpen aria-hidden="true" className="size-3.5 shrink-0" />
                  {savedProfilesOpen ? "Close saved" : "Load saved"}
                </button>
              </div>
              <div className="-mx-3 -mb-3 mt-1 min-w-0 rounded-b-xl border-t border-border bg-muted/80 px-3 py-2 dark:bg-muted/50 md:col-span-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => setNotesExpanded((expanded) => !expanded)}
                  aria-expanded={notesExpanded}
                  aria-controls="chart-notes"
                  className="min-h-11 text-left text-xs font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {notesExpanded ? "Hide personal notes" : profile.notes ? "Edit personal notes" : "+ Add personal notes"}
                </button>
                {notesExpanded && (
                  <div className="flex min-w-0 items-end gap-2">
                    <label htmlFor="chart-notes" className="sr-only">Personal chart notes</label>
                    <textarea
                      id="chart-notes"
                      maxLength={10000}
                      rows={4}
                      value={profile.notes}
                      onChange={(event) => setProfile({ notes: event.target.value })}
                      placeholder="Add personal notes, life events, or reference details..."
                      className="min-h-24 min-w-0 flex-1 resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
                    />
                    <span aria-live="polite" className="shrink-0 pb-2 text-[10px] tabular-nums text-muted-foreground">{profile.notes.length}/10,000</span>
                  </div>
                )}
              </div>
            </div>
          </form>
          {profileActionError && <p role="alert" className="mt-2 text-xs text-rose-800 dark:text-rose-200">{profileActionError}</p>}
          {profileActionMessage && <p role="status" className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">{profileActionMessage}</p>}
          {coordinateTimezoneError && <p role="status" className="mt-1 truncate text-[11px] text-rose-700 dark:text-rose-300">{coordinateTimezoneError}</p>}
        </section>

        <SavedChartsDialog
          open={savedProfilesOpen}
          loading={savedProfilesLoading}
          profiles={savedProfiles}
          query={savedProfilesQuery}
          deletingId={deletingProfileId}
          actionError={profileActionError}
          actionMessage={profileActionMessage}
          onQueryChange={setSavedProfilesQuery}
          onClose={() => setSavedProfilesOpen(false)}
          onCreateFirstChart={startFirstChartSave}
          onSelect={selectSavedProfile}
          onDelete={(saved) => void deleteSavedProfile(saved)}
        />

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

        {dashboardTab !== "jamakkol" && (
          <nav role="tablist" aria-label="Kundali analysis" className="no-scrollbar flex w-full snap-x snap-mandatory gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-sm md:items-center md:rounded-2xl md:border-stone-200/80 md:bg-white md:p-1.5 md:shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            {DASHBOARD_TABS.map(({ id, label }) => (
              <button
                key={id}
                id={`kundali-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={dashboardTab === id}
                aria-controls="kundali-tab-panel"
                onClick={() => selectDashboardTab(id)}
                onMouseEnter={() => preloadDashboardTab(id)}
                onFocus={() => preloadDashboardTab(id)}
                className={`min-h-11 shrink-0 snap-start rounded-lg px-2 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:min-h-0 md:rounded-xl md:px-3.5 md:py-2 md:text-[13.5px] md:transition-colors md:whitespace-nowrap ${dashboardTab === id ? "border border-primary/30 bg-accent text-accent-foreground shadow-sm md:border-[#EBC7B8] md:bg-[#FDF2EC] md:font-semibold md:text-[#B84E2E] md:shadow-[0_1px_2px_rgba(192,90,58,0.08)]" : "text-muted-foreground hover:bg-muted hover:text-foreground md:font-medium md:text-slate-600 md:hover:bg-stone-100/80 md:hover:text-slate-900"}`}
              >
                {label}
              </button>
            ))}
          </nav>
        )}

        <div
          id="kundali-tab-panel"
          role={dashboardTab === "jamakkol" ? "region" : "tabpanel"}
          aria-label={dashboardTab === "jamakkol" ? "Jamakkol analysis" : undefined}
          aria-labelledby={dashboardTab === "jamakkol" ? "main-navigation-jamakkol" : `kundali-tab-${dashboardTab}`}
          className="min-w-0"
        >
        {dashboardTab === "kp" && (
          <KPAstrology
            profile={submittedProfile ?? profile}
            language={language}
            viewPreferences={viewPreferences}
            ChartRenderer={SvgChart}
          />
        )}
        {dashboardTab === "jaimini" && (
          <Suspense fallback={
            <EphemerisLoader
              tone="dashboard"
              title="Opening Jaimini analysis"
              description="Loading chart calculations and interpretations…"
              detail={`${profile.city || "Birth chart"} · Jaimini`}
            />
          }>
            <JaiminiDashboard
              profile={submittedProfile ?? profile}
              data={chartMode === "birth" ? data : null}
              chartMode={chartMode}
              loading={loading}
              error={error}
              onCalculateBirthChart={calculateBirthChart}
            />
          </Suspense>
        )}
        {dashboardTab === "jamakkol" && (
          <Suspense fallback={<SecondaryTabSkeleton />}>
            <JamakkolTab
              profile={submittedProfile ?? profile}
              data={chartMode === "transit" ? transitData : data}
              chartMode={chartMode}
              transitDate={transitDate}
              transitTime={transitTime}
              transitMode={transitMode}
            />
          </Suspense>
        )}
        {dashboardTab === "shodashvarga" && (
          <Suspense fallback={<SecondaryTabSkeleton />}>
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
          </Suspense>
        )}
        {dashboardTab === "dasha" && (
          <Suspense fallback={<SecondaryTabSkeleton />}>
            <DashaTab
              data={data}
              system={dashaSystem}
              onSystemChange={setDashaSystem}
              seed={dashaSeed}
              onSeedChange={setDashaSeed}
              lagnaMode={dashaLagnaMode}
              onLagnaModeChange={setDashaLagnaMode}
            />
          </Suspense>
        )}
        {dashboardTab === "aspects" && (
          <Suspense fallback={<SecondaryTabSkeleton />}>
            <AspectsTab data={displayData} language={language} useSignIcons={viewPreferences.useSignIcons} />
          </Suspense>
        )}
        {dashboardTab === "midpoints" && (
          <Suspense fallback={<SecondaryTabSkeleton />}>
            <MidpointsTab
              report={midpointReport}
              preferences={midpointPreferences}
              onPreferencesChange={setMidpointPreferences}
              decimal={decimalDegrees}
              unavailableReason={midpointUnavailableReason}
            />
          </Suspense>
        )}
        {dashboardTab === "core" && (
        <div className="flex flex-col gap-4">
        {displayError && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{displayError}</span></div>}
        <div className="order-2 lg:order-1">
          <PanchangStrip date={displayData?.input.date ?? profile.date} planets={displayData?.planets ?? []} houseSystem={houseSystem} />
        </div>
        {kharaPoints.length > 0 && (
          <section aria-label="Khara divisional points" className="order-3 overflow-hidden rounded-xl border border-border bg-card text-card-foreground md:rounded-2xl md:border-stone-200/80 md:shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-3">
              <h2 className="text-sm font-semibold">Khara positions</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">64th Navamsha and 22nd Drekkana from the Lagna and Moon.</p>
            </div>
            <div className="grid divide-y divide-border border-t border-border md:grid-cols-2 md:divide-x md:divide-y-0">
              {kharaPoints.map((points) => (
                <div key={points.name} className="min-w-0 px-4 py-3">
                  <h3 className="mb-2 text-xs font-semibold">{points.name}</h3>
                  <dl className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <dt className="text-xs font-medium">64th Navamsha</dt>
                        <dd className="text-[10px] text-muted-foreground">8th from {signName(SIGNS[points.navamsaSign], language)} Navamsha</dd>
                      </div>
                      <dd className="text-right text-sm font-semibold">{signName(SIGNS[points.sixtyFourthNavamsaSign], language)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-2">
                      <div>
                        <dt className="text-xs font-medium">22nd Drekkana</dt>
                        <dd className="text-[10px] text-muted-foreground">8th from {signName(SIGNS[points.drekkanaSign], language)} Drekkana</dd>
                      </div>
                      <dd className="text-right text-sm font-semibold">{signName(SIGNS[points.twentySecondDrekkanaSign], language)}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Core chart panels grow with their controls and charts; wide tables keep horizontal-only overflow. */}
        <div id="kundali-charts" className="order-1 grid w-full grid-cols-1 items-stretch gap-4 scroll-mt-4 lg:order-2 lg:grid-cols-2 lg:gap-6">
          <div className="row-start-1 flex min-h-0 min-w-0 lg:col-start-1">
            <section className="relative flex h-full min-h-0 w-full flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm md:rounded-2xl md:border-stone-200/80 md:shadow-[0_1px_3px_rgba(15,23,42,0.04)]" aria-label="Primary D1 chart">
              <ChartControls
                chartMode={chartMode}
                chartStyle={chartStyle}
                onChartStyleChange={setChartStyle}
                overlayTransits={overlayTransits}
                onOverlayTransitsChange={handleTransitOverlayChange}
                ascendantLabel={displayData ? `${signName(displayData.ascendant.signName, language)} rising` : "Calculating lagna"}
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
              <div className="relative w-full min-w-0 p-4 bg-card">
                <div className="relative mx-auto w-full max-w-[640px]">
                  {displayData ? <SvgChart style={chartStyle} ascendant={displayData.ascendant} planets={displayData.planets} points={displayData.points} houseCusps={displayData.houseCusps} varga={1} referenceHouse={referenceHouseNumber} overlay={chartMode === "birth" && overlayTransits ? transitData?.planets : undefined} showTransitLabels={chartMode === "transit" && overlayTransits} language={language} preferences={viewPreferences} /> : displayLoading ? <EphemerisLoader title="Calculating birth chart" description="Finding planetary positions and house cusps…" detail={`${profile.city || "Birth chart"} · Swiss Ephemeris`} activity="Calculating chart" tone="dashboard" compact /> : <div className="grid aspect-square w-full place-items-center text-xs text-muted-foreground">Chart unavailable</div>}
                  {overlayTransits && transitLoading && (
                    <div role="status" aria-live="polite" className="absolute right-5 top-5 z-10 inline-flex items-center gap-2 rounded-full border border-stone-300 bg-card/95 px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm dark:border-stone-700 dark:text-stone-300">
                      <LoaderCircle className="size-3.5 animate-spin" />
                      Updating transit positions
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-none flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><span className={`size-2 rounded-full ${chartMode === "transit" ? "bg-cyan-600 dark:bg-cyan-400" : "bg-amber-600 dark:bg-amber-400"}`} /> {chartMode === "transit" ? `Transit · ${currentTransitLabel}` : "Birth chart"}</span>
                <button type="button" className="flex items-center gap-1.5 rounded px-1 transition hover:bg-[hsl(var(--input))]/50" onMouseEnter={() => setHoveredPlanet("Vargottama")} onMouseLeave={() => setHoveredPlanet(null)} onFocus={() => setHoveredPlanet("Vargottama")} onBlur={() => setHoveredPlanet(null)}><span className="inline-block size-3 rounded-full border border-[#C05A3A]" /> Vargottama</button>
                <span title="Retrograde Motion"><span className="font-bold text-rose-700 dark:text-rose-300">R</span> = retrograde</span>
                <span className="min-w-0 break-words text-right" title={chartStyle === "placidus" ? `${referenceLabel} at 9 o’clock` : referenceLabel}>{chartStyle === "placidus" ? `${referenceLabel} at 9 o’clock` : referenceLabel}</span>
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[10px] text-slate-600 dark:text-slate-400">
                <span>{chartMode === "transit" ? transitLoading ? "Refreshing current sky…" : transitError ?? "Live transit positions" : overlayTransits ? transitLoading ? "Refreshing transit sky…" : transitError ?? `Transit positions · ${currentTransitLabel}` : "Birth chart positions"}</span>
                <span aria-hidden="true">·</span>
                <span>House cusps: {houseSystem === "carter" ? "Carter (Poli-Equatorial)" : "Placidus"} · planetary houses: {houseSystem === "carter" ? "Carter" : "Whole Sign"}</span>
                {data && <span className="inline-flex items-center gap-1"><Clock3 aria-hidden="true" className="size-3" /> Calculated {new Date(data.calculatedAt).toLocaleTimeString()}</span>}
              </p>
            </section>
          </div>

          <div className="order-2 flex min-h-0 min-w-0 lg:col-start-2 lg:row-start-1">
            <section id="auxiliary-chart" className="relative flex h-full min-h-0 w-full flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm md:rounded-2xl md:border-stone-200/80 md:shadow-[0_1px_3px_rgba(15,23,42,0.04)]" aria-label="Auxiliary chart viewer">
              <div className="flex flex-col gap-3 border-b border-border bg-muted/10 p-4 lg:min-h-[96px] lg:justify-center lg:gap-0 lg:p-3">
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
                    <select aria-label="Auxiliary reference lagna" value={auxiliaryReferenceName} onChange={(event) => setAuxiliaryReferenceName(event.target.value)} className={`${CONTROL_CLASS} w-full pr-9`}>
                      <option value="Ascendant">Ascendant</option>
                      {Array.from({ length: 12 }, (_, index) => <option key={index} value={`house:${index + 1}`}>House {index + 1}</option>)}
                    </select>
                  </label>
              </div>
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
              <div className="relative w-full min-w-0 p-4 bg-card">
                <div className="relative mx-auto w-full max-w-[640px]">
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
              <div><p className="text-xs font-semibold">Planetary positions</p><p className="mt-0.5 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">Swiss Ephemeris · sidereal · Jaimini karakas</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">Node
                  <select aria-label="Rahu Ketu node mode" value={nodeType} onChange={(event) => setNodeType(event.target.value as "true" | "mean")} className={`${CONTROL_CLASS} h-8 text-xs`}><option value="true">True Node</option><option value="mean">Mean Node</option></select>
                </label>
                <div role="group" aria-label="Longitude display format" className="flex rounded-lg bg-muted p-1">
                  {([["dms", false], ["decimal", true]] as const).map(([label, decimal]) => <button key={label} type="button" aria-pressed={decimalDegrees === decimal} onClick={() => setDecimalDegrees(decimal)} className={`rounded-md px-2 py-1.5 text-xs ${decimalDegrees === decimal ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground"}`}>{label === "dms" ? "DMS" : "Decimal"}</button>)}
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              {displayData ? <PlanetTable data={displayData} decimal={decimalDegrees} language={language} preferences={viewPreferences} nodeType={nodeType} interceptedSigns={displayData.interceptedSigns} /> : <div className="grid h-60 place-items-center text-xs text-muted-foreground">{displayLoading ? <span className="inline-flex items-center gap-2"><LoaderCircle className="size-4 animate-spin text-primary" /> Calculating positions</span> : "No planetary data"}</div>}
            </div>
            {displayData && (
              <details className="group mt-3 rounded-lg border border-border bg-muted dark:bg-muted/40">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs marker:content-none">
                  <Crosshair className="size-3.5 text-amber-700 dark:text-amber-300" />
                  <span className="font-medium">{houseSystem === "carter" ? "Carter house cusps" : "Bhava Chalit cusps"}</span><span className="text-slate-600">· {displayData.houseCuspSystem}</span>
                  <ChevronDown className="ml-auto size-3.5 text-slate-600 transition group-open:rotate-180" />
                </summary>
                <div className="grid grid-cols-2 gap-1.5 border-t border-slate-200 p-2 sm:grid-cols-3 lg:grid-cols-4 dark:border-slate-800">
                  {displayData.houseCusps.map((cusp, index) => {
                    const next = displayData.houseCusps[(index + 1) % 12];
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
                    <p className="mt-1 text-muted-foreground">Bhava Chalit comparison is available from the chart selector; cusp houses use the start-to-next-cusp spans shown above.</p>
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
                { label: "House system", value: houseSystem === "carter" ? "Carter (Poli-Equatorial)" : "Whole Sign + Placidus", icon: Globe2, color: "text-slate-600" },
              ].map(({ label, value, icon: Icon, color }) => <div key={label} className="flex items-center gap-2 rounded-lg border border-border bg-muted px-2.5 py-2"><Icon className={`size-3.5 shrink-0 ${color}`} /><div className="min-w-0"><p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p><p className="truncate text-xs">{value}</p></div></div>)}
            </div>
          </section>

        </div>

        </div>
        )}
        {dashboardTab === "ashtakavarga" && (
          <Suspense fallback={<SecondaryTabSkeleton />}>
            <div className="space-y-5">
              <AshtakavargaTab data={displayData} language={language} useSignIcons={viewPreferences.useSignIcons} />
              <Suspense fallback={<SecondaryTabSkeleton />}>
                <StrengthAnalysisTab data={displayData} />
              </Suspense>
            </div>
          </Suspense>
        )}
        {dashboardTab === "medical" && (
          <Suspense fallback={<SecondaryTabSkeleton />}>
            <MedicalTab
              data={data}
              transitData={transitData}
              chartMode={chartMode}
              transitLoading={transitLoading}
              transitError={transitError}
            />
          </Suspense>
        )}
        {dashboardTab === "transit-calendar" && (
          <Suspense fallback={<SecondaryTabSkeleton />}>
            <TransitCalendarTab natalPlanets={data?.planets ?? []} />
          </Suspense>
        )}
        </div>
      </div>
      <ChartSettingsDrawer
        open={chartSettingsOpen}
        onClose={closeChartSettings}
        settings={chartSettings}
        chartStyle={chartStyle}
        showBirthTimeAdjuster={chartMode === "birth"}
        onAdjustTime={adjustBirthTime}
        onApply={setChartSettings}
      />
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
              {displayData
                ? <div className="relative mx-auto aspect-square w-full max-w-[min(88vh,1000px)] [&>div]:!max-w-none [&>svg]:!max-w-none"><SvgChart style={chartStyle} ascendant={displayData.ascendant} planets={displayData.planets} points={displayData.points} houseCusps={displayData.houseCusps} varga={1} referenceHouse={referenceHouseNumber} overlay={chartMode === "birth" && overlayTransits ? transitData?.planets : undefined} showTransitLabels={chartMode === "transit" && overlayTransits} language={language} preferences={viewPreferences} /></div>
                : <div className="grid min-h-[50vh] place-items-center text-sm text-slate-600">{displayLoading ? "Calculating chart…" : "Chart is unavailable."}</div>}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"><span>{chartStyle === "placidus" ? "Placidus · Ascendant at 9 o’clock · MC above IC" : `${chartStyle} · D1 Rasi`}</span><span>{chartMode === "transit" ? "Current transit placements" : overlayTransits ? "Cyan placements are current transits" : "Birth chart placements"}</span></div>
          </section>
        </div>
      )}
    </div>
  );
}

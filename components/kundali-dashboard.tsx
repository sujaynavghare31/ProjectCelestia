"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownUp,
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
  Search,
  Settings2,
  Save,
  X,
} from "lucide-react";
import type { ChartStyle, CelestialLanguage, EphemerisResponse, PlanetPosition, ViewPreferences, ZodiacMode } from "@/lib/kundali-types";
import { getBirthDateTimeDefaults, useKundaliStore, type BirthProfile } from "@/lib/kundali-store";
import { limitCoordinatePrecision, parseCoordinateDraft } from "@/lib/coordinate-input";
import { planetName, signName } from "@/lib/astrology/localization";
import { dagdhaRashis } from "@/lib/astrology/dagdha-rashi";
import { readSavedAstrologyConfig } from "@/lib/astrology/config-storage";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

const loadDashaTab = () => import("@/components/dashboard-tabs/DashaDashboard");
const loadElementModalityTab = () => import("@/components/dashboard-tabs/element-modality-tab");
const loadAspectsTab = () => import("@/components/dashboard-tabs/aspects-tab");
const loadAshtakavargaTab = () => import("@/components/dashboard-tabs/ashtakavarga-tab");
const loadStrengthAnalysisTab = () => import("@/components/dashboard-tabs/strength-analysis-tab");
const loadMedicalTab = () => import("@/components/dashboard-tabs/medical-tab");
const loadChartExportTab = () => import("@/components/dashboard-tabs/chart-export-tab");
const DashaTab = lazy(loadDashaTab);
const ElementModalityTab = lazy(loadElementModalityTab);
const AspectsTab = lazy(loadAspectsTab);
const AshtakavargaTab = lazy(loadAshtakavargaTab);
const StrengthAnalysisTab = lazy(loadStrengthAnalysisTab);
const MedicalTab = lazy(loadMedicalTab);
const ChartExportTab = lazy(loadChartExportTab);

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
    <section aria-label="Panchang" className="col-span-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-[hsl(var(--foreground))] shadow-sm xl:col-span-2">
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
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-[11px] font-medium text-muted-foreground" title="Birth time rectification">BTR</span>
      <div role="group" aria-label="Adjust birth time" className="flex gap-1">
        {adjustments.map(({ seconds, label, description }) => (
          <button key={seconds} type="button" onClick={() => onAdjust(seconds)} className="h-7 rounded-md border border-border bg-background px-1.5 text-[10px] font-semibold tabular-nums text-foreground transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" aria-label={description} title={description}>
            {label}
          </button>
        ))}
      </div>
    </div>
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
  const hoveredPlanet = useKundaliStore((state) => state.hoveredPlanet);
  const setHoveredPlanet = useKundaliStore((state) => state.setHoveredPlanet);
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
    <svg viewBox="0 0 360 360" className="absolute inset-0 h-full w-full object-contain" role="img" aria-label={`Placidus chart with ${referenceHouse === 1 ? "Ascendant" : `House ${referenceHouse}`} as reference lagna at nine o'clock`}>
      <circle cx={center} cy={center} r="166" fill="hsl(var(--card))" stroke="hsl(var(--chart-grid))" strokeWidth="1" />
      <circle cx={center} cy={center} r="126" fill="none" stroke="hsl(var(--chart-grid))" strokeWidth="1" />
      <circle cx={center} cy={center} r="82" fill="none" stroke="hsl(var(--chart-grid))" strokeWidth="1" />
      {preferences.showSignDivisions && Array.from({ length: 12 }, (_, sign) => {
        const boundary = point(sign * 30, 166);
        const inner = point(sign * 30, 126);
        const label = point(sign * 30 + 15, 145);
        return (
          <g key={`sign-${sign}`}>
            <line x1={inner.x} y1={inner.y} x2={boundary.x} y2={boundary.y} stroke="hsl(var(--chart-grid))" strokeWidth="1" />
            <text x={label.x} y={label.y + 3} fill={signColor(sign)} fontSize="8" textAnchor="middle">{chartSignDisplay(sign, language, preferences)}</text>
          </g>
        );
      })}
      {preferences.showEqualHouses && Array.from({ length: 12 }, (_, index) => {
        const cusp = point(ascendant.longitude + index * 30, 126);
        const inner = point(ascendant.longitude + index * 30, 82);
        return <line key={`equal-house-${index}`} x1={cusp.x} y1={cusp.y} x2={inner.x} y2={inner.y} stroke="hsl(var(--chart-grid))" strokeDasharray="2 2" strokeWidth="1" />;
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
            <line x1={edge.x} y1={edge.y} x2={inner.x} y2={inner.y} stroke={cusp.house === 1 || cusp.house === 7 || cusp.house === 10 || cusp.house === 4 ? "hsl(var(--champagne-gold))" : "hsl(var(--chart-grid))"} strokeWidth="1" />
            {preferences.showHouseLabels && <text x={label.x} y={label.y + 3} fill={displayedHouse === 1 ? "hsl(var(--champagne-gold))" : "hsl(var(--chart-grid))"} fontSize="8" textAnchor="middle">H{displayedHouse}</text>}
          </g>
        );
      })}
      <text x="20" y="185" fill="hsl(var(--champagne-gold))" fontSize="9" fontWeight="700">LAGNA</text>
      <text x="315" y="185" fill="var(--chart-muted)" fontSize="8">DSC</text>
      {cuspsByHouse[9] && (() => {
        const mc = point(cuspsByHouse[9].longitude, 158);
        const ic = point(cuspsByHouse[3]?.longitude ?? cuspsByHouse[9].longitude + 180, 158);
        return <g fill="hsl(var(--champagne-gold))" fontSize="8" fontWeight="700" textAnchor="middle"><text x={mc.x} y={mc.y - 2}>MC</text><text x={ic.x} y={ic.y + 9}>IC</text></g>;
      })()}
      {chartBodies.map((body, index) => {
        const sameLongitudeBefore = chartBodies.slice(0, index).filter((other) => Math.abs((((other.longitude - body.longitude + 540) % 360) - 180)) < 4).length;
        const label = point(body.longitude, 104 + sameLongitudeBefore * 12);
        const color = body.transit ? "hsl(var(--champagne-gold))" : ["Ascendant", "Sun", "Moon"].includes(body.name) ? "hsl(var(--champagne-gold))" : ["Uranus", "Neptune", "Pluto", "Chiron", "Lilith"].includes(body.name) ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))";
        const name = chartPlanetDisplay(body, language, preferences.usePlanetIcons);
        const retrograde = body.motion === "R";
        const vargottama = body.name !== "Ascendant" && body.sign === getVargaSign(body, 9);
        const highlighted = hoveredPlanet === null || body.name === hoveredPlanet || (hoveredPlanet === "Vargottama" && vargottama);
        return (
          <g key={`${body.id}-${body.transit ? "transit" : "natal"}`} opacity={highlighted ? 1 : 0.4} filter={highlighted && hoveredPlanet !== null ? "drop-shadow(0 0 6px hsl(var(--champagne-gold)))" : undefined} onMouseEnter={() => setHoveredPlanet(body.name)} onMouseLeave={() => setHoveredPlanet(null)}>
            {retrograde && <title>Retrograde Motion</title>}
            {vargottama && <ellipse cx={label.x} cy={label.y} rx={name.length * 3.4 + (retrograde ? 5 : 0)} ry="9" fill="none" stroke="hsl(var(--champagne-gold))" strokeWidth="1" />}
            <text x={label.x} y={label.y + 3.5} fill={color} fontSize="10" fontWeight={body.name === "Ascendant" ? "700" : "600"} textAnchor="middle">
              {body.transit ? "T " : ""}{name}{retrograde && <tspan fill="hsl(var(--retrograde-crimson))" fontSize="8" fontWeight="800" dy="-3">ᴿ</tspan>}
            </text>
          </g>
        );
      })}
      <text x="180" y="350" fill="hsl(var(--muted-foreground))" fontSize="8" textAnchor="middle">PLACIDUS HOUSES · SIDEREAL LONGITUDES</text>
    </svg>
  );
}

function SvgChart({
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
  preferences = { showHouseLabels: true, showOuterPlanets: true, showAsteroids: false, showUpagrahas: false, showFortune: false, usePlanetIcons: false, useSignIcons: false, showEqualHouses: false, showSignDivisions: true, showSignNumbers: true, showBhavaCusps: false },
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
    isTransit: false,
  }));
  const transitBodies = (overlay ?? []).filter((planet) => chartPlanetVisible(planet, preferences)).map((planet) => ({
    ...planet,
    id: `transit-${planet.id}`,
    chartSign: getVargaSign(planet, varga),
    chartHouse: chartHouseForPlanet(planet),
    isTransit: true,
  }));
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
      <svg viewBox="0 0 360 360" className="absolute inset-0 h-full w-full object-contain" role="img" aria-label={`${varga === 1 ? "D1" : `D${varga}`} circular Rashi chart`}>
          <circle cx="180" cy="180" r="160" fill="hsl(var(--card))" stroke="hsl(var(--chart-grid))" strokeWidth="1" />
          <circle cx="180" cy="180" r="105" fill="none" stroke="hsl(var(--chart-grid))" strokeWidth="1" />
        {Array.from({ length: 12 }, (_, index) => {
          const point = polar(160, index * 30);
          const house = houses[index];
          const label = polar(133, index * 30 + 15);
          const contents = [...house.bodies, ...transitBodies.filter((body) => body.chartHouse === house.house)];
          return (
            <g key={house.house}>
              <line x1="180" y1="180" x2={point.x} y2={point.y} stroke="hsl(var(--chart-grid))" strokeWidth="1" />
              <text x={label.x} y={label.y - 5} fill={house.house === 1 ? "hsl(var(--champagne-gold))" : signColor(house.sign)} fontSize="9" textAnchor="middle">{preferences.showHouseLabels ? `${house.house} · ` : ""}{chartSignDisplay(house.sign, language, preferences)}</text>
              {contents.length ? contents.map((body, bodyIndex) => {
                const name = chartPlanetDisplay(body, language, preferences.usePlanetIcons);
                const y = label.y + 10 + bodyIndex * 12;
                const vargottama = body.name !== "Ascendant" && body.sign === getVargaSign(body, 9);
                return (
                  <g key={body.id} opacity={isHighlighted(body, vargottama) ? 1 : 0.4} filter={isHighlighted(body, vargottama) && hoveredPlanet !== null ? "drop-shadow(0 0 6px hsl(var(--champagne-gold)))" : undefined} onMouseEnter={() => onBodyEnter(body)} onMouseLeave={() => setHoveredPlanet(null)}>
                    {body.motion === "R" && <title>Retrograde Motion</title>}
                    {vargottama && <ellipse cx={label.x} cy={y - 3} rx={name.length * 3.4 + (body.motion === "R" ? 5 : 0)} ry="8" fill="none" stroke="hsl(var(--champagne-gold))" strokeWidth="1" />}
                    <text x={label.x} y={y} fill={body.isTransit ? "hsl(var(--champagne-gold))" : body.name === "Ascendant" ? "hsl(var(--champagne-gold))" : "hsl(var(--foreground))"} fontSize="10" fontWeight="600" textAnchor="middle">
                      {body.isTransit ? "T " : ""}{name}{body.motion === "R" && <tspan fill="hsl(var(--retrograde-crimson))" fontSize="8" fontWeight="800" dy="-3">ᴿ</tspan>}
                    </text>
                  </g>
                );
              }) : <text x={label.x} y={label.y + 10} fill="var(--chart-muted)" fontSize="9" textAnchor="middle">·</text>}
            </g>
          );
        })}
        <circle cx="180" cy="180" r="3" fill="hsl(var(--champagne-gold))" />
        <text x="180" y="338" fill="#64748b" fontSize="9" textAnchor="middle">SIDEREAL · WHOLE SIGN</text>
      </svg>
    );
  }

  if (style === "south") {
    const signOrder = [11, 0, 1, 2, 10, -1, -1, 3, 9, -1, -1, 4, 8, 7, 6, 5];
    return (
      <div className="absolute inset-0 grid h-full w-full grid-cols-4 grid-rows-4 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        {signOrder.map((sign, index) => {
          if (sign < 0) return <div key={`empty-${index}`} className="border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60" />;
          const signHouse = getSignHouse(sign, ascSign);
          const bodies = [...chartBodies, ...transitBodies].filter((body) => (
            houseBasedPlacement && varga === 1 ? body.chartHouse === signHouse : body.chartSign === sign
          ));
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
        return (
          <g key={house.house}>
            <text x={x} y={y - 15} fill={isAscHouse ? "hsl(var(--champagne-gold))" : signColor(house.sign)} fontSize="9" textAnchor="middle">{preferences.showHouseLabels ? isAscHouse ? "1ST HOUSE" : `H${house.house}` : ""}{preferences.showHouseLabels ? " · " : ""}{chartSignDisplay(house.sign, language, preferences).toUpperCase()}</text>
            {preferences.showBhavaCusps && houseCusps[house.house - 1] && <text x={x} y={y - 3} fill="var(--chart-transit)" fontSize="7" textAnchor="middle">C{house.house} {degreeToDms(houseCusps[house.house - 1].longitude % 30)}</text>}
            {[...house.bodies, ...transitBodies.filter((body) => body.chartHouse === house.house)].map((body, index, bodies) => {
              const row = Math.floor(index / 1);
              const bodyColor = body.isTransit ? "hsl(var(--champagne-gold))" : ["Ascendant", "Sun", "Moon"].includes(body.name) ? "hsl(var(--champagne-gold))" : "hsl(var(--foreground))";
              const name = chartPlanetDisplay(body, language, preferences.usePlanetIcons);
              const bodyY = y + 10 + row * 13 - Math.max(0, bodies.length - 4) * 4;
              const vargottama = body.name !== "Ascendant" && body.sign === getVargaSign(body, 9);
              return (
                <g key={body.id} opacity={isHighlighted(body, vargottama) ? 1 : 0.4} filter={isHighlighted(body, vargottama) && hoveredPlanet !== null ? "drop-shadow(0 0 6px hsl(var(--champagne-gold)))" : undefined} onMouseEnter={() => onBodyEnter(body)} onMouseLeave={() => setHoveredPlanet(null)}>
                  {body.motion === "R" && <title>Retrograde Motion</title>}
                  {vargottama && <ellipse cx={x} cy={bodyY - 3} rx={name.length * 3.4 + (body.motion === "R" ? 5 : 0)} ry="8" fill="none" stroke="hsl(var(--champagne-gold))" strokeWidth="1" />}
                  <text x={x} y={bodyY} fill={bodyColor} fontSize={bodies.length > 4 ? "9" : "10"} fontWeight={body.name === "Ascendant" ? "700" : "600"} textAnchor="middle">
                    {body.isTransit ? "T " : ""}{name}{body.motion === "R" && <tspan fill="hsl(var(--retrograde-crimson))" fontSize="8" fontWeight="800" dy="-3">ᴿ</tspan>}
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
      <table className="w-full min-w-[690px] text-left text-xs">
        <thead className="sticky top-0 bg-card text-xs uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
          <tr>{["Graha", "Jaimini karaka", "Sign", "Nakshatra", "Pada", "Longitude", "Motion", "Declination", "Dignity", "STATES (AVASTHAS)"].map((heading) => <th key={heading} className="whitespace-nowrap px-1.5 py-2 font-medium">{heading}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
          {rows.map((position) => {
            const isAscendant = position.name === "Ascendant";
            const isGoldPosition = isAscendant || position.name === "Sun" || position.name === "Moon";
            const vargottama = position.name !== "Ascendant" && position.sign === getVargaSign(position, 9);
            const detailedAvastha = data.avasthaReport?.planets.find((report) => report.planet === position.name);
            return (
              <tr key={position.id} className={`bg-transparent text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--border)/0.2)] ${isGoldPosition ? "text-[hsl(var(--champagne-gold))]" : ""}`}>
                <td className="min-w-[108px] px-1.5 py-1.5 font-semibold">
                  <span className="block whitespace-nowrap">{preferences.usePlanetIcons && <PlanetMark name={position.name} label={position.symbol} enabled />} {planetName(position.name, "en", position.name)}</span>
                  {vargottama && <span title="Rasi and Navamsha signs are the same" className="mt-0.5 inline-flex rounded bg-violet-100 px-1 py-0.5 text-[10px] font-medium leading-none text-violet-800 dark:bg-violet-400/10 dark:text-violet-300">Vargottama</span>}
                </td>
                <td className="whitespace-nowrap px-1.5 py-1.5 font-semibold text-[hsl(var(--champagne-gold))]">{position.jaimini ? <abbr title={JAIMINI_KARAKA_NAMES[position.jaimini] ?? position.jaimini} className="no-underline">{JAIMINI_KARAKA_NAMES[position.jaimini] ?? position.jaimini}</abbr> : "—"}</td>
                <td className="px-1.5 py-1.5">
                  <div className="whitespace-nowrap">
                    {preferences.useSignIcons ? <SignMark sign={position.sign} label={signName(position.signName, language)} enabled /> : signName(position.signName, language)}
                  </div>
                  {(dagdhaSigns.includes(position.sign) || interceptedSigns.includes(position.sign)) && (
                    <div className="mt-1 flex flex-col items-start gap-0.5">
                      {dagdhaSigns.includes(position.sign) && <span title={`Dagdha Rashi for birth tithi ${tithiNumber}; common Muhurta convention.`} className="rounded bg-rose-100 px-1 py-0.5 text-[10px] font-semibold leading-none text-rose-800 dark:bg-rose-400/10 dark:text-rose-300">Dagdha Rashi</span>}
                      {interceptedSigns.includes(position.sign) && <span title={`${position.signName} is intercepted: it does not appear on any Placidus house cusp.`} className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold leading-none text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">Intercepted Sign</span>}
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-1.5 py-1.5">{position.nakshatraName}</td>
                <td className="px-1.5 py-1.5 text-center">{position.pada}</td>
                <td className="whitespace-nowrap px-1.5 py-1.5 text-right text-[hsl(var(--muted-foreground))]"><DegreeValue position={position} decimal={decimal} /></td>
                <td className="px-1.5 py-1.5">
                  {nodeType === "true" && (position.name === "Rahu" || position.name === "Ketu") && position.motion === "D"
                    ? <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${motionStyle(position.motion)}`}><span>Direct</span><span role="img" aria-label="Rahu/Ketu is in direct motion for this specific ephemeris calculation time." title="Rahu/Ketu is in direct motion for this specific ephemeris calculation time."><Info className="size-4" /></span></span>
                    : <span className={`inline-flex whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${motionStyle(position.motion)}`}>{position.motion === "R" ? "Retrograde" : "Direct"}</span>}
                </td>
                <td className={`whitespace-nowrap px-1.5 py-1.5 text-right font-mono text-[hsl(var(--muted-foreground))] ${Math.abs(position.declination) > 23.45 ? "font-semibold text-[hsl(var(--retrograde-crimson))]" : ""}`} title={Math.abs(position.declination) > 23.45 ? "Out of Bounds (OOB) Declination" : undefined}>{declinationToDms(position.declination)}</td>
                <td className="whitespace-nowrap px-1.5 py-1.5"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${dignityStyle(position.dignity)}`}>{position.dignity}</span></td>
                <td className="px-1.5 py-1.5">
                  {detailedAvastha ? (
                    <div className="flex min-w-36 flex-col gap-0.5 text-xs text-slate-600 dark:text-slate-400">
                      <span>Baladi: {detailedAvastha.baladi.state}</span>
                      <span title={detailedAvastha.jagradadi.reasons.join(" ")}>Jagradadi: {detailedAvastha.jagradadi.state}</span>
                      {detailedAvastha.shayanadi && <span>Shayanadi: {detailedAvastha.shayanadi.state}</span>}
                      {!!detailedAvastha.lajjitadi?.length && <span>Lajjitadi: {detailedAvastha.lajjitadi.map(({ state }) => state).join(", ")}</span>}
                    </div>
                  ) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type AuxiliaryType = "divisional" | "transit" | "solar" | "tajika" | "progressions";
type DashaSystem = "vimshottari" | "chara" | "ashtottari" | "yogini" | "kalachakra";
type DashaSeed = "moon" | "ascendant" | "sun" | "ascendant-lord";
type DashaLagnaMode = "natural" | "maha-lord" | "antar-lord";
type DashboardTab = "core" | "dasha" | "element-modality" | "aspects" | "ashtakavarga" | "medical" | "export";

// All existing astrology views remain available; strength modules are now grouped with Ashtakavarga.
const DASHBOARD_TABS: Array<{ id: DashboardTab; label: string }> = [
  { id: "core", label: "Core Dashboard" },
  { id: "dasha", label: "Dasha Systems" },
  { id: "element-modality", label: "Element & Modality" },
  { id: "aspects", label: "Drishti & Aspects" },
  { id: "ashtakavarga", label: "Ashtakavarga & Strength" },
  { id: "medical", label: "Medical Astrology" },
  { id: "export", label: "Chart Image / Export" },
];

function dashboardTabFromLocation(): DashboardTab {
  const value = new URLSearchParams(window.location.search).get("tab");
  return DASHBOARD_TABS.some(({ id }) => id === value) ? value as DashboardTab : "core";
}

function preloadDashboardTab(tab: DashboardTab) {
  const loaders = {
    dasha: loadDashaTab,
    "element-modality": loadElementModalityTab,
    aspects: loadAspectsTab,
    ashtakavarga: () => Promise.all([loadAshtakavargaTab(), loadStrengthAnalysisTab()]),
    medical: loadMedicalTab,
    export: loadChartExportTab,
  };
  if (tab === "core") return;
  void loaders[tab]().catch((error: unknown) => {
    console.error(`[kundali] Unable to preload ${tab} tab`, error);
  });
}

function SecondaryTabSkeleton() {
  return (
    <div aria-label="Loading analysis" aria-busy="true" className="space-y-4">
      <div className="h-16 animate-pulse rounded-xl border border-border bg-card" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-72 animate-pulse rounded-xl border border-border bg-card" />
      </div>
    </div>
  );
}

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
  notes: string;
}

export function KundaliDashboard() {
  const authLoaded = true;
  const isSignedIn = false;
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
  const setHoveredPlanet = useKundaliStore((state) => state.setHoveredPlanet);
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
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>("core");
  const [submittedProfile, setSubmittedProfile] = useState<BirthProfile | null>(null);
  const [transitData, setTransitData] = useState<EphemerisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitLoading, setTransitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitError, setTransitError] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState("Ascendant");
  const [auxiliaryReferenceName, setAuxiliaryReferenceName] = useState("Ascendant");
  const [overlayTransits, setOverlayTransits] = useState(false);
  const [chartMaximized, setChartMaximized] = useState(false);
  const [auxiliaryType, setAuxiliaryType] = useState<AuxiliaryType>("divisional");
  const [auxiliaryChartId, setAuxiliaryChartId] = useState(`D${varga}`);
  const [targetAge, setTargetAge] = useState(30);
  const [ageMode, setAgeMode] = useState<"completed" | "ongoing">("completed");
  const [nadiProgressions, setNadiProgressions] = useState(false);
  const [bhriguProgressions, setBhriguProgressions] = useState(false);
  const [dashaSystem, setDashaSystem] = useState<DashaSystem>("vimshottari");
  const [dashaSeed, setDashaSeed] = useState<DashaSeed>("moon");
  const [dashaLagnaMode, setDashaLagnaMode] = useState<DashaLagnaMode>("maha-lord");
  const [savedProfiles, setSavedProfiles] = useState<SavedChartRecord[]>([]);
  const [savedProfileId, setSavedProfileId] = useState("");
  const [notesFocused, setNotesFocused] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [chartNameDraft, setChartNameDraft] = useState("");
  const [savingChart, setSavingChart] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [chartMode, setChartMode] = useState<"transit" | "birth">("transit");
  const [locationSearch, setLocationSearch] = useState(profile.city);
  const [useCoordinates, setUseCoordinates] = useState(false);
  const [latitudeDraft, setLatitudeDraft] = useState(profile.lat.toFixed(2));
  const [longitudeDraft, setLongitudeDraft] = useState(profile.lng.toFixed(2));
  const notesInputRef = useRef<HTMLTextAreaElement>(null);
  const [locationResults, setLocationResults] = useState<GeocodeResult[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [coordinateTimezoneError, setCoordinateTimezoneError] = useState<string | null>(null);
  const initialProfileSubmitted = useRef(false);

  useEffect(() => {
    const syncTab = () => setDashboardTab(dashboardTabFromLocation());
    syncTab();
    window.addEventListener("popstate", syncTab);
    return () => window.removeEventListener("popstate", syncTab);
  }, []);

  useEffect(() => {
    const defaults = getBirthDateTimeDefaults(profile);
    if (defaults) setProfile(defaults);
  }, [profile.date, profile.time, setProfile]);

  useEffect(() => {
    if (initialProfileSubmitted.current || !profile.date || !profile.time || !profile.timezone) return;
    if (!Number.isFinite(profile.lat) || !Number.isFinite(profile.lng)) return;
    initialProfileSubmitted.current = true;
    const initialTransitProfile = {
      ...profile,
      name: "Current transit",
      sex: "not-applicable" as const,
    };
    setProfile({ name: initialTransitProfile.name, sex: initialTransitProfile.sex });
    setSubmittedProfile(initialTransitProfile);
    setChartMode("transit");
  }, [profile.date, profile.time, profile.lat, profile.lng, profile.timezone, profile.name, profile.sex, setProfile]);

  useEffect(() => {
    if (!authLoaded) return;
    let active = true;
    void fetch("/api/profiles")
      .then(async (response) => {
        const result = await response.json() as { profiles?: SavedChartRecord[]; error?: string };
        if (!active) return;
        if (response.status === 401) {
          setAuthRequired(true);
          return;
        }

        if (!response.ok || !Array.isArray(result.profiles)) throw new Error(result.error ?? `Saved chart request failed (${response.status}).`);
        setAuthRequired(false);
        setSavedProfiles(result.profiles);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        console.error("[kundali] Unable to load saved charts", requestError);
        setSaveError(requestError instanceof Error ? requestError.message : "Unable to load saved charts.");
      });
    return () => {
      active = false;
    };
  }, [authLoaded, isSignedIn]);

  useEffect(() => {
    setLocationSearch(profile.city);
  }, [profile.city]);

  useEffect(() => {
    const notesInput = notesInputRef.current;
    if (!notesInput) return;
    notesInput.style.height = "36px";
    notesInput.style.height = `${profile.notes ? Math.max(notesInput.scrollHeight, 36) : 36}px`;
  }, [profile.notes]);

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
    if (!submittedProfile?.date || !submittedProfile.time) {
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
            nameFirstLetter: submittedProfile.name.trim().slice(0, 1).toUpperCase(),
            gender: submittedProfile.sex,
            ...(auxiliaryType === "solar" || auxiliaryType === "tajika" ? { targetAge, ageMode } : {}),
          }),
        });
        const responseText = await response.text();
        let result: EphemerisResponse | { error: string };
        try {
          result = JSON.parse(responseText) as EphemerisResponse | { error: string };
        } catch {
          throw new Error(`Ephemeris request failed (${response.status}): ${responseText.trim() || "The server returned an empty response."}`);
        }
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
  }, [submittedProfile, ayanamsa, zodiacMode, customAyanamsaDegrees, nodeType, auxiliaryType, targetAge, ageMode]);

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
            avasthaConfig: readSavedAstrologyConfig()?.avastha,
          }),
        });
        const responseText = await response.text();
        let result: EphemerisResponse | { error: string };
        try {
          result = JSON.parse(responseText) as EphemerisResponse | { error: string };
        } catch {
          throw new Error(`Transit request failed (${response.status}): ${responseText.trim() || "The server returned an empty response."}`);
        }
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
  const submitBirthChart = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile.date || !profile.time || !Number.isFinite(profile.lat) || !Number.isFinite(profile.lng) || profile.lat < -90 || profile.lat > 90 || profile.lng < -180 || profile.lng > 180 || !profile.timezone) {
      setError("Enter a valid birth date, time, and city before submitting.");
      return;
    }
    setSubmittedProfile({ ...profile, name: profile.name.trim() || "Birth chart" });
    setChartMode("birth");
    setError(null);
  };
  const submitSaveChart = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
          notes: profile.notes,
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
  const openSavedChart = (profileId: string) => {
    setSavedProfileId(profileId);
    const selected = savedProfiles.find((item) => item.id === profileId);
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
        notes: selected.notes ?? "",
      });
      setSubmittedProfile({
        id: selected.id,
        name: selected.fullName,
        sex: profile.sex,
        date: selected.dateOfBirth.slice(0, 10),
        time: selected.timeOfBirth,
        lat: selected.latitude,
        lng: selected.longitude,
        timezone: selected.timezone,
        city: selected.city ?? "",
        notes: selected.notes ?? "",
      });
      setLatitudeDraft(selected.latitude.toFixed(2));
      setLongitudeDraft(selected.longitude.toFixed(2));
      setUseCoordinates(false);
    }
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

  const displayData = chartMode === "transit" ? transitData : data;
  const displayLoading = chartMode === "transit" ? transitLoading : loading;
  const displayError = chartMode === "transit" ? transitError : error;
  const activeBirthProfile = submittedProfile ?? profile;
  const referenceHouseNumber = getReferenceHouse(referenceName);
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
  const currentTransitLabel = transitData ? new Date(transitData.calculatedAt).toLocaleTimeString() : "—";
  return (
    <div id="kundali-dashboard" className="relative min-w-0 space-y-4 bg-background text-foreground">
      <div className="mx-auto max-w-[1750px] space-y-4">
        <section aria-label="Birth chart controls" className="shrink-0 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div id="saved-charts" className="flex items-center gap-2 scroll-mt-4">
              <span className="grid size-7 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"><Orbit className="size-4" /></span>
              <p className="text-xs font-semibold">Chart profile</p>
            </div>
            <div className="flex flex-nowrap items-center gap-1.5">
              <button type="button" onClick={saveChart} title="Save chart" aria-label="Save chart" className="inline-grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:border-slate-700 dark:text-slate-200 dark:hover:border-amber-800 dark:hover:bg-amber-950/30 dark:hover:text-amber-200"><Save className="size-4" /></button>
              <select aria-label="Saved charts; select one to load" title="Select a saved chart to load" value={savedProfileId} onChange={(event) => openSavedChart(event.target.value)} className={`${CONTROL_CLASS} h-9 max-w-48 text-xs`}>
                <option value="">Saved charts ({savedProfiles.length})</option>
                {savedProfiles.map((saved) => <option key={saved.id} value={saved.id}>{saved.chartName ?? saved.fullName} · {saved.dateOfBirth.slice(0, 10)}</option>)}
              </select>
            </div>
          </div>
          <form onSubmit={submitBirthChart} className="space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              <label className="flex min-w-0 flex-col text-xs font-medium text-slate-700 dark:text-slate-300">
                Chart name
                <input aria-label="Chart name" type="text" value={profile.name === "Current transit" ? "" : profile.name} placeholder={chartMode === "transit" ? "Current Transit" : "Enter your name"} onChange={(event) => setProfile({ name: event.target.value })} className={`${CONTROL_CLASS} mt-1 h-9 w-full text-sm placeholder:text-slate-600 dark:placeholder:text-slate-400`} />
              </label>
              <label className="flex min-w-0 flex-col text-xs font-medium text-slate-700 dark:text-slate-300">Gender
                <select aria-label="Gender" value={profile.sex} onChange={(event) => setProfile({ sex: event.target.value as BirthProfile["sex"] })} className={`${CONTROL_CLASS} mt-1 h-9 w-full min-w-0 px-2 text-sm`}>
                  <option value="not-applicable">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>
              <label className="flex min-w-0 flex-col text-xs font-medium text-slate-700 dark:text-slate-300">Birth date
                <input aria-label="Birth date" type="date" value={profile.date} onChange={(event) => setProfile({ date: event.target.value })} className={`${CONTROL_CLASS} mt-1 h-9 w-full px-2 text-sm`} />
              </label>
              <label className="flex min-w-0 flex-col text-xs font-medium text-slate-700 dark:text-slate-300">Birth time
                <input aria-label="Time of birth" type="time" step={1} value={profile.time} onChange={(event) => {
                  const time = event.target.value;
                  if (time) setProfile({ time: time.length === 5 ? `${time}:00` : time });
                }} className={`${CONTROL_CLASS} mt-1 h-9 w-full px-2 text-sm font-mono`} />
              </label>
              <div className="relative min-w-0 text-xs font-medium text-slate-700 dark:text-slate-300">
                {!useCoordinates ? (
                  <>
                    <label htmlFor="birth-city-search">Birth city</label>
                    <span className="relative mt-1 block">
                      <MapPin className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                      <input id="birth-city-search" aria-label="Birth city; search anywhere" type="search" value={locationSearch} onChange={(event) => setLocationSearch(event.target.value)} placeholder="Search city…" autoComplete="off" aria-autocomplete="list" aria-expanded={locationResults.length > 0} className={`${CONTROL_CLASS} h-9 w-full min-w-0 px-2 pr-16 text-sm`} />
                      {locationLoading && <Search className="absolute right-14 top-2.5 size-3.5 animate-pulse text-primary" />}
                      <button type="button" onClick={useCurrentLocation} disabled={currentLocationLoading} title={currentLocationLoading ? "Finding current location" : "Use current location"} aria-label={currentLocationLoading ? "Finding current location" : "Use current location"} className="absolute right-8 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-wait disabled:opacity-60">
                        {currentLocationLoading ? <LoaderCircle className="size-3.5 animate-spin" /> : <Crosshair className="size-3.5" />}
                      </button>
                      <button type="button" onClick={() => {
                        if (Number.isFinite(profile.lat)) setLatitudeDraft(profile.lat.toFixed(2));
                        if (Number.isFinite(profile.lng)) setLongitudeDraft(profile.lng.toFixed(2));
                        setUseCoordinates(true);
                        setLocationError(null);
                      }} title="Enter birth coordinates" aria-label="Enter birth coordinates" className="absolute right-1 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"><MapPin className="size-3.5" /></button>
                    </span>
                    {locationError && <p role="status" className="absolute z-10 mt-1 rounded bg-card px-1 text-xs text-destructive">{locationError}</p>}
                    {locationResults.length > 0 && (
                      <ul role="listbox" aria-label="Location search results" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl">
                        {locationResults.map((location) => <li key={`${location.label}-${location.latitude}-${location.longitude}`} role="option" aria-selected={false}><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseLocation(location)} className="w-full rounded-lg px-2.5 py-2 text-left transition hover:bg-muted"><span className="block truncate text-xs font-medium text-foreground">{location.city}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{location.label} · {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)} · {location.timezone}</span></button></li>)}
                      </ul>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_1.5rem] items-end gap-1">
                    <label className="min-w-0 truncate">Latitude
                      <input aria-label="Latitude" type="text" inputMode="decimal" autoComplete="off" value={latitudeDraft} onChange={(event) => {
                        const value = limitCoordinatePrecision(event.target.value);
                        setLatitudeDraft(value);
                        setProfile({ lat: parseCoordinateDraft(value) });
                      }} className={`${CONTROL_CLASS} mt-1 h-9 w-full min-w-0 px-1 text-xs font-mono tabular-nums`} placeholder="28.66" />
                    </label>
                    <label className="min-w-0 truncate">Longitude
                      <input aria-label="Longitude" type="text" inputMode="decimal" autoComplete="off" value={longitudeDraft} onChange={(event) => {
                        const value = limitCoordinatePrecision(event.target.value);
                        setLongitudeDraft(value);
                        setProfile({ lng: parseCoordinateDraft(value) });
                      }} className={`${CONTROL_CLASS} mt-1 h-9 w-full min-w-0 px-1 text-xs font-mono tabular-nums`} placeholder="72.87" />
                    </label>
                    <button type="button" onClick={() => {
                      setUseCoordinates(false);
                      setLocationError(null);
                    }} title="Search for a birth city" aria-label="Search for a birth city" className="grid size-9 place-items-center rounded-lg border border-input text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                      <MapPin className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <button type="submit" className="inline-flex h-9 w-full min-w-0 items-center justify-center gap-1.5 rounded-lg bg-amber-700 px-1 text-xs font-semibold text-white transition hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/40">
                Load birth chart
              </button>
              <div className="-mx-3 -mb-3 mt-1 flex min-w-0 items-start gap-2 rounded-b-xl border-t border-border bg-slate-50/80 px-3 py-2 dark:bg-slate-800/50 sm:col-span-2 md:col-span-3 lg:col-span-6">
                  <label htmlFor="chart-notes" className="sr-only">Chart notes</label>
                  <textarea
                    ref={notesInputRef}
                    id="chart-notes"
                    maxLength={10000}
                    rows={1}
                    value={profile.notes}
                    onChange={(event) => setProfile({ notes: event.target.value })}
                    onFocus={() => setNotesFocused(true)}
                    onBlur={() => setNotesFocused(false)}
                    placeholder="Add personal notes, life events, or reference details..."
                    className="min-h-9 min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent p-1.5 text-sm leading-5 text-foreground outline-none placeholder:whitespace-nowrap placeholder:text-ellipsis placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                  />
                  {notesFocused && <span aria-live="polite" className="shrink-0 pt-2 text-[10px] tabular-nums text-muted-foreground">{profile.notes.length}/10,000</span>}
                </div>
            </div>
          </form>
          {coordinateTimezoneError && <p role="status" className="mt-1 truncate text-[11px] text-rose-700 dark:text-rose-300">{coordinateTimezoneError}</p>}
        </section>

        <nav role="tablist" aria-label="Kundali analysis" className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-sm">
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
              className={`min-h-9 shrink-0 rounded-lg px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${dashboardTab === id ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div id="kundali-tab-panel" role="tabpanel" aria-labelledby={`kundali-tab-${dashboardTab}`} className="min-w-0">
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
        {dashboardTab === "element-modality" && (
          <Suspense fallback={<SecondaryTabSkeleton />}>
            <ElementModalityTab data={displayData} language={language} />
          </Suspense>
        )}
        {dashboardTab === "aspects" && (
          <Suspense fallback={<SecondaryTabSkeleton />}>
            <AspectsTab data={displayData} language={language} useSignIcons={viewPreferences.useSignIcons} />
          </Suspense>
        )}
        {dashboardTab === "core" && (
        <div className="space-y-4">
        {displayError && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{displayError}</span></div>}
        <PanchangStrip date={displayData?.input.date ?? profile.date} planets={displayData?.planets ?? []} />

        {/* Core chart panels grow with their controls and charts; wide tables keep horizontal-only overflow. */}
        <div id="kundali-charts" className="grid w-full grid-cols-1 items-stretch gap-4 scroll-mt-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="row-start-1 flex min-h-0 min-w-0 xl:col-start-1">
            <section className="relative flex h-full min-h-0 w-full flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm" aria-label="Primary D1 chart">
              <div className="bg-muted/10 p-4 border-b border-border flex flex-col gap-3 xl:min-h-[232px]">
              <div className="flex flex-none flex-wrap items-center justify-between gap-2">
                <div><p className="text-xs font-semibold">Primary chart · D1</p><p className="mt-0.5 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">{chartMode === "transit" ? "Current transit · whole sign" : "Birth chart · whole sign"}</p></div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800 dark:bg-amber-400/10 dark:text-amber-300"><Crosshair className="size-3" /> {displayData?.ascendant.signName ?? "—"} rising · {displayData ? degreeToDms(displayData.ascendant.longitude % 30) : "—"}</span>
                  {chartMode === "birth" && <BirthTimeAdjuster onAdjust={adjustBirthTime} />}
                  <button type="button" onClick={() => setChartMaximized(true)} aria-label="Maximize D1 chart" title="View chart full screen" className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-cyan-400 hover:text-cyan-700 dark:border-slate-700 dark:text-slate-300 dark:hover:text-cyan-300"><Maximize2 className="size-4" /></button>
                </div>
              </div>
                <div className="flex flex-1 flex-col justify-between gap-3">
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
              </div>
              <div className="relative h-[min(95vw,500px)] min-h-[360px] min-w-0 w-full overflow-hidden p-4 flex items-center justify-center bg-card">
                <div className="relative h-full w-full max-w-[500px] max-h-[500px] aspect-square">
                  {displayData ? <SvgChart style={chartStyle} ascendant={displayData.ascendant} planets={displayData.planets} points={displayData.points} houseCusps={displayData.houseCusps} varga={1} referenceHouse={referenceHouseNumber} overlay={chartMode === "birth" && overlayTransits ? transitData?.planets : undefined} language={language} preferences={viewPreferences} /> : <div className="grid h-full w-full place-items-center text-xs text-slate-600">{displayLoading ? <LoaderCircle className="size-5 animate-spin text-cyan-500" /> : "Chart unavailable"}</div>}
                </div>
              </div>
              <div className="mt-3 flex flex-none flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><span className={`size-2 rounded-full ${chartMode === "transit" ? "bg-cyan-600 dark:bg-cyan-400" : "bg-amber-600 dark:bg-amber-400"}`} /> {chartMode === "transit" ? "Current transit" : "Birth chart"}</span>
                <button type="button" className="flex items-center gap-1.5 rounded px-1 transition hover:bg-[hsl(var(--input))]/50" onMouseEnter={() => setHoveredPlanet("Vargottama")} onMouseLeave={() => setHoveredPlanet(null)} onFocus={() => setHoveredPlanet("Vargottama")} onBlur={() => setHoveredPlanet(null)}><span className="inline-block size-3 rounded-full border border-violet-600" /> Vargottama</button>
                <span title="Retrograde Motion"><span className="font-bold text-rose-600">R</span> = retrograde</span>
                <span>{chartStyle === "placidus" ? `${referenceName === "Ascendant" ? "Ascendant" : `House ${referenceHouseNumber}`} at 9 o’clock` : `${referenceName === "Ascendant" ? "Ascendant" : `House ${referenceHouseNumber}`} reference`}</span>
              </div>
              {chartMode === "transit" && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{transitLoading ? "Refreshing current sky…" : transitError ?? `Current sky · ${currentTransitLabel}`}</p>}
              {chartMode === "birth" && overlayTransits && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{transitLoading ? "Refreshing current sky…" : transitError ?? `Transit positions · ${currentTransitLabel}`}</p>}
            </section>
          </div>

          <div className="order-2 flex min-h-0 min-w-0 xl:col-start-2 xl:row-start-1">
            <section id="auxiliary-chart" className="relative flex h-full min-h-0 w-full flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm" aria-label="Auxiliary chart viewer">
              <div className="bg-muted/10 p-4 border-b border-border flex flex-col gap-3 xl:min-h-[232px]">
              <div className="grid flex-none grid-cols-1 gap-4 md:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{auxiliaryType === "divisional" ? selectedAuxiliaryChart.label : "Auxiliary chart viewer"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{auxiliaryType === "divisional" ? selectedAuxiliaryChart.description : "Compare divisional, transit, return &amp; progression views"}</p>
                </div>
                <div className="flex w-full gap-2">
                  <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">Auxiliary chart
                    <select aria-label="Auxiliary chart type" value={auxiliaryType} onChange={(event) => setAuxiliaryType(event.target.value as AuxiliaryType)} className={`${CONTROL_CLASS} w-full`}>
                      <option value="divisional">Divisional Charts (D2–D60)</option><option value="transit">Transit Chart</option><option value="solar">Solar Return (Varshaphala)</option><option value="tajika">Tajika</option><option value="progressions">Progressions</option>
                    </select>
                  </label>
                  <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">Reference Lagna
                    <select aria-label="Auxiliary reference lagna" value={auxiliaryReferenceName} onChange={(event) => setAuxiliaryReferenceName(event.target.value)} className={`${CONTROL_CLASS} w-full`}>
                      <option value="Ascendant">Ascendant</option>
                      {Array.from({ length: 12 }, (_, index) => <option key={index} value={`house:${index + 1}`}>House {index + 1}</option>)}
                    </select>
                  </label>
                </div>
              </div>
              {auxiliaryType === "divisional" && (
                <div className="flex min-h-10 flex-none items-center">
                  <Select
                    value={auxiliaryChartId}
                    onValueChange={(value) => {
                      setAuxiliaryChartId(value);
                      setVarga(value === "BHAVA" ? 1 : Number(value.slice(1)));
                    }}
                  >
                    <SelectTrigger aria-label="Select auxiliary divisional chart" className="h-9 w-full bg-card">
                      <SelectValue placeholder="Select a chart" />
                    </SelectTrigger>
                    {/* Opaque portal surface stays legible above the auxiliary chart. */}
                    <SelectContent className="z-[100] !bg-white dark:!bg-gray-900">
                      <SelectGroup>
                        <SelectLabel>Primary</SelectLabel>
                        {AUXILIARY_CHARTS.filter((chart) => chart.group === "Primary").map((chart) => <SelectItem key={chart.id} value={chart.id}>{chart.label} · {chart.description}</SelectItem>)}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Divisional</SelectLabel>
                        {AUXILIARY_CHARTS.filter((chart) => chart.group === "Divisional").map((chart) => <SelectItem key={chart.id} value={chart.id}>{chart.label} · {chart.description}</SelectItem>)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
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
              </div>
              <div className="relative h-[min(95vw,500px)] min-h-[360px] min-w-0 w-full overflow-hidden p-4 flex items-center justify-center bg-card">
                <div className="relative h-full w-full max-w-[500px] max-h-[500px] aspect-square">
                  {auxiliaryAscendant && auxiliaryPlanets
                    ? <SvgChart style={chartStyle} ascendant={auxiliaryAscendant} planets={auxiliaryPlanets} points={auxiliaryPoints ?? []} houseCusps={auxiliaryCusps ?? []} varga={auxiliaryVarga} houseBasedPlacement={isBhavaChalitChart} referenceHouse={auxiliaryReferenceHouseNumber} overlay={undefined} language={language} preferences={viewPreferences} />
                    : <div className="grid h-full w-full place-items-center px-6 text-center text-xs text-slate-600">{displayLoading ? <LoaderCircle className="size-5 animate-spin text-cyan-500" /> : "Auxiliary chart unavailable"}</div>}
                </div>
              </div>
              {auxiliaryType === "solar" || auxiliaryType === "tajika"
                ? <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Exact sidereal solar return · {solarReturnUtc ? `${new Date(solarReturnUtc ?? "").toLocaleString()} UTC` : "Awaiting calculation"} · {auxiliaryReferenceName === "Ascendant" ? "Ascendant" : `House ${auxiliaryReferenceHouseNumber}`} reference</p>
                : auxiliaryType === "transit" ? <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Current sky at chart coordinates · {currentTransitLabel} · {auxiliaryReferenceName === "Ascendant" ? "Ascendant" : `House ${auxiliaryReferenceHouseNumber}`} reference</p>
                  : auxiliaryType === "progressions" ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Progression controls are saved in this view, but progression calculations are not yet provided by the ephemeris engine. Reference lagna: {auxiliaryReferenceName === "Ascendant" ? "Ascendant" : `House ${auxiliaryReferenceHouseNumber}`}.</p>
                    : <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">D{varga} divisional placements · whole-sign houses · {auxiliaryReferenceName === "Ascendant" ? "Ascendant" : `House ${auxiliaryReferenceHouseNumber}`} reference</p>}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
                <button type="button" className="flex items-center gap-1.5 rounded px-1 transition hover:bg-[hsl(var(--input))]/50" onMouseEnter={() => setHoveredPlanet("Vargottama")} onMouseLeave={() => setHoveredPlanet(null)} onFocus={() => setHoveredPlanet("Vargottama")} onBlur={() => setHoveredPlanet(null)}><span className="inline-block size-3 rounded-full border border-violet-600" /> Vargottama</button>
                <span title="Retrograde Motion"><span className="font-bold text-rose-600">R</span> = retrograde</span>
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
                <div role="group" aria-label="Longitude display format" className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-950">
                  {([["dms", false], ["decimal", true]] as const).map(([label, decimal]) => <button key={label} type="button" aria-pressed={decimalDegrees === decimal} onClick={() => setDecimalDegrees(decimal)} className={`rounded-md px-2 py-1.5 text-xs ${decimalDegrees === decimal ? "bg-white font-semibold text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-600"}`}>{label === "dms" ? "DMS" : "Decimal"}</button>)}
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
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

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3" /> Bhava cusps: Placidus · planetary houses: Whole Sign</span>
          {data && <span>Calculated {new Date(data.calculatedAt).toLocaleTimeString()}</span>}
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
        {dashboardTab === "export" && (
          <Suspense fallback={<SecondaryTabSkeleton />}>
            <ChartExportTab data={displayData} chartName={profile.name || "Celestia chart"} />
          </Suspense>
        )}
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
              <input id="saved-chart-name" autoFocus maxLength={100} value={chartNameDraft} onChange={(event) => setChartNameDraft(event.target.value)} className={`${CONTROL_CLASS} w-full`} placeholder="Optional chart name" />
              {authRequired && <p className="text-xs text-amber-700 dark:text-amber-300">Sign in before saving a chart.</p>}
              {saveError && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{saveError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" disabled={savingChart} onClick={() => setSaveDialogOpen(false)} className="h-9 rounded-lg border border-slate-200 px-3 text-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancel</button>
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
              <div><h2 id="maximized-chart-title" className="text-sm font-semibold">D1 {chartMode === "transit" ? "Transit" : "Birth"} · {referenceName === "Ascendant" ? "Ascendant" : `House ${referenceHouseNumber}`} reference</h2><p className="text-xs text-slate-600">{chartMode === "transit" ? `${transitData ? new Date(transitData.calculatedAt).toLocaleString() : "Current sky"} · ${profile.city}` : `${activeBirthProfile.name} · ${formatBirthDate(activeBirthProfile.date)} · ${activeBirthProfile.city}`}</p></div>
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

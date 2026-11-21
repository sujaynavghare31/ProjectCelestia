"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CarFront,
  Check,
  CircleHelp,
  Compass,
  Gem,
  FolderOpen,
  Globe2,
  Heart,
  Info,
  Menu,
  Moon,
  Orbit,
  PanelTop,
  Sparkles,
  Sun,
  UserRound,
  Wallet,
  WandSparkles,
  Smartphone,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KundaliDashboard } from "@/components/kundali-dashboard";
import type { CelestialLanguage } from "@/lib/kundali-types";
import { useKundaliStore } from "@/lib/kundali-store";
import { TABLES, chaldeanSum, computeProfile, digitSum, kuaOf, masterReduce, pythSum, reduce, relationLabel } from "@/lib/numerology";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { isLocalClerkFallback } from "@/lib/clerk-config";
import CelestiaLoader from "@/components/ui/CelestiaLoader";
import { AYANAMSA_OPTIONS, getAyanamsaLabel } from "@/lib/ayanamsa-options";

const gridNumbers = [4, 9, 2, 3, 5, 7, 8, 1, 6];

const planetDetails: Record<number, {
  planet: string;
  traits: string;
  colors: string[];
  swatches: string[];
  gemstone: string;
  unfavorableColors: string[];
  enemies: number[];
  friends: number[];
  luckyDay: string;
}> = {
  1: { planet: "Sun", traits: "Initiative, leadership, confidence", colors: ["Gold", "Orange"], swatches: ["bg-amber-300", "bg-amber-400"], gemstone: "Ruby", unfavorableColors: ["Black", "Deep blue"], enemies: [6, 8], friends: [2, 3, 9], luckyDay: "Sunday" },
  2: { planet: "Moon", traits: "Intuition, empathy, imagination", colors: ["White", "Silver"], swatches: ["bg-slate-100", "bg-slate-400"], gemstone: "Pearl", unfavorableColors: ["Dark red", "Black"], enemies: [8], friends: [1, 3, 5], luckyDay: "Monday" },
  3: { planet: "Jupiter", traits: "Wisdom, expression, optimism", colors: ["Yellow", "Violet"], swatches: ["bg-yellow-400", "bg-violet-500"], gemstone: "Yellow sapphire", unfavorableColors: ["Black", "Dark green"], enemies: [6], friends: [1, 2, 9], luckyDay: "Thursday" },
  4: { planet: "Rahu", traits: "Originality, discipline, persistence", colors: ["Electric blue", "Grey"], swatches: ["bg-sky-300", "bg-stone-400"], gemstone: "Hessonite", unfavorableColors: ["Red", "Orange"], enemies: [1, 8], friends: [5, 6], luckyDay: "Saturday" },
  5: { planet: "Mercury", traits: "Adaptability, curiosity, communication", colors: ["Emerald", "Turquoise"], swatches: ["bg-emerald-500", "bg-teal-400"], gemstone: "Emerald", unfavorableColors: ["Red", "Black"], enemies: [], friends: [1, 3, 6], luckyDay: "Wednesday" },
  6: { planet: "Venus", traits: "Harmony, aesthetics, responsibility", colors: ["Rose", "Sky blue"], swatches: ["bg-rose-400", "bg-sky-400"], gemstone: "Diamond", unfavorableColors: ["Dark red", "Black"], enemies: [1, 3], friends: [2, 5, 8], luckyDay: "Friday" },
  7: { planet: "Ketu", traits: "Reflection, insight, independence", colors: ["Sea green", "White"], swatches: ["bg-teal-500", "bg-slate-100"], gemstone: "Cat’s eye", unfavorableColors: ["Black", "Dark red"], enemies: [8], friends: [1, 2, 5], luckyDay: "Monday" },
  8: { planet: "Saturn", traits: "Ambition, resilience, achievement", colors: ["Navy", "Charcoal"], swatches: ["bg-slate-500", "bg-stone-700"], gemstone: "Blue sapphire", unfavorableColors: ["Red", "Orange"], enemies: [1, 2, 4], friends: [5, 6], luckyDay: "Saturday" },
  9: { planet: "Mars", traits: "Courage, compassion, determination", colors: ["Red", "Coral"], swatches: ["bg-rose-300", "bg-rose-200"], gemstone: "Red coral", unfavorableColors: ["Black", "Navy"], enemies: [], friends: [1, 3, 5], luckyDay: "Tuesday" },
};

const arrowDefinitions = [
  { numbers: [2, 5, 8], label: "Spirituality", explanation: "Inner awareness & intuition", color: "cyan" },
  { numbers: [4, 5, 6], label: "Willpower", explanation: "Focus & determination", color: "yellow" },
  { numbers: [1, 5, 9], label: "Intuition", explanation: "Vision & clear direction", color: "violet" },
  { numbers: [4, 9, 2], label: "Mental plane", explanation: "Analytical & imaginative thinking", color: "blue" },
];

const arrowCoordinates: Record<number, [number, number]> = {
  1: [150, 250], 2: [250, 50], 3: [50, 150],
  4: [50, 50], 5: [150, 150], 6: [250, 250],
  7: [250, 150], 8: [50, 250], 9: [150, 50],
};

const navigationItems = [
  { id: "panchang", label: "Panchang", icon: CalendarDays },
  { id: "kundali", label: "Kundali", icon: Compass },
  { id: "numerology", label: "Numerology", icon: Sparkles },
  { id: "jamakkol", label: "Jamakkol", icon: Orbit },
  { id: "match", label: "Match Making", icon: Heart },
  { id: "about", label: "About", icon: Info },
] as const;
const mobileNavigationItems = [
  { id: "panchang", label: "Panchang", icon: CalendarDays },
  { id: "kundali", label: "Kundali", icon: Compass },
  { id: "numerology", label: "Numerology", icon: Sparkles },
  { id: "jamakkol", label: "Jamakkol", icon: Orbit },
  { id: "match", label: "Match Making", icon: Heart },
] as const;

function NumerologyTabLoading() {
  return (
    <CelestiaLoader label="Loading Numerology…" sublabel="Preparing your numerology insights…" tone="dashboard" />
  );
}

const PanchangDashboard = dynamic(() => import("@/components/panchang/PanchangDashboard"), {
  loading: () => <CelestiaLoader label="Loading Panchang…" sublabel="Preparing today's calendar and insights…" tone="dashboard" />,
});
const About = dynamic(() => import("@/components/About"), {
  loading: () => <CelestiaLoader label="Loading About…" sublabel="Preparing Project Celestia information…" tone="dashboard" />,
});
const NumerologyPrimer = dynamic(() => import("@/components/numerology/NumerologyPrimer"), {
  loading: NumerologyTabLoading,
});
const CoreEssenceTab = dynamic(() => import("@/components/numerology/CoreEssenceTab"), { loading: NumerologyTabLoading });
const EnterpriseCommerceTab = dynamic(() => import("@/components/numerology/EnterpriseCommerceTab"), { loading: NumerologyTabLoading });
const SynergyBondsTab = dynamic(() => import("@/components/numerology/SynergyBondsTab"), { loading: NumerologyTabLoading });
const NumerologyWorkbench = dynamic(() => import("@/components/numerology/NumerologyWorkbench"), {
  loading: NumerologyTabLoading,
});
const MatchTab = dynamic(() => import("@/components/match/MatchTab"), {
  ssr: false,
  loading: () => <CelestiaLoader label="Opening match making…" sublabel="Preparing Kundli Milan analysis…" tone="dashboard" />,
});

function parseBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (year < 1900 || year > 2100) return null;
  const check = new Date(year, month - 1, day);
  if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (check > today) return null;
  return { year, month, day };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">{children}</p>;
}

function CardHeading({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <CardTitle>{title}</CardTitle>
      </div>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </div>
  );
}

function MetricCard({
  label,
  number,
  planet,
  breakdown,
  subtitle,
  icon: Icon,
  accent = "gold",
}: {
  label: string;
  number: number | null;
  planet: string;
  breakdown: string;
  subtitle: string;
  icon: LucideIcon;
  accent?: "gold" | "sage";
}) {
  const isGold = accent === "gold";
  return (
    <Card>
      <CardHeader><CardHeading icon={Icon} title={label} detail="CORE NUMBER" /></CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <div className={`font-serif text-[72px] font-medium leading-[0.9] tracking-[-0.08em] ${isGold ? "text-amber-600 dark:text-amber-300" : "text-emerald-800 dark:text-emerald-300"}`}>
            {number ?? "—"}
          </div>
          <div className={`mb-1 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${isGold ? "bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300" : "bg-emerald-50 text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-300"}`}>
            <Orbit className="size-3.5" /> {planet}
          </div>
        </div>
        <p className="mt-4 min-h-9 rounded-lg bg-muted/60 px-3 py-2 font-mono text-xs leading-5 text-muted-foreground">{breakdown || "Add a valid date of birth"}</p>
        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function HomeContent({ isSignedIn }: { isSignedIn: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const birthProfile = useKundaliStore((state) => state.profile);
  const setBirthProfile = useKundaliStore((state) => state.setProfile);
  const language = useKundaliStore((state) => state.language);
  const setLanguage = useKundaliStore((state) => state.setLanguage);
  const ayanamsa = useKundaliStore((state) => state.ayanamsa);
  const setAyanamsa = useKundaliStore((state) => state.setAyanamsa);
  const zodiacMode = useKundaliStore((state) => state.zodiacMode);
  const languageLabel = language === "initials" ? "English · initials" : language === "hi" ? "Hindi" : language === "mr" ? "Marathi" : "English";
  const [mounted, setMounted] = useState(false);
  const [system, setSystem] = useState(false);
  const fullName = birthProfile.name;
  const dateOfBirth = birthProfile.date;
  const [kuaGender, setKuaGender] = useState<"male" | "female">("male");
  const [activeTab, setActiveTab] = useState("kundali");
  const [selectedTab, setSelectedTab] = useState("kundali");
  const [, startTabTransition] = useTransition();
  const [activeNavigation, setActiveNavigation] = useState("kundali");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuCloseButtonRef = useRef<HTMLButtonElement>(null);
  const [dashboardNavigationRequest, setDashboardNavigationRequest] = useState<{ tab: "core" | "jamakkol"; id: number } | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const isDark = mounted ? resolvedTheme === "dark" : false;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    setMounted(true);
    const tab = new URLSearchParams(window.location.search).get("tab");
    const destination = navigationItems.find(({ id }) => id === tab)?.id;
    if (!destination) return;
    setActiveNavigation(destination);
    const nextTab = destination === "jamakkol" ? "kundali" : destination;
    setActiveTab(nextTab);
    setSelectedTab(nextTab);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const activeElement = document.activeElement;
    menuCloseButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (activeElement instanceof HTMLElement) activeElement.focus();
    };
  }, [mobileMenuOpen]);

  const numerology = useMemo(() => {
    const birth = parseBirthDate(dateOfBirth);
    const letterMap = system ? TABLES.pythagorean : TABLES.chaldean;
    const letters = Array.from(fullName.toUpperCase()).flatMap((character, index) => {
      const value = letterMap[character];
      return value ? [{ character, value, index }] : [];
    });
    const nameTotal = system ? pythSum(fullName) : chaldeanSum(fullName);
    const nameNumber = !letters.length ? null : system ? masterReduce(nameTotal) : reduce(nameTotal);

    if (!birth) {
      return {
        birth: null,
        digitCounts: {} as Record<number, number>,
        mulank: null,
        mulankBreakdown: "",
        bhagyank: null,
        bhagyankBreakdown: "",
        nameCompound: letters.length ? nameTotal : null,
        nameNumber,
        nameTrace: letters.length ? `${nameTotal} → ${nameNumber}` : "",
        letters,
        kuaNumber: null,
        kuaMaleNumber: null,
        kuaFemaleNumber: null,
        personalYear: null,
        personalYearTrace: "",
        personalYearProgress: 0,
        profile: null,
      };
    }

    const todayDate = new Date();
    const todayISO = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;
    const profile = computeProfile({
      fullName,
      dob: dateOfBirth,
      gender: kuaGender === "male" ? "Male" : "Female",
      forecastYear: currentYear,
      today: todayISO,
    });
    const currentDate = new Date();
    const thisYearBirthday = new Date(currentDate.getFullYear(), birth.month - 1, birth.day);
    const cycleStart = thisYearBirthday <= currentDate
      ? thisYearBirthday
      : new Date(currentDate.getFullYear() - 1, birth.month - 1, birth.day);
    const cycleEnd = new Date(cycleStart.getFullYear() + 1, birth.month - 1, birth.day);
    const cycleLength = cycleEnd.getTime() - cycleStart.getTime();
    const personalYearProgress = Math.max(0, Math.min(100, ((currentDate.getTime() - cycleStart.getTime()) / cycleLength) * 100));
    const dateDigits = dateOfBirth.replaceAll("-", "").split("").map(Number);
    const nameTrace = `${nameTotal} → ${nameNumber}`;

    return {
      birth,
      digitCounts: profile.loShu.counts,
      mulank: profile.chaldean.moolank,
      mulankBreakdown: `${String(birth.day).split("").join(" + ")} → ${profile.chaldean.moolank}`,
      bhagyank: profile.chaldean.bhagyank,
      bhagyankBreakdown: `${dateDigits.join(" + ")} = ${digitSum(dateOfBirth)} → ${profile.chaldean.bhagyank}`,
      nameCompound: letters.length ? nameTotal : null,
      nameNumber: letters.length ? (system ? profile.pythagorean.expression : profile.chaldean.nameNumber) : null,
      nameTrace: letters.length ? nameTrace : "",
      letters,
      kuaNumber: profile.chaldean.kua,
      kuaMaleNumber: kuaOf(dateOfBirth, "Male"),
      kuaFemaleNumber: kuaOf(dateOfBirth, "Female"),
      personalYear: profile.forecast.personalYear,
      personalYearTrace: profile.forecast.personalYearTheme,
      personalYearProgress,
      profile,
    };
  }, [dateOfBirth, fullName, system, kuaGender, currentYear]);

  const mulankInfo = numerology.mulank ? planetDetails[numerology.mulank] : null;
  const destinyInfo = numerology.bhagyank ? planetDetails[numerology.bhagyank] : null;
  const nameInfo = numerology.nameNumber ? planetDetails[numerology.nameNumber] : null;
  const luckyNumbers = [...new Set([numerology.mulank, numerology.bhagyank, numerology.nameNumber].filter((value): value is number => value !== null))];
  const enemyNumbers = numerology.mulank
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((number) => relationLabel(numerology.mulank, number) === "Enemy")
    : [];
  const planes = [
    { name: "Mental", numbers: [4, 9, 2] },
    { name: "Emotional", numbers: [3, 5, 7] },
    { name: "Practical", numbers: [8, 1, 6] },
  ].map((plane) => ({
    ...plane,
    count: numerology.birth ? plane.numbers.filter((number) => (numerology.digitCounts[number] ?? 0) > 0).length : 0,
    complete: numerology.birth && plane.numbers.every((number) => (numerology.digitCounts[number] ?? 0) > 0),
  }));
  const arrows = arrowDefinitions.map((arrow) => ({
    ...arrow,
    complete: numerology.birth && arrow.numbers.every((number) => (numerology.digitCounts[number] ?? 0) > 0),
    count: numerology.birth ? arrow.numbers.filter((number) => (numerology.digitCounts[number] ?? 0) > 0).length : 0,
  }));
  const missingNumbers = numerology.birth ? gridNumbers.filter((number) => !(numerology.digitCounts[number] > 0)) : [];
  const luckyDates = numerology.profile?.lucky.datesEveryMonth ?? [];
  const navigate = (destination: typeof navigationItems[number]["id"]) => {
    setMobileMenuOpen(false);
    setActiveNavigation(destination);
    const nextTab = destination === "jamakkol" ? "kundali" : destination;
    setSelectedTab(nextTab);
    startTabTransition(() => setActiveTab(nextTab));
    if (destination === "jamakkol" || destination === "kundali") {
      setDashboardNavigationRequest((current) => ({
        tab: destination === "jamakkol" ? "jamakkol" : "core",
        id: (current?.id ?? 0) + 1,
      }));
    }
    window.requestAnimationFrame(() => {
      const scroller = document.getElementById("dashboard-scroll");
      if (!scroller) return;
      const targetId = destination === "kundali" ? "kundali-charts" : null;
      const target = targetId ? document.getElementById(targetId) : null;
      if (target) {
        const scrollerTop = scroller.getBoundingClientRect().top;
        const targetTop = target.getBoundingClientRect().top;
        scroller.scrollTo({ top: scroller.scrollTop + targetTop - scrollerTop - 16, behavior: "smooth" });
      } else {
        scroller.scrollTo({ top: 0, behavior: "smooth" });
      }

    });
  };
  const renderNavigationItems = (compact = false) => navigationItems.map(({ id, label, icon: Icon }) => {
    const active = activeNavigation === id;
    return (
      <button
        key={id}
        id={`main-navigation-${id}`}
        type="button"
        onClick={() => navigate(id)}
        aria-current={active ? "page" : undefined}
        className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${compact ? "text-xs" : "w-full"} ${active ? "border-[#C05A3A]/30 bg-white font-semibold text-[#C05A3A] shadow-xs dark:bg-slate-800" : "border-transparent font-medium text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"}`}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {label}
      </button>
    );
  });
  const relationship = numerology.mulank && numerology.bhagyank
    ? relationLabel(numerology.mulank, numerology.bhagyank) === "Friend"
      ? "Friendly"
      : relationLabel(numerology.mulank, numerology.bhagyank)
    : "—";

  return (
    <main className="relative z-0 flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background text-foreground">
      <header className="sticky top-0 z-[70] shrink-0 border-b border-stone-200/70 bg-white/95 backdrop-blur dark:border-slate-700/70 dark:bg-slate-950/95">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
          <a href="#kundali-charts" onClick={(event) => { event.preventDefault(); navigate("kundali"); }} className="flex min-w-0 items-center gap-2" aria-label="Project Celestia Kundali dashboard">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <svg viewBox="0 0 36 36" aria-hidden="true" className="size-5">
                <circle cx="18" cy="18" r="6.5" fill="#f59e0b" />
                <path d="M18 3.5v5M18 27.5v5M3.5 18h5M27.5 18h5M7.75 7.75l3.6 3.6M24.65 24.65l3.6 3.6M28.25 7.75l-3.6 3.6M11.35 24.65l-3.6 3.6" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="27.5" cy="9" r="1.5" fill="#22d3ee" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="hidden truncate text-[13px] font-semibold tracking-[0.02em] min-[375px]:block md:block">Project Celestia</span>
              <span className="block truncate text-[13px] font-semibold tracking-[0.02em] min-[375px]:hidden md:hidden">Celestia</span>
              <span className="hidden text-[9px] tracking-wide text-slate-600 md:block dark:text-slate-400">YOUR PERSONAL COSMIC COMPASS</span>
            </span>
          </a>

          <div className="hidden shrink-0 items-center gap-2.5 md:flex">
            <Select value={ayanamsa} onValueChange={setAyanamsa} disabled={zodiacMode === "tropical"}>
              <SelectTrigger
                aria-label={`Ayanamsa, current setting: ${zodiacMode === "tropical" ? "Tropical · Sayana" : getAyanamsaLabel(ayanamsa)}`}
                title={zodiacMode === "tropical" ? "Ayanamsa applies only to Sidereal (Nirayana) charts" : "Ayanamsa"}
                className={`h-9 w-[132px] gap-1.5 rounded-xl bg-background px-2 text-[11px] xl:w-[178px] xl:px-2.5 ${zodiacMode === "tropical" ? "text-muted-foreground" : ""}`}
              >
                <Orbit aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-left">
                  {zodiacMode === "tropical" ? "Tropical · Sayana" : <><span className="xl:hidden">{getAyanamsaLabel(ayanamsa)}</span><span className="hidden xl:inline">Ayanamsa · {getAyanamsaLabel(ayanamsa)}</span></>}
                </span>
              </SelectTrigger>
              <SelectContent align="end" className="z-[100] max-h-[70vh] bg-card text-card-foreground">
                {AYANAMSA_OPTIONS.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={language} onValueChange={(value) => setLanguage(value as CelestialLanguage)}>
              <SelectTrigger aria-label={`Display language, current setting: ${languageLabel}`} className="h-9 w-[100px] gap-2 rounded-xl bg-background px-2 text-[11px] xl:w-[156px] xl:px-2.5">
                <Globe2 aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">{languageLabel}</span>
              </SelectTrigger>
              <SelectContent align="end" className="z-[100] bg-card text-card-foreground">
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
                <SelectItem value="mr">Marathi</SelectItem>
                <SelectItem value="initials">English · initials</SelectItem>
              </SelectContent>
            </Select>
            <Link href="/saved-charts" title="Open saved charts" className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#C05A3A]/40 bg-[#FDF2EC] px-2.5 text-xs font-semibold text-[#B44E2F] transition hover:bg-[#FBE6DA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40 xl:px-3.5">
              <FolderOpen aria-hidden="true" className="size-4 shrink-0" />
              <span>Load chart</span>
            </Link>
            {isSignedIn ? (
              <UserButton />
            ) : (
              <Link href="/login" prefetch={true} className="inline-flex h-9 items-center whitespace-nowrap rounded-xl px-2 text-xs font-semibold text-slate-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-200 dark:hover:bg-slate-800">
                Sign in
              </Link>
            )}
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
              title={`Switch to ${isDark ? "light" : "dark"} mode`}
            >
              {!mounted || isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:hidden">
            <Link href="/saved-charts" title="Open saved charts" className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#C05A3A]/40 bg-[#FDF2EC] px-2.5 text-xs font-semibold text-[#B44E2F] transition hover:bg-[#FBE6DA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40">
              <FolderOpen aria-hidden="true" className="size-4 shrink-0" />
              <span>Load</span>
            </Link>
            {isSignedIn ? (
              <UserButton />
            ) : (
              <Link href="/login" prefetch={true} className="inline-flex h-9 items-center justify-center rounded-xl px-2 text-xs font-semibold text-slate-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-200 dark:hover:bg-slate-800">
                Sign in
              </Link>
            )}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu-drawer"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-2.5 text-xs font-semibold text-slate-800 shadow-2xs transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Menu aria-hidden="true" className="size-4" />
              Menu
            </button>
          </div>
        </div>

        <div className="border-t border-stone-200/60 bg-[#FAF8F5]/90 dark:border-slate-700/70 dark:bg-slate-900/90">
          <nav aria-label="Primary modules" className="mx-auto hidden h-11 max-w-7xl items-center justify-center gap-2 px-3 md:flex sm:px-6 lg:px-8">
            {renderNavigationItems(true)}
          </nav>
          <div className="relative md:hidden">
            <nav aria-label="Primary modules" className="no-scrollbar flex h-11 snap-x snap-mandatory items-center gap-2 overflow-x-auto px-3 py-2">
              {mobileNavigationItems.map(({ id, label, icon: Icon }) => {
                const active = activeNavigation === id;
                return (
                  <button
                    key={id}
                    id={`mobile-main-navigation-${id}`}
                    type="button"
                    onClick={() => navigate(id)}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex h-8 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-xs font-medium touch-manipulation transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${active ? "border-[#C05A3A]/30 bg-white font-semibold text-[#C05A3A] shadow-xs dark:bg-slate-800" : "border-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                  >
                    <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </nav>
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-[#FAF8F5] to-transparent dark:from-slate-900" />
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[90] pt-[calc(6.25rem+env(safe-area-inset-top,0px))] md:hidden">
            <button type="button" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} className="absolute inset-0 bg-slate-950/30" />
            <section id="mobile-menu-drawer" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title" className="relative z-10 max-h-[calc(100dvh-6.25rem)] w-full overflow-y-auto rounded-b-2xl border border-border bg-card p-4 text-card-foreground shadow-xl sm:px-5">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
                <h2 id="mobile-menu-title" className="text-sm font-semibold">Menu</h2>
                <button ref={menuCloseButtonRef} type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
              <div className="grid gap-4">
                <section aria-labelledby="mobile-menu-ayanamsa">
                  <h3 id="mobile-menu-ayanamsa" className="mb-1.5 text-xs font-semibold text-muted-foreground">Ayanamsa</h3>
                  <Select value={ayanamsa} onValueChange={setAyanamsa} disabled={zodiacMode === "tropical"}>
                    <SelectTrigger
                      aria-label={`Ayanamsa, current setting: ${zodiacMode === "tropical" ? "Tropical · Sayana" : getAyanamsaLabel(ayanamsa)}`}
                      title={zodiacMode === "tropical" ? "Ayanamsa applies only to Sidereal (Nirayana) charts" : "Ayanamsa"}
                      className="h-11 w-full gap-2 rounded-xl bg-background text-sm"
                    >
                      <Orbit aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-left">{zodiacMode === "tropical" ? "Tropical · Sayana" : getAyanamsaLabel(ayanamsa)}</span>
                    </SelectTrigger>
                    <SelectContent align="start" className="z-[110] max-h-[60vh] bg-card text-card-foreground">
                      {AYANAMSA_OPTIONS.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {zodiacMode === "tropical" && <p className="mt-1 text-xs text-muted-foreground">Ayanamsa applies only to Sidereal (Nirayana) charts.</p>}
                </section>
                <section aria-labelledby="mobile-menu-language">
                  <h3 id="mobile-menu-language" className="mb-1.5 text-xs font-semibold text-muted-foreground">Language</h3>
                  <Select value={language} onValueChange={(value) => setLanguage(value as CelestialLanguage)}>
                    <SelectTrigger aria-label={`Display language, current setting: ${languageLabel}`} className="h-11 w-full gap-2 rounded-xl bg-background text-sm">
                      <Globe2 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-left">{languageLabel}</span>
                    </SelectTrigger>
                    <SelectContent align="start" className="z-[110] bg-card text-card-foreground">
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="mr">Marathi</SelectItem>
                      <SelectItem value="initials">English · initials</SelectItem>
                    </SelectContent>
                  </Select>
                </section>
                <section aria-labelledby="mobile-menu-appearance">
                  <h3 id="mobile-menu-appearance" className="mb-1.5 text-xs font-semibold text-muted-foreground">Appearance</h3>
                  <button type="button" onClick={() => setTheme(isDark ? "light" : "dark")} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-border px-3 text-left text-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                    {isDark ? <Sun aria-hidden="true" className="size-4" /> : <Moon aria-hidden="true" className="size-4" />}
                    Switch to {isDark ? "light" : "dark"} mode
                  </button>
                </section>
                <button type="button" onClick={() => navigate("about")} className="flex min-h-11 items-center rounded-xl border border-border px-3 text-left text-sm font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  About Project Celestia
                </button>
              </div>
            </section>
          </div>
        )}
      </header>

        <div id="dashboard-scroll" className="cosmic-grid min-w-0 overflow-x-hidden p-3 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px]">
          <div id="dashboard-home" className="pt-0">
            {selectedTab === "numerology" && (
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="font-serif text-2xl font-semibold tracking-wide sm:text-[30px]">Vibrational Analysis Suite</h1>
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">Explore the traditions, rhythms, and patterns of your personal numbers.</p>
                </div>
                <NumerologyPrimer />
              </div>
            )}

            <Tabs
              value={selectedTab}
              onValueChange={(nextTab) => {
                setSelectedTab(nextTab);
                setActiveNavigation(nextTab);
                startTabTransition(() => setActiveTab(nextTab));
              }}
              className="min-w-0 max-w-full overflow-x-clip"
            >
              <TabsList aria-label="Dashboard sections" className="hidden">
                <TabsTrigger value="panchang"><CalendarDays className="size-3.5" /> Panchang</TabsTrigger>
                <TabsTrigger value="kundali"><Compass className="size-3.5" /> Kundali &amp; Charts</TabsTrigger>
                <TabsTrigger value="numerology"><Sparkles className="size-3.5" /> Numerology</TabsTrigger>
                <TabsTrigger value="match"><Heart className="size-3.5" /> Match Making</TabsTrigger>
                <TabsTrigger value="about"><Info className="size-3.5" /> About</TabsTrigger>
              </TabsList>

              <TabsContent value="numerology" className="mt-6 rounded-2xl bg-background p-4 shadow-sm shadow-stone-200/50 focus-visible:outline-none sm:p-6 dark:shadow-none">
                <Tabs defaultValue="core-essence" className="min-w-0">
                  <TabsList aria-label="Vibrational analysis sections" className="sticky top-0 z-30 mb-5 h-auto w-full justify-start gap-1 overflow-x-auto rounded-t-xl border border-border bg-background/95 px-2 pt-2 shadow-sm shadow-stone-200/50 backdrop-blur dark:shadow-none">
                    <TabsTrigger value="core-essence" className="h-10 rounded-t-lg px-3 text-sm text-muted-foreground hover:text-foreground data-[state=active]:text-accent-foreground after:inset-x-2 after:bg-transparent data-[state=active]:after:bg-primary">Core Essence</TabsTrigger>
                    <TabsTrigger value="enterprise" className="h-10 rounded-t-lg px-3 text-sm text-muted-foreground hover:text-foreground data-[state=active]:text-accent-foreground after:inset-x-2 after:bg-transparent data-[state=active]:after:bg-primary">Enterprise &amp; Commerce</TabsTrigger>
                    <TabsTrigger value="synergy" className="h-10 rounded-t-lg px-3 text-sm text-muted-foreground hover:text-foreground data-[state=active]:text-accent-foreground after:inset-x-2 after:bg-transparent data-[state=active]:after:bg-primary">Synergy &amp; Bonds</TabsTrigger>
                    <TabsTrigger value="additional" className="h-10 rounded-t-lg px-3 text-sm text-muted-foreground hover:text-foreground data-[state=active]:text-accent-foreground after:inset-x-2 after:bg-transparent data-[state=active]:after:bg-primary">Additional Analysis</TabsTrigger>
                    <TabsTrigger value="in-depth" className="h-10 rounded-t-lg px-3 text-sm text-muted-foreground hover:text-foreground data-[state=active]:text-accent-foreground after:inset-x-2 after:bg-transparent data-[state=active]:after:bg-primary">In-Depth Reading</TabsTrigger>
                  </TabsList>
                  <TabsContent value="core-essence" className="mt-0 focus-visible:outline-none">
                <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <section className="flex flex-col gap-4" aria-label="Inputs and core numbers">
                    <Card>
                      <CardHeader><CardHeading icon={UserRound} title="Core Essence" detail="PROFILE INPUTS" /></CardHeader>
                      <CardContent>
                        <div className="space-y-3.5">
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Full name</span>
                            <input value={fullName} onChange={(event) => setBirthProfile({ name: event.target.value })} placeholder="Enter your full name" className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40" />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Date of birth</span>
                            <span className="relative block">
                              <input type="date" value={dateOfBirth} onChange={(event) => setBirthProfile({ date: event.target.value })} className="h-10 w-full rounded-lg border border-border bg-card px-3 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40" />
                              <CalendarDays className="pointer-events-none absolute right-3 top-3 size-4 text-slate-600" />
                            </span>
                          </label>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                          <div><p className="text-xs font-medium">Name calculation</p><p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{system ? "Pythagorean" : "Chaldean"}</p></div>
                          <div className="flex items-center gap-2.5">
                            <span className={`text-xs ${system ? "text-slate-600" : "font-medium text-slate-800 dark:text-slate-200"}`}>Chaldean</span>
                            <Switch checked={system} onCheckedChange={setSystem} aria-label="Toggle Chaldean or Pythagorean system" />
                            <span className={`text-xs ${system ? "font-medium text-slate-800 dark:text-slate-200" : "text-slate-600"}`}>Pythagorean</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <MetricCard
                      label="Mulank"
                      number={numerology.mulank}
                      planet={mulankInfo?.planet ?? "—"}
                      breakdown={numerology.mulankBreakdown}
                      subtitle={mulankInfo?.traits ?? "Enter a valid date of birth to calculate your Psychic Number."}
                      icon={Gem}
                    />
                    <MetricCard
                      label="Bhagyank"
                      number={numerology.bhagyank}
                      planet={destinyInfo?.planet ?? "—"}
                      breakdown={numerology.bhagyankBreakdown}
                      subtitle={destinyInfo?.traits ?? "Your Destiny Number uses every digit in your birth date."}
                      icon={WandSparkles}
                      accent="sage"
                    />
                    <Card>
                      <CardHeader><CardHeading icon={WandSparkles} title="Name number" detail={system ? "PYTHAGOREAN" : "CHALDEAN"} /></CardHeader>
                      <CardContent>
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <span className="font-serif text-[64px] leading-none tracking-[-0.08em] text-amber-600 dark:text-amber-300">{numerology.nameNumber ?? "—"}</span>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Name vibration {numerology.nameTrace && `· ${numerology.nameTrace}`}</p>
                          </div>
                          <div className="mb-1 text-right">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-400/10 dark:text-amber-300"><Orbit className="size-3.5" /> {nameInfo?.planet ?? "—"}</span>
                            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{system ? "Pythagorean total" : "Compound value"} <strong className="text-slate-900 dark:text-slate-200">{numerology.nameCompound ?? "—"}</strong></p>
                          </div>
                        </div>
                        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                          <div className="mb-2 flex items-center justify-between"><SectionLabel>Letter values · {fullName.trim() || "enter a name"}</SectionLabel><span className="text-xs text-slate-600">{system ? "A–Z" : "CHALDEAN"}</span></div>
                          <div className="flex flex-wrap gap-1.5">
                            {numerology.letters.length ? numerology.letters.map(({ character, value, index }) => (
                              <div key={`${character}-${index}`} className="min-w-8 rounded-md border border-border bg-muted/60 px-1.5 py-1 text-center">
                                <span className="block text-xs font-medium text-slate-800 dark:text-slate-200">{character}</span><span className="block text-xs text-slate-600">{value}</span>
                              </div>
                            )) : <p className="text-xs text-slate-600">Enter letters to calculate your name number.</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </section>

                  <section className="flex flex-col gap-4" aria-label="Lo Shu grid and planes">
                    <Card className="order-1">
                      <CardHeader><CardHeading icon={PanelTop} title="Lo Shu grid" detail="DOB + CORE NUMBERS" /></CardHeader>
                      <CardContent>
                        <div className="relative mx-auto aspect-square w-full max-w-[330px]">
                          <svg className="pointer-events-none absolute inset-0 z-10 size-full p-2" viewBox="0 0 300 300" fill="none" aria-hidden="true">
                            {[
                              { numbers: [2, 5, 8], color: "#789b7a" },
                              { numbers: [4, 5, 6], color: "#c6a575" },
                              { numbers: [1, 5, 9], color: "#bf8c90" },
                            ].map(({ numbers, color }) => {
                              const [startX, startY] = arrowCoordinates[numbers[0]];
                              const [middleX, middleY] = arrowCoordinates[numbers[1]];
                              const [endX, endY] = arrowCoordinates[numbers[2]];
                              const active = numbers.every((number) => (numerology.digitCounts[number] ?? 0) > 0);
                              return <path key={numbers.join("-")} d={`M${startX} ${startY} ${middleX} ${middleY} ${endX} ${endY}`} stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 6" opacity={active ? 0.85 : 0.2} />;
                            })}
                          </svg>
                          <div className="absolute inset-2 grid grid-cols-3 grid-rows-3 gap-2">
                            {gridNumbers.map((number) => {
                              const count = numerology.digitCounts[number] ?? 0;
                              return (
                                <button
                                  key={number}
                                  type="button"
                                  disabled={!numerology.birth}
                                  onClick={() => setSelectedNumber(selectedNumber === number ? null : number)}
                                  className={`relative z-0 flex flex-col items-center justify-center rounded-xl border border-border bg-card shadow-sm shadow-stone-200/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${count > 0 ? "bg-accent" : "opacity-50"} ${selectedNumber === number ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                                  aria-label={`Number ${number}, ${count === 0 ? "missing" : `present ${count} times`}`}
                                >
                                  <span className={`font-serif text-3xl ${count > 0 ? "text-accent-foreground" : "text-muted-foreground"}`}>{count ? String(number).repeat(count) : number}</span>
                                  {count > 0 && <span className="mt-1 text-xs text-accent-foreground">{count}×</span>}
                                </button>
                              );
                            })}
                          </div>
                          <div className="absolute -bottom-5 left-0 right-0 flex justify-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-600" /> Spirituality</span>
                            <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-amber-600" /> Willpower</span>
                            <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-rose-500" /> Intuition</span>
                          </div>
                        </div>
                        <p className="mt-9 text-center text-xs text-slate-600 dark:text-slate-400">
                          {!numerology.birth ? "Enter a valid date to populate the grid" : selectedNumber === null ? "Repeated digits are shown together · select a cell to inspect" : `Number ${selectedNumber} appears ${numerology.digitCounts[selectedNumber] ?? 0} ${(numerology.digitCounts[selectedNumber] ?? 0) === 1 ? "time" : "times"} in this date`}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="order-3">
                      <CardHeader><CardHeading icon={ArrowDownRight} title="Arrows of strength" detail={`${arrows.filter((arrow) => arrow.complete).length} COMPLETE`} /></CardHeader>
                      <CardContent>
                        <div className="space-y-2.5">
                          {arrows.map((arrow) => (
                            <div key={arrow.label} className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
                              <div>
                                <p className="text-xs font-medium">{arrow.numbers.join(" – ")} <span className="font-normal text-slate-600 dark:text-slate-400">{arrow.label}</span></p>
                                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{arrow.explanation}</p>
                              </div>
                              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${arrow.complete ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-muted text-foreground"}`}>
                                {arrow.complete && <Check className="size-3" />}{arrow.complete ? "Complete" : `${arrow.count}/3`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="order-2">
                      <CardHeader><CardHeading icon={Orbit} title="Planes & missing numbers" /></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-2">
                          {planes.map((plane) => (
                            <div key={plane.name} className={`rounded-lg border p-2.5 ${plane.complete ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40" : "border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40"}`}>
                              <p className="text-xs text-slate-600 dark:text-slate-400">{plane.name}</p>
                              <p className={`mt-1 text-base font-semibold ${plane.complete ? "text-emerald-900 dark:text-emerald-300" : ""}`}>{plane.count}/3</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                          <span className="text-xs text-slate-600 dark:text-slate-400">Missing numbers</span>
                          <div className="flex gap-1.5">{missingNumbers.length ? missingNumbers.map((number) => <span key={number} className="grid size-6 place-items-center rounded-md bg-rose-100 text-xs font-semibold text-rose-800 dark:bg-rose-400/10 dark:text-rose-300">{number}</span>) : <span className="text-xs text-slate-600">{numerology.birth ? "None" : "Enter DOB"}</span>}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </section>

                  <section className="flex flex-col gap-4 md:col-span-2 md:grid md:grid-cols-2 lg:col-span-1 lg:flex lg:grid-cols-1" aria-label="Auspicious metrics and compatibility">
                    <Card>
                      <CardHeader><CardHeading icon={Sparkles} title="Auspicious metrics" detail="PERSONAL GUIDE" /></CardHeader>
                      <CardContent>
                        <div className="mb-4 grid grid-cols-3 gap-2">
                          {[
                            { icon: Wallet, label: "Bank account", number: luckyNumbers[0] },
                            { icon: Smartphone, label: "Mobile number", number: luckyNumbers[1] ?? luckyNumbers[0] },
                            { icon: CarFront, label: "Vehicle", number: luckyNumbers[2] ?? luckyNumbers[0] },
                          ].map(({ icon: Icon, label, number }) => (
                            <div key={label} className="rounded-xl border border-border bg-muted/60 p-2.5">
                              <Icon className="size-4 text-amber-700 dark:text-amber-300" />
                              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{label}</p>
                              <p className="mt-0.5 text-xs font-semibold">{number ? `Ends in ${number}` : "—"}</p>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div><p className="text-xs text-slate-600 dark:text-slate-400">Kua number · {numerology.birth?.year ?? "—"}</p><p className="mt-0.5 text-xs text-slate-600">Feng Shui personal direction number</p></div>
                            <select aria-label="Kua calculation gender" value={kuaGender} onChange={(event) => setKuaGender(event.target.value as "male" | "female")} className="rounded-md border border-input bg-card px-2 py-1 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                              <option value="male">Male · {numerology.kuaMaleNumber ?? "—"}</option><option value="female">Female · {numerology.kuaFemaleNumber ?? "—"}</option>
                            </select>
                          </div>
                          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                            <div className="flex items-center justify-between"><div><p className="text-xs text-slate-600 dark:text-slate-400">Personal year · {currentYear}</p><p className="mt-0.5 text-xs text-slate-600">{numerology.personalYearTrace || "Enter a valid date of birth"}</p></div><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-sm font-semibold text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-300">{numerology.personalYear ?? "—"}</span></div>
                            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Personal year progress" aria-valuenow={mounted ? Math.round(numerology.personalYearProgress) : 0} aria-valuemin={0} aria-valuemax={100}>
                              <div className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-emerald-500 transition-[width]" style={{ width: `${mounted ? Math.round(numerology.personalYearProgress) : 0}%` }} />
                            </div>
                            <p className="mt-1 text-right text-xs text-slate-600">{mounted ? Math.round(numerology.personalYearProgress) : 0}% through birthday year</p>
                          </div>
                        </div>
                        <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400">Numerology and Feng Shui traditions vary; use these as reflective prompts.</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardHeading icon={Gem} title="Supportive Resonance & Gems" detail={mulankInfo?.planet ?? "MULANK RULER"} /></CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <SectionLabel>Supportive colors</SectionLabel>
                            <div className="flex flex-wrap gap-2">
                              {(mulankInfo?.colors ?? []).map((color, index) => <span key={color} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1 text-xs dark:border-slate-700"><span className={`size-3 rounded-full ${mulankInfo?.swatches[index]}`} />{color}</span>)}
                              {!mulankInfo && <span className="text-xs text-slate-600">Enter a valid date to see colors.</span>}
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                            <span className="text-xs text-slate-600 dark:text-slate-400">Traditional gemstone</span><span className="text-xs font-medium">{mulankInfo?.gemstone ?? "—"}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardHeading icon={CircleHelp} title="Frequencies to Temper" detail="GENTLE GUIDANCE" /></CardHeader>
                      <CardContent>
                        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                          <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300"><CircleHelp className="size-3.5" /></span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-amber-950 dark:text-amber-200">Numbers to approach thoughtfully</p>
                              <p className="mt-1 text-xs leading-relaxed text-amber-900/80 dark:text-amber-200/80">{enemyNumbers.length ? `Mulank ${numerology.mulank} traditions often advise extra care with: ${enemyNumbers.join(", ")}.` : numerology.mulank ? "No specific enemy numbers are listed for this Mulank." : "Enter a valid birth date to see your guidance."}</p>
                              {mulankInfo && <p className="mt-2 text-xs leading-relaxed text-amber-900/80 dark:text-amber-200/80">Colors sometimes used sparingly: {mulankInfo.unfavorableColors.join(", ")}.</p>}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardHeading icon={Heart} title="Synergy & Bonds" detail="RELATIONSHIPS" /></CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div><p className="text-xs text-slate-600 dark:text-slate-400">Mulank ↔ Bhagyank</p><p className="mt-0.5 text-xs font-medium">{numerology.mulank ?? "—"} <span className="text-slate-600">with</span> {numerology.bhagyank ?? "—"}</p></div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${relationship === "Friendly" ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-300" : relationship === "Enemy" ? "bg-rose-100 text-rose-800 dark:bg-rose-400/10 dark:text-rose-300" : "bg-muted text-foreground"}`}>{relationship}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                            <div><p className="text-xs text-slate-600 dark:text-slate-400">Lucky dates</p><p className="mt-1 text-xs font-medium">{luckyDates.length ? luckyDates.map((day) => `${day}${day === 1 || day === 21 || day === 31 ? "st" : day === 2 || day === 22 ? "nd" : day === 3 || day === 23 ? "rd" : "th"}`).join(" · ") : "—"}</p></div>
                            <ArrowRight className="size-4 shrink-0 text-slate-600" />
                          </div>
                          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                            <div><p className="text-xs text-slate-600 dark:text-slate-400">Lucky day</p><p className="mt-1 text-xs font-medium">{mulankInfo?.luckyDay ?? "—"}</p></div>
                            <CalendarCheck2 className="size-4 shrink-0 text-cyan-700 dark:text-cyan-300" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </section>
                </div>
                <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"><CircleHelp className="size-3" /> Calculations update as you type. Interpretations are traditional and for personal reflection.</div>
                  </TabsContent>
                  <TabsContent value="enterprise" className="mt-0 focus-visible:outline-none">
                    <EnterpriseCommerceTab profile={numerology.profile} />
                  </TabsContent>
                  <TabsContent value="synergy" className="mt-0 focus-visible:outline-none">
                    <SynergyBondsTab profile={numerology.profile} />
                  </TabsContent>
                  <TabsContent value="additional" className="mt-0 focus-visible:outline-none">
                    <NumerologyWorkbench profile={numerology.profile} />
                  </TabsContent>
                  <TabsContent value="in-depth" className="mt-0 focus-visible:outline-none">
                    <CoreEssenceTab profile={numerology.profile} />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="kundali" className="mt-3 focus-visible:outline-none"><KundaliDashboard navigationRequest={dashboardNavigationRequest} isSignedIn={isSignedIn} /></TabsContent>
              <TabsContent value="panchang" className="mt-6 focus-visible:outline-none"><PanchangDashboard /></TabsContent>
              <TabsContent value="match" className="mt-3 focus-visible:outline-none"><MatchTab /></TabsContent>
              <TabsContent value="about" className="mt-0 focus-visible:outline-none"><About /></TabsContent>
            </Tabs>
          </div>

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-4 text-xs text-slate-600 dark:border-slate-800/70 dark:text-slate-400">
            <span>Project Celestia <span className="mx-1.5">·</span> A thoughtful space for self-discovery</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles className="size-3" /> Insights are for reflection, not prediction.</span>
          </footer>
        </div>
        </div>
    </main>
  );
}

function ClerkHome() {
  const { isSignedIn } = useAuth();
  return <HomeContent isSignedIn={Boolean(isSignedIn)} />;
}

export default function Home() {
  return isLocalClerkFallback ? <HomeContent isSignedIn={false} /> : <ClerkHome />;
}

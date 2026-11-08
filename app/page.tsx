"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowDownRight,
  ArrowRight,
  Bookmark,
  CalendarCheck2,
  CalendarDays,
  CarFront,
  Check,
  CircleHelp,
  Clock3,
  Compass,
  Gem,
  Heart,
  Home as HomeIcon,
  Moon,
  Orbit,
  PanelTop,
  Sparkles,
  Sun,
  UserRound,
  Wallet,
  WandSparkles,
  Smartphone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KundaliDashboard } from "@/components/kundali-dashboard";
import { AuthActions } from "@/components/auth-actions";
import { useKundaliStore } from "@/lib/kundali-store";

const gridNumbers = [4, 9, 2, 3, 5, 7, 8, 1, 6];
const masterNumbers = new Set([11, 22, 33]);

const chaldeanValues: Record<string, number> = {
  A: 1, I: 1, J: 1, Q: 1, Y: 1,
  B: 2, K: 2, R: 2,
  C: 3, G: 3, L: 3, S: 3,
  D: 4, M: 4, T: 4,
  E: 5, H: 5, N: 5, X: 5,
  U: 6, V: 6, W: 6,
  O: 7, Z: 7,
  F: 8, P: 8,
};

const pythagoreanValues: Record<string, number> = Object.fromEntries(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter, index) => [letter, (index % 9) + 1]),
);

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
  1: { planet: "Sun", traits: "Initiative, leadership, confidence", colors: ["Gold", "Orange"], swatches: ["bg-amber-500", "bg-orange-500"], gemstone: "Ruby", unfavorableColors: ["Black", "Deep blue"], enemies: [6, 8], friends: [2, 3, 9], luckyDay: "Sunday" },
  2: { planet: "Moon", traits: "Intuition, empathy, imagination", colors: ["White", "Silver"], swatches: ["bg-slate-100", "bg-slate-400"], gemstone: "Pearl", unfavorableColors: ["Dark red", "Black"], enemies: [8], friends: [1, 3, 5], luckyDay: "Monday" },
  3: { planet: "Jupiter", traits: "Wisdom, expression, optimism", colors: ["Yellow", "Violet"], swatches: ["bg-yellow-400", "bg-violet-500"], gemstone: "Yellow sapphire", unfavorableColors: ["Black", "Dark green"], enemies: [6], friends: [1, 2, 9], luckyDay: "Thursday" },
  4: { planet: "Rahu", traits: "Originality, discipline, persistence", colors: ["Electric blue", "Grey"], swatches: ["bg-blue-600", "bg-slate-500"], gemstone: "Hessonite", unfavorableColors: ["Red", "Orange"], enemies: [1, 8], friends: [5, 6], luckyDay: "Saturday" },
  5: { planet: "Mercury", traits: "Adaptability, curiosity, communication", colors: ["Emerald", "Turquoise"], swatches: ["bg-emerald-500", "bg-teal-400"], gemstone: "Emerald", unfavorableColors: ["Red", "Black"], enemies: [], friends: [1, 3, 6], luckyDay: "Wednesday" },
  6: { planet: "Venus", traits: "Harmony, aesthetics, responsibility", colors: ["Rose", "Sky blue"], swatches: ["bg-rose-400", "bg-sky-400"], gemstone: "Diamond", unfavorableColors: ["Dark red", "Black"], enemies: [1, 3], friends: [2, 5, 8], luckyDay: "Friday" },
  7: { planet: "Ketu", traits: "Reflection, insight, independence", colors: ["Sea green", "White"], swatches: ["bg-teal-500", "bg-slate-100"], gemstone: "Cat’s eye", unfavorableColors: ["Black", "Dark red"], enemies: [8], friends: [1, 2, 5], luckyDay: "Monday" },
  8: { planet: "Saturn", traits: "Ambition, resilience, achievement", colors: ["Navy", "Charcoal"], swatches: ["bg-indigo-900", "bg-slate-700"], gemstone: "Blue sapphire", unfavorableColors: ["Red", "Orange"], enemies: [1, 2, 4], friends: [5, 6], luckyDay: "Saturday" },
  9: { planet: "Mars", traits: "Courage, compassion, determination", colors: ["Red", "Coral"], swatches: ["bg-red-500", "bg-orange-400"], gemstone: "Red coral", unfavorableColors: ["Black", "Navy"], enemies: [], friends: [1, 3, 5], luckyDay: "Tuesday" },
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
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "kundali", label: "Kundali", icon: Compass },
  { id: "numerology", label: "Numerology", icon: Sparkles },
  { id: "saved-charts", label: "Saved Charts", icon: Bookmark },
  { id: "matchmaking", label: "Matchmaking", icon: Heart },
  { id: "panchang", label: "Panchang", icon: CalendarDays },
] as const;

function digitSum(value: number) {
  return String(Math.abs(Math.trunc(value))).split("").reduce((sum, digit) => sum + Number(digit), 0);
}

export function reduceToSingleDigit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  let result = Math.abs(Math.trunc(value));
  while (result > 9) result = digitSum(result);
  return result;
}

function reduceWithTrace(value: number) {
  if (!Number.isFinite(value)) return { value: 0, trace: "" };
  let current = Math.abs(Math.trunc(value));
  const steps = [String(current)];
  while (current > 9 && !masterNumbers.has(current)) {
    current = digitSum(current);
    steps.push(String(current));
  }
  if (masterNumbers.has(current)) {
    const finalValue = reduceToSingleDigit(current);
    steps.push(String(finalValue));
    return { value: finalValue, trace: steps.join(" → ") };
  }
  return { value: current, trace: steps.join(" → ") };
}

function parseBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const check = new Date(year, month - 1, day);
  if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) return null;
  return { year, month, day };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-xs font-semibold uppercase tracking-[0.17em] text-slate-600 dark:text-slate-400">{children}</p>;
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
        <span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <CardTitle>{title}</CardTitle>
      </div>
      {detail && <span className="text-xs text-slate-600 dark:text-slate-400">{detail}</span>}
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
  accent?: "gold" | "cyan";
}) {
  const isGold = accent === "gold";
  return (
    <Card>
      <CardHeader><CardHeading icon={Icon} title={label} detail="CORE NUMBER" /></CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <div className={`font-serif text-[72px] font-medium leading-[0.9] tracking-[-0.08em] ${isGold ? "text-amber-600 dark:text-yellow-400" : "text-cyan-700 dark:text-cyan-300"}`}>
            {number ?? "—"}
          </div>
          <div className={`mb-1 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${isGold ? "bg-amber-50 text-amber-800 dark:bg-yellow-400/10 dark:text-yellow-300" : "bg-cyan-50 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-300"}`}>
            <Orbit className="size-3.5" /> {planet}
          </div>
        </div>
        <p className="mt-4 min-h-9 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs leading-5 text-slate-600 dark:bg-slate-950/70 dark:text-slate-300">{breakdown || "Add a valid date of birth"}</p>
        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function PlaceholderPanel({ title }: { title: string }) {
  return (
    <Card className="min-h-[400px]">
      <CardContent className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300"><Sparkles className="size-6" /></div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-400">This space is ready for your personalized {title.toLowerCase()} insights. Connect your data source to bring the full experience to life.</p>
        <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400"><Clock3 className="size-3.5" /> Coming soon</span>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { resolvedTheme, setTheme } = useTheme();
  const birthProfile = useKundaliStore((state) => state.profile);
  const setBirthProfile = useKundaliStore((state) => state.setProfile);
  const [mounted, setMounted] = useState(false);
  const [system, setSystem] = useState(false);
  const fullName = birthProfile.name;
  const dateOfBirth = birthProfile.date;
  const [kuaGender, setKuaGender] = useState<"male" | "female">("male");
  const [activeTab, setActiveTab] = useState("kundali");
  const [activeNavigation, setActiveNavigation] = useState("kundali");
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const isDark = mounted ? resolvedTheme === "dark" : false;
  const currentYear = new Date().getFullYear();

  useEffect(() => setMounted(true), []);

  const numerology = useMemo(() => {
    const birth = parseBirthDate(dateOfBirth);
    const letterMap = system ? pythagoreanValues : chaldeanValues;
    const letters = Array.from(fullName.toUpperCase()).flatMap((character, index) => {
      const value = letterMap[character];
      return value ? [{ character, value, index }] : [];
    });
    const nameCompound = letters.reduce((sum, letter) => sum + letter.value, 0);
    const nameReduced = letters.length ? reduceWithTrace(nameCompound) : null;

    if (!birth) {
      return {
        birth: null,
        digitCounts: {} as Record<number, number>,
        mulank: null,
        mulankBreakdown: "",
        bhagyank: null,
        bhagyankBreakdown: "",
        nameCompound: letters.length ? nameCompound : null,
        nameNumber: nameReduced?.value ?? null,
        nameTrace: nameReduced?.trace ?? "",
        letters,
        kuaNumber: null,
        kuaMaleNumber: null,
        kuaFemaleNumber: null,
        personalYear: null,
        personalYearTrace: "",
        personalYearProgress: 0,
      };
    }

    const dateDigits = `${String(birth.year).padStart(4, "0")}${String(birth.month).padStart(2, "0")}${String(birth.day).padStart(2, "0")}`;
    const digitCounts = dateDigits.split("").reduce<Record<number, number>>((counts, digit) => {
      const number = Number(digit);
      if (number > 0) counts[number] = (counts[number] ?? 0) + 1;
      return counts;
    }, {});
    const daySum = digitSum(birth.day);
    const mulank = reduceToSingleDigit(daySum);
    const mulankTrace = reduceWithTrace(birth.day);
    const dobSum = dateDigits.split("").reduce((sum, digit) => sum + Number(digit), 0);
    const bhagyankTrace = reduceWithTrace(dobSum);

    const yearDigit = reduceToSingleDigit(String(birth.year).split("").reduce((sum, digit) => sum + Number(digit), 0));
    const kuaMaleNumber = reduceToSingleDigit(11 - yearDigit);
    const kuaFemaleNumber = reduceToSingleDigit(4 + yearDigit);
    const kuaNumber = kuaGender === "male" ? kuaMaleNumber : kuaFemaleNumber;

    const personalYearTotal = currentYear + birth.month + birth.day;
    const personalYear = reduceWithTrace(personalYearTotal);
    const today = new Date();
    const thisYearBirthday = new Date(today.getFullYear(), birth.month - 1, birth.day);
    const cycleStart = thisYearBirthday <= today
      ? thisYearBirthday
      : new Date(today.getFullYear() - 1, birth.month - 1, birth.day);
    const cycleEnd = new Date(cycleStart.getFullYear() + 1, birth.month - 1, birth.day);
    const cycleLength = cycleEnd.getTime() - cycleStart.getTime();
    const personalYearProgress = Math.max(0, Math.min(100, ((today.getTime() - cycleStart.getTime()) / cycleLength) * 100));

    return {
      birth,
      digitCounts,
      mulank,
      mulankBreakdown: masterNumbers.has(birth.day)
        ? `${birth.day} → ${mulankTrace.trace.split(" → ").slice(1).join(" → ")}`
        : `${String(birth.day).split("").join(" + ")} = ${daySum}${masterNumbers.has(daySum) ? ` → ${mulank}` : ""}`,
      bhagyank: bhagyankTrace.value,
      bhagyankBreakdown: `${dateDigits.split("").join(" + ")} = ${dobSum} → ${bhagyankTrace.trace.split(" → ").slice(1).join(" → ") || bhagyankTrace.value}`,
      nameCompound: letters.length ? nameCompound : null,
      nameNumber: nameReduced?.value ?? null,
      nameTrace: nameReduced?.trace ?? "",
      letters,
      kuaNumber,
      kuaMaleNumber,
      kuaFemaleNumber,
      personalYear: personalYear.value,
      personalYearTrace: `${currentYear} + ${birth.month} + ${birth.day} = ${personalYearTotal} → ${personalYear.trace.split(" → ").slice(1).join(" → ") || personalYear.value}`,
      personalYearProgress,
    };
  }, [dateOfBirth, fullName, system, kuaGender, currentYear]);

  const mulankInfo = numerology.mulank ? planetDetails[numerology.mulank] : null;
  const destinyInfo = numerology.bhagyank ? planetDetails[numerology.bhagyank] : null;
  const nameInfo = numerology.nameNumber ? planetDetails[numerology.nameNumber] : null;
  const luckyNumbers = [...new Set([numerology.mulank, numerology.bhagyank, numerology.nameNumber].filter((value): value is number => value !== null))];
  const enemyNumbers = mulankInfo?.enemies ?? [];
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
  const luckyDates = numerology.mulank
    ? [numerology.mulank, numerology.mulank + 9, numerology.mulank + 18, numerology.mulank + 27].filter((day) => day <= 31)
    : [];
  const navigate = (destination: typeof navigationItems[number]["id"]) => {
    setActiveNavigation(destination);
    if (destination === "home" || destination === "kundali" || destination === "saved-charts") {
      setActiveTab("kundali");
    } else {
      setActiveTab(destination);
    }
    window.requestAnimationFrame(() => {
      const scroller = document.getElementById("dashboard-scroll");
      if (!scroller) return;
      const targetId = destination === "saved-charts"
        ? "saved-charts"
        : destination === "kundali"
          ? "kundali-charts"
          : null;
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
        type="button"
        onClick={() => navigate(id)}
        aria-current={active ? "page" : undefined}
        className={`flex h-9 items-center gap-2 rounded-lg text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${compact ? "min-w-max px-3" : "w-full px-3"} ${active ? "bg-primary/10 text-blue-700 dark:bg-primary/15 dark:text-cyan-300" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"}`}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {label}
      </button>
    );
  });
  const relationship = numerology.mulank && numerology.bhagyank
    ? numerology.mulank === numerology.bhagyank
      ? "Friendly"
      : planetDetails[numerology.mulank].enemies.includes(numerology.bhagyank)
        ? "Enemy"
        : planetDetails[numerology.mulank].friends.includes(numerology.bhagyank)
          ? "Friendly"
          : "Neutral"
    : "—";

  return (
    <main className="flex h-screen min-w-0 flex-col overflow-hidden bg-background text-foreground">
        <header className="z-30 flex min-h-[60px] shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6">
          <a href="#" onClick={(event) => { event.preventDefault(); navigate("home"); }} className="flex min-w-0 items-center gap-2.5" aria-label="Project Celestia home">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-900 dark:bg-slate-800">
              <svg viewBox="0 0 36 36" aria-hidden="true" className="size-5">
                <circle cx="18" cy="18" r="6.5" fill="#f59e0b" />
                <path d="M18 3.5v5M18 27.5v5M3.5 18h5M27.5 18h5M7.75 7.75l3.6 3.6M24.65 24.65l3.6 3.6M28.25 7.75l-3.6 3.6M11.35 24.65l-3.6 3.6" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="27.5" cy="9" r="1.5" fill="#22d3ee" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold tracking-[0.02em]">Project Celestia</span>
              <span className="hidden text-xs tracking-wide text-slate-600 sm:block dark:text-slate-400">YOUR PERSONAL COSMIC COMPASS</span>
            </span>
          </a>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <AuthActions />
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-slate-600 shadow-sm transition hover:border-primary hover:text-primary dark:text-slate-300"
              aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
              title={`Switch to ${isDark ? "light" : "dark"} mode`}
            >
              {!mounted || isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </header>
        <nav aria-label="Main navigation" className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-card px-3 py-1.5">
          {renderNavigationItems(true)}
        </nav>

        <div id="dashboard-scroll" className="cosmic-grid min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1750px]">
          <div id="dashboard-home" className="pt-0">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-[30px]">{activeTab === "kundali" ? "Your celestial map, at a glance." : "A little more aligned."}</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{activeTab === "kundali" ? "Birth chart, Panchang, and planetary transits in one place." : "Explore the patterns and possibilities written in your numbers."}</p>
              </div>
              <div className="hidden items-center gap-2 text-xs text-slate-600 sm:flex dark:text-slate-400"><CalendarDays className="size-3.5" /> {activeTab === "kundali" ? "Birth profile" : "Personal profile"} <span className="text-slate-400 dark:text-slate-700">/</span> {activeTab === "kundali" ? "Kundali" : "Vedic numerology"}</div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 max-w-full overflow-x-clip">
              <TabsList aria-label="Dashboard sections" className="hidden">
                <TabsTrigger value="numerology"><Sparkles className="size-3.5" /> Numerology</TabsTrigger>
                <TabsTrigger value="kundali"><Compass className="size-3.5" /> Kundali &amp; Charts</TabsTrigger>
                <TabsTrigger value="matchmaking"><Heart className="size-3.5" /> Matchmaking</TabsTrigger>
                <TabsTrigger value="panchang"><CalendarDays className="size-3.5" /> Panchang</TabsTrigger>
              </TabsList>

              <TabsContent value="numerology" className="mt-6 focus-visible:outline-none">
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
                  <section className="flex flex-col gap-4" aria-label="Inputs and core numbers">
                    <Card>
                      <CardHeader><CardHeading icon={UserRound} title="Your details" detail="PROFILE INPUTS" /></CardHeader>
                      <CardContent>
                        <div className="space-y-3.5">
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Full name</span>
                            <input value={fullName} onChange={(event) => setBirthProfile({ name: event.target.value })} placeholder="Enter your full name" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-cyan-400" />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Date of birth</span>
                            <span className="relative block">
                              <input type="date" value={dateOfBirth} onChange={(event) => setBirthProfile({ date: event.target.value })} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-cyan-400" />
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
                      accent="cyan"
                    />
                  </section>

                  <section className="flex flex-col gap-4" aria-label="Lo Shu grid and planes">
                    <Card>
                      <CardHeader><CardHeading icon={PanelTop} title="Lo Shu grid" detail="DOB FREQUENCY" /></CardHeader>
                      <CardContent>
                        <div className="relative mx-auto aspect-square w-full max-w-[330px]">
                          <svg className="pointer-events-none absolute inset-0 z-10 size-full p-2" viewBox="0 0 300 300" fill="none" aria-hidden="true">
                            {[
                              { numbers: [2, 5, 8], color: "#06b6d4" },
                              { numbers: [4, 5, 6], color: "#eab308" },
                              { numbers: [1, 5, 9], color: "#8b5cf6" },
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
                                  className={`relative z-0 flex flex-col items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${count > 0 ? "border-cyan-200 bg-cyan-50/90 dark:border-cyan-900 dark:bg-cyan-950/70" : "border-slate-200 bg-white/80 opacity-30 dark:border-slate-800 dark:bg-slate-900/70"} ${selectedNumber === number ? "ring-2 ring-cyan-500 ring-offset-2 ring-offset-white dark:ring-cyan-400 dark:ring-offset-slate-900" : ""}`}
                                  aria-label={`Number ${number}, ${count === 0 ? "missing" : `present ${count} times`}`}
                                >
                                  <span className={`font-serif text-3xl ${count > 0 ? "text-cyan-800 dark:text-cyan-200" : "text-slate-600 dark:text-slate-400"}`}>{count ? String(number).repeat(count) : number}</span>
                                  {count > 0 && <span className="mt-1 text-xs text-cyan-800 dark:text-cyan-300">{count}×</span>}
                                </button>
                              );
                            })}
                          </div>
                          <div className="absolute -bottom-5 left-0 right-0 flex justify-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-cyan-500" /> Spirituality</span>
                            <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-yellow-500" /> Willpower</span>
                            <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-violet-500" /> Intuition</span>
                          </div>
                        </div>
                        <p className="mt-9 text-center text-xs text-slate-600 dark:text-slate-400">
                          {!numerology.birth ? "Enter a valid date to populate the grid" : selectedNumber === null ? "Repeated digits are shown together · select a cell to inspect" : `Number ${selectedNumber} appears ${numerology.digitCounts[selectedNumber] ?? 0} ${(numerology.digitCounts[selectedNumber] ?? 0) === 1 ? "time" : "times"} in this date`}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardHeading icon={ArrowDownRight} title="Arrows of strength" detail={`${arrows.filter((arrow) => arrow.complete).length} COMPLETE`} /></CardHeader>
                      <CardContent>
                        <div className="space-y-2.5">
                          {arrows.map((arrow) => (
                            <div key={arrow.label} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-950/60">
                              <div>
                                <p className="text-xs font-medium">{arrow.numbers.join(" – ")} <span className="font-normal text-slate-600 dark:text-slate-400">{arrow.label}</span></p>
                                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{arrow.explanation}</p>
                              </div>
                              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${arrow.complete ? "bg-cyan-100 text-cyan-900 dark:bg-cyan-400/10 dark:text-cyan-300" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                                {arrow.complete && <Check className="size-3" />}{arrow.complete ? "Complete" : `${arrow.count}/3`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardHeading icon={Orbit} title="Planes & missing numbers" /></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-2">
                          {planes.map((plane) => (
                            <div key={plane.name} className={`rounded-lg border p-2.5 ${plane.complete ? "border-cyan-200 bg-cyan-50 dark:border-cyan-900 dark:bg-cyan-950/40" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40"}`}>
                              <p className="text-xs text-slate-600 dark:text-slate-400">{plane.name}</p>
                              <p className={`mt-1 text-base font-semibold ${plane.complete ? "text-cyan-800 dark:text-cyan-300" : ""}`}>{plane.count}/3</p>
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

                  <section className="flex flex-col gap-4" aria-label="Auspicious metrics and compatibility">
                    <Card>
                      <CardHeader><CardHeading icon={WandSparkles} title="Name number" detail={system ? "PYTHAGOREAN" : "CHALDEAN"} /></CardHeader>
                      <CardContent>
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <span className="font-serif text-[64px] leading-none tracking-[-0.08em] text-amber-600 dark:text-yellow-400">{numerology.nameNumber ?? "—"}</span>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Name vibration {numerology.nameTrace && `· ${numerology.nameTrace}`}</p>
                          </div>
                          <div className="mb-1 text-right">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-yellow-400/10 dark:text-yellow-300"><Orbit className="size-3.5" /> {nameInfo?.planet ?? "—"}</span>
                            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Compound value <strong className="text-slate-900 dark:text-slate-200">{numerology.nameCompound ?? "—"}</strong></p>
                          </div>
                        </div>
                        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                          <div className="mb-2 flex items-center justify-between"><SectionLabel>Letter values · {fullName.trim() || "enter a name"}</SectionLabel><span className="text-xs text-slate-600">{system ? "A–Z" : "CHALDEAN"}</span></div>
                          <div className="flex flex-wrap gap-1.5">
                            {numerology.letters.length ? numerology.letters.map(({ character, value, index }) => (
                              <div key={`${character}-${index}`} className="min-w-8 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-center dark:border-slate-800 dark:bg-slate-950/60">
                                <span className="block text-xs font-medium text-slate-800 dark:text-slate-200">{character}</span><span className="block text-xs text-slate-600">{value}</span>
                              </div>
                            )) : <p className="text-xs text-slate-600">Enter letters to calculate your name number.</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardHeading icon={Sparkles} title="Auspicious metrics" detail="PERSONAL GUIDE" /></CardHeader>
                      <CardContent>
                        <div className="mb-4 grid grid-cols-3 gap-2">
                          {[
                            { icon: Wallet, label: "Bank account", number: luckyNumbers[0] },
                            { icon: Smartphone, label: "Mobile number", number: luckyNumbers[1] ?? luckyNumbers[0] },
                            { icon: CarFront, label: "Vehicle", number: luckyNumbers[2] ?? luckyNumbers[0] },
                          ].map(({ icon: Icon, label, number }) => (
                            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/50">
                              <Icon className="size-4 text-cyan-700 dark:text-cyan-300" />
                              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{label}</p>
                              <p className="mt-0.5 text-xs font-semibold">{number ? `Ends in ${number}` : "—"}</p>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div><p className="text-xs text-slate-600 dark:text-slate-400">Kua number · {numerology.birth?.year ?? "—"}</p><p className="mt-0.5 text-xs text-slate-600">Feng Shui personal direction number</p></div>
                            <select aria-label="Kua calculation gender" value={kuaGender} onChange={(event) => setKuaGender(event.target.value as "male" | "female")} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950">
                              <option value="male">Male · {numerology.kuaMaleNumber ?? "—"}</option><option value="female">Female · {numerology.kuaFemaleNumber ?? "—"}</option>
                            </select>
                          </div>
                          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                            <div className="flex items-center justify-between"><div><p className="text-xs text-slate-600 dark:text-slate-400">Personal year · {currentYear}</p><p className="mt-0.5 text-xs text-slate-600">{numerology.personalYearTrace || "Enter a valid date of birth"}</p></div><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-cyan-50 text-sm font-semibold text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-300">{numerology.personalYear ?? "—"}</span></div>
                            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-label="Personal year progress" aria-valuenow={mounted ? Math.round(numerology.personalYearProgress) : 0} aria-valuemin={0} aria-valuemax={100}>
                              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-[width]" style={{ width: `${mounted ? Math.round(numerology.personalYearProgress) : 0}%` }} />
                            </div>
                            <p className="mt-1 text-right text-xs text-slate-600">{mounted ? Math.round(numerology.personalYearProgress) : 0}% through birthday year</p>
                          </div>
                        </div>
                        <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400">Numerology and Feng Shui traditions vary; use these as reflective prompts.</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardHeading icon={Gem} title="Lucky colors & gemstones" detail={mulankInfo?.planet ?? "MULANK RULER"} /></CardHeader>
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
                      <CardHeader><CardHeading icon={CircleHelp} title="Avoid / cautions" detail="GENTLE GUIDANCE" /></CardHeader>
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
                      <CardHeader><CardHeading icon={Heart} title="Compatibility" detail="RELATIONSHIPS" /></CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div><p className="text-xs text-slate-600 dark:text-slate-400">Mulank ↔ Bhagyank</p><p className="mt-0.5 text-xs font-medium">{numerology.mulank ?? "—"} <span className="text-slate-600">with</span> {numerology.bhagyank ?? "—"}</p></div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${relationship === "Friendly" ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-300" : relationship === "Enemy" ? "bg-rose-100 text-rose-800 dark:bg-rose-400/10 dark:text-rose-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{relationship}</span>
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

              <TabsContent value="kundali" className="mt-3 focus-visible:outline-none"><KundaliDashboard /></TabsContent>
              <TabsContent value="matchmaking" className="mt-6 focus-visible:outline-none"><PlaceholderPanel title="Matchmaking" /></TabsContent>
              <TabsContent value="panchang" className="mt-6 focus-visible:outline-none"><PlaceholderPanel title="Panchang" /></TabsContent>
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

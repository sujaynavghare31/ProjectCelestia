import { calculateNadiTimeline } from "./timeline";
import { calculateCharaDasha } from "./chara";
import { calculateYoginiDasha } from "./yogini";
import { calculateSwissTransit } from "./swiss-transit-provider";
import { addYears, getTimingChart, YEAR_LENGTH_DAYS } from "./core";
import { ASHTOTTARI_LORDS, DASHA_LORDS } from "./sequences";
import type { Graha } from "../avastha/types";
import type { BcpYear, NadiYearView, Period, TimingChart, TimingInput } from "./types";

export { ASHTOTTARI_LORDS, DASHA_LORDS };

const ASHTOTTARI_NAKSHATRA_GROUPS: readonly (readonly string[])[] = [
  ["Krittika", "Rohini"],
  ["Mrigashira", "Ardra", "Punarvasu", "Pushya"],
  ["Ashlesha", "Magha"],
  ["Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra"],
  ["Swati", "Vishakha", "Anuradha"],
  ["Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana"],
  ["Dhanishta", "Shatabhisha", "Purva Bhadrapada"],
  ["Uttara Bhadrapada", "Revati", "Ashwini", "Bharani"],
] as const;

const NAKSHATRA_NAMES = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
  "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
] as const;

export type DashaSystem = "vimshottari" | "yogini" | "ashtottari" | "chara";
export type DashaDepth = "Maha Dasha" | "Antar Dasha" | "Pratyantar Dasha" | "Sookshma Dasha";

export interface DashaPeriodNode {
  id: string;
  name: DashaDepth;
  lord: string;
  start: string;
  end: string;
  durationYears: number;
  yearLengthDays: number;
  clipped?: boolean;
  reasons: string[];
  details?: Record<string, unknown>;
  subPeriods: DashaPeriodNode[];
}

export interface DashaEngineResult {
  system: DashaSystem;
  title: string;
  cycleYears: number;
  periods: DashaPeriodNode[];
  nakshatra?: { number: number; name: string; progress: number; remaining: number };
}

export interface NadiProgressedPlanet {
  planet: Graha;
  natalLongitude: number;
  progressedLongitude: number;
  progressedSign: number;
  progressedDegree: number;
  natalHouse: number;
  progressedHouse: number;
  signAtOnePerTwelveYears: number;
}

export interface NadiEngineResult {
  system: "nadi";
  title: "Nadi Progression";
  ageYears: number;
  lagnaSign: number;
  activeBcpHouse: number;
  progressedPlanets: NadiProgressedPlanet[];
  timeline: NadiYearView[];
}

const DEPTH_NAMES: DashaDepth[] = ["Maha Dasha", "Antar Dasha", "Pratyantar Dasha", "Sookshma Dasha"];
const DAY_MS = 86_400_000;

function normalizeLongitude(longitude: number) {
  return ((longitude % 360) + 360) % 360;
}

function yearsBetween(start: number, end: number, chart: TimingChart) {
  return (end - start) / (YEAR_LENGTH_DAYS[chart.config.yearLength] * DAY_MS);
}

function lunarData(chart: TimingChart) {
  const moon = chart.byPlanet.get("Moon");
  if (!moon) throw new Error("Moon longitude is required to calculate nakshatra-based Dasha systems.");
  const span = 360 / 27;
  const longitude = normalizeLongitude(moon.longitude);
  const number = Math.floor(longitude / span) + 1;
  return {
    longitude,
    span,
    number,
    name: NAKSHATRA_NAMES[number - 1],
    progress: (longitude % span) / span,
  };
}

function ashtottariLordIndex(nakshatra: string) {
  return ASHTOTTARI_NAKSHATRA_GROUPS.findIndex((group) => group.includes(nakshatra));
}

function makeNode(
  lord: string,
  start: number,
  end: number,
  chart: TimingChart,
  depth: number,
  reasons: string[],
  details?: Record<string, unknown>,
  children: DashaPeriodNode[] = [],
  clipped = false,
): DashaPeriodNode {
  return {
    id: `${depth}:${lord}:${new Date(start).toISOString()}`,
    name: DEPTH_NAMES[depth - 1],
    lord,
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    durationYears: yearsBetween(start, end, chart),
    yearLengthDays: YEAR_LENGTH_DAYS[chart.config.yearLength],
    ...(clipped ? { clipped: true } : {}),
    reasons,
    ...(details ? { details } : {}),
    subPeriods: children,
  };
}

function mapExistingPeriod(period: Period, chart: TimingChart, birth: number): DashaPeriodNode | null {
  const originalStart = new Date(period.start).getTime();
  const end = new Date(period.end).getTime();
  if (end <= birth) return null;
  const start = Math.max(originalStart, birth);
  const children = (period.children ?? [])
    .map((child) => mapExistingPeriod(child, chart, birth))
    .filter((child): child is DashaPeriodNode => child !== null);
  return makeNode(
    period.lord,
    start,
    end,
    chart,
    period.level,
    period.reasons,
    period.details,
    children,
    period.clipped || originalStart < birth,
  );
}

function createSubPeriods({
  lordOrder,
  lordYears,
  cycleYears,
  lord,
  start,
  end,
  chart,
  depth,
  maxDepth,
  clipFrom,
}: {
  lordOrder: readonly { lord: string; years: number }[];
  lordYears: Readonly<Record<string, number>>;
  cycleYears: number;
  lord: string;
  start: number;
  end: number;
  chart: TimingChart;
  depth: number;
  maxDepth: number;
  clipFrom: number;
}): DashaPeriodNode[] {
  if (depth > maxDepth) return [];
  const parentYears = yearsBetween(start, end, chart);
  const startIndex = lordOrder.findIndex(({ lord: item }) => item === lord);
  if (startIndex < 0) throw new Error(`Unknown Dasha lord "${lord}" in the configured sequence.`);
  let cursor = start;
  return lordOrder.map((_, offset) => {
    const subLord = lordOrder[(startIndex + offset) % lordOrder.length].lord;
    const duration = parentYears * lordYears[subLord] / cycleYears * YEAR_LENGTH_DAYS[chart.config.yearLength] * DAY_MS;
    const subEnd = offset === lordOrder.length - 1 ? end : Math.min(end, cursor + duration);
    const originalStart = cursor;
    const visibleStart = Math.max(cursor, clipFrom);
    const child = makeNode(
      subLord,
      visibleStart,
      subEnd,
      chart,
      depth,
      [`${parentYears.toFixed(6)} × ${lordYears[subLord]}/${cycleYears} Dasha years.`],
      originalStart < clipFrom ? { virtualStart: new Date(originalStart).toISOString() } : undefined,
      createSubPeriods({
        lordOrder,
        lordYears,
        cycleYears,
        lord: subLord,
        start: cursor,
        end: subEnd,
        chart,
        depth: depth + 1,
        maxDepth,
        clipFrom,
      }),
      originalStart < clipFrom,
    );
    cursor = subEnd;
    return child;
  }).filter((period) => new Date(period.end).getTime() > clipFrom);
}

function calculateNakshatraBasedSystem(
  chart: TimingChart,
  system: "vimshottari" | "ashtottari",
): DashaEngineResult {
  const lunar = lunarData(chart);
  const order = system === "vimshottari"
    ? DASHA_LORDS
    : ASHTOTTARI_LORDS;
  const lordYears = Object.fromEntries(order.map(({ lord, years }) => [lord, years]));
  const cycleYears = order.reduce((sum, item) => sum + item.years, 0);
  const lordIndex = system === "vimshottari"
    ? (lunar.number - 1) % order.length
    : ashtottariLordIndex(lunar.name);
  const startingIndex = system === "vimshottari" ? lordIndex : Math.max(0, lordIndex);
  const firstLord = order[startingIndex].lord;
  const birth = chart.birth.getTime();
  const to = chart.to.getTime();
  const firstBalance = (1 - lunar.progress) * lordYears[firstLord];
  let cursor = birth - lunar.progress * lordYears[firstLord] * YEAR_LENGTH_DAYS[chart.config.yearLength] * DAY_MS;
  const periods: DashaPeriodNode[] = [];
  let index = startingIndex;

  while (cursor < to && periods.length < 240) {
    const lord = order[index].lord;
    const fullYears = lordYears[lord];
    const end = cursor + fullYears * YEAR_LENGTH_DAYS[chart.config.yearLength] * DAY_MS;
    const visibleStart = Math.max(cursor, birth);
    if (end > chart.from.getTime()) {
      periods.push(makeNode(
        lord,
        visibleStart,
        end,
        chart,
        1,
        [
          `${system === "vimshottari" ? lunar.name : "Ashtottari nakshatra group"} begins at ${lunar.progress.toFixed(6)} of its segment.`,
          `Full ${fullYears}-year ${system === "vimshottari" ? "Vimshottari" : "Ashtottari"} Maha Dasha.`,
        ],
        cursor < birth ? { virtualStart: new Date(cursor).toISOString(), balanceAtBirthYears: firstBalance } : undefined,
        createSubPeriods({
          lordOrder: order,
          lordYears,
          cycleYears,
          lord,
          start: cursor,
          end,
          chart,
          depth: 2,
          maxDepth: 3,
          clipFrom: birth,
        }),
        cursor < birth,
      ));
    }
    cursor = end;
    index = (index + 1) % order.length;
  }
  return {
    system,
    title: system === "vimshottari" ? "Vimshottari Dasha" : "Ashtottari Dasha",
    cycleYears,
    periods,
    nakshatra: { number: lunar.number, name: lunar.name, progress: lunar.progress, remaining: 1 - lunar.progress },
  };
}

function calculateYogini(chart: TimingChart, input: TimingInput): DashaEngineResult {
  const lunar = lunarData(chart);
  const periods = calculateYoginiDasha(input)
    .map((period) => mapExistingPeriod(period, chart, chart.birth.getTime()))
    .filter((period): period is DashaPeriodNode => period !== null);
  return {
    system: "yogini",
    title: "Yogini Dasha",
    cycleYears: 36,
    periods,
    nakshatra: { number: lunar.number, name: lunar.name, progress: lunar.progress, remaining: 1 - lunar.progress },
  };
}

export function calculateDashaSystem(
  system: DashaSystem,
  input: TimingInput,
): DashaEngineResult {
  const chart = getTimingChart(input);
  if (system === "vimshottari" || system === "ashtottari") return calculateNakshatraBasedSystem(chart, system);
  if (system === "yogini") return calculateYogini(chart, input);
  const periods = calculateCharaDasha(input)
    .map((period) => mapExistingPeriod(period, chart, chart.birth.getTime()))
    .filter((period): period is DashaPeriodNode => period !== null);
  return { system: "chara", title: "Chara Dasha", cycleYears: 12, periods };
}

export async function calculateNadiSystem(input: TimingInput, now = new Date()): Promise<NadiEngineResult> {
  const chart = getTimingChart(input);
  const timeline = await calculateNadiTimeline(input, calculateSwissTransit);
  const ageYears = (now.getTime() - chart.birth.getTime()) / (YEAR_LENGTH_DAYS[chart.config.yearLength] * DAY_MS);
  const elapsedYears = Math.max(0, ageYears);
  const activeBcpHouse = (Math.floor(elapsedYears) % 12) + 1;
  const progressedPlanets = chart.planets.map((planet) => {
    const progressedLongitude = normalizeLongitude(planet.longitude + elapsedYears);
    const progressedSign = Math.floor(progressedLongitude / 30) + 1;
    const progressedHouse = ((planet.house - 1 + Math.floor(elapsedYears / 12)) % 12) + 1;
    return {
      planet: planet.planet,
      natalLongitude: planet.longitude,
      progressedLongitude,
      progressedSign,
      progressedDegree: progressedLongitude % 30,
      natalHouse: planet.house,
      progressedHouse,
      signAtOnePerTwelveYears: ((planet.sign - 1 + Math.floor(elapsedYears / 12)) % 12) + 1,
    };
  });
  return {
    system: "nadi",
    title: "Nadi Progression",
    ageYears: Math.max(0, ageYears),
    lagnaSign: chart.lagnaSign,
    activeBcpHouse,
    progressedPlanets,
    timeline,
  };
}

export function addDashaHorizon(input: TimingInput, years: number): TimingInput {
  const birth = new Date(input.birthDateTimeUTC);
  if (!Number.isFinite(birth.getTime())) throw new Error("birthDateTimeUTC must be a valid ISO datetime.");
  return {
    ...input,
    fromDate: input.fromDate ?? birth.toISOString(),
    toDate: input.toDate ?? addYears(birth, years, input.config?.yearLength).toISOString(),
  };
}

export const ASHTOTTARI_SEQUENCE = ASHTOTTARI_LORDS;
export const ASHTOTTARI_NAKSHATRA_GROUPS_EXPORT = ASHTOTTARI_NAKSHATRA_GROUPS;

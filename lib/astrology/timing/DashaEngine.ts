import { calculateCharaDasha } from "./chara";
import { calculateYoginiDasha } from "./yogini";
import { addYears, getDashaSeedLongitude, getSignLord, getTimingChart, signAt, YEAR_LENGTH_DAYS } from "./core";
import { ASHTOTTARI_LORDS, DASHA_LORDS } from "./sequences";
import { derivePosition, SIGNS } from "../avastha/graha";
import type { Period, TimingChart, TimingInput } from "./types";

export { ASHTOTTARI_LORDS, DASHA_LORDS };

const ASHTOTTARI_NAKSHATRA_GROUPS: readonly (readonly string[])[] = [
  ["Krittika", "Rohini"],
  ["Mrigashira", "Ardra", "Punarvasu", "Pushya"],
  ["Ashlesha", "Magha"],
  ["Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra"],
  ["Swati", "Vishakha", "Anuradha"],
  ["Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Abhijit", "Shravana"],
  ["Dhanishta", "Shatabhisha", "Purva Bhadrapada"],
  ["Uttara Bhadrapada", "Revati", "Ashwini", "Bharani"],
] as const;

const NAKSHATRA_NAMES = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
  "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
] as const;

export type DashaSystem = "vimshottari" | "yogini" | "ashtottari" | "chara" | "kalachakra";
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
  notices?: string[];
}

const DEPTH_NAMES: DashaDepth[] = ["Maha Dasha", "Antar Dasha", "Pratyantar Dasha", "Sookshma Dasha"];
const DAY_MS = 86_400_000;
const KALACHAKRA_YEARS = [7, 16, 9, 21, 5, 9, 16, 7, 10, 4, 4, 10] as const;
const SAVYA_SIGNS = new Set([1, 2, 3, 7, 8, 9]);

function normalizeLongitude(longitude: number) {
  return ((longitude % 360) + 360) % 360;
}

function yearsBetween(start: number, end: number, chart: TimingChart) {
  return (end - start) / (YEAR_LENGTH_DAYS[chart.config.yearLength] * DAY_MS);
}

function lunarData(longitude: number) {
  const span = 360 / 27;
  longitude = normalizeLongitude(longitude);
  const number = Math.floor(longitude / span) + 1;
  return {
    longitude,
    span,
    number,
    name: NAKSHATRA_NAMES[number - 1],
    progress: (longitude % span) / span,
  };
}

function ashtottariLunarData(longitude: number) {
  const normalized = normalizeLongitude(longitude);
  const abhijitStart = 276 + 40 / 60;
  const abhijitEnd = 280 + 53 / 60;
  if (normalized >= abhijitStart && normalized < abhijitEnd) {
    return {
      ...lunarData(normalized),
      name: "Abhijit",
      progress: (normalized - abhijitStart) / (abhijitEnd - abhijitStart),
    };
  }
  return lunarData(normalized);
}

function ashtottariLordIndex(nakshatra: string) {
  return ASHTOTTARI_NAKSHATRA_GROUPS.findIndex((group) => group.includes(nakshatra));
}

function ashtottariEligibilityNotice(chart: TimingChart) {
  const rahu = chart.byPlanet.get("Rahu")!;
  const ascendantLord = chart.byPlanet.get(getSignLord(chart.lagnaSign))!;
  const lordToRahu = ((rahu.sign - ascendantLord.sign + 12) % 12) + 1;
  const isKendraOrTrikona = [1, 4, 5, 7, 9, 10].includes(lordToRahu);
  if (rahu.house !== 1 && isKendraOrTrikona) return [];
  return ["Traditional Ashtottari eligibility is not met: Rahu must be outside the Ascendant and in a kendra or trikona from the Ascendant lord."];
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

function mapExistingPeriod(period: Period, chart: TimingChart, birth: number, maxLevel = 3): DashaPeriodNode | null {
  const originalStart = new Date(period.start).getTime();
  const end = new Date(period.end).getTime();
  if (end <= birth) return null;
  const start = Math.max(originalStart, birth);
  const children = period.level < maxLevel
    ? (period.children ?? [])
      .map((child) => mapExistingPeriod(child, chart, birth, maxLevel))
      .filter((child): child is DashaPeriodNode => child !== null)
    : [];
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

function calculateNakshatraBasedSystem(
  chart: TimingChart,
  system: "vimshottari" | "ashtottari",
): DashaEngineResult {
  const longitude = getDashaSeedLongitude(chart);
  const lunar = system === "vimshottari" ? lunarData(longitude) : ashtottariLunarData(longitude);
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
        [],
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
    ...(system === "ashtottari" ? { notices: ashtottariEligibilityNotice(chart) } : {}),
  };
}

function calculateYogini(chart: TimingChart, input: TimingInput): DashaEngineResult {
  const lunar = lunarData(getDashaSeedLongitude(chart));
  const periods = calculateYoginiDasha(input, undefined, false)
    .map((period) => mapExistingPeriod(period, chart, chart.birth.getTime(), 2))
    .filter((period): period is DashaPeriodNode => period !== null);
  return {
    system: "yogini",
    title: "Yogini Dasha",
    cycleYears: 36,
    periods,
    nakshatra: { number: lunar.number, name: lunar.name, progress: lunar.progress, remaining: 1 - lunar.progress },
  };
}

function calculateKalachakra(chart: TimingChart): DashaEngineResult {
  const longitude = getDashaSeedLongitude(chart);
  const position = derivePosition(longitude);
  const firstSign = position.navamsaSign;
  const forward = SAVYA_SIGNS.has(firstSign);
  const dehaSign = firstSign;
  const jeevaSign = signAt(firstSign, forward ? 8 : -8);
  const fractionElapsed = ((longitude % 30) % (30 / 9)) / (30 / 9);
  const birth = chart.birth.getTime();
  const to = chart.to.getTime();
  const yearMs = YEAR_LENGTH_DAYS[chart.config.yearLength] * DAY_MS;
  const order = Array.from({ length: 12 }, (_, index) => signAt(firstSign, forward ? index : -index));
  const firstYears = KALACHAKRA_YEARS[firstSign - 1];
  let cursor = birth - fractionElapsed * firstYears * yearMs;
  let index = 0;
  const periods: DashaPeriodNode[] = [];

  while (cursor < to && periods.length < 240) {
    const sign = order[index];
    const years = KALACHAKRA_YEARS[sign - 1];
    const end = cursor + years * yearMs;
    if (end > chart.from.getTime()) {
      const visibleStart = Math.max(cursor, birth);
      let antarCursor = cursor;
      const antarOrder = Array.from({ length: 12 }, (_, antarIndex) => signAt(sign, forward ? antarIndex : -antarIndex));
      const antars = antarOrder.map((antarSign, antarIndex) => {
        const antarEnd = antarIndex === order.length - 1
          ? end
          : antarCursor + (end - cursor) * KALACHAKRA_YEARS[antarSign - 1] / 118;
        const antar = makeNode(
          SIGNS[antarSign - 1],
          Math.max(antarCursor, birth),
          antarEnd,
          chart,
          2,
          [`Kalachakra Rashi subperiod weighted by its ${KALACHAKRA_YEARS[antarSign - 1]}-year sign value.`],
          undefined,
          [],
          antarCursor < birth,
        );
        antarCursor = antarEnd;
        return antar;
      }).filter((antar) => Date.parse(antar.end) > birth);
      const role = sign === dehaSign ? "Deha" : sign === jeevaSign ? "Jeeva" : "Rashi";
      periods.push(makeNode(
        SIGNS[sign - 1],
        visibleStart,
        end,
        chart,
        1,
        [
          `Navamsha ${SIGNS[firstSign - 1]} begins the ${forward ? "Savya" : "Apasavya"} sign sequence.`,
          `${role} sign for this cycle; Deha ${SIGNS[dehaSign - 1]}, Jeeva ${SIGNS[jeevaSign - 1]}.`,
          `Kalachakra sign duration: ${years} years.`,
        ],
        {
          ...(cursor < birth ? { virtualStart: new Date(cursor).toISOString() } : {}),
          dehaSign,
          jeevaSign,
          role,
          direction: forward ? "Savya" : "Apasavya",
        },
        antars,
        cursor < birth,
      ));
    }
    cursor = end;
    index = (index + 1) % order.length;
  }

  const lunar = lunarData(longitude);
  return {
    system: "kalachakra",
    title: "Kalachakra Dasha",
    cycleYears: KALACHAKRA_YEARS.reduce((sum, years) => sum + years, 0),
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
  if (system === "kalachakra") return calculateKalachakra(chart);
  const periods = calculateCharaDasha(input)
    .map((period) => mapExistingPeriod(period, chart, chart.birth.getTime()))
    .filter((period): period is DashaPeriodNode => period !== null);
  return { system: "chara", title: "Chara Dasha", cycleYears: 12, periods };
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

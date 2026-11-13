import { getPlanetaryDignity } from "../planetary-dignity-service";
import { addYears, getTimingChart, signAt } from "./core";
import type { Graha } from "../avastha/types";
import type { Period, TimingChart, TimingInput } from "./types";

export const YOGINIS = [
  { index: 1, name: "Mangala", planet: "Moon" as const, years: 1 },
  { index: 2, name: "Pingala", planet: "Sun" as const, years: 2 },
  { index: 3, name: "Dhanya", planet: "Jupiter" as const, years: 3 },
  { index: 4, name: "Bhramari", planet: "Mars" as const, years: 4 },
  { index: 5, name: "Bhadrika", planet: "Mercury" as const, years: 5 },
  { index: 6, name: "Ulka", planet: "Saturn" as const, years: 6 },
  { index: 7, name: "Siddha", planet: "Venus" as const, years: 7 },
  { index: 8, name: "Sankata", planet: "Rahu" as const, years: 8 },
] as const;
const NAKSHATRA_SPAN = 360 / 27;

function getYoginiIndex(nakshatra: number) {
  const index = (nakshatra + 3) % 8;
  return index === 0 ? 8 : index;
}

function yoginiAt(index: number, config: TimingChart["config"]) {
  const item = YOGINIS[(index - 1 + 8) % 8];
  return item.index === 8 && config.sankataLord === "Ketu" ? { ...item, planet: "Ketu" as const } : item;
}

function detailsForYogini(planet: Graha, chart: TimingChart, avasthaSummary?: Record<string, unknown>) {
  const position = chart.byPlanet.get(planet)!;
  return {
    yogini: YOGINIS.find(({ planet: defaultLord }) => defaultLord === (planet === "Ketu" ? "Rahu" : planet))?.name ?? "Sankata",
    planet,
    natalSign: position.sign,
    natalHouse: position.house,
    dignity: getPlanetaryDignity(planet, position.sign - 1, position.degree),
    avasthaSummary: avasthaSummary?.[planet] ?? null,
  };
}

function buildSubperiods(
  parent: Period,
  mdIndex: number,
  chart: TimingChart,
  avasthaSummary?: Record<string, unknown>,
  depth: 2 | 3 = 2,
  parentYoginiIndex = mdIndex,
): Period[] {
  let cursor = new Date(parent.start);
  return Array.from({ length: 8 }, (_, offset) => {
    const index = ((parentYoginiIndex - 1 + offset) % 8) + 1;
    const yogini = yoginiAt(index, chart.config);
    const periodYears = parent.years * yogini.years / 36;
    const end = offset === 7 ? new Date(parent.end) : addYears(cursor, periodYears, chart.config.yearLength);
    const period: Period = {
      level: (parent.level + 1) as Period["level"],
      lord: yogini.name,
      start: cursor.toISOString(),
      end: end.toISOString(),
      years: (end.getTime() - cursor.getTime()) / (addYears(chart.birth, 1, chart.config.yearLength).getTime() - chart.birth.getTime()),
      reasons: [`Yogini subperiod length is ${parent.years.toFixed(8)} × ${yogini.years}/36 years.`],
      details: { ...detailsForYogini(yogini.planet, chart, avasthaSummary), years: yogini.years, index },
    };
    if (depth === 3 && period.level === 2) period.children = buildSubperiods(period, mdIndex, chart, avasthaSummary, 2, index);
    cursor = end;
    return period;
  });
}

function clipAtBirth(period: Period, birth: Date): Period | null {
  const start = new Date(period.start);
  const end = new Date(period.end);
  if (end <= birth) return null;
  const children = period.children?.map((child) => clipAtBirth(child, birth)).filter((child): child is Period => child !== null);
  if (start >= birth) return children ? { ...period, children } : period;
  const yearMs = end.getTime() - start.getTime();
  return {
    ...period,
    start: birth.toISOString(),
    years: (end.getTime() - birth.getTime()) / yearMs * period.years,
    clipped: true,
    details: { ...period.details, virtualStart: period.start },
    ...(children ? { children } : {}),
  };
}

export function calculateYoginiDasha(input: TimingInput, avasthaSummary?: Record<string, unknown>): Period[] {
  const chart = getTimingChart(input);
  const moon = chart.byPlanet.get("Moon")!;
  const moonPosition = ((moon.longitude % NAKSHATRA_SPAN) + NAKSHATRA_SPAN) % NAKSHATRA_SPAN;
  const nakshatra = Math.floor(moon.longitude / NAKSHATRA_SPAN) + 1;
  const firstIndex = getYoginiIndex(nakshatra);
  const first = yoginiAt(firstIndex, chart.config);
  const fractionLeft = (NAKSHATRA_SPAN - moonPosition) / NAKSHATRA_SPAN;
  const balanceYears = fractionLeft * first.years;
  const elapsedYears = first.years - balanceYears;
  const virtualStart = addYears(chart.birth, -elapsedYears, chart.config.yearLength);
  const firstEnd = addYears(chart.birth, balanceYears, chart.config.yearLength);
  const periods: Period[] = [];

  const makeMd = (yoginiIndex: number, start: Date, end: Date, fullDuration: number, clipped: boolean) => {
    const yogini = yoginiAt(yoginiIndex, chart.config);
    const md: Period = {
      level: 1,
      lord: yogini.name,
      start: start.toISOString(),
      end: end.toISOString(),
      years: (end.getTime() - start.getTime()) / (addYears(chart.birth, 1, chart.config.yearLength).getTime() - chart.birth.getTime()),
      clipped,
      reasons: clipped
        ? [`Birth nakshatra balance: ${fractionLeft.toFixed(8)} of ${first.name}'s ${first.years}-year cycle remains; virtual cycle starts before birth.`]
        : [`Full ${yogini.years}-year Yogini period in the repeating 36-year cycle.`],
      details: { ...detailsForYogini(yogini.planet, chart, avasthaSummary), index: yoginiIndex, fullDurationYears: fullDuration, virtualStart: clipped ? virtualStart.toISOString() : undefined, visibleStart: clipped ? chart.birth.toISOString() : undefined },
    };
    const fullTreeRoot = {
      ...md,
      start: (clipped ? virtualStart : start).toISOString(),
      end: (clipped ? addYears(virtualStart, fullDuration, chart.config.yearLength) : end).toISOString(),
      years: fullDuration,
    };
    md.children = buildSubperiods(fullTreeRoot, yoginiIndex, chart, avasthaSummary, 3, yoginiIndex)
      .map((child) => clipAtBirth(child, chart.birth))
      .filter((child): child is Period => child !== null);
    return md;
  };

  if (firstEnd > chart.from) periods.push(makeMd(firstIndex, virtualStart, firstEnd, first.years, true));
  let cursor = firstEnd;
  let index = (firstIndex % 8) + 1;
  let cycleCount = 0;
  while (cursor < chart.to && cycleCount < 400) {
    const yogini = yoginiAt(index, chart.config);
    const end = addYears(cursor, yogini.years, chart.config.yearLength);
    if (end > chart.from) periods.push(makeMd(index, cursor, end, yogini.years, false));
    cursor = end;
    index = (index % 8) + 1;
    cycleCount += 1;
  }
  return periods;
}

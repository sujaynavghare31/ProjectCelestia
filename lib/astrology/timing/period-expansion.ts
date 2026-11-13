import type { DashaPeriodNode, DashaSystem } from "./DashaEngine";
import { ASHTOTTARI_LORDS, DASHA_LORDS, YOGINI_DASHA_LORDS } from "./sequences";

const NEXT_DEPTH: Partial<Record<DashaPeriodNode["name"], DashaPeriodNode["name"]>> = {
  "Maha Dasha": "Antar Dasha",
  "Antar Dasha": "Pratyantar Dasha",
  "Pratyantar Dasha": "Sookshma Dasha",
};

const SEQUENCES = {
  vimshottari: DASHA_LORDS,
  ashtottari: ASHTOTTARI_LORDS,
  yogini: YOGINI_DASHA_LORDS,
} as const;

export function createDashaSubperiods(
  period: DashaPeriodNode,
  system: DashaSystem,
): DashaPeriodNode[] {
  if (system === "chara" || system === "kalachakra") return [];
  const name = NEXT_DEPTH[period.name];
  if (!name) return [];

  const sequence = SEQUENCES[system];
  const firstIndex = sequence.findIndex(({ lord }) => lord === period.lord);
  if (firstIndex < 0) return [];

  const visibleStart = Date.parse(period.start);
  const end = Date.parse(period.end);
  const virtualStart = typeof period.details?.virtualStart === "string"
    ? Date.parse(period.details.virtualStart)
    : visibleStart;
  if (![visibleStart, virtualStart, end].every(Number.isFinite) || end <= visibleStart || end <= virtualStart) return [];

  const totalYears = sequence.reduce((sum, item) => sum + item.years, 0);
  const fullDuration = end - virtualStart;
  let elapsedYears = 0;

  return sequence.flatMap((_, offset) => {
    const item = sequence[(firstIndex + offset) % sequence.length];
    const start = virtualStart + fullDuration * elapsedYears / totalYears;
    elapsedYears += item.years;
    const childEnd = offset === sequence.length - 1
      ? end
      : virtualStart + fullDuration * elapsedYears / totalYears;
    if (childEnd <= visibleStart) return [];

    const clippedStart = Math.max(start, visibleStart);
    const yearLengthDays = period.yearLengthDays ?? 365.2425;
    const durationYears = (childEnd - clippedStart) / (yearLengthDays * 86_400_000);
    const clipped = start < visibleStart;
    return [{
      id: `${name}:${item.lord}:${new Date(clippedStart).toISOString()}`,
      name,
      lord: item.lord,
      start: new Date(clippedStart).toISOString(),
      end: new Date(childEnd).toISOString(),
      durationYears,
      yearLengthDays,
      ...(clipped ? { clipped: true } : {}),
      reasons: [`${period.name} divided proportionally by the ${system} cycle (${item.years}/${totalYears} years).`],
      ...(clipped ? { details: { virtualStart: new Date(start).toISOString() } } : {}),
      subPeriods: [],
    }];
  });
}

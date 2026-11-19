import { YEAR_DAYS, SAVYA, mod, sign } from "./constants";
import { lordOf, isExalted, isDebilitated, getLagnaSign, planetLongitudes, trikonaStart } from "./core";
import type { PlanetPositions } from "./constants";

export interface DashaPeriod {
  sign: number;
  years: number;
  start: number;
  end: number;
  ageFrom: number;
  ageTo: number;
  isCurrent: boolean;
  cycle?: 1 | 2;
}

export interface AntardashaPeriod {
  sign: number;
  years: number;
  start: number;
  end: number;
  ageFrom: number;
  ageTo: number;
  isCurrent: boolean;
}

export interface DashaResult {
  system: "chara-knrao" | "chara-parashara" | "sthira" | "shoola" | "navamsa" | "brahma" | "mandooka" | "trikona" | "drig";
  periods: DashaPeriod[];
  antardashas?: Record<string, AntardashaPeriod[]>;
}

export function isOddSign(s: number): boolean {
  return mod(s, 12) % 2 === 0;
}

export function yearsToLord(s: number, dir: 1 | -1, planets: PlanetPositions = []): number {
  s = mod(s, 12);
  const l = lordOf(s, planets);
  const ls = sign(planetLongitudes(planets)[l] ?? 0);
  let n = mod(dir * (ls - s), 12);
  let y = n === 0 ? 12 : n;
  if (isExalted(l, planets)) y += 1;
  if (isDebilitated(l, planets)) y -= 1;
  return y > 0 ? y : 0;
}

export function buildPeriods(
  sequence: number[],
  years: number[],
  birthMs: number,
  asOfMs: number,
  cycles?: (1 | 2)[],
): DashaPeriod[] {
  let cursor = birthMs;
  const periods: DashaPeriod[] = [];
  for (let i = 0; i < sequence.length; i++) {
    const y = Math.max(0, years[i] ?? 0);
    const end = cursor + y * YEAR_DAYS * 86400000;
    const ageFrom = (cursor - birthMs) / (YEAR_DAYS * 86400000);
    const ageTo = (end - birthMs) / (YEAR_DAYS * 86400000);
    periods.push({
      sign: mod(sequence[i], 12),
      years: y,
      start: cursor,
      end,
      ageFrom,
      ageTo,
      isCurrent: y > 0 && asOfMs >= cursor && asOfMs < end,
      ...(cycles ? { cycle: cycles[i] } : {}),
    });
    cursor = end;
  }
  return periods;
}

export function charaKnRao(lagnaLongitude: number, planets: PlanetPositions, birthMs: number, asOfMs: number): DashaResult {
  const lagna = getLagnaSign(lagnaLongitude);
  const ninth = mod(lagna + 8, 12);
  const dir: 1 | -1 = SAVYA.includes(ninth) ? 1 : -1;
  const firstSigns = Array.from({ length: 12 }, (_, i) => mod(lagna + dir * i, 12));
  const firstYears = firstSigns.map((s) => yearsToLord(s, SAVYA.includes(s) ? 1 : -1, planets));
  const secondSigns = firstSigns;
  const secondYears = firstYears.map((y) => Math.max(0, 12 - y));
  const periods = buildPeriods(
    [...firstSigns, ...secondSigns],
    [...firstYears, ...secondYears],
    birthMs, asOfMs,
    [...firstSigns.map(() => 1 as const), ...secondSigns.map(() => 2 as const)],
  );
  return { system: "chara-knrao", periods, antardashas: buildCharaAntardashas(periods, birthMs, asOfMs, lagna, "knrao") };
}

export function charaParashara(lagnaLongitude: number, planets: PlanetPositions, birthMs: number, asOfMs: number): DashaResult {
  const lagna = getLagnaSign(lagnaLongitude);
  const dir: 1 | -1 = isOddSign(lagna) ? 1 : -1;
  const firstSigns = Array.from({ length: 12 }, (_, i) => mod(lagna + dir * i, 12));
  const firstYears = firstSigns.map((s) => yearsToLord(s, isOddSign(s) ? 1 : -1, planets));
  const secondYears = firstYears.map((y) => Math.max(0, 12 - y));
  const periods = buildPeriods(
    [...firstSigns, ...firstSigns],
    [...firstYears, ...secondYears],
    birthMs, asOfMs,
    [...firstSigns.map(() => 1 as const), ...firstSigns.map(() => 2 as const)],
  );
  return { system: "chara-parashara", periods, antardashas: buildCharaAntardashas(periods, birthMs, asOfMs, lagna, "parashara") };
}

export function buildCharaAntardashas(
  periods: DashaPeriod[],
  birthMs: number,
  asOfMs: number,
  lagna: number,
  method: "knrao" | "parashara",
): Record<string, AntardashaPeriod[]> {
  const map: Record<string, AntardashaPeriod[]> = {};
  for (const md of periods) {
    const mdAdPart = md.years / 12;
    const adDir: 1 | -1 = method === "parashara"
      ? (isOddSign(md.sign) ? 1 : -1)
      : (SAVYA.includes(md.sign) ? 1 : -1);
    const parts: AntardashaPeriod[] = [];
    let cursor = md.start;
    for (let j = 0; j < 12; j++) {
      const adSign = method === "parashara"
        ? mod(md.sign + adDir * j, 12)
        : mod(md.sign + adDir * (j + 1), 12);
      const end = cursor + mdAdPart * YEAR_DAYS * 86400000;
      parts.push({
        sign: adSign,
        years: mdAdPart,
        start: cursor,
        end,
        ageFrom: (cursor - birthMs) / (YEAR_DAYS * 86400000),
        ageTo: (end - birthMs) / (YEAR_DAYS * 86400000),
        isCurrent: mdAdPart > 0 && asOfMs >= cursor && asOfMs < end,
      });
      cursor = end;
    }
    const mdIndex = periods.indexOf(md);
    map[`${md.sign}-${md.cycle ?? 1}-${mdIndex}`] = parts;
  }
  return map;
}

export function findCurrentAD(result: DashaResult, mdIndex: number, asOfMs: number): AntardashaPeriod | undefined {
  const md = result.periods[mdIndex];
  if (!md || !result.antardashas) return undefined;
  const key = Object.keys(result.antardashas).find((k) => k.endsWith(`-${mdIndex}`));
  return result.antardashas[key ?? ""]?.find((ad) => ad.isCurrent)
    ?? result.antardashas[key ?? ""]?.find((ad) => asOfMs >= ad.start && asOfMs < ad.end);
}

export function sthira(start: number, planets: PlanetPositions, birthMs: number, asOfMs: number): DashaResult {
  const dir: 1 | -1 = isOddSign(start) ? 1 : -1;
  const sequence = Array.from({ length: 12 }, (_, i) => mod(start + dir * i, 12));
  const years = sequence.map((s) => mod(s, 3) === 0 ? 7 : mod(s, 3) === 1 ? 8 : 9);
  return { system: "sthira", periods: buildPeriods(sequence, years, birthMs, asOfMs) };
}

export function shoola(s17: number, birthMs: number, asOfMs: number): DashaResult {
  const dir: 1 | -1 = isOddSign(s17) ? 1 : -1;
  const sequence = Array.from({ length: 12 }, (_, i) => mod(s17 + dir * i, 12));
  return { system: "shoola", periods: buildPeriods(sequence, Array(12).fill(9), birthMs, asOfMs) };
}

export function navamsaDasha(lagnaLongitude: number, birthMs: number, asOfMs: number): DashaResult {
  const lagna = getLagnaSign(lagnaLongitude);
  const dir: 1 | -1 = isOddSign(lagna) ? 1 : -1;
  const sequence = Array.from({ length: 12 }, (_, i) => mod(lagna + dir * i, 12));
  return { system: "navamsa", periods: buildPeriods(sequence, Array(12).fill(9), birthMs, asOfMs) };
}

export function brahmaDasha(brahmaSign: number, planets: PlanetPositions, birthMs: number, asOfMs: number): DashaResult {
  const dir: 1 | -1 = isOddSign(brahmaSign) ? 1 : -1;
  const sequence = Array.from({ length: 12 }, (_, i) => mod(brahmaSign + dir * i, 12));
  const years = sequence.map((s) => {
    const sixthFrom = mod(s + 5, 12);
    const target = lordOf(sixthFrom, planets);
    const lordSign = sign(planetLongitudes(planets)[target] ?? 0);
    const rowDir: 1 | -1 = isOddSign(s) ? 1 : -1;
    let y = mod(rowDir * (lordSign - s), 12);
    y = y === 0 ? 12 : y;
    y -= 1;
    return y === 0 ? 12 : y;
  });
  return { system: "brahma", periods: buildPeriods(sequence, years, birthMs, asOfMs) };
}

export function mandooka(s17: number, birthMs: number, asOfMs: number): DashaResult {
  const dir: 1 | -1 = isOddSign(s17) ? 1 : -1;
  const offsets = [0, 3, 6, 9, 1, 4, 7, 10, 2, 5, 8, 11];
  const sequence = offsets.map((o) => mod(s17 + dir * o, 12));
  const years = sequence.map((s) => mod(s, 3) === 0 ? 7 : mod(s, 3) === 1 ? 8 : 9);
  return { system: "mandooka", periods: buildPeriods(sequence, years, birthMs, asOfMs) };
}

export function trikonaDasha(lagna: number, planets: PlanetPositions, birthMs: number, asOfMs: number): DashaResult {
  const start = trikonaStart(getLagnaSign(lagna), planets);
  const dir: 1 | -1 = isOddSign(start) ? 1 : -1;
  const offsets = [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11];
  const sequence = offsets.map((o) => mod(start + dir * o, 12));
  const years = sequence.map((s) => yearsToLord(s, isOddSign(s) ? 1 : -1, planets));
  return { system: "trikona", periods: buildPeriods(sequence, years, birthMs, asOfMs) };
}

export function drigDasha(lagnaLongitude: number, planets: PlanetPositions, birthMs: number, asOfMs: number): DashaResult {
  const lagna = getLagnaSign(lagnaLongitude);
  const bases = [mod(lagna + 8, 12), mod(lagna + 9, 12), mod(lagna + 10, 12)];
  const sequence: number[] = [];
  for (const base of bases) {
    const offsets = isOddSign(base) ? [0, 3, 6, 9] : [0, 9, 6, 3];
    offsets.forEach((o) => sequence.push(mod(base + o, 12)));
  }
  const years = sequence.map((s) => yearsToLord(s, isOddSign(s) ? 1 : -1, planets));
  return { system: "drig", periods: buildPeriods(sequence, years, birthMs, asOfMs) };
}

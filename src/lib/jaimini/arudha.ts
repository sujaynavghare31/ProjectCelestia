import { LORD1, NATURAL_BENEFICS, NATURAL_MALEFICS, OWN, mod, sign } from "./constants";
import { lordOf, planetLongitudes, signStrength, associated, planetSigns, aspects } from "./core";
import type { PlanetPositions } from "./constants";

export const ARUDHA_NAMES = [
  "Arudha Lagna (AL)", "Dhana pada", "Vikrama pada", "Sukha / Matri pada",
  "Mantra / Putra pada", "Shatru / Roga pada", "Dara pada (DP)", "Mrityu pada",
  "Bhagya / Pitri pada", "Rajya / Karma pada", "Labha pada", "Upapada (UL)",
] as const;

export interface ArudhaReading {
  id: string;
  present: boolean;
  meaning: string;
}

export function bhavaPada(lagna: number, house: number, planets: PlanetPositions): number {
  const s = mod(lagna + house - 1, 12);
  const ls = sign(planetLongitudes(planets)[lordOf(s, planets)] ?? 0);
  let a = mod(ls + mod(ls - s, 12), 12);
  if (mod(a - s, 12) === 0) a = mod(s + 9, 12);
  if (mod(a - s, 12) === 6) a = mod(a + 9, 12);
  return mod(a, 12);
}

export function arudhaLagnas(lagna: number, planets: PlanetPositions): number[] {
  return Array.from({ length: 12 }, (_, i) => bhavaPada(lagna, i + 1, planets));
}

export function grahaArudha(p: number, planets: PlanetPositions): number {
  const longs = planetLongitudes(planets);
  const s = sign(longs[p] ?? 0);
  const ownSigns = OWN[p as keyof typeof OWN] ?? [];
  let ownSign = s;
  if (ownSigns.length > 0) {
    ownSign = ownSigns.length === 1
      ? ownSigns[0]
      : (signStrength(ownSigns[0], planets) >= signStrength(ownSigns[1], planets) ? ownSigns[0] : ownSigns[1]);
  }
  const count = mod(ownSign - s, 12);
  let a = mod(ownSign + count, 12);
  if (mod(a - s, 12) === 0) a = mod(s + 9, 12);
  if (mod(a - s, 12) === 6) a = mod(a + 9, 12);
  return mod(a, 12);
}

export function grahaArudhas(planets: PlanetPositions): number[] {
  return planetLongitudes(planets).map((_, p) => grahaArudha(p, planets));
}

export function planetsInHouse(reference: number, house: number, planets: PlanetPositions): number[] {
  const target = mod(reference + house - 1, 12);
  return planetSigns(planets).map((ps, p) => ps === target ? p : -1).filter((p) => p >= 0);
}

export function arudhaReadings(lagna: number, planets: PlanetPositions): ArudhaReading[] {
  const padas = arudhaLagnas(lagna, planets);
  const AL = padas[0];
  const A7 = padas[6];
  const UL = padas[11];
  const eleventh = planetsInHouse(AL, 11, planets);
  const twelfth = planetsInHouse(AL, 12, planets);
  const inUL7 = planetsInHouse(UL, 7, planets);
  const ul2 = planetsInHouse(UL, 2, planets);
  const signs = planetSigns(planets);
  const beneficsIn11 = eleventh.filter((p) => NATURAL_BENEFICS.includes(p as 1 | 3 | 4 | 5)).length;
  const maleficsIn11 = eleventh.filter((p) => NATURAL_MALEFICS.includes(p as 0 | 2 | 6 | 7 | 8)).length;
  const alA7Kendra = mod(AL - A7, 3) === 0;
  const alA7Trine = mod(AL - A7, 4) === 0;
  const diff = mod(AL - A7, 12);
  const friction = [6, 8, 1, 11].includes(diff);
  const secondFromUL = mod(UL + 1, 12);
  const marriageEndures = ul2.includes(4) || ul2.includes(5)
    || aspects(signs[4], secondFromUL);

  return [
    { id: "benefics-11-al", present: beneficsIn11 > 0, meaning: "Gains by fair means" },
    { id: "malefics-11-al", present: maleficsIn11 > 0, meaning: "Gains through struggle" },
    { id: "income-expenses", present: eleventh.length > twelfth.length, meaning: "Income exceeds expenses" },
    { id: "partners-good", present: alA7Kendra || alA7Trine, meaning: "Good partnerships" },
    { id: "partners-friction", present: friction, meaning: "Friction with partners" },
    { id: "al-rahu-ketu", present: [signs[7], signs[8]].includes(AL), meaning: "Rumours or an unconventional image" },
    { id: "ul-7th", present: inUL7.length > 0, meaning: "Marriage tested" },
    { id: "ul-2nd", present: marriageEndures, meaning: "Marriage endures" },
  ];
}

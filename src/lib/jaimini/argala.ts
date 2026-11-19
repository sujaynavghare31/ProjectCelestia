import { mod } from "./constants";
import { planetSigns } from "./core";
import type { PlanetPositions } from "./constants";

export type ArgalaReference = "lagna" | "al" | "kk" | "ak" | "moon" | "ul";

export interface ArgalaHouse {
  house: number;
  sign: number;
  net: number;
  effective: number[];
  counts: Record<string, number>;
}

export function planetsAtSign(s: number, planets: PlanetPositions): number[] {
  s = mod(s, 12);
  return planetSigns(planets).map((ps, p) => ps === s ? p : -1).filter((p) => p >= 0);
}

export function argalaForHouse(reference: number, house: number, planets: PlanetPositions): ArgalaHouse {
  const s = mod(reference + house - 1, 12);
  const sources: Array<[string, number, number]> = [
    ["2nd", mod(s + 1, 12), mod(s + 11, 12)],
    ["4th", mod(s + 3, 12), mod(s + 9, 12)],
    ["11th", mod(s + 10, 12), mod(s + 2, 12)],
    ["5th", mod(s + 4, 12), mod(s + 8, 12)],
  ];
  const effective: number[] = [];
  const counts: Record<string, number> = {};
  sources.forEach(([name, argalaSign, obstructionSign], i) => {
    const argalaCount = planetsAtSign(argalaSign, planets).length;
    const obstructionCount = planetsAtSign(obstructionSign, planets).length;
    counts[name] = argalaCount - obstructionCount;
    if (argalaCount > obstructionCount) effective.push(i);
  });
  return { house, sign: s, net: effective.length, effective, counts };
}

export function argalaTable(reference: number, planets: PlanetPositions): ArgalaHouse[] {
  return Array.from({ length: 12 }, (_, i) => argalaForHouse(reference, i + 1, planets));
}

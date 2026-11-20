// Vedic (graha-drishti) aspects measured in DEGREES with an orb — as used by KP software tables.
import { norm360, type Body } from "./constants";

/** Aspect angles each body casts (degrees ahead in the zodiac). Conjunction (0°) handled separately. */
export const ASPECT_ANGLES: Partial<Record<Body, number[]>> = {
  Sun: [180], Moon: [180], Mercury: [180], Venus: [180],
  Mars: [90, 180, 210], Jupiter: [120, 180, 240], Saturn: [60, 180, 270],
  Rahu: [], Ketu: [],                     // nodes cast no aspect (they still conjoin)
  Uranus: [180], Neptune: [180], Pluto: [180],
};
export interface AspectOptions {
  /** orb for the 7 planets (default 8°) */
  orb?: number;
  /** orb for Uranus/Neptune/Pluto (default 5°) */
  outerOrb?: number;
  /** tight orb for "Cuspal aspect" (default 3°20′) */
  cuspalOrb?: number;
}
export const DEFAULT_ASPECTS: Required<AspectOptions> = { orb: 8, outerOrb: 5, cuspalOrb: 10 / 3 };
const isOuter = (b: Body) => b === "Uranus" || b === "Neptune" || b === "Pluto";
export const orbOf = (b: Body, o: Required<AspectOptions>) => (isOuter(b) ? o.outerOrb : o.orb);
const sep = (a: number, b: number) => Math.abs(norm360(a - b + 180) - 180);

/** Smallest distance between where `from` throws an aspect and `target` (Infinity if no aspect angle). */
export function aspectDistance(from: Body, fromLon: number, targetLon: number): number {
  const angles = ASPECT_ANGLES[from] ?? [];
  return angles.reduce((best, a) => Math.min(best, sep(norm360(fromLon + a), targetLon)), Infinity);
}
export const aspects = (from: Body, fromLon: number, targetLon: number, orb: number) => aspectDistance(from, fromLon, targetLon) <= orb;
/** Conjunction: within the smaller orb of the two bodies. */
export const conjunct = (a: Body, la: number, b: Body, lb: number, o: Required<AspectOptions>) => sep(la, lb) <= Math.min(orbOf(a, o), orbOf(b, o));

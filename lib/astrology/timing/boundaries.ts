import type { DashaSeed } from "./types";

export interface TimingBoundaryInput {
  seed: DashaSeed;
  seedLongitude: number;
  ascendantLongitude: number;
  planetLongitudes: number[];
  houseCusps: number[];
}

function distanceToBoundary(longitude: number, interval: number) {
  const remainder = ((longitude % interval) + interval) % interval;
  return Math.min(remainder, interval - remainder);
}

function angularDistance(first: number, second: number) {
  const difference = Math.abs(((first - second + 540) % 360) - 180);
  return difference;
}

export function hasTimingBoundaryOverlap(input: TimingBoundaryInput) {
  const seedMargin = input.seed === "ascendant" ? 2.5 : 0.1;
  const nearSeed = distanceToBoundary(input.seedLongitude, 30) <= seedMargin
    || distanceToBoundary(input.seedLongitude, 360 / 27) <= seedMargin;
  const nearAscendantSign = input.seed === "ascendant-lord"
    && distanceToBoundary(input.ascendantLongitude, 30) <= 2.5;
  const nearHouseCusp = input.planetLongitudes.some((longitude) =>
    input.houseCusps.some((cusp) => angularDistance(longitude, cusp) <= 1.25),
  );
  return nearSeed || nearAscendantSign || nearHouseCusp;
}

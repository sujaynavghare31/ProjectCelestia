import { bhavaOf } from "@/src/lib/chart/bhava";

export interface HouseCusp {
  house: number;
  longitude: number;
}

export function getHouseForLongitude(longitude: number, cusps: HouseCusp[]): number {
  if (cusps.length !== 12) throw new Error("Exactly 12 house cusps are required.");

  const orderedCusps = [...cusps].sort((a, b) => a.house - b.house);
  for (let index = 0; index < orderedCusps.length; index += 1) {
    const cusp = orderedCusps[index];
    if (cusp.house !== index + 1 || !Number.isFinite(cusp.longitude)) {
      throw new Error("House cusps must have sequential house numbers and finite longitudes.");
    }
  }

  return bhavaOf(longitude, orderedCusps.map(({ longitude }) => longitude));
}

export function mapPositionsToHouses<T extends { longitude: number }>(
  positions: T[],
  cusps: HouseCusp[],
): Array<T & { house: number }> {
  return positions.map((position) => ({
    ...position,
    house: getHouseForLongitude(position.longitude, cusps),
  }));
}

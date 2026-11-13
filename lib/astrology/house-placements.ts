export interface HouseCusp {
  house: number;
  longitude: number;
}

function normalizeDegrees(degree: number) {
  return ((degree % 360) + 360) % 360;
}

export function getHouseForLongitude(longitude: number, cusps: HouseCusp[]): number {
  if (!Number.isFinite(longitude)) throw new Error("Planet longitude must be finite.");
  if (cusps.length !== 12) throw new Error("Exactly 12 house cusps are required.");

  const orderedCusps = [...cusps].sort((a, b) => a.house - b.house);
  for (let index = 0; index < orderedCusps.length; index += 1) {
    const cusp = orderedCusps[index];
    if (cusp.house !== index + 1 || !Number.isFinite(cusp.longitude)) {
      throw new Error("House cusps must have sequential house numbers and finite longitudes.");
    }

    const nextCusp = orderedCusps[(index + 1) % orderedCusps.length];
    const start = normalizeDegrees(cusp.longitude);
    const end = normalizeDegrees(nextCusp.longitude);
    const span = (end - start + 360) % 360;
    if (span === 0) throw new Error("House cusps cannot share the same longitude.");

    const distance = (normalizeDegrees(longitude) - start + 360) % 360;
    if (distance < span) return cusp.house;
  }

  throw new Error("House cusps do not cover the planetary longitude.");
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

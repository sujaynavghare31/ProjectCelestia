import type { CuspSystem } from "@/lib/kundali-types";
import { bhavaOf, norm360 } from "@/lib/astrology/cusp-labels";

export interface CuspAyanamsa {
  id: string;
  degrees: number;
}

export interface BhavaCuspInput {
  ascendantLongitude: number;
  midheavenLongitude: number;
  placidusCusps: number[];
  kpCusps?: number[];
  carterCusps?: number[];
  latitude: number;
  ayanamsaId: string;
}

function assertCusps(cusps: number[], system: CuspSystem) {
  if (cusps.length !== 12 || cusps.some((cusp) => !Number.isFinite(cusp))) {
    throw new Error(`${system} requires twelve finite cusp longitudes.`);
  }
  if (cusps.some((cusp, index) => norm360(cusps[(index + 1) % cusps.length] - cusp) === 0)) {
    throw new Error(`${system} cusp longitudes must be distinct.`);
  }
  return cusps.map(norm360);
}

function equalCusps(ascendantLongitude: number) {
  return Array.from({ length: 12 }, (_, index) => norm360(ascendantLongitude + index * 30));
}

function sripatiCusps(ascendantLongitude: number, midheavenLongitude: number) {
  const angles = [
    norm360(ascendantLongitude),
    norm360(midheavenLongitude + 180),
    norm360(ascendantLongitude + 180),
    norm360(midheavenLongitude),
  ];
  const madhyas = angles.flatMap((start, quadrant) => {
    const end = angles[(quadrant + 1) % angles.length];
    const span = norm360(end - start);
    return [start, norm360(start + span / 3), norm360(start + 2 * span / 3)];
  });
  return madhyas.map((current, index) => {
    const previous = madhyas[(index + madhyas.length - 1) % madhyas.length];
    return norm360(previous + norm360(current - previous) / 2);
  });
}

export function getBhavaCusps(
  system: CuspSystem,
  birth: BhavaCuspInput,
  ayanamsa: CuspAyanamsa,
): number[] {
  if (birth.ayanamsaId !== ayanamsa.id) {
    throw new Error(`Selected cusps require the ${birth.ayanamsaId} ayanamsa.`);
  }
  if (system === "kp" && ayanamsa.id !== "krishnamurti") {
    throw new Error("KP cusps require the Krishnamurti ayanamsa.");
  }
  if (system === "sripati") return assertCusps(sripatiCusps(birth.ascendantLongitude, birth.midheavenLongitude), system);
  if (system === "equal") return assertCusps(equalCusps(birth.ascendantLongitude), system);
  if ((system === "placidus" || system === "kp") && Math.abs(birth.latitude) >= 66) {
    return assertCusps(equalCusps(birth.ascendantLongitude), system);
  }
  const cusps = system === "placidus"
    ? birth.placidusCusps
    : system === "kp"
      ? birth.kpCusps
      : birth.carterCusps;
  if (!cusps) throw new Error(`${system} cusp data is unavailable for this chart.`);
  return assertCusps(cusps, system);
}

export function houseOfBhava(longitude: number, cusps: number[]) {
  return bhavaOf(longitude, assertCusps(cusps, "placidus"));
}

import swe from "swisseph";
import { normalizeLongitude } from "../avastha/graha";
import type { Graha } from "../avastha/types";
import type { TransitPosition } from "./bnn";

type EclipticResult = { longitude: number; longitudeSpeed: number; error?: string };

const PLANET_CODES: Partial<Record<Graha, number>> = {
  Sun: swe.SE_SUN,
  Moon: swe.SE_MOON,
  Mars: swe.SE_MARS,
  Mercury: swe.SE_MERCURY,
  Jupiter: swe.SE_JUPITER,
  Venus: swe.SE_VENUS,
  Saturn: swe.SE_SATURN,
  Rahu: swe.SE_TRUE_NODE,
};

function toJulianDay(date: Date) {
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 +
    (date.getUTCSeconds() + date.getUTCMilliseconds() / 1000) / 3600;
  return swe.swe_julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), hour, swe.SE_GREG_CAL);
}

export function calculateSwissTransit(date: Date, planet: Graha): TransitPosition {
  if (!Number.isFinite(date.getTime())) throw new Error("Transit date must be valid.");
  swe.swe_set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);
  const julianDay = toJulianDay(date);
  const code = PLANET_CODES[planet];
  if (code === undefined) {
    if (planet !== "Ketu") throw new Error(`Unsupported transit planet ${planet}.`);
    const rahu = swe.swe_calc_ut(julianDay, swe.SE_TRUE_NODE, swe.SEFLG_MOSEPH | swe.SEFLG_SPEED | swe.SEFLG_SIDEREAL) as EclipticResult;
    if (rahu.error) throw new Error(`Swiss Ephemeris could not calculate Rahu: ${rahu.error}`);
    return { longitude: normalizeLongitude(rahu.longitude + 180), speed: -rahu.longitudeSpeed };
  }
  const result = swe.swe_calc_ut(julianDay, code, swe.SEFLG_MOSEPH | swe.SEFLG_SPEED | swe.SEFLG_SIDEREAL) as EclipticResult;
  if (result.error || !Number.isFinite(result.longitude) || !Number.isFinite(result.longitudeSpeed)) {
    throw new Error(`Swiss Ephemeris could not calculate ${planet}: ${result.error ?? "invalid ephemeris result"}`);
  }
  return { longitude: normalizeLongitude(result.longitude), speed: result.longitudeSpeed };
}

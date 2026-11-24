import type { AyanamsaKind } from "./types";
import { julianDayTt } from "./time";

const JULIAN_CENTURY_DAYS = 36_525;
const J2000 = 2_451_545;
const LAHIRI_AT_J2000 = 23.85709235370888;
const LAHIRI_RATE_ARCSECONDS_PER_YEAR = 50.287965;
const LAHIRI_ACCELERATION_ARCSECONDS_PER_YEAR_SQUARED = 0.00011055;

export const KP_AYANAMSA_CONFIG = {
  KP_NEW: {
    epochJdUt: 2_461_365.0283,
    epochDegrees: 24.14222222,
    rateArcsecondsPerJulianYear: 50.2388475,
  },
  KP_OLD: {
    epochDegrees: 23.76024,
    linearArcsecondsPerCentury: 5028.796195,
    quadraticArcsecondsPerCenturySquared: 1.1054348,
  },
} as const;

export function ayanamsa(kind: AyanamsaKind, utc: Date): number {
  const jdTt = julianDayTt(utc);
  const t = (jdTt - J2000) / JULIAN_CENTURY_DAYS;

  if (kind === "kp_new") {
    const { epochJdUt, epochDegrees, rateArcsecondsPerJulianYear } = KP_AYANAMSA_CONFIG.KP_NEW;
    const jdUt = utc.getTime() / 86_400_000 + 2_440_587.5;
    return epochDegrees + rateArcsecondsPerJulianYear * (jdUt - epochJdUt) / 365.25 / 3600;
  }
  if (kind === "kp_old") {
    const config = KP_AYANAMSA_CONFIG.KP_OLD;
    return config.epochDegrees
      + (config.linearArcsecondsPerCentury * t + config.quadraticArcsecondsPerCenturySquared * t ** 2) / 3600;
  }

  const yearsSinceJ2000 = (jdTt - J2000) / 365.25;
  return LAHIRI_AT_J2000
    + (LAHIRI_RATE_ARCSECONDS_PER_YEAR * yearsSinceJ2000
      + LAHIRI_ACCELERATION_ARCSECONDS_PER_YEAR_SQUARED * yearsSinceJ2000 ** 2) / 3600;
}

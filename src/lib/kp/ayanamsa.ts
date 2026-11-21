import { julianDayUT } from "./placidus";

export type ZodiacMode = "KP_NEW" | "KP_OLD";

export const KP_AYANAMSA_CONFIG = {
  KP_NEW: {
    epochJdUt: 2461365.0283,
    epochDegrees: 24.14222222,
    rateArcsecondsPerJulianYear: 50.2388475,
  },
  KP_OLD: {
    epochDegrees: 23.760240,
    linearArcsecondsPerCentury: 5028.796195,
    quadraticArcsecondsPerCenturySquared: 1.1054348,
  },
} as const;

// TODO: confirm the KP New rate against the user's software on two additional dates.
function deltaTSeconds(year: number): number {
  const t = year - 2000;
  return 62.92 + 0.32217 * t + 0.005589 * t * t;
}

function julianDayUtAt(instant: Date): number {
  if (!Number.isFinite(instant.getTime())) throw new Error("A valid instant is required for KP ayanamsa.");
  return julianDayUT(
    `${String(instant.getUTCFullYear()).padStart(4, "0")}-${String(instant.getUTCMonth() + 1).padStart(2, "0")}-${String(instant.getUTCDate()).padStart(2, "0")}`,
    `${String(instant.getUTCHours()).padStart(2, "0")}:${String(instant.getUTCMinutes()).padStart(2, "0")}:${String(instant.getUTCSeconds()).padStart(2, "0")}`,
    0,
  );
}

export function kpAyanamsaAt(instant: Date, kind: ZodiacMode): number {
  const jdUt = julianDayUtAt(instant);

  if (kind === "KP_NEW") {
    const config = KP_AYANAMSA_CONFIG.KP_NEW;
    return config.epochDegrees
      + config.rateArcsecondsPerJulianYear * (jdUt - config.epochJdUt) / 365.25 / 3600;
  }

  const jdTt = jdUt + deltaTSeconds(instant.getUTCFullYear()) / 86400;
  const t = (jdTt - 2451545.0) / 36525;
  const config = KP_AYANAMSA_CONFIG.KP_OLD;
  return config.epochDegrees
    + (config.linearArcsecondsPerCentury * t
      + config.quadraticArcsecondsPerCenturySquared * t * t) / 3600;
}

export function formatAyanamsa(value: number): string {
  const totalHundredths = Math.round(value * 3600 * 100);
  const degrees = Math.floor(totalHundredths / 360000);
  const remaining = totalHundredths - degrees * 360000;
  const minutes = Math.floor(remaining / 6000);
  const seconds = (remaining - minutes * 6000) / 100;
  return `${degrees}°${String(minutes).padStart(2, "0")}′${seconds.toFixed(2).padStart(5, "0")}″`;
}

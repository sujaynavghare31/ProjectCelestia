// ---------------------------------------------------------------------------
// Angle / time formatting (matches the workbook's "Shown as" columns)
// ---------------------------------------------------------------------------

export const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;
export type Sign = (typeof SIGNS)[number];

/** Normalise any angle to [0, 360). */
export const norm360 = (x: number) => ((x % 360) + 360) % 360;
/** Normalise a day fraction to [0, 1). */
export const norm1 = (x: number) => ((x % 1) + 1) % 1;

/** Split a non-negative value into whole units, minutes and seconds (seconds rounded to `dp`, carry handled). */
function split(abs: number, dp: number): [number, number, number] {
  const f = 10 ** dp;
  let totalSec = Math.round(abs * 3600 * f) / f;
  let whole = Math.floor(totalSec / 3600 + 1e-12);
  totalSec -= whole * 3600;
  let min = Math.floor(totalSec / 60 + 1e-12);
  let sec = Math.round((totalSec - min * 60) * f) / f;
  if (sec >= 60) { sec -= 60; min += 1; }
  if (min >= 60) { min -= 60; whole += 1; }
  return [whole, min, sec];
}
const p2 = (n: number) => String(n).padStart(2, "0");
const sec2 = (s: number, dp: number) => s.toFixed(dp).padStart(dp ? dp + 3 : 2, "0");

/** 73.0166… -> "73° 01′ 00.00″" (negative values get a leading "-"). */
export function formatDMS(deg: number, dp = 2): string {
  const [d, m, s] = split(Math.abs(deg), dp);
  return `${deg < 0 ? "-" : ""}${d}° ${p2(m)}′ ${sec2(s, dp)}″`;
}

/** Day fraction (or hours / 24) -> "19h 45m 00.56s". */
export function formatHMS(dayFraction: number, dp = 2): string {
  const [h, m, s] = split(Math.abs(dayFraction) * 24, dp);
  return `${dayFraction < 0 ? "-" : ""}${h}h ${p2(m)}m ${sec2(s, dp)}s`;
}

export interface ZodiacPosition {
  longitude: number;     // 0..360 decimal degrees
  sign: Sign;
  signIndex: number;     // 0 = Aries
  degreeInSign: number;  // 0..30 decimal
  text: string;          // "Taurus 2° 49′ 18.06″"
}

/** Ecliptic longitude -> sign + degrees, e.g. 32.8216 -> "Taurus 2° 49′ 18.06″". */
export function zodiac(longitude: number, dp = 2): ZodiacPosition {
  const L = norm360(longitude);
  // round first so 59.999″ carries into the next degree / sign consistently
  const f = 3600 * 10 ** dp;
  const Lr = norm360(Math.round(L * f) / f);
  const signIndex = Math.floor(Lr / 30) % 12;
  const inSign = Lr - signIndex * 30;
  const [d, m, s] = split(inSign, dp);
  return { longitude: L, sign: SIGNS[signIndex], signIndex, degreeInSign: inSign, text: `${SIGNS[signIndex]} ${d}° ${p2(m)}′ ${sec2(s, dp)}″` };
}

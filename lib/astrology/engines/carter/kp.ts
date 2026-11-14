// ---------------------------------------------------------------------------
// Optional: Nakshatra, star lord, sub lord, sub-sub lord (KP / Vimshottari division)
// NOT part of the Excel workbook – provided because a Kundli page normally shows
// cusp lords next to Nirayana cusps. Pure arithmetic, no ephemeris needed.
// ---------------------------------------------------------------------------
import { norm360 } from "./format";

export const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
] as const;
/** Vimshottari order and years (total 120). */
export const DASHA_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"] as const;
export const DASHA_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17];
export const SIGN_LORDS = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"] as const;

const NAK = 360 / 27; // 13°20′

/** Divide `span` degrees starting with lord index `start` in Vimshottari proportions; return [lord index, offset inside it, its span]. */
function subdivide(pos: number, span: number, start: number): [number, number, number] {
  let acc = 0;
  for (let i = 0; i < 9; i++) {
    const idx = (start + i) % 9;
    const w = (span * DASHA_YEARS[idx]) / 120;
    if (pos < acc + w || i === 8) return [idx, pos - acc, w];
    acc += w;
  }
  throw new Error("unreachable");
}

export interface KpLords {
  signLord: string;
  nakshatra: string;
  pada: number;      // 1..4
  starLord: string;
  subLord: string;
  subSubLord: string;
}

/** KP lords for a SIDEREAL (Nirayana) longitude. */
export function kpLords(siderealLongitude: number): KpLords {
  const L = norm360(siderealLongitude);
  const n = Math.min(26, Math.floor(L / NAK));
  const inNak = L - n * NAK;
  const star = n % 9;
  const [sub, inSub, subSpan] = subdivide(inNak, NAK, star);
  const [subSub] = subdivide(inSub, subSpan, sub);
  return {
    signLord: SIGN_LORDS[Math.floor(L / 30) % 12],
    nakshatra: NAKSHATRAS[n],
    pada: Math.min(4, Math.floor(inNak / (NAK / 4)) + 1),
    starLord: DASHA_LORDS[star],
    subLord: DASHA_LORDS[sub],
    subSubLord: DASHA_LORDS[subSub],
  };
}

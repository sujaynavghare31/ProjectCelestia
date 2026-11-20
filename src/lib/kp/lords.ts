// Sign / Star / Sub / Sub-sub lords (KP 249-division logic, computed exactly — no lookup table needed)
import { DASHA_ORDER, DASHA_YEARS, NAK_SPAN, NAKSHATRAS, SIGN_LORD, SIGNS, norm360, type Graha } from "./constants";

export interface KpLords {
  longitude: number;
  signIndex: number;
  sign: (typeof SIGNS)[number];
  degreeInSign: number;
  nakshatraIndex: number;
  nakshatra: (typeof NAKSHATRAS)[number];
  pada: number;
  signLord: Graha;
  starLord: Graha;
  subLord: Graha;
  subSubLord: Graha;
}

const EPS = 1e-9;
/** Split `span` degrees into 9 Vimshottari parts starting from `first`; return the lord whose part contains `pos` and the part's start/length. */
function vimshottariPart(first: Graha, span: number, pos: number) {
  const start = DASHA_ORDER.indexOf(first);
  let acc = 0;
  for (let k = 0; k < 9; k++) {
    const lord = DASHA_ORDER[(start + k) % 9];
    const len = (span * DASHA_YEARS[lord]) / 120;
    if (pos < acc + len - EPS || k === 8) return { lord, start: acc, length: len };
    acc += len;
  }
  throw new Error("unreachable");
}

export function kpLords(longitude: number): KpLords {
  const L = norm360(longitude);
  const signIndex = Math.floor(L / 30 + EPS) % 12;
  const nak = Math.min(26, Math.floor(L / NAK_SPAN + EPS));
  const inNak = Math.max(0, L - nak * NAK_SPAN);
  const starLord = DASHA_ORDER[nak % 9];
  const sub = vimshottariPart(starLord, NAK_SPAN, inNak);
  const ssl = vimshottariPart(sub.lord, sub.length, inNak - sub.start);
  return {
    longitude: L, signIndex, sign: SIGNS[signIndex], degreeInSign: L - signIndex * 30,
    nakshatraIndex: nak, nakshatra: NAKSHATRAS[nak], pada: Math.min(4, Math.floor(inNak / (10 / 3) + EPS) + 1),
    signLord: SIGN_LORD[signIndex], starLord, subLord: sub.lord, subSubLord: ssl.lord,
  };
}

/** 47.0706 → "17° 4′ 14.02″" (degrees inside the sign). */
export function dmsInSign(longitude: number, dp = 2): string {
  const d = norm360(longitude) % 30;
  const f = 10 ** dp;
  let total = Math.round(d * 3600 * f) / f;
  let deg = Math.floor(total / 3600 + 1e-12); total -= deg * 3600;
  let min = Math.floor(total / 60 + 1e-12); let sec = Math.round((total - min * 60) * f) / f;
  if (sec >= 60) { sec -= 60; min += 1; }
  if (min >= 60) { min -= 60; deg += 1; }
  return `${deg}° ${min}′ ${sec.toFixed(dp)}″`;
}
/** sign index + degrees + minutes + seconds → longitude */
export const fromSignDMS = (signIndex: number, d: number, m: number, s: number) => signIndex * 30 + d + m / 60 + s / 3600;

// ---------------------------------------------------------------------------
// Own astronomy (no ephemeris files): Meeus Sun & Moon, Schlyter planets (+Jupiter/Saturn perturbations),
// nodes, nutation, Ascendant, ayanamsa. Accuracy ±1–2′ for 1800–2100 — enough for Kundli Milan.
// Same formulas as the Excel workbook (Calc_Boy / Calc_Girl sheets).
// ---------------------------------------------------------------------------
import { ELEMENTS, MOON_TERMS } from "./astroData";

const RAD = Math.PI / 180;
const sin = (d: number) => Math.sin(d * RAD), cos = (d: number) => Math.cos(d * RAD), tan = (d: number) => Math.tan(d * RAD);
export const norm360 = (x: number) => ((x % 360) + 360) % 360;
const atan2d = (y: number, x: number) => Math.atan2(y, x) / RAD;
const wrap180 = (x: number) => norm360(x + 180) - 180;

export const AYANAMSAS = {
  "Lahiri (Chitrapaksha)": 23.857092, "Krishnamurti (KP)": 23.760240, "Raman": 22.410791, "Sri Yukteshwar": 22.478803, "J.N. Bhasin": 22.762137,
  "Fagan-Bradley": 24.740300, "Usha-Shashi": 20.057541, "Djwhal Khul": 28.359679, "Tropical (Sayana = 0)": 0,
} as const;
export type AyanamsaName = keyof typeof AYANAMSAS;

/** Julian Day (UT) for a Gregorian local date/time (Meeus ch.7 — works for any year). */
export function julianDayUT(date: string, time: string, tzHours: number): number {
  let [Y, M, D] = date.split("-").map(Number);
  const [h, mi, s = 0] = time.split(":").map(Number);
  if (M <= 2) { Y -= 1; M += 12; }
  const A = Math.floor(Y / 100), Bg = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + Bg - 1524.5 + (h + mi / 60 + s / 3600 - tzHours) / 24;
}
/** ΔT = TT − UT in seconds (NASA / Espenak–Meeus polynomials). */
export function deltaT(year: number, month: number): number {
  const y = year + (month - 0.5) / 12;
  if (y < 1900) return -2.79;
  if (y < 1920) { const t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
  if (y < 1941) { const t = y - 1920; return 21.2 + 0.84493 * t - 0.0761 * t ** 2 + 0.0020936 * t ** 3; }
  if (y < 1961) { const t = y - 1950; return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547; }
  if (y < 1986) { const t = y - 1975; return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718; }
  if (y < 2005) { const t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
  if (y < 2050) { const t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t ** 2; }
  return -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y);
}

function sun(T: number) {
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T), M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) + (0.019993 - 0.000101 * T) * sin(2 * M) + 0.000289 * sin(3 * M);
  const lon = norm360(L0 + C), v = M + C, R = (1.000001018 * (1 - e * e)) / (1 + e * cos(v)), om = 125.04 - 1934.136 * T;
  return { lon, R, apparent: norm360(lon - 0.00569 - 0.00478 * sin(om)) };
}
function moon(T: number) {
  const Lp = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T ** 3 / 538841);
  const D = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T ** 3 / 545868);
  const M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T);
  const Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T ** 3 / 69699);
  const Fa = norm360(93.272095 + 483202.0175233 * T - 0.0036539 * T * T);
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  let sum = 0;
  for (const [c, d, m, mp, f] of MOON_TERMS) sum += c * (m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E) * sin(d * D + m * M + mp * Mp + f * Fa);
  sum += 0.003958 * sin(119.75 + 131.849 * T) + 0.001962 * sin(Lp - Fa) + 0.000318 * sin(53.09 + 479264.29 * T);
  const meanNode = norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T ** 3 / 467441);
  const trueNode = norm360(meanNode - 1.4979 * sin(2 * (D - Fa)) - 0.15 * sin(M) - 0.1226 * sin(2 * D) + 0.1176 * sin(2 * Fa) - 0.0801 * sin(2 * (Mp - Fa)));
  return { lon: norm360(Lp + sum), meanNode, trueNode };
}
type PlanetName = keyof typeof ELEMENTS;
function planetGeo(name: PlanetName, d: number, sunLon: number, sunR: number) {
  const [N0, N1, i0, i1, w0, w1, a, e0, e1, M0, M1] = ELEMENTS[name];
  const N = N0 + N1 * d, i = i0 + i1 * d, w = w0 + w1 * d, e = e0 + e1 * d, M = norm360(M0 + M1 * d);
  let E = M + (e / RAD) * sin(M) * (1 + e * cos(M));
  for (let k = 0; k < 4; k++) E = E - (E - (e / RAD) * sin(E) - M) / (1 - e * cos(E));
  const xv = a * (cos(E) - e), yv = a * Math.sqrt(1 - e * e) * sin(E), v = atan2d(yv, xv), r = Math.hypot(xv, yv);
  const xh = r * (cos(N) * cos(v + w) - sin(N) * sin(v + w) * cos(i)), yh = r * (sin(N) * cos(v + w) + cos(N) * sin(v + w) * cos(i)), zh = r * sin(v + w) * sin(i);
  let lon = atan2d(yh, xh), lat = atan2d(zh, Math.hypot(xh, yh));
  const Mj = norm360(19.895 + 0.0830853001 * d), Ms = norm360(316.967 + 0.0334442282 * d);
  if (name === "Jupiter") lon += -0.332 * sin(2 * Mj - 5 * Ms - 67.6) - 0.056 * sin(2 * Mj - 2 * Ms + 21) + 0.042 * sin(3 * Mj - 5 * Ms + 21) - 0.036 * sin(Mj - 2 * Ms)
    + 0.022 * cos(Mj - Ms) + 0.023 * sin(2 * Mj - 3 * Ms + 52) - 0.016 * sin(Mj - 5 * Ms - 69);
  if (name === "Saturn") {
    lon += 0.812 * sin(2 * Mj - 5 * Ms - 67.6) - 0.229 * cos(2 * Mj - 4 * Ms - 2) + 0.119 * sin(Mj - 2 * Ms - 3) + 0.046 * sin(2 * Mj - 6 * Ms - 69) + 0.014 * sin(Mj - 3 * Ms + 32);
    lat += -0.02 * cos(2 * Mj - 4 * Ms - 2) + 0.018 * sin(2 * Mj - 6 * Ms - 49);
  }
  const xg = r * cos(lon) * cos(lat) + sunR * cos(sunLon), yg = r * sin(lon) * cos(lat) + sunR * sin(sunLon), zg = r * sin(lat);
  return { lon: norm360(atan2d(yg, xg)), dist: Math.hypot(xg, yg, zg) };
}

export interface BirthInput {
  date: string; time: string;           // local "YYYY-MM-DD", "HH:MM[:SS]"
  tzHours: number; latitude: number; longitude: number;
  ayanamsa?: AyanamsaName | number;     // name or J2000 value; default Lahiri
  node?: "true" | "mean";
}
export const GRAHA_NAMES = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu", "Ascendant"] as const;
export type GrahaName = (typeof GRAHA_NAMES)[number];

/** Sidereal positions (degrees) + speeds for a birth. */
export function computePositions(b: BirthInput) {
  const jdUT = julianDayUT(b.date, b.time, b.tzHours);
  const [Y, Mo] = b.date.split("-").map(Number);
  const jdTT = jdUT + deltaT(Y, Mo) / 86400;
  const T = (jdTT - 2451545) / 36525, TU = (jdUT - 2451545) / 36525, d = jdTT - 2451543.5;
  const om = 125.04452 - 1934.136261 * T, Ls = 280.4665 + 36000.7698 * T, Lm = 218.3165 + 481267.8813 * T;
  const dpsi = (-17.2 * sin(om) - 1.32 * sin(2 * Ls) - 0.23 * sin(2 * Lm) + 0.21 * sin(2 * om)) / 3600;
  const deps = (9.2 * cos(om) + 0.57 * cos(2 * Ls) + 0.1 * cos(2 * Lm) - 0.09 * cos(2 * om)) / 3600;
  const eps = 23.439291111 - 0.013004167 * T - 0.0000001639 * T * T + 0.0000005036 * T ** 3 + deps;
  const gmst = norm360(280.46061837 + 360.98564736629 * (jdUT - 2451545) + 0.000387933 * TU * TU - TU ** 3 / 38710000);
  const ramc = norm360(gmst + dpsi * cos(eps) + b.longitude);
  const asc = norm360(atan2d(cos(ramc), -(sin(ramc) * cos(eps) + tan(b.latitude) * sin(eps))));
  const ay0 = typeof b.ayanamsa === "number" ? b.ayanamsa : AYANAMSAS[b.ayanamsa ?? "Lahiri (Chitrapaksha)"];
  const ayan = ay0 === 0 ? 0 : ay0 + (5028.796195 * T + 1.1054348 * T * T) / 3600 + dpsi;

  const at = (dd: number) => {
    const TT = T + dd / 36525, s = sun(TT), m = moon(TT);
    const pl = Object.fromEntries((Object.keys(ELEMENTS) as PlanetName[]).map((n) => [n, planetGeo(n, d + dd, s.lon, s.R)])) as Record<PlanetName, { lon: number; dist: number }>;
    return { s, m, pl };
  };
  const p0 = at(0), p1 = at(1);
  const trop: Record<GrahaName, number> = {} as Record<GrahaName, number>;
  const speed: Record<GrahaName, number> = {} as Record<GrahaName, number>;
  trop.Sun = p0.s.apparent; speed.Sun = wrap180(p1.s.apparent - p0.s.apparent);
  trop.Moon = norm360(p0.m.lon + dpsi); speed.Moon = wrap180(p1.m.lon - p0.m.lon);
  for (const n of Object.keys(ELEMENTS) as PlanetName[]) {
    const sp = wrap180(p1.pl[n].lon - p0.pl[n].lon);
    trop[n] = norm360(p0.pl[n].lon - sp * 0.0057755183 * p0.pl[n].dist - (20.49552 / 3600) * cos(p0.s.lon - p0.pl[n].lon) + dpsi);
    speed[n] = sp;
  }
  const node0 = b.node === "mean" ? p0.m.meanNode : p0.m.trueNode, node1 = b.node === "mean" ? p1.m.meanNode : p1.m.trueNode;
  trop.Rahu = norm360(node0 + dpsi); trop.Ketu = norm360(node0 + 180 + dpsi); speed.Rahu = speed.Ketu = wrap180(node1 - node0);
  trop.Ascendant = asc; speed.Ascendant = 0;
  const sidereal = Object.fromEntries(GRAHA_NAMES.map((g) => [g, norm360(trop[g] - ayan)])) as Record<GrahaName, number>;
  return { sidereal, tropical: trop, speed, ayanamsa: ayan, jdUT, deltaT: deltaT(Y, Mo) };
}

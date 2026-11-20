// Placidus house cusps (KP standard) from birth data — pure math, no ephemeris needed.
import { norm360 } from "./constants";

const RAD = Math.PI / 180;
const sin = (d: number) => Math.sin(d * RAD), cos = (d: number) => Math.cos(d * RAD), tan = (d: number) => Math.tan(d * RAD);
const atan2d = (y: number, x: number) => norm360(Math.atan2(y, x) / RAD);

export interface BirthMoment {
  date: string;        // "YYYY-MM-DD" local
  time: string;        // "HH:MM[:SS]" local
  tzHours: number;     // east +, e.g. 5.5
  latitude: number;    // north +
  longitude: number;   // east +
}

/** Julian Day (UT) of a local date/time. */
export function julianDayUT(date: string, time: string, tzHours: number): number {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi, s = 0] = time.split(":").map(Number);
  return Date.UTC(y, mo - 1, d, h, mi, s) / 86400000 + 2440587.5 - tzHours / 24;
}
/** UTC epoch milliseconds of a local date/time. */
export const utcMillis = (date: string, time: string, tzHours: number) => (julianDayUT(date, time, tzHours) - 2440587.5) * 86400000;

/** Mean obliquity of the ecliptic (IAU 1980), degrees. */
export const obliquity = (jdUT: number) => { const T = (jdUT - 2451545) / 36525; return 23.439291111 - 0.013004167 * T - 1.639e-7 * T * T + 5.036e-7 * T ** 3; };
/** RAMC (local sidereal time in degrees). */
export function ramc(jdUT: number, eastLongitude: number): number {
  const T = (jdUT - 2451545) / 36525;
  const gmst = 280.46061837 + 360.98564736629 * (jdUT - 2451545) + 0.000387933 * T * T - (T ** 3) / 38710000;
  return norm360(gmst + eastLongitude);
}
const lonFromRA = (ra: number, eps: number) => atan2d(sin(ra), cos(ra) * cos(eps));

/** 12 TROPICAL Placidus cusps (house 1..12). */
export function placidusTropical(ramcDeg: number, latitude: number, eps: number): number[] {
  if (Math.abs(latitude) >= 66) throw new Error("Placidus is undefined near the polar circles");
  const asc = atan2d(cos(ramcDeg), -(sin(ramcDeg) * cos(eps) + tan(latitude) * sin(eps)));
  const mc = atan2d(sin(ramcDeg), cos(ramcDeg) * cos(eps));
  // cusp 11/12 trisect the diurnal semi-arc, cusp 2/3 the nocturnal one — iterate on the cusp's own declination
  const cusp = (f: number, above: boolean) => {
    let lon = norm360(mc + (above ? 30 * f * 3 : 180 - 30 * f * 3));
    for (let k = 0; k < 30; k++) {
      const dec = Math.asin(sin(eps) * sin(lon)) / RAD;
      const x = tan(latitude) * tan(dec);
      const ad = Math.asin(Math.max(-1, Math.min(1, x))) / RAD;   // ascensional difference
      const ra = above ? ramcDeg + f * (90 + ad) : ramcDeg + 180 - f * (90 - ad);
      const next = lonFromRA(norm360(ra), eps);
      if (Math.abs(norm360(next - lon + 180) - 180) < 1e-10) { lon = next; break; }
      lon = next;
    }
    return lon;
  };
  const c11 = cusp(1 / 3, true), c12 = cusp(2 / 3, true), c2 = cusp(2 / 3, false), c3 = cusp(1 / 3, false);
  const t = [asc, c2, c3, norm360(mc + 180), norm360(c11 + 180), norm360(c12 + 180),
             norm360(asc + 180), norm360(c2 + 180), norm360(c3 + 180), mc, c11, c12];
  return t;
}

/** Geocentric latitude from geographic (geodetic) latitude — classical KP tables/software use this for house cusps. */
export const geocentricLatitude = (lat: number) => lat - (692.74 * sin(2 * lat) - 1.16 * sin(4 * lat)) / 3600;

export interface CuspOptions {
  /** true (default) = use geocentric latitude, as KP softwares do (matches them within ~0.2′). false = geographic latitude (Swiss Ephemeris style). */
  geocentricLatitude?: boolean;
}
/** 12 SIDEREAL (nirayana) KP cusps for a birth moment and ayanamsa (degrees, e.g. KP New). */
export function kpCusps(b: BirthMoment, ayanamsa: number, opts: CuspOptions = {}): number[] {
  const jd = julianDayUT(b.date, b.time, b.tzHours);
  const lat = (opts.geocentricLatitude ?? true) ? geocentricLatitude(b.latitude) : b.latitude;
  return placidusTropical(ramc(jd, b.longitude), lat, obliquity(jd)).map((c) => norm360(c - ayanamsa));
}

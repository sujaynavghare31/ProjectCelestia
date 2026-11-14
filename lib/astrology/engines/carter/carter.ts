// ---------------------------------------------------------------------------
// Birth details → RAMC → MC / Ascendant → Carter (Poli-Equatorial) house cusps
// Port of Birth_to_Carter_Cusps_v2.xlsx (sheet "Birth to Cusps").
// Pure, synchronous, no dependencies. Angles in decimal degrees, time in day fractions.
// ---------------------------------------------------------------------------
import { formatDMS, formatHMS, norm1, norm360, zodiac, type ZodiacPosition } from "./format";
import { kpLords, type KpLords } from "./kp";

const RAD = Math.PI / 180;
const sin = (d: number) => Math.sin(d * RAD), cos = (d: number) => Math.cos(d * RAD), tan = (d: number) => Math.tan(d * RAD);
/** atan2 in degrees, normalised 0..360. NOTE: JS Math.atan2(y, x) – Excel ATAN2(x, y) has the arguments the other way round. */
const atan2deg = (y: number, x: number) => norm360(Math.atan2(y, x) / RAD);

export interface CarterInput {
  /** Birth date (local civil date) "YYYY-MM-DD" */
  date: string;
  /** Birth time (local clock time) "HH:MM" or "HH:MM:SS" */
  time: string;
  /** Hours from GMT, east positive (IST = 5.5, New York = -5). Add +1 yourself if DST / war time applied. */
  tzHours: number;
  /** Decimal degrees, EAST positive (west negative). */
  longitude: number;
  /** Decimal degrees, NORTH positive (south negative). */
  latitude: number;
  /** Sidereal time at 0h GMT from an ephemeris, as a day fraction (optional – otherwise calculated). */
  siderealTime0hOverride?: number | null;
  /** Ayanamsa in decimal degrees (optional – otherwise mean Lahiri polynomial). Pass the portal's Swiss Ephemeris value to stay consistent. */
  ayanamsaOverride?: number | null;
  /** Obliquity in decimal degrees (optional – otherwise the workbook's linear formula). */
  obliquityOverride?: number | null;
  /** Include KP nakshatra / star / sub lords for the Nirayana cusps (default true). */
  withKpLords?: boolean;
  /**
   * When LMT falls on the previous/next calendar day (e.g. 00:15 IST in Mumbai → LMT 23:36 previous day),
   * use that day's sidereal time. The workbook does NOT do this (it wraps the time only), which shifts RAMC by
   * ~3m56s ≈ 1°. Default true (correct). Set false to reproduce the spreadsheet exactly.
   */
  fixLmtDayRollover?: boolean;
}

export interface CuspRow {
  house: number;
  /** RA of cusp = RA(Asc) + (n−1)×30 */
  ra: number;
  sayana: ZodiacPosition;
  /** Method A: Sayana cusp − ayanamsa (standard; same as Swiss Ephemeris sidereal houses) */
  nirayanaA: ZodiacPosition;
  /** RA used by Method B = RA(Asc) − ayanamsa + (n−1)×30 */
  raB: number;
  /** Method B: ecliptic longitude of RA(Asc) − ayanamsa + (n−1)×30 */
  nirayanaB: ZodiacPosition;
  kpA?: KpLords;
  kpB?: KpLords;
}

function parseDate(s: string) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s.trim());
  if (!m) throw new Error(`Invalid date "${s}" (YYYY-MM-DD)`);
  return { y: +m[1], m: +m[2], d: +m[3] };
}
function parseTime(s: string) {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?$/.exec(s.trim());
  if (!m) throw new Error(`Invalid time "${s}" (HH:MM[:SS])`);
  const h = +m[1], mi = +m[2], se = m[3] ? +m[3] : 0;
  if (h > 23 || mi > 59 || se >= 60) throw new Error(`Invalid time "${s}"`);
  return (h * 3600 + mi * 60 + se) / 86400;
}
/** Days from J2000.0 (JD 2451545.0) to 0h UT of the given calendar date. */
export function daysFromJ2000At0h(y: number, m: number, d: number): number {
  return Date.UTC(y, m - 1, d) / 86400000 + 2440587.5 - 2451545;
}
/** Greenwich mean sidereal time at 0h UT, as a day fraction (Meeus 12.4 without the T³ term – as in the workbook). */
export function gmst0h(daysJ2000: number): number {
  const T = daysJ2000 / 36525;
  return norm360(280.46061837 + 360.98564736629 * daysJ2000 + 0.000387933 * T * T) / 360;
}
/** Mean Lahiri (Chitrapaksha) ayanamsa – polynomial used by the workbook (fit to Swiss Ephemeris, < 1″ for 1850–2150). */
export function lahiriMean(daysJ2000UT: number): number {
  const T = daysJ2000UT / 36525;
  return 23.8570924 + 1.39688796 * T + 0.00030709 * T * T;
}
/** Mean obliquity, workbook formula: 23°27′08″ − 0.0001321388 × (year − 1900). */
export const obliquityOf = (year: number) => 23 + 27 / 60 + 8 / 3600 - 0.0001321388 * (year - 1900);

/** Ecliptic longitude of the ecliptic point with right ascension `ra` (both degrees). */
export const longitudeFromRA = (ra: number, eps: number) => atan2deg(sin(ra), cos(ra) * cos(eps));
/** Right ascension of an ecliptic point at longitude `lon` (latitude 0). */
export const raFromLongitude = (lon: number, eps: number) => atan2deg(sin(lon) * cos(eps), cos(lon));

export function carterCusps(input: CarterInput) {
  const { y, m, d } = parseDate(input.date);
  const birth = parseTime(input.time);
  const tz = input.tzHours, lon = input.longitude, lat = input.latitude;
  if (Math.abs(lat) >= 66.5) throw new Error("Latitude beyond polar circles – Ascendant is undefined/unstable");
  if (Math.abs(lon) > 180) throw new Error("Longitude must be −180..180");
  const fix = input.fixLmtDayRollover ?? true;

  // ---------- STEP 1: birth time → RAMC ----------
  const stdMeridian = tz * 15;
  const timeDiff = (lon - stdMeridian) / 15 / 24;          // days; negative = subtract
  const lmtRaw = birth + timeDiff;
  const lmt = norm1(lmtRaw);
  const dayShift = fix ? Math.floor(lmtRaw) : 0;           // −1 / 0 / +1
  const gmt = norm1(birth - tz / 24);
  const days0 = daysFromJ2000At0h(y, m, d) + dayShift;
  const gst0Calc = gmst0h(days0);
  const gst0 = input.siderealTime0hOverride ?? gst0Calc;
  const placeCorr = (-lon / 15 * 9.8565) / 86400;           // East: subtract, West: add
  const bplst = norm1(gst0 + placeCorr);
  const lmtSid = lmt * 1.002738;
  const ramcDay = norm1(lmtSid + bplst);
  const ramc = ramcDay * 360;

  // ---------- STEP 2: RAMC → MC, Ascendant ----------
  const eps = input.obliquityOverride ?? obliquityOf(y);
  const mc = atan2deg(sin(ramc), cos(ramc) * cos(eps));
  const asc = atan2deg(cos(ramc), -(sin(ramc) * cos(eps) + tan(lat) * sin(eps)));
  const raAsc = raFromLongitude(asc, eps);
  const ayanCalc = lahiriMean(daysFromJ2000At0h(y, m, d) + birth - tz / 24);
  const ayan = input.ayanamsaOverride ?? ayanCalc;
  const raAscMinusAyan = norm360(raAsc - ayan);

  // ---------- STEP 3: Carter cusps ----------
  const withKp = input.withKpLords ?? true;
  const cusps: CuspRow[] = [];
  for (let n = 1; n <= 12; n++) {
    const ra = norm360(raAsc + (n - 1) * 30);
    const say = longitudeFromRA(ra, eps);
    const raB = norm360(raAscMinusAyan + (n - 1) * 30);
    const nb = longitudeFromRA(raB, eps);
    const row: CuspRow = { house: n, ra, sayana: zodiac(say), nirayanaA: zodiac(say - ayan), raB, nirayanaB: zodiac(nb) };
    if (withKp) { row.kpA = kpLords(say - ayan); row.kpB = kpLords(nb); }
    cusps.push(row);
  }

  return {
    input: { ...input, fixLmtDayRollover: fix },
    step1: {
      longitude: { value: lon, text: formatDMS(lon) },
      latitude: { value: lat, text: formatDMS(lat) },
      standardMeridian: { value: stdMeridian, text: formatDMS(stdMeridian) },
      timeDifference: { value: timeDiff, text: formatHMS(timeDiff) },
      lmt: { value: lmt, text: formatHMS(lmt), dayShift: Math.floor(lmtRaw) },
      gmt: { value: gmt, text: formatHMS(gmt) },
      siderealTime0hCalculated: { value: gst0Calc, text: formatHMS(gst0Calc) },
      siderealTime0hUsed: { value: gst0, text: formatHMS(gst0) },
      placeCorrection: { value: placeCorr, text: formatHMS(placeCorr) },
      bplst: { value: bplst, text: formatHMS(bplst) },
      lmtSidereal: { value: lmtSid, text: formatHMS(lmtSid) },
      ramc: { value: ramc, hms: formatHMS(ramcDay), text: formatDMS(ramc) },
    },
    step2: {
      obliquity: { value: eps, text: formatDMS(eps) },
      mc: zodiac(mc),
      ascendant: zodiac(asc),
      raAscendant: { value: raAsc, text: formatDMS(raAsc) },
      ayanamsaCalculated: { value: ayanCalc, text: formatDMS(ayanCalc) },
      ayanamsa: { value: ayan, text: formatDMS(ayan), source: input.ayanamsaOverride != null ? "override" : "Lahiri (mean, polynomial)" },
      nirayanaAscendant: zodiac(asc - ayan),
      nirayanaMC: zodiac(mc - ayan),
      raAscMinusAyanamsa: { value: raAscMinusAyan, text: formatDMS(raAscMinusAyan) },
    },
    cusps,
    notes: [
      "Sayana = tropical; Nirayana = tropical − ayanamsa.",
      "Cusp 1 = Ascendant. In Carter's system cusp 10 is generally NOT the MC.",
      "Method A (standard, as Swiss Ephemeris): cusps computed tropically, then ayanamsa subtracted from each cusp.",
      "Method B: ayanamsa subtracted from the RA of the Ascendant, then 30° RA steps converted to longitude.",
    ],
  };
}
export type CarterResult = ReturnType<typeof carterCusps>;

/**
 * House (1..12) containing ecliptic longitude `lambda`, given the 12 cusp longitudes in house order
 * (same zodiac for both – e.g. planet Nirayana λ with nirayanaA cusps). A planet exactly on a cusp belongs to that house.
 */
export function houseOf(lambda: number, cuspLongitudes: number[]): number {
  if (cuspLongitudes.length !== 12) throw new Error("need 12 cusps");
  const L = norm360(lambda);
  for (let h = 0; h < 12; h++) {
    const start = norm360(cuspLongitudes[h]), end = norm360(cuspLongitudes[(h + 1) % 12]);
    const span = norm360(end - start), off = norm360(L - start);
    if (off < span || span === 0) return h + 1;
  }
  return 12; // unreachable for valid cusps
}

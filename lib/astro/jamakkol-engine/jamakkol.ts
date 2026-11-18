// ---------------------------------------------------------------------------
// Jamakkol Prasannam engine – port of Jamakkol_Prasannam.xlsx
// Jama grahas, Udayam, Aarudam, Kavippu, gochara, panchang, South-Indian chart boxes.
// Pure TypeScript, no dependencies. Times are local; angles sidereal (Lahiri) degrees.
// ---------------------------------------------------------------------------

export const SIGNS = ["Mesham (Aries)", "Rishabam (Taurus)", "Mithunam (Gemini)", "Kadagam (Cancer)", "Simmam (Leo)", "Kanni (Virgo)",
  "Thulam (Libra)", "Viruchigam (Scorpio)", "Dhanusu (Sagittarius)", "Makaram (Capricorn)", "Kumbam (Aquarius)", "Meenam (Pisces)"] as const;
export const TAMIL_MONTHS = ["Chithirai", "Vaikasi", "Aani", "Aadi", "Aavani", "Purattasi", "Aippasi", "Karthigai", "Margazhi", "Thai", "Maasi", "Panguni"];
export const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
  "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
  "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
const T15 = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"];
export const TITHIS = [...T15.map((t) => `Shukla ${t}`), "Purnima", ...T15.map((t) => `Krishna ${t}`), "Amavasya"];
export const YOGAS = ["Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva",
  "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"];
const KAR7 = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti"];
export const KARANAS = ["Kimstughna", ...Array.from({ length: 56 }, (_, i) => KAR7[i % 7]), "Shakuni", "Chatushpada", "Naga"];
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_LORD = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
/** Fixed order of the 8 Jama grahas; each next one stands 45° behind the previous. */
export const JAMA_ORDER = ["Sun", "Mars", "Jupiter", "Mercury", "Venus", "Saturn", "Moon", "Pambu (Rahu)"] as const;
export const JAMA_SHORT = ["Su", "Ma", "Ju", "Me", "Ve", "Sa", "Mo", "Pa"];
/** Exaltation sign index (0 = Aries) used for the "↑" flag. */
export const JAMA_EXALT = [0, 9, 3, 5, 11, 6, 1, 1];
const HORA_ORDER = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"];
const RAHU_PART = [8, 2, 7, 5, 6, 4, 3], YAMA_PART = [5, 4, 3, 2, 1, 7, 6], GULIKA_PART = [7, 6, 5, 4, 3, 2, 1];
/** Kavippu veedi (0 Mesha, 1 Rishaba, 2 Mithuna) by the Sun's sidereal sign. */
const VEEDI = [1, 0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 1];
/** South-Indian layout: sign index per grid cell, null = centre. */
export const SOUTH_INDIAN_GRID: (number | null)[][] = [[11, 0, 1, 2], [10, null, null, 3], [9, null, null, 4], [8, 7, 6, 5]];
/** Chart category colors. */
export const COLORS = {
  jama: { text: "#963D5D", bg: "#F8EAF0" },
  gochara: { text: "#176B68", bg: "#E6F2EF" },
  upagraha: { text: "#654D91", bg: "#F0EBF7" },
  points: { text: "#8B5E12", bg: "#F8F0D9" },
  sign: { text: "#526A63", bg: "#EEF2ED" },
  border: "#3D685F",
};

// ----------------------------- helpers -----------------------------
const RAD = Math.PI / 180;
const sin = (d: number) => Math.sin(d * RAD), cos = (d: number) => Math.cos(d * RAD), tan = (d: number) => Math.tan(d * RAD);
export const norm360 = (x: number) => ((x % 360) + 360) % 360;
const mod = (a: number, n: number) => ((a % n) + n) % n;
/** Excel-style serial day for a calendar date (local). */
const serial = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000; };
const weekdayOf = (iso: string, offsetDays = 0) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + offsetDays)).getUTCDay(); };
export const hmsToFrac = (t: string) => { const [h, m, s] = t.split(":").map(Number); return (h * 3600 + m * 60 + (s || 0)) / 86400; };
export const fracToHM = (f: number) => { const mins = Math.floor(mod(f, 1) * 1440 + 1e-7); return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`; };
const EPS = 1e-7;   // absorbs binary float noise so exact values (e.g. 24.3°) are not floored to the second below
const ff = (x: number) => Math.floor(x + EPS);
const degMin = (lon: number) => { const d = lon % 30; return `${ff(d)}°${String(ff(mod(d * 60, 60)) % 60).padStart(2, "0")}′`; };
export const dms = (lon: number) => { const d = lon % 30; return `${ff(d)}° ${String(ff(mod(d * 60, 60)) % 60).padStart(2, "0")}′ ${String(ff(mod(d * 3600, 60)) % 60).padStart(2, "0")}″`; };
export const nakshatraPada = (lon: number) => {
  const n = Math.min(26, ff((lon * 3) / 40)), within = lon - (n * 40) / 3;
  return `${NAKSHATRAS[n]}-${Math.min(4, ff((within * 3) / 10)) + 1}`;
};

// ----------------------------- sunrise / sunset (NOAA) -----------------------------
export function sunriseSunset(iso: string, lat: number, lon: number, tz: number) {
  const jd = serial(iso) + 0.5 - tz / 24 + 2415018.5, T = (jd - 2451545) / 36525;
  const L0 = mod(280.46646 + T * (36000.76983 + T * 0.0003032), 360);
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = sin(M) * (1.914602 - T * (0.004817 + 0.000014 * T)) + sin(2 * M) * (0.019993 - 0.000101 * T) + sin(3 * M) * 0.000289;
  const app = L0 + C - 0.00569 - 0.00478 * sin(125.04 - 1934.136 * T);
  const ob = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * cos(125.04 - 1934.136 * T);
  const dec = Math.asin(sin(ob) * sin(app)) / RAD;
  const y = tan(ob / 2) ** 2;
  const eot = 4 * (y * sin(2 * L0) - 2 * e * sin(M) + 4 * e * y * sin(M) * cos(2 * L0) - 0.5 * y * y * sin(4 * L0) - 1.25 * e * e * sin(2 * M)) / RAD;
  const ha = Math.acos(cos(90.833) / (cos(lat) * cos(dec)) - tan(lat) * tan(dec)) / RAD;
  const noon = (720 - 4 * lon - eot + tz * 60) / 1440;
  return { sunrise: noon - (ha * 4) / 1440, sunset: noon + (ha * 4) / 1440 };
}

// ----------------------------- low-precision Sun / Moon / node -----------------------------
export function lahiri(dJ: number) { const t = dJ / 36525; return 23.8570924 + 1.39688796 * t + 0.00030709 * t * t; }
export function sunTropical(dJ: number) {
  const L = mod(280.46 + 0.9856474 * dJ, 360), g = mod(357.528 + 0.9856003 * dJ, 360);
  return mod(L + 1.915 * sin(g) + 0.02 * sin(2 * g), 360);
}
export function moonTropical(dJ: number) {
  const L = mod(218.3165 + 13.17639648 * dJ, 360), Mm = mod(134.9634 + 13.06499295 * dJ, 360), D = mod(297.8502 + 12.19074912 * dJ, 360);
  const Fm = mod(93.2721 + 13.2293505 * dJ, 360), Ms = mod(357.5291 + 0.98560028 * dJ, 360);
  return mod(L + 6.288774 * sin(Mm) + 1.274027 * sin(2 * D - Mm) + 0.658314 * sin(2 * D) + 0.213618 * sin(2 * Mm) - 0.185116 * sin(Ms)
    - 0.114332 * sin(2 * Fm) + 0.058793 * sin(2 * D - 2 * Mm) + 0.057066 * sin(2 * D - Ms - Mm) + 0.053322 * sin(2 * D + Mm)
    + 0.045758 * sin(2 * D - Ms) - 0.040923 * sin(Ms - Mm) - 0.03472 * sin(D) - 0.030383 * sin(Ms + Mm) + 0.015327 * sin(2 * D - 2 * Fm)
    - 0.012528 * sin(Mm + 2 * Fm) + 0.01098 * sin(Mm - 2 * Fm) + 0.010675 * sin(4 * D - Mm) + 0.010034 * sin(3 * Mm)
    + 0.008548 * sin(4 * D - 2 * Mm) - 0.007888 * sin(2 * D + Ms - Mm) - 0.006766 * sin(2 * D + Ms) - 0.005163 * sin(D - Mm)
    + 0.004987 * sin(D + Ms) + 0.004036 * sin(2 * D - Ms + Mm), 360);
}
export const meanRahuTropical = (dJ: number) => mod(125.0445 - 0.0529538 * dJ, 360);

// ----------------------------- main -----------------------------
export interface JamakkolInput {
  date: string;              // "YYYY-MM-DD" local date of the question
  time: string;              // "HH:MM[:SS]" local time
  tz?: number;               // hours east of GMT (default 5.5 IST)
  lat?: number; lon?: number; // N+, E+ (default Mumbai)
  place?: string;
  ascendant?: number | null;
  sunriseOverride?: string | null;  // "HH:MM[:SS]" – optional, to match a panchang
  sunsetOverride?: string | null;
  ayanamsa?: number | null;  // optional; default mean Lahiri polynomial
  /** Sidereal planets from the portal's Swiss Ephemeris. Sun / Moon / Rahu are calculated if omitted (≈0.01° / ≈1′ / mean node). */
  planets: { Sun?: number; Moon?: number; Mars: number; Mercury: number; Jupiter: number; Venus: number; Saturn: number; Rahu?: number };
  retrograde?: Partial<Record<"Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn", boolean>>;
  mandiLongitude?: number | null;
}
export type Category = "points" | "jama" | "gochara" | "upagraha";
export interface Point { name: string; short: string; category: Category; longitude: number; signIndex: number; sign: string; degree: string; nakshatraPada: string; label: string; exalted?: boolean; retrograde?: boolean }

export const DEFAULT_LOCATION = { place: "Mumbai, Maharashtra, India", lat: 19.076, lon: 72.8777, tz: 5.5 };
export const CITIES = [
  { place: "Mumbai", lat: 19.076, lon: 72.8777, tz: 5.5 },
  { place: "Delhi", lat: 28.6139, lon: 77.209, tz: 5.5 },
  { place: "Delhi Cantonment", lat: 28.59613, lon: 77.15874, tz: 5.5 },
  { place: "Chennai", lat: 13.0827, lon: 80.2707, tz: 5.5 },
  { place: "Bengaluru", lat: 12.9716, lon: 77.5946, tz: 5.5 },
  { place: "Hyderabad", lat: 17.385, lon: 78.4867, tz: 5.5 },
  { place: "Kolkata", lat: 22.5726, lon: 88.3639, tz: 5.5 },
  { place: "Pune", lat: 18.5204, lon: 73.8567, tz: 5.5 },
];

export function jamakkol(input: JamakkolInput) {
  const usingDefault = input.lat === undefined || input.lon === undefined;
  const inp = {
    ...input,
    lat: input.lat ?? DEFAULT_LOCATION.lat,
    lon: input.lon ?? DEFAULT_LOCATION.lon,
    tz: input.tz ?? DEFAULT_LOCATION.tz,
    place: input.place ?? (usingDefault ? DEFAULT_LOCATION.place : undefined),
  };
  const QT = hmsToFrac(inp.time.length === 5 ? inp.time + ":00" : inp.time);
  const today = sunriseSunset(inp.date, inp.lat, inp.lon, inp.tz);
  const shift = (iso: string, n: number) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const yest = sunriseSunset(shift(inp.date, -1), inp.lat, inp.lon, inp.tz), tom = sunriseSunset(shift(inp.date, 1), inp.lat, inp.lon, inp.tz);
  const srOv = inp.sunriseOverride ? hmsToFrac(inp.sunriseOverride.length === 5 ? inp.sunriseOverride + ":00" : inp.sunriseOverride) : null;
  const ssOv = inp.sunsetOverride ? hmsToFrac(inp.sunsetOverride.length === 5 ? inp.sunsetOverride + ":00" : inp.sunsetOverride) : null;
  const SR = srOv ?? today.sunrise, SS = ssOv ?? today.sunset;
  const SSY = ssOv === null ? yest.sunset : ssOv + (yest.sunset - today.sunset);
  const SRN = srOv === null ? tom.sunrise : srOv + (tom.sunrise - today.sunrise);

  const dJ = serial(inp.date) + QT - inp.tz / 24 + 2415018.5 - 2451545;
  const ayan = inp.ayanamsa ?? lahiri(dJ);
  const sun = inp.planets.Sun ?? mod(sunTropical(dJ) - ayan, 360);
  const moon = inp.planets.Moon ?? mod(moonTropical(dJ) - ayan, 360);
  const rahu = inp.planets.Rahu ?? mod(meanRahuTropical(dJ) - ayan, 360);

  // Jamakkol day starts at 06:00; jamam = 90 min; jama grahas move back 0.5°/min
  const jwd = weekdayOf(inp.date, QT < 0.25 ? -1 : 0);
  const el = mod((QT - 0.25) * 1440, 720);
  const half: "Day" | "Night" = QT >= 0.25 && QT < 0.75 ? "Day" : "Night";
  const jamamNo = Math.floor(el / 90) + 1;
  const lord = WEEKDAY_LORD[jwd], li = JAMA_ORDER.indexOf(lord as (typeof JAMA_ORDER)[number]);

  // Udayam (equal division of day / night from the Sun)
  const ufrac = QT >= SR && QT < SS ? (QT - SR) / (SS - SR) : QT >= SS ? (QT - SS) / (1 + SRN - SS) : (QT + 1 - SSY) / (1 + SR - SSY);
  const udayam = mod(sun + 360 * ufrac, 360);
  const aarudam = mod(Math.round(QT * 1440 * 6 * 1e6) / 1e6, 360);   // 6° per clock minute (5 min = 1 sign), rounded like the Excel
  const sunSign = Math.floor(sun / 30);
  const kavN = mod(VEEDI[sunSign] - Math.floor(aarudam / 30), 12) + 1;
  const kavRaw = mod(Math.floor(udayam / 30) + kavN - 1, 12) * 30 + (30 - (aarudam - Math.floor(aarudam / 30) * 30));
  const kavippu = mod(Math.round(kavRaw * 1e6) / 1e6, 360);   // Kavippu sign = N-th from Udayam; degree = 30° − Aarudam degree

  const mk = (name: string, short: string, category: Category, lon: number, extra: Partial<Point> = {}): Point => {
    const s = Math.floor(lon / 30);
    const flag = extra.exalted ? " ↑" : extra.retrograde ? " (R)" : "";
    return { name, short, category, longitude: lon, signIndex: s, sign: SIGNS[s], degree: dms(lon), nakshatraPada: nakshatraPada(lon), label: `${short} ${degMin(lon)}${flag}`, ...extra };
  };
  const points: Point[] = [mk("Udayam", "Udayam", "points", udayam), mk("Aarudam", "Aarudam", "points", aarudam), mk("Kavippu", "Kavippu", "points", kavippu)];
  if (inp.mandiLongitude != null) points.push(mk("Mandi", "md", "upagraha", mod(inp.mandiLongitude, 360)));
  JAMA_ORDER.forEach((j, k) => {
    const lon = mod(360 - el * 0.5 - 45 * (k - li), 360);
    points.push(mk(`Jama ${j}`, JAMA_SHORT[k], "jama", lon, { exalted: Math.floor(lon / 30) === JAMA_EXALT[k] }));
  });
  const R = inp.retrograde ?? {};
  ([["Sun", "Su", sun, false], ["Moon", "Mo", moon, false], ["Mars", "Ma", inp.planets.Mars, !!R.Mars], ["Mercury", "Me", inp.planets.Mercury, !!R.Mercury],
    ["Jupiter", "Ju", inp.planets.Jupiter, !!R.Jupiter], ["Venus", "Ve", inp.planets.Venus, !!R.Venus], ["Saturn", "Sa", inp.planets.Saturn, !!R.Saturn],
    ["Rahu", "Ra", rahu, true], ["Ketu", "Ke", mod(rahu + 180, 360), true]] as [string, string, number, boolean][])
    .forEach(([n, s, l, r]) => points.push(mk(n, s, "gochara", mod(l, 360), { retrograde: r })));

  // chart boxes
  const udSign = Math.floor(udayam / 30);
  const boxes = SIGNS.map((sign, i) => ({
    signIndex: i, sign,
    house: mod(i - udSign, 12) + 1,
    asc: inp.ascendant != null && Math.floor(mod(inp.ascendant, 360) / 30) === i,
    jama: points.filter((p) => p.category === "jama" && p.signIndex === i).map((p) => p.label),
    gochara: points.filter((p) => p.category === "gochara" && p.signIndex === i).map((p) => p.label),
    upagraha: points.filter((p) => p.category === "upagraha" && p.signIndex === i).map((p) => p.label),
    points: points.filter((p) => p.category === "points" && p.signIndex === i).map((p) => p.label),
  }));

  // panchang
  const diff = mod(moonTropical(dJ) - sunTropical(dJ), 360);
  const usedDiff = inp.planets.Sun !== undefined || inp.planets.Moon !== undefined ? mod(moon - sun, 360) : diff;
  const vwd = weekdayOf(inp.date, QT < SR ? -1 : 0);
  const horaIdx = QT >= SR && QT < SS ? Math.floor((QT - SR) / ((SS - SR) / 12))
    : 12 + Math.floor(QT >= SS ? (QT - SS) / ((1 + SRN - SS) / 12) : (QT + 1 - SSY) / ((1 + SR - SSY) / 12));
  const wdDate = weekdayOf(inp.date);
  const period = (part: number) => `${fracToHM(SR + ((part - 1) * (SS - SR)) / 8)} – ${fracToHM(SR + (part * (SS - SR)) / 8)}`;
  const jStart = (half === "Day" ? 0.25 : 0.75) + ((jamamNo - 1) * 90) / 1440;
  const panchang = {
    vara: WEEKDAYS[vwd],
    tamilMonth: TAMIL_MONTHS[sunSign],
    sunrise: fracToHM(SR), sunset: fracToHM(SS),
    tithi: TITHIS[Math.floor(usedDiff / 12)],
    nakshatra: nakshatraPada(moon),
    yoga: YOGAS[Math.floor(mod(sun + moon, 360) / (40 / 3))],
    karana: KARANAS[Math.floor(usedDiff / 6)],
    moonSign: SIGNS[Math.floor(moon / 30)],
    sunSign: SIGNS[sunSign],
    horaLord: HORA_ORDER[mod(HORA_ORDER.indexOf(WEEKDAY_LORD[vwd]) + horaIdx, 7)],
    rahuKalam: period(RAHU_PART[wdDate]), yamagandam: period(YAMA_PART[wdDate]), gulikaKalam: period(GULIKA_PART[wdDate]),
    jamakkolDay: `${WEEKDAYS[jwd]} · ${half} #${jamamNo} (${fracToHM(jStart)}–${fracToHM(jStart + 90 / 1440)})`,
    ayanamsa: `${Math.floor(ayan)}° ${String(Math.floor(mod(ayan * 60, 60))).padStart(2, "0")}′`,
  };

  return {
    input: inp,
    ascendant: inp.ascendant != null ? mk("Ascendant", "ASC", "points", mod(inp.ascendant, 360)) : null,
    jamam: { weekday: WEEKDAYS[jwd], half, number: jamamNo, lord, minutesIntoHalf: el, start: fracToHM(jStart), end: fracToHM(jStart + 90 / 1440) },
    sun: { sunrise: SR, sunset: SS, previousSunset: SSY, nextSunrise: SRN },
    udayam: points[0], aarudam: points[1], kavippu: points[2],
    kavippuCount: kavN, veediSign: SIGNS[VEEDI[sunSign]],
    jamaGrahas: points.filter((p) => p.category === "jama"),
    gochara: points.filter((p) => p.category === "gochara"),
    exaltedJama: points.filter((p) => p.category === "jama" && p.exalted).map((p) => p.name.replace("Jama ", "")),
    points, boxes, panchang,
  };
}
export type JamakkolResult = ReturnType<typeof jamakkol>;

export const KP_NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
  "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
] as const;

export const KP_PLANETS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"] as const;
export type KpLord = (typeof KP_PLANETS)[number];

const DASHA_YEARS: Record<KpLord, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};
const SIGN_LORDS: KpLord[] = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
const NAKSHATRA_SPAN = 360 / 27;
const SUBDIVISION_TOTAL = 120;

export interface KpDetails {
  signLord: KpLord;
  nakshatra: string;
  nakshatraIndex: number;
  starLord: KpLord;
  subLord: KpLord;
  subSubLord: KpLord;
  nakshatraProgress: number;
  subProgress: number;
}

export interface KpHoraryZone {
  number: number;
  start: number;
  end: number;
  longitude: number;
  subLord: KpLord;
}

export function normalizeKpLongitude(longitude: number) {
  return ((longitude % 360) + 360) % 360;
}

function sequenceFrom(lord: KpLord) {
  const start = KP_PLANETS.indexOf(lord);
  return KP_PLANETS.map((_, index) => KP_PLANETS[(start + index) % KP_PLANETS.length]);
}

function lordAtProgress(progress: number, startingLord: KpLord) {
  let cursor = 0;
  for (const lord of sequenceFrom(startingLord)) {
    const share = DASHA_YEARS[lord] / SUBDIVISION_TOTAL;
    if (progress < cursor + share) {
      return { lord, start: cursor, end: cursor + share };
    }
    cursor += share;
  }
  return { lord: "Mercury" as KpLord, start: cursor, end: 1 };
}

export function calculateKpDetails(longitude: number): KpDetails {
  const normalized = normalizeKpLongitude(longitude);
  const signIndex = Math.floor(normalized / 30);
  const nakshatraIndex = Math.min(26, Math.floor(normalized / NAKSHATRA_SPAN));
  const nakshatraStart = nakshatraIndex * NAKSHATRA_SPAN;
  const nakshatraProgress = (normalized - nakshatraStart) / NAKSHATRA_SPAN;
  const starLord = KP_PLANETS[nakshatraIndex % KP_PLANETS.length];
  const sub = lordAtProgress(nakshatraProgress, starLord);
  const subProgress = (nakshatraProgress - sub.start) / (sub.end - sub.start);
  const subSubLord = lordAtProgress(Math.min(1 - Number.EPSILON, Math.max(0, subProgress)), sub.lord).lord;
  return {
    signLord: SIGN_LORDS[signIndex],
    nakshatra: KP_NAKSHATRAS[nakshatraIndex],
    nakshatraIndex: nakshatraIndex + 1,
    starLord,
    subLord: sub.lord,
    subSubLord,
    nakshatraProgress,
    subProgress,
  };
}

export function calculateKpDetailsForLongitudes(longitudes: number[]) {
  return longitudes.map(calculateKpDetails);
}

const HORARY_ZONES: KpHoraryZone[] = Array.from({ length: 249 }, (_, index) => {
  const start = index * 360 / 249;
  const end = (index + 1) * 360 / 249;
  return {
    number: index + 1,
    start,
    end,
    longitude: (start + end) / 2,
    subLord: calculateKpDetails((start + end) / 2).subLord,
  };
});

export function horaryNumberToLongitude(number: number) {
  if (!Number.isInteger(number) || number < 1 || number > 249) {
    throw new Error("KP horary number must be a whole number from 1 to 249.");
  }
  return HORARY_ZONES[number - 1].longitude;
}

export function horaryNumberDetails(number: number) {
  return HORARY_ZONES[number - 1] ?? null;
}

import swe from "swisseph";
import { localDateTimeToUtc, shiftLocalDate } from "../timezone";
import { gulikaSegment } from "../upagrahas";

const DAY_MS = 86_400_000;
const SCAN_STEP_MS = 30 * 60_000;
const NAKSHATRA_SPAN = 360 / 27;
const TITHI_SPAN = 12;
const KARANA_SPAN = 6;

const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
  "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra",
  "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha",
  "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];
const TITHIS = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami",
  "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi",
  "Purnima",
];
const YOGAS = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma",
  "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
  "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha",
  "Shukla", "Brahma", "Indra", "Vaidhriti",
];
const RASHIS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];
const RITUS = ["Vasanta", "Vasanta", "Grishma", "Grishma", "Varsha", "Varsha", "Sharad", "Sharad", "Hemanta", "Hemanta", "Shishira", "Shishira"];
const ANANDADI_YOGAS = [
  "Ananda", "Kaladanda", "Dhumra", "Prajapati", "Saumya", "Dhwanksha", "Dhwaja",
  "Shrivatsa", "Vajra", "Mudgara", "Chhatra", "Maitra", "Manasa", "Padma", "Lumba",
  "Utpata", "Mrityu", "Kana", "Siddhi", "Shubha", "Amrita", "Musala", "Gada",
  "Matanga", "Raksha", "Charma", "Sthira", "Vardhamana",
];
const ANANDADI_QUALITY: PanchangQuality[] = [
  "auspicious", "inauspicious", "inauspicious", "auspicious", "auspicious",
  "inauspicious", "auspicious", "auspicious", "inauspicious", "inauspicious",
  "auspicious", "auspicious", "auspicious", "auspicious", "inauspicious",
  "inauspicious", "inauspicious", "inauspicious", "auspicious", "auspicious",
  "auspicious", "inauspicious", "inauspicious", "auspicious", "inauspicious",
  "auspicious", "auspicious", "auspicious",
];
const TARA_NAMES = [
  "Janma", "Sampat", "Vipat", "Kshema", "Pratyari",
  "Sadhaka", "Naidhana", "Mitra", "Param Mitra",
];
const TARA_QUALITY: PanchangQuality[] = [
  "inauspicious", "auspicious", "inauspicious", "auspicious", "inauspicious",
  "auspicious", "inauspicious", "auspicious", "auspicious",
];
const CHOGHADIYA_NAMES = ["Udveg", "Chal", "Labh", "Amrit", "Kaal", "Shubh", "Rog"];
const CHOGHADIYA_QUALITY: PanchangQuality[] = [
  "inauspicious", "neutral", "auspicious", "auspicious", "inauspicious", "auspicious", "inauspicious",
];
const CHOGHADIYA_DAY_START = [0, 3, 6, 2, 5, 1, 4];
const CHOGHADIYA_NIGHT_SEQUENCE = [0, 5, 3, 1, 6, 4, 2];
const CHOGHADIYA_NIGHT_START = [1, 3, 5, 0, 2, 4, 6];
const STRONG_CHANDRABALAM_HOUSES = new Set([1, 3, 6, 7, 10, 11]);
const MOVABLE_KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti"];

const RAHU_KALAM_SEGMENT: Record<number, number> = {
  1: 2, 2: 7, 3: 5, 4: 6, 5: 4, 6: 3, 7: 8,
};
const YAMAGANDA_SEGMENT: Record<number, number> = {
  1: 4, 2: 3, 3: 2, 4: 1, 5: 7, 6: 6, 7: 5,
};
const DUR_MUHURTA: Record<number, number[]> = {
  1: [9, 12], 2: [4, 22], 3: [8], 4: [6, 12], 5: [4, 9], 6: [1, 2], 7: [14],
};

const VARJYAM_START_GHATIS = [
  50, 24, 30, 40, 14, 21, 30, 20, 32, 30, 20, 18, 21, 20, 14, 14, 10, 14, 56,
  24, 20, 10, 10, 18, 16, 24, 30,
];
const AMRIT_START_GHATIS = VARJYAM_START_GHATIS.map((ghatis, index) =>
  index === 18 ? 44 : (ghatis + 24) % 60,
);

export interface PanchangCalculationInput {
  date: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface PanchangSegment {
  index: number;
  name: string;
  start: string;
  end: string;
  quality?: PanchangQuality;
}

export type PanchangQuality = "auspicious" | "inauspicious" | "neutral";

export interface PanchangTimingWindow {
  start: string;
  end: string;
}

export interface PanchangSlot extends PanchangTimingWindow {
  index: number;
  name: string;
  quality: PanchangQuality;
}

export interface PanchangTiming {
  name: string;
  windows: PanchangTimingWindow[];
  note?: string;
}

export interface PanchangDay {
  date: string;
  timezone: string;
  weekday: string;
  solarEvents: {
    sunrise: string;
    sunset: string;
    nextSunrise: string;
    solarNoon: string | null;
    civilDawn: string | null;
    civilDusk: string | null;
    moonrise: string | null;
    moonset: string | null;
  };
  astronomy: {
    sunSign: string;
    sunDegree: number;
    moonSign: string;
    moonDegree: number;
    moonNakshatraPada: number;
    ascendantSign: string | null;
    ascendantDegree: number | null;
    ayanamsaDegrees: number;
  };
  lunarSolar: {
    vikramSamvat: number;
    shakaSamvat: number;
    chaitraNewYear: string;
    ritu: string;
    ayana: "Uttarayana" | "Dakshinayana";
    convention: string;
  };
  anandadiYoga: {
    name: string;
    quality: PanchangQuality;
  };
  choghadiya: {
    day: PanchangSlot[];
    night: PanchangSlot[];
  };
  tarabalam: {
    transitNakshatra: string;
    grid: Array<{
      name: string;
      quality: PanchangQuality;
      janmaNakshatras: Array<{ name: string; selected: boolean }>;
    }>;
  };
  chandrabalam: {
    transitMoonSign: string;
    rows: Array<{
      janmaMoonSign: string;
      relativeHouse: number;
      quality: PanchangQuality;
    }>;
  };
  lagnaTransitions: Array<{
    sign: string;
    start: string;
    end: string;
    panchakaRahita: boolean;
  }>;
  panchakaRahita: PanchangTimingWindow[];
  panchangAtSunrise: {
    tithi: string;
    nakshatra: string;
    yoga: string;
    karana: string;
    weekday: string;
  };
  timeline: {
    start: string;
    end: string;
    tracks: Array<{
      key: "tithi" | "nakshatra" | "yoga" | "karana" | "muhurta";
      label: string;
      segments: PanchangSegment[];
    }>;
  };
  timings: {
    inauspicious: PanchangTiming[];
    auspicious: PanchangTiming[];
    note: string;
  };
  notes: string[];
}

type EclipticResult = { longitude: number; error?: string };
type RiseResult = { transitTime: number; error?: string };
type TrackKey = "tithi" | "nakshatra" | "yoga" | "karana";
type PanchangIndices = Record<TrackKey, number> & {
  nakshatraPada: number;
  sunLongitude: number;
  moonLongitude: number;
};

function normalizeDegrees(degree: number) {
  return ((degree % 360) + 360) % 360;
}

function toJulianDay(date: Date) {
  const utcHour = date.getUTCHours() + date.getUTCMinutes() / 60 +
    (date.getUTCSeconds() + date.getUTCMilliseconds() / 1000) / 3600;
  return swe.swe_julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    utcHour,
    swe.SE_GREG_CAL,
  );
}

function fromJulianDay(julianDay: number) {
  return new Date(Math.round((julianDay - 2_440_587.5) * DAY_MS));
}

function assertValidInput({ date, latitude, longitude, timezone }: PanchangCalculationInput) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Date must use YYYY-MM-DD.");
  }
  const [year, month, day] = date.split("-").map(Number);
  const calendarDate = new Date(0);
  calendarDate.setUTCFullYear(year, month - 1, day);
  calendarDate.setUTCHours(0, 0, 0, 0);
  if (year < 1900 || year > 2100 || calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) {
    throw new Error("Date must be a valid calendar date between 1900 and 2100.");
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("Latitude must be between -90 and 90.");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("Longitude must be between -180 and 180.");
  }
  if (!timezone.trim()) {
    throw new Error("A valid time zone is required.");
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    throw new Error("Time zone must be a valid IANA time zone.");
  }
}

function localDayBounds(date: string, timezone: string) {
  const nextDate = shiftLocalDate(date, 1);
  return {
    start: localDateTimeToUtc(date, "00:00:00", timezone),
    end: localDateTimeToUtc(nextDate, "00:00:00", timezone),
  };
}

function solarEvent(
  localDate: string,
  timezone: string,
  latitude: number,
  longitude: number,
  body: number,
  eventType: number,
): { time: Date | null; error?: string } {
  const bounds = localDayBounds(localDate, timezone);
  const result = swe.swe_rise_trans(
    toJulianDay(bounds.start),
    body,
    "",
    swe.SEFLG_MOSEPH,
    eventType,
    longitude,
    latitude,
    0,
    1013.25,
    15,
  ) as RiseResult;
  if (result.error || !Number.isFinite(result.transitTime)) {
    return { time: null, error: result.error ?? "Swiss Ephemeris did not return an event time." };
  }
  const time = fromJulianDay(result.transitTime);
  if (time < bounds.start || time >= bounds.end) {
    return { time: null, error: `No matching event occurred on local date ${localDate}.` };
  }
  return { time };
}

function requiredSolarEvent(
  localDate: string,
  timezone: string,
  latitude: number,
  longitude: number,
  eventType: number,
  label: string,
) {
  const result = solarEvent(localDate, timezone, latitude, longitude, swe.SE_SUN, eventType);
  if (!result.time) {
    throw new Error(`Could not calculate ${label} for ${localDate}: ${result.error ?? "no event found"}`);
  }
  return result.time;
}

function positionAt(timestamp: number): PanchangIndices {
  const julianDay = toJulianDay(new Date(timestamp));
  const flags = swe.SEFLG_MOSEPH | swe.SEFLG_SIDEREAL;
  const sun = swe.swe_calc_ut(julianDay, swe.SE_SUN, flags) as EclipticResult;
  const moon = swe.swe_calc_ut(julianDay, swe.SE_MOON, flags) as EclipticResult;
  if (sun.error || moon.error) {
    throw new Error(sun.error || moon.error || "Swiss Ephemeris could not calculate Sun and Moon longitudes.");
  }
  const sunLongitude = normalizeDegrees(sun.longitude);
  const moonLongitude = normalizeDegrees(moon.longitude);
  const elongation = normalizeDegrees(moonLongitude - sunLongitude);
  return {
    tithi: Math.floor(elongation / TITHI_SPAN),
    nakshatra: Math.floor(moonLongitude / NAKSHATRA_SPAN),
    yoga: Math.floor(normalizeDegrees(moonLongitude + sunLongitude) / NAKSHATRA_SPAN),
    karana: Math.floor(elongation / KARANA_SPAN),
    nakshatraPada: Math.floor((moonLongitude % NAKSHATRA_SPAN) / (NAKSHATRA_SPAN / 4)) + 1,
    sunLongitude,
    moonLongitude,
  };
}

function getAscendantAt(timestamp: number, latitude: number, longitude: number) {
  const result = swe.swe_houses_ex(
    toJulianDay(new Date(timestamp)),
    swe.SEFLG_SIDEREAL,
    latitude,
    longitude,
    "W",
  ) as { ascendant?: number; error?: string };
  if (result.error || !Number.isFinite(result.ascendant)) {
    throw new Error(result.error ?? "Swiss Ephemeris returned an invalid ascendant.");
  }
  return normalizeDegrees(result.ascendant as number);
}

function astronomicalDetailsAt(timestamp: number, latitude: number, longitude: number) {
  const position = positionAt(timestamp);
  const julianDay = toJulianDay(new Date(timestamp));
  const ayanamsaDegrees = swe.swe_get_ayanamsa_ut(julianDay);
  if (!Number.isFinite(ayanamsaDegrees)) {
    throw new Error("Swiss Ephemeris returned an invalid Lahiri ayanamsa.");
  }
  let ascendant: number | null = null;
  let ascendantError: string | undefined;
  try {
    ascendant = getAscendantAt(timestamp, latitude, longitude);
  } catch (error) {
    ascendantError = error instanceof Error ? error.message : "Swiss Ephemeris could not calculate the ascendant.";
  }
  const sunSignIndex = Math.floor(position.sunLongitude / 30);
  const moonSignIndex = Math.floor(position.moonLongitude / 30);
  const ascendantSignIndex = ascendant === null ? null : Math.floor(ascendant / 30);
  return {
    sunSign: RASHIS[sunSignIndex],
    sunDegree: position.sunLongitude - sunSignIndex * 30,
    moonSign: RASHIS[moonSignIndex],
    moonDegree: position.moonLongitude - moonSignIndex * 30,
    moonNakshatraPada: position.nakshatraPada,
    ascendantSign: ascendantSignIndex === null ? null : RASHIS[ascendantSignIndex],
    ascendantDegree: ascendant === null || ascendantSignIndex === null ? null : ascendant - ascendantSignIndex * 30,
    ayanamsaDegrees,
    sunSignIndex,
    moonSignIndex,
    ascendantError,
  };
}

function buildPanchakaRahitaSegments(start: number, end: number) {
  let segmentStart = start;
  let previousTime = start;
  let isRahita = positionAt(start).moonLongitude < 300;
  const segments: Array<{ start: number; end: number; isRahita: boolean }> = [];

  for (let sampleTime = Math.min(start + SCAN_STEP_MS, end); sampleTime <= end; sampleTime = Math.min(sampleTime + SCAN_STEP_MS, end)) {
    const sampleIsRahita = positionAt(sampleTime).moonLongitude < 300;
    if (sampleIsRahita !== isRahita) {
      let low = previousTime;
      let high = sampleTime;
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        const middleIsRahita = positionAt(middle).moonLongitude < 300;
        if (middleIsRahita === isRahita) low = middle;
        else high = middle;
      }
      if (high > segmentStart) segments.push({ start: segmentStart, end: high, isRahita });
      segmentStart = high;
      isRahita = sampleIsRahita;
    }

    previousTime = sampleTime;
    if (sampleTime === end) break;
  }

  if (end > segmentStart) segments.push({ start: segmentStart, end, isRahita });
  return segments;
}

function buildLagnaTransitions(start: number, end: number, latitude: number, longitude: number) {
  const readState = (timestamp: number) => ({
    sign: Math.floor(getAscendantAt(timestamp, latitude, longitude) / 30),
    panchakaRahita: positionAt(timestamp).moonLongitude < 300,
  });
  const sameState = (left: ReturnType<typeof readState>, right: ReturnType<typeof readState>) =>
    left.sign === right.sign && left.panchakaRahita === right.panchakaRahita;
  const step = 10 * 60_000;
  let segmentStart = start;
  let previousTime = start;
  let previousState = readState(start);
  const segments: Array<{ sign: number; start: number; end: number; panchakaRahita: boolean }> = [];

  for (let sampleTime = Math.min(start + step, end); sampleTime <= end; sampleTime = Math.min(sampleTime + step, end)) {
    const sampleState = readState(sampleTime);
    if (!sameState(sampleState, previousState)) {
      let low = previousTime;
      let high = sampleTime;
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (sameState(readState(middle), previousState)) low = middle;
        else high = middle;
      }
      if (high > segmentStart) {
        segments.push({
          sign: previousState.sign,
          start: segmentStart,
          end: high,
          panchakaRahita: previousState.panchakaRahita,
        });
      }
      segmentStart = high;
      previousState = readState(high);
    }

    previousTime = sampleTime;
    if (sampleTime === end) break;
  }

  if (end > segmentStart) {
    segments.push({
      sign: previousState.sign,
      start: segmentStart,
      end,
      panchakaRahita: previousState.panchakaRahita,
    });
  }
  return segments;
}

function buildTrackSegments(start: number, end: number, key: TrackKey): Array<{ index: number; start: number; end: number }> {
  let segmentStart = start;
  let previousTime = start;
  let previousIndex = positionAt(start)[key];
  const segments: Array<{ index: number; start: number; end: number }> = [];

  for (let sampleTime = Math.min(start + SCAN_STEP_MS, end); sampleTime <= end; sampleTime = Math.min(sampleTime + SCAN_STEP_MS, end)) {
    const sampleIndex = positionAt(sampleTime)[key];
    if (sampleIndex !== previousIndex) {
      let low = previousTime;
      let high = sampleTime;
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (positionAt(middle)[key] === previousIndex) low = middle;
        else high = middle;
      }
      if (high > segmentStart) segments.push({ index: previousIndex, start: segmentStart, end: high });
      segmentStart = high;
    }

    previousTime = sampleTime;
    previousIndex = sampleIndex;
    if (sampleTime === end) break;
  }

  if (end > segmentStart) segments.push({ index: previousIndex, start: segmentStart, end });
  return segments;
}

function tithiName(index: number) {
  if (index === 14) return "Purnima";
  if (index === 29) return "Amavasya";
  const paksha = index < 15 ? "Shukla" : "Krishna";
  const name = TITHIS[index % 15];
  return `${paksha} ${name}`;
}

function karanaName(index: number) {
  if (index === 0) return "Kimstughna";
  if (index <= 56) return MOVABLE_KARANAS[(index - 1) % MOVABLE_KARANAS.length];
  return ["Shakuni", "Chatushpada", "Naga"][index - 57];
}

function segmentName(key: TrackKey, index: number) {
  switch (key) {
    case "tithi": return tithiName(index);
    case "nakshatra": return NAKSHATRAS[index];
    case "yoga": return YOGAS[index];
    case "karana": return karanaName(index);
  }
}

function toSegments(key: TrackKey, segments: Array<{ index: number; start: number; end: number }>): PanchangSegment[] {
  return segments.map(({ index, start, end }) => ({
    index,
    name: segmentName(key, index),
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
  }));
}

function weekdayAt(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en", { timeZone: timezone, weekday: "long" }).format(date);
}

function isoWeekday(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function windowFromMilliseconds(start: number, end: number): PanchangTimingWindow {
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}

function calculateTimings({
  weekday,
  weekdayIndex,
  sunrise,
  sunset,
  nextSunrise,
  previousSunset,
  nakshatraSegments,
}: {
  weekday: number;
  weekdayIndex: number;
  sunrise: number;
  sunset: number;
  nextSunrise: number;
  previousSunset: number | null;
  nakshatraSegments: Array<{ index: number; start: number; end: number }>;
}) {
  const daylight = sunset - sunrise;
  const dayPart = daylight / 8;
  const rahuSegment = RAHU_KALAM_SEGMENT[weekday];
  const yamagandaSegment = YAMAGANDA_SEGMENT[weekday];
  const rahu = windowFromMilliseconds(
    sunrise + (rahuSegment - 1) * dayPart,
    sunrise + rahuSegment * dayPart,
  );
  const yamaganda = windowFromMilliseconds(
    sunrise + (yamagandaSegment - 1) * dayPart,
    sunrise + yamagandaSegment * dayPart,
  );
  const gulikaiSegment = gulikaSegment(weekdayIndex, true);
  const gulikai = windowFromMilliseconds(
    sunrise + (gulikaiSegment - 1) * dayPart,
    sunrise + gulikaiSegment * dayPart,
  );

  const dayMuhurta = daylight / 15;
  const durMuhurtaWindows = DUR_MUHURTA[weekday].map((number) => {
    if (number <= 15) {
      return windowFromMilliseconds(
        sunrise + (number - 1) * dayMuhurta,
        sunrise + number * dayMuhurta,
      );
    }
    const nightMuhurta = (nextSunrise - sunset) / 15;
    const nightNumber = number - 15;
    return windowFromMilliseconds(
      sunset + (nightNumber - 1) * nightMuhurta,
      sunset + nightNumber * nightMuhurta,
    );
  });

  const amritWindows = nakshatraSegments.flatMap(({ index, start, end }) => {
    const duration = end - start;
    if (duration <= 0) return [];
    const windowStart = start + (AMRIT_START_GHATIS[index] / 60) * duration;
    const windowEnd = windowStart + (4 / 60) * duration;
    const clippedStart = Math.max(windowStart, sunrise);
    const clippedEnd = Math.min(windowEnd, nextSunrise);
    return clippedStart < clippedEnd ? [windowFromMilliseconds(clippedStart, clippedEnd)] : [];
  });

  const notes: string[] = [];
  const abhijit = weekday === 3
    ? []
    : [windowFromMilliseconds(
      sunrise + 7 * dayMuhurta,
      sunrise + 8 * dayMuhurta,
    )];
  const brahma = previousSunset === null
    ? []
    : (() => {
      const nightMuhurta = (sunrise - previousSunset) / 15;
      return [windowFromMilliseconds(sunrise - 2 * nightMuhurta, sunrise - nightMuhurta)];
    })();

  if (weekday === 3) notes.push("Abhijit Muhurta is not observed on Wednesday in this convention.");
  if (!brahma.length) notes.push("Brahma Muhurta is unavailable because the previous sunset could not be calculated.");

  const timing = (name: string, windows: PanchangTimingWindow[], note?: string): PanchangTiming => ({
    name,
    windows,
    ...(note ? { note } : {}),
  });

  return {
    timings: {
      inauspicious: [
        timing("Rahu Kalam", [rahu]),
        timing("Yamaganda", [yamaganda]),
        timing("Gulikai Kalam", [gulikai]),
        timing("Dur Muhurtam", durMuhurtaWindows),
      ],
      auspicious: [
        timing("Abhijit Muhurta", abhijit, weekday === 3 ? "Not observed on Wednesday in this convention." : undefined),
        timing("Amrit Kalam", amritWindows, amritWindows.length ? undefined : "No Amrit Kalam window overlaps this Vedic day."),
        timing("Brahma Muhurta", brahma, brahma.length ? undefined : "Previous sunset is unavailable."),
      ],
      note: "Traditional muhurta conventions vary by region. These windows use the selected location's calculated sunrise, sunset, weekday, and Nakshatra boundaries.",
    },
    notes,
  };
}

function choghadiyaSlots(start: number, end: number, weekday: number, isNight: boolean): PanchangSlot[] {
  const duration = (end - start) / 8;
  const nightStartPosition = CHOGHADIYA_NIGHT_START[weekday];
  const dayStartIndex = CHOGHADIYA_DAY_START[weekday];
  return Array.from({ length: 8 }, (_, slot) => {
    const index = isNight
      ? CHOGHADIYA_NIGHT_SEQUENCE[(nightStartPosition + slot) % CHOGHADIYA_NIGHT_SEQUENCE.length]
      : (dayStartIndex + slot) % CHOGHADIYA_NAMES.length;
    return {
      index,
      name: CHOGHADIYA_NAMES[index],
      quality: CHOGHADIYA_QUALITY[index],
      start: new Date(Math.round(start + slot * duration)).toISOString(),
      end: new Date(Math.round(start + (slot + 1) * duration)).toISOString(),
    };
  });
}

function calculateAnandadiYoga(weekday: number, nakshatra: number) {
  const nakshatraWithAbhijit = nakshatra < 21 ? nakshatra : nakshatra + 1;
  const index = (nakshatraWithAbhijit - 4 * weekday + 28) % 28;
  return { name: ANANDADI_YOGAS[index], quality: ANANDADI_QUALITY[index] };
}

function calculateTarabalam(transitNakshatra: number) {
  return {
    transitNakshatra: NAKSHATRAS[transitNakshatra],
    grid: TARA_NAMES.map((name, taraIndex) => ({
      name,
      quality: TARA_QUALITY[taraIndex],
      janmaNakshatras: NAKSHATRAS.map((janmaNakshatra, janmaIndex) => ({
        name: janmaNakshatra,
        selected: ((transitNakshatra - janmaIndex + 27) % 27) % 9 === taraIndex,
      })),
    })),
  };
}

function calculateChandrabalam(transitMoonSign: number) {
  return {
    transitMoonSign: RASHIS[transitMoonSign],
    rows: RASHIS.map((janmaMoonSign, janmaSign) => {
      const relativeHouse = ((transitMoonSign - janmaSign + 12) % 12) + 1;
      return {
        janmaMoonSign,
        relativeHouse,
        quality: STRONG_CHANDRABALAM_HOUSES.has(relativeHouse) ? "auspicious" as const : "inauspicious" as const,
      };
    }),
  };
}

function buildMuhurtaSegments(
  start: number,
  end: number,
  timings: PanchangDay["timings"],
  panchakaRahita: Array<{ start: number; end: number }>,
): PanchangSegment[] {
  const intervals = [
    ...timings.auspicious.flatMap(({ name, windows }) => windows.map(({ start: from, end: to }) => ({
      name,
      quality: "auspicious" as const,
      start: Math.max(start, Date.parse(from)),
      end: Math.min(end, Date.parse(to)),
    }))),
    ...timings.inauspicious.flatMap(({ name, windows }) => windows.map(({ start: from, end: to }) => ({
      name,
      quality: "inauspicious" as const,
      start: Math.max(start, Date.parse(from)),
      end: Math.min(end, Date.parse(to)),
    }))),
    ...panchakaRahita.map(({ start: from, end: to }) => ({
      name: "Panchaka Rahita",
      quality: "auspicious" as const,
      start: Math.max(start, from),
      end: Math.min(end, to),
    })),
  ].filter(({ start: from, end: to }) => from < to);
  const boundaries = [...new Set([start, end, ...intervals.flatMap(({ start: from, end: to }) => [from, to])])]
    .sort((left, right) => left - right);

  return boundaries.slice(0, -1).flatMap((from, index) => {
    const to = boundaries[index + 1];
    if (to <= from) return [];
    const midpoint = from + (to - from) / 2;
    const active = intervals.filter(({ start: activeStart, end: activeEnd }) => midpoint >= activeStart && midpoint < activeEnd);
    const names = [...new Set(active.map(({ name }) => name))];
    const quality = active.some(({ quality: activeQuality }) => activeQuality === "inauspicious")
      ? "inauspicious"
      : active.length
        ? "auspicious"
        : "neutral";
    return [{
      index,
      name: names.length ? names.join(" · ") : "Available",
      quality,
      start: new Date(from).toISOString(),
      end: new Date(to).toISOString(),
    }];
  });
}

function getLocalDate(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function chaitraNewYear(year: number, timezone: string, latitude: number, longitude: number) {
  const start = localDateTimeToUtc(`${year}-03-01`, "00:00:00", timezone).getTime();
  const end = localDateTimeToUtc(`${year}-04-20`, "00:00:00", timezone).getTime();
  const step = 6 * 60 * 60_000;
  let previousTime = start;
  let previous = positionAt(start);

  for (let sampleTime = Math.min(start + step, end); sampleTime <= end; sampleTime = Math.min(sampleTime + step, end)) {
    const sample = positionAt(sampleTime);
    const sunInPisces = Math.floor(sample.sunLongitude / 30) === 11;
    if (previous.tithi === 29 && sample.tithi === 0 && sunInPisces) {
      let low = previousTime;
      let high = sampleTime;
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (positionAt(middle).tithi === 29) low = middle;
        else high = middle;
      }
      const transitionDate = getLocalDate(new Date(high), timezone);
      const sunrise = requiredSolarEvent(transitionDate, timezone, latitude, longitude, swe.SE_CALC_RISE, "Chaitra sunrise");
      return high <= sunrise.getTime() ? transitionDate : shiftLocalDate(transitionDate, 1);
    }

    previousTime = sampleTime;
    previous = sample;
    if (sampleTime === end) break;
  }

  throw new Error(`Could not determine the Chaitra new year for ${year}.`);
}

export function calculatePanchang(input: PanchangCalculationInput): PanchangDay {
  assertValidInput(input);
  swe.swe_set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);

  const { date, latitude, longitude, timezone } = input;
  const year = Number(date.slice(0, 4));
  const previousDate = shiftLocalDate(date, -1);
  const nextDate = shiftLocalDate(date, 1);
  const sunriseDate = requiredSolarEvent(date, timezone, latitude, longitude, swe.SE_CALC_RISE, "sunrise");
  const sunsetDate = requiredSolarEvent(date, timezone, latitude, longitude, swe.SE_CALC_SET, "sunset");
  const nextSunriseDate = requiredSolarEvent(nextDate, timezone, latitude, longitude, swe.SE_CALC_RISE, "tomorrow's sunrise");
  const previousSunsetResult = solarEvent(previousDate, timezone, latitude, longitude, swe.SE_SUN, swe.SE_CALC_SET);
  const solarNoonResult = solarEvent(date, timezone, latitude, longitude, swe.SE_SUN, swe.SE_CALC_MTRANSIT);
  const civilDawnResult = solarEvent(date, timezone, latitude, longitude, swe.SE_SUN, swe.SE_CALC_RISE | swe.SE_BIT_CIVIL_TWILIGHT);
  const civilDuskResult = solarEvent(date, timezone, latitude, longitude, swe.SE_SUN, swe.SE_CALC_SET | swe.SE_BIT_CIVIL_TWILIGHT);
  const moonriseResult = solarEvent(date, timezone, latitude, longitude, swe.SE_MOON, swe.SE_CALC_RISE);
  const moonsetResult = solarEvent(date, timezone, latitude, longitude, swe.SE_MOON, swe.SE_CALC_SET);

  const sunrise = sunriseDate.getTime();
  const sunset = sunsetDate.getTime();
  const nextSunrise = nextSunriseDate.getTime();
  if (!(sunrise < sunset && sunset < nextSunrise)) {
    throw new Error("Calculated solar events are not in sunrise-to-sunset order for this local date.");
  }

  const indicesAtSunrise = positionAt(sunrise);
  const astronomy = astronomicalDetailsAt(sunrise, latitude, longitude);
  const trackKeys: TrackKey[] = ["tithi", "nakshatra", "yoga", "karana"];
  const limbTracks = trackKeys.map((key) => ({
    key,
    label: key[0].toUpperCase() + key.slice(1),
    segments: toSegments(key, buildTrackSegments(sunrise, nextSunrise, key)),
  }));
  const extendedNakshatraSegments = buildTrackSegments(
    sunrise - 2 * DAY_MS,
    nextSunrise + 2 * DAY_MS,
    "nakshatra",
  );
  const weekday = weekdayAt(sunriseDate, timezone);
  const weekdayNumber = isoWeekday(date);
  const weekdayIndex = weekdayNumber % 7;
  const timings = calculateTimings({
    weekday: weekdayNumber,
    weekdayIndex,
    sunrise,
    sunset,
    nextSunrise,
    previousSunset: previousSunsetResult.time?.getTime() ?? null,
    nakshatraSegments: extendedNakshatraSegments,
  });
  const notes = [...timings.notes];
  if (!solarNoonResult.time) notes.push(`Solar noon unavailable: ${solarNoonResult.error ?? "no transit found"}`);
  if (!civilDawnResult.time) notes.push(`Civil dawn unavailable: ${civilDawnResult.error ?? "no event found"}`);
  if (!civilDuskResult.time) notes.push(`Civil dusk unavailable: ${civilDuskResult.error ?? "no event found"}`);
  if (!moonriseResult.time) notes.push(`Moonrise unavailable: ${moonriseResult.error ?? "no event found"}`);
  if (!moonsetResult.time) notes.push(`Moonset unavailable: ${moonsetResult.error ?? "no event found"}`);
  if (astronomy.ascendantError) notes.push(`Ascendant unavailable: ${astronomy.ascendantError}`);

  const panchakaSegments = buildPanchakaRahitaSegments(sunrise, nextSunrise);
  let lagnaTransitions: ReturnType<typeof buildLagnaTransitions> = [];
  try {
    lagnaTransitions = buildLagnaTransitions(sunrise, nextSunrise, latitude, longitude);
  } catch (error) {
    notes.push(`Lagna transitions unavailable: ${error instanceof Error ? error.message : "Swiss Ephemeris could not calculate them."}`);
  }
  const panchakaRahita = panchakaSegments
    .filter(({ isRahita }) => isRahita)
    .map(({ start, end }) => windowFromMilliseconds(start, end));
  const muhurtaSegments = buildMuhurtaSegments(
    sunrise,
    nextSunrise,
    timings.timings,
    panchakaRahita.map(({ start, end }) => ({ start: Date.parse(start), end: Date.parse(end) })),
  );
  const chaitraStart = chaitraNewYear(year, timezone, latitude, longitude);
  const afterChaitraStart = date >= chaitraStart;
  const solarNoon = solarNoonResult.time?.toISOString() ?? null;

  return {
    date,
    timezone,
    weekday,
    solarEvents: {
      sunrise: sunriseDate.toISOString(),
      sunset: sunsetDate.toISOString(),
      nextSunrise: nextSunriseDate.toISOString(),
      solarNoon,
      civilDawn: civilDawnResult.time?.toISOString() ?? null,
      civilDusk: civilDuskResult.time?.toISOString() ?? null,
      moonrise: moonriseResult.time?.toISOString() ?? null,
      moonset: moonsetResult.time?.toISOString() ?? null,
    },
    astronomy: {
      sunSign: astronomy.sunSign,
      sunDegree: astronomy.sunDegree,
      moonSign: astronomy.moonSign,
      moonDegree: astronomy.moonDegree,
      moonNakshatraPada: astronomy.moonNakshatraPada,
      ascendantSign: astronomy.ascendantSign,
      ascendantDegree: astronomy.ascendantDegree,
      ayanamsaDegrees: astronomy.ayanamsaDegrees,
    },
    lunarSolar: {
      vikramSamvat: year + (afterChaitraStart ? 57 : 56),
      shakaSamvat: year - (afterChaitraStart ? 78 : 79),
      chaitraNewYear: chaitraStart,
      ritu: RITUS[astronomy.sunSignIndex],
      ayana: [9, 10, 11, 0, 1].includes(astronomy.sunSignIndex) ? "Uttarayana" : "Dakshinayana",
      convention: "Samvat year changes at Chaitra Shukla Pratipada; regional Vikram Samvat conventions can differ.",
    },
    anandadiYoga: calculateAnandadiYoga(weekdayIndex, indicesAtSunrise.nakshatra),
    choghadiya: {
      day: choghadiyaSlots(sunrise, sunset, weekdayIndex, false),
      night: choghadiyaSlots(sunset, nextSunrise, weekdayIndex, true),
    },
    tarabalam: calculateTarabalam(indicesAtSunrise.nakshatra),
    chandrabalam: calculateChandrabalam(astronomy.moonSignIndex),
    lagnaTransitions: lagnaTransitions.map(({ sign, start, end, panchakaRahita: isRahita }) => ({
      sign: RASHIS[sign],
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      panchakaRahita: isRahita,
    })),
    panchakaRahita,
    panchangAtSunrise: {
      tithi: tithiName(indicesAtSunrise.tithi),
      nakshatra: `${NAKSHATRAS[indicesAtSunrise.nakshatra]} · Pada ${indicesAtSunrise.nakshatraPada}`,
      yoga: YOGAS[indicesAtSunrise.yoga],
      karana: karanaName(indicesAtSunrise.karana),
      weekday,
    },
    timeline: {
      start: sunriseDate.toISOString(),
      end: nextSunriseDate.toISOString(),
      tracks: [
        ...limbTracks,
        { key: "muhurta", label: "Muhurta", segments: muhurtaSegments },
      ],
    },
    timings: timings.timings,
    notes,
  };
}

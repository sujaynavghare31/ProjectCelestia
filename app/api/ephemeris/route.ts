import { NextResponse } from "next/server";
import swe from "swisseph";
import type { EphemerisRequest, DashaPeriod, PlanetPosition } from "@/lib/kundali-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
  "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];
const NAK_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const SIGN_LORDS = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
const DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const DASHA_YEARS: Record<string, number> = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
const AYANAMSA_MODES: Record<string, number> = {
  "fagan-bradley": swe.SE_SIDM_FAGAN_BRADLEY,
  lahiri: swe.SE_SIDM_LAHIRI,
  raman: swe.SE_SIDM_RAMAN,
  krishnamurti: swe.SE_SIDM_KRISHNAMURTI,
  yukteshwar: swe.SE_SIDM_YUKTESHWAR,
};

const FRIENDS: Record<string, string[]> = {
  Sun: ["Moon", "Mars", "Jupiter"], Moon: ["Sun", "Mercury"], Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"], Jupiter: ["Sun", "Moon", "Mars"], Venus: ["Mercury", "Saturn"], Saturn: ["Mercury", "Venus"],
};
const ENEMIES: Record<string, string[]> = {
  Sun: ["Venus", "Saturn"], Moon: [], Mars: ["Mercury"], Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"], Venus: ["Sun", "Moon"], Saturn: ["Sun", "Moon", "Mars"],
};
const OWN_SIGNS: Record<string, number[]> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};
const EXALTATION: Record<string, number> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const DEBILITATION: Record<string, number> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };

const BODIES = [
  { id: "sun", name: "Sun", symbol: "Su", code: swe.SE_SUN },
  { id: "moon", name: "Moon", symbol: "Mo", code: swe.SE_MOON },
  { id: "mars", name: "Mars", symbol: "Ma", code: swe.SE_MARS },
  { id: "mercury", name: "Mercury", symbol: "Me", code: swe.SE_MERCURY },
  { id: "jupiter", name: "Jupiter", symbol: "Ju", code: swe.SE_JUPITER },
  { id: "venus", name: "Venus", symbol: "Ve", code: swe.SE_VENUS },
  { id: "saturn", name: "Saturn", symbol: "Sa", code: swe.SE_SATURN },
  { id: "uranus", name: "Uranus", symbol: "Ur", code: swe.SE_URANUS },
  { id: "neptune", name: "Neptune", symbol: "Ne", code: swe.SE_NEPTUNE },
  { id: "pluto", name: "Pluto", symbol: "Pl", code: swe.SE_PLUTO },
];

type EclipticResult = { longitude: number; latitude: number; longitudeSpeed: number; error?: string };
type EquatorialResult = { declination: number; error?: string };
type HousesResult = { house: number[]; ascendant: number; ascendantSpeed?: number; error?: string };

function normalizeDegrees(degree: number) {
  return ((degree % 360) + 360) % 360;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function localDateTimeToUtc(date: string, time: string, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second] = time.split(":").map(Number);
  const localDate = new Date(0);
  localDate.setUTCFullYear(year, month - 1, day);
  localDate.setUTCHours(hour, minute, second, 0);
  const localAsUtc = localDate.getTime();

  if (/^[+-]\d{2}:\d{2}$/.test(timezone)) {
    const sign = timezone[0] === "-" ? -1 : 1;
    const [offsetHours, offsetMinutes] = timezone.slice(1).split(":").map(Number);
    if (offsetHours > 14 || offsetMinutes > 59 || (offsetHours === 14 && offsetMinutes !== 0)) throw new Error("Timezone offset is outside the supported range.");
    return new Date(localAsUtc - sign * (offsetHours * 60 + offsetMinutes) * 60_000);
  }

  let offset = 0;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const localParts = formatter.formatToParts(new Date(localAsUtc - offset * 60_000));
      const parts = Object.fromEntries(localParts.map(({ type, value }) => [type, Number(value)]));
      const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
      offset = Math.round((asUtc - (localAsUtc - offset * 60_000)) / 60_000);
    }
  } catch {
    throw new Error("Timezone must be a valid IANA timezone or a UTC offset such as +05:30.");
  }
  return new Date(localAsUtc - offset * 60_000);
}

function validateRequest(value: unknown): EphemerisRequest {
  if (!isRecord(value)) throw new Error("Request body must be a JSON object.");
  const { date, time, lat, lng, timezone, ayanamsa, nodeType, targetAge, ageMode, dashaSeed } = value;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("date must use YYYY-MM-DD.");
  if (typeof time !== "string" || !/^\d{2}:\d{2}:\d{2}$/.test(time)) throw new Error("time must use HH:MM:SS.");
  const [year, month, day] = date.split("-").map(Number);
  const checkDate = new Date(0);
  checkDate.setUTCFullYear(year, month - 1, day);
  checkDate.setUTCHours(0, 0, 0, 0);
  if (checkDate.getUTCFullYear() !== year || checkDate.getUTCMonth() !== month - 1 || checkDate.getUTCDate() !== day) throw new Error("date is not a valid calendar date.");
  const [hour, minute, second] = time.split(":").map(Number);
  if (hour > 23 || minute > 59 || second > 59) throw new Error("time is outside the 24-hour clock.");
  if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("lat must be a number from -90 to 90.");
  if (typeof lng !== "number" || !Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error("lng must be a number from -180 to 180.");
  if (typeof timezone !== "string" || timezone.length > 64 || !timezone.trim()) throw new Error("timezone is required.");
  const normalizedAyanamsa = typeof ayanamsa === "string" ? ayanamsa.toLowerCase() : "";
  if (!Object.hasOwn(AYANAMSA_MODES, normalizedAyanamsa)) throw new Error(`Unsupported ayanamsa. Choose one of: ${Object.keys(AYANAMSA_MODES).join(", ")}.`);
  if (nodeType !== "true" && nodeType !== "mean") throw new Error("nodeType must be 'true' or 'mean'.");
  if (targetAge !== undefined && (typeof targetAge !== "number" || !Number.isInteger(targetAge) || targetAge < 0 || targetAge > 120)) throw new Error("targetAge must be a whole number from 0 to 120.");
  if (ageMode !== undefined && ageMode !== "completed" && ageMode !== "ongoing") throw new Error("ageMode must be 'completed' or 'ongoing'.");
  if (dashaSeed !== undefined && dashaSeed !== "moon" && dashaSeed !== "ascendant" && dashaSeed !== "sun") throw new Error("dashaSeed must be 'moon', 'ascendant', or 'sun'.");
  return {
    date, time, lat, lng, timezone: timezone.trim(), ayanamsa: normalizedAyanamsa, nodeType,
    ...(typeof targetAge === "number" ? { targetAge } : {}),
    ...(ageMode !== undefined ? { ageMode } : {}),
    ...(dashaSeed !== undefined ? { dashaSeed } : {}),
  };
}

function dignityFor(planet: string, sign: number) {
  if (!Object.hasOwn(OWN_SIGNS, planet)) return "—";
  if (EXALTATION[planet] === sign) return "Exalted";
  if (DEBILITATION[planet] === sign) return "Debilitated";
  if (OWN_SIGNS[planet].includes(sign)) return "Own";
  const signLord = SIGN_LORDS[sign];
  if (FRIENDS[planet].includes(signLord)) return "Friend";
  if (ENEMIES[planet].includes(signLord)) return "Enemy";
  return "Neutral";
}

function makePosition({
  id,
  name,
  symbol,
  longitude,
  speed,
  declination,
  ascendantLongitude,
  jaimini,
}: {
  id: string;
  name: string;
  symbol: string;
  longitude: number;
  speed: number;
  declination: number;
  ascendantLongitude: number;
  jaimini?: string;
}): PlanetPosition {
  const normalizedLongitude = normalizeDegrees(longitude);
  const sign = Math.floor(normalizedLongitude / 30);
  const degree = normalizedLongitude - sign * 30;
  const nakshatraSpan = 360 / 27;
  const nakshatraIndex = Math.floor(normalizedLongitude / nakshatraSpan);
  const pada = Math.floor((normalizedLongitude - nakshatraIndex * nakshatraSpan) / (nakshatraSpan / 4)) + 1;
  const ascendantSign = Math.floor(normalizeDegrees(ascendantLongitude) / 30);
  const house = ((sign - ascendantSign + 12) % 12) + 1;
  return {
    id, name, symbol, longitude: normalizedLongitude, sign, signName: SIGNS[sign], degree,
    speed, motion: speed < 0 ? "R" : "D", declination, nakshatra: nakshatraIndex + 1,
    nakshatraName: NAKSHATRAS[nakshatraIndex], pada,
    nakshatraLord: NAK_LORDS[nakshatraIndex % NAK_LORDS.length], house,
    dignity: dignityFor(name, sign), ...(jaimini ? { jaimini } : {}),
  };
}

function buildDashaTimeline(moonLongitude: number, birthDate: Date, now: Date): DashaPeriod[] {
  const nakshatraIndex = Math.floor(normalizeDegrees(moonLongitude) / (360 / 27));
  const nakshatraStart = nakshatraIndex * (360 / 27);
  const progress = (normalizeDegrees(moonLongitude) - nakshatraStart) / (360 / 27);
  const firstLord = NAK_LORDS[nakshatraIndex % NAK_LORDS.length];
  const firstOrderIndex = DASHA_ORDER.indexOf(firstLord);
  const yearsPerDay = 365.2425 * 86_400_000;

  const createSubPeriods = (start: number, end: number, parentLord: string, level: number): DashaPeriod[] => {
    const parentYears = (end - start) / yearsPerDay;
    const parentIndex = DASHA_ORDER.indexOf(parentLord);
    let cursor = start;
    return DASHA_ORDER.map((_, offset) => {
      const lord = DASHA_ORDER[(parentIndex + offset) % DASHA_ORDER.length];
      const duration = parentYears * DASHA_YEARS[lord] / 120 * yearsPerDay;
      const subEnd = offset === DASHA_ORDER.length - 1 ? end : cursor + duration;
      const period: DashaPeriod = {
        lord,
        start: new Date(cursor).toISOString(),
        end: new Date(subEnd).toISOString(),
        active: now.getTime() >= cursor && now.getTime() < subEnd,
      };
      if (level > 1) period.periods = createSubPeriods(cursor, subEnd, lord, level - 1);
      cursor = subEnd;
      return period;
    });
  };

  const periods: DashaPeriod[] = [];
  let cursor = birthDate.getTime() - DASHA_YEARS[firstLord] * progress * yearsPerDay;
  for (let index = 0; index < DASHA_ORDER.length * 3; index += 1) {
    const lord = DASHA_ORDER[(firstOrderIndex + index) % DASHA_ORDER.length];
    const fullYears = DASHA_YEARS[lord];
    const end = cursor + fullYears * yearsPerDay;
    periods.push({
      lord,
      start: new Date(cursor).toISOString(),
      end: new Date(end).toISOString(),
      active: now.getTime() >= cursor && now.getTime() < end,
      periods: createSubPeriods(cursor, end, lord, 2),
    });
    cursor = end;
    if (cursor > now.getTime() + 120 * yearsPerDay) break;
  }
  return periods;
}

function calculateEphemeris(input: EphemerisRequest, epoch?: Date) {
  const utcDate = epoch ?? localDateTimeToUtc(input.date, input.time, input.timezone);
  const utcHour = utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60 + utcDate.getUTCSeconds() / 3600;
  const julianDay = swe.swe_julday(utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, utcDate.getUTCDate(), utcHour, swe.SE_GREG_CAL);
  swe.swe_set_sid_mode(AYANAMSA_MODES[input.ayanamsa], 0, 0);
  const ayanamsaDegrees = swe.swe_get_ayanamsa_ut(julianDay);
  const flags = swe.SEFLG_MOSEPH | swe.SEFLG_SPEED | swe.SEFLG_SIDEREAL;
  const equatorialFlags = swe.SEFLG_MOSEPH | swe.SEFLG_SPEED | swe.SEFLG_EQUATORIAL;
  const nodeCode = input.nodeType === "true" ? swe.SE_TRUE_NODE : swe.SE_MEAN_NODE;
  const node = swe.swe_calc_ut(julianDay, nodeCode, flags) as EclipticResult;
  const nodeEquatorial = swe.swe_calc_ut(julianDay, nodeCode, equatorialFlags) as EquatorialResult;
  if (node.error || nodeEquatorial.error) throw new Error(node.error || nodeEquatorial.error || "Failed to calculate lunar nodes.");

  let bhavaSystem = "Placidus";
  let bhavaResult = swe.swe_houses_ex(julianDay, swe.SEFLG_SIDEREAL, input.lat, input.lng, "P") as HousesResult;
  if (bhavaResult.error) {
    bhavaSystem = "Whole Sign (polar fallback)";
    bhavaResult = swe.swe_houses_ex(julianDay, swe.SEFLG_SIDEREAL, input.lat, input.lng, "W") as HousesResult;
  }
  const wholeSignResult = swe.swe_houses_ex(julianDay, swe.SEFLG_SIDEREAL, input.lat, input.lng, "W") as HousesResult;
  if (bhavaResult.error || wholeSignResult.error) throw new Error(bhavaResult.error || wholeSignResult.error || "Failed to calculate houses.");
  const ascendantLongitude = wholeSignResult.ascendant;
  const ascSign = Math.floor(normalizeDegrees(ascendantLongitude) / 30);
  const ascSpeed = (swe.swe_houses_ex2(julianDay, swe.SEFLG_SIDEREAL, input.lat, input.lng, "W") as HousesResult).ascendantSpeed ?? 0;
  const eclipticNutation = swe.swe_calc_ut(julianDay, swe.SE_ECL_NUT, swe.SEFLG_MOSEPH) as EclipticResult;
  if (eclipticNutation.error) throw new Error(eclipticNutation.error);
  const ascEquatorial = swe.swe_cotrans([normalizeDegrees(ascendantLongitude + ayanamsaDegrees), 0, 1], eclipticNutation.latitude) as { latitude: number };

  const ascendant = makePosition({
    id: "ascendant", name: "Ascendant", symbol: "As", longitude: ascendantLongitude,
    speed: ascSpeed, declination: ascEquatorial.latitude, ascendantLongitude,
  });

  const planets: PlanetPosition[] = BODIES.map((body) => {
    const ecliptic = swe.swe_calc_ut(julianDay, body.code, flags) as EclipticResult;
    const equatorial = swe.swe_calc_ut(julianDay, body.code, equatorialFlags) as EquatorialResult;
    if (ecliptic.error || equatorial.error) throw new Error(ecliptic.error || equatorial.error || `Failed to calculate ${body.name}.`);
    return makePosition({
      ...body,
      longitude: ecliptic.longitude,
      speed: ecliptic.longitudeSpeed,
      declination: equatorial.declination,
      ascendantLongitude,
    });
  });

  const rahu = makePosition({
    id: "rahu", name: "Rahu", symbol: "Ra", longitude: node.longitude, speed: node.longitudeSpeed,
    declination: nodeEquatorial.declination, ascendantLongitude,
  });
  const ketu = makePosition({
    id: "ketu", name: "Ketu", symbol: "Ke", longitude: node.longitude + 180, speed: node.longitudeSpeed,
    declination: -nodeEquatorial.declination, ascendantLongitude,
  });
  const karakaPlanets = [...planets.filter(({ name }) => ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].includes(name))]
    .sort((a, b) => b.degree - a.degree || a.name.localeCompare(b.name));
  const karakaLabels = ["AK", "AmK", "BK", "MK", "PK", "GK", "DK"];
  const jaiminiByName = new Map(karakaPlanets.map((planet, index) => [planet.name, karakaLabels[index]]));
  const taggedPlanets = planets.map((planet) => ({ ...planet, jaimini: jaiminiByName.get(planet.name) }));
  const houseCusps = bhavaResult.house.map((longitude, index) => {
    const sign = Math.floor(normalizeDegrees(longitude) / 30);
    return { house: index + 1, longitude: normalizeDegrees(longitude), sign, signName: SIGNS[sign] };
  });

  return {
    julianDay,
    ayanamsa: { name: input.ayanamsa, degrees: ayanamsaDegrees },
    ascendant,
    planets: [
      ...taggedPlanets.filter(({ name }) => ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].includes(name)),
      rahu,
      ketu,
      ...taggedPlanets.filter(({ name }) => ["Uranus", "Neptune", "Pluto"].includes(name)),
    ].map((planet) => ({
      ...planet,
      house: ((planet.sign - ascSign + 12) % 12) + 1,
    })),
    houseCusps,
    houseCuspSystem: bhavaSystem,
    dashas: buildDashaTimeline(
      input.dashaSeed === "ascendant" ? ascendantLongitude
        : input.dashaSeed === "sun" ? planets.find(({ name }) => name === "Sun")?.longitude ?? 0
          : (swe.swe_calc_ut(julianDay, swe.SE_MOON, flags) as EclipticResult).longitude,
      utcDate,
      new Date(),
    ),
    calculatedAt: new Date().toISOString(),
    engine: `Swiss Ephemeris ${swe.swe_version()} · Moshier`,
  };
}

function findSolarReturn(input: EphemerisRequest) {
  if (input.targetAge === undefined) return null;
  const [birthYear, birthMonth, birthDay] = input.date.split("-").map(Number);
  const targetYear = birthYear + input.targetAge + (input.ageMode === "ongoing" ? 1 : 0);
  const targetDay = Math.min(birthDay, new Date(Date.UTC(targetYear, birthMonth, 0)).getUTCDate());
  const approximateDate = localDateTimeToUtc(
    `${String(targetYear).padStart(4, "0")}-${String(birthMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`,
    "12:00:00",
    input.timezone,
  );
  const flags = swe.SEFLG_MOSEPH | swe.SEFLG_SPEED | swe.SEFLG_SIDEREAL;
  swe.swe_set_sid_mode(AYANAMSA_MODES[input.ayanamsa], 0, 0);
  const natalDate = localDateTimeToUtc(input.date, input.time, input.timezone);
  const natalJulianDay = swe.swe_julday(
    natalDate.getUTCFullYear(), natalDate.getUTCMonth() + 1, natalDate.getUTCDate(),
    natalDate.getUTCHours() + natalDate.getUTCMinutes() / 60 + natalDate.getUTCSeconds() / 3600,
    swe.SE_GREG_CAL,
  );
  const targetLongitude = (swe.swe_calc_ut(natalJulianDay, swe.SE_SUN, flags) as EclipticResult).longitude;
  const centerJulianDay = swe.swe_julday(
    approximateDate.getUTCFullYear(), approximateDate.getUTCMonth() + 1, approximateDate.getUTCDate(),
    approximateDate.getUTCHours() + approximateDate.getUTCMinutes() / 60,
    swe.SE_GREG_CAL,
  );
  const solarLongitude = (julianDay: number) => {
    const result = swe.swe_calc_ut(julianDay, swe.SE_SUN, flags) as EclipticResult;
    if (result.error) throw new Error(result.error);
    return normalizeDegrees(result.longitude - targetLongitude + 180) - 180;
  };

  let lower = centerJulianDay - 6;
  let upper = lower;
  let lowerValue = solarLongitude(lower);
  let bracketed = false;
  for (let day = 0.25; day <= 12; day += 0.25) {
    upper = lower + 0.25;
    const upperValue = solarLongitude(upper);
    if (lowerValue <= 0 && upperValue >= 0) {
      bracketed = true;
      break;
    }
    lower = upper;
    lowerValue = upperValue;
  }
  if (!bracketed) throw new Error("Could not locate the requested solar return within the expected date range.");

  for (let iteration = 0; iteration < 40; iteration += 1) {
    const midpoint = (lower + upper) / 2;
    if (solarLongitude(midpoint) < 0) lower = midpoint;
    else upper = midpoint;
  }
  const julianDay = (lower + upper) / 2;
  const utc = swe.swe_revjul(julianDay, swe.SE_GREG_CAL);
  const epoch = new Date(Date.UTC(
    utc.year, utc.month - 1, utc.day,
    Math.floor(utc.hour), Math.floor((utc.hour % 1) * 60),
    Math.round((((utc.hour % 1) * 60) % 1) * 60),
  ));
  return { epoch, targetAge: input.targetAge, ageMode: input.ageMode ?? "completed" };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  try {
    const input = validateRequest(body);
    const chart = calculateEphemeris(input);
    const returnEpoch = findSolarReturn(input);
    if (!returnEpoch) return NextResponse.json({ input, ...chart });
    const returnChart = calculateEphemeris(input, returnEpoch.epoch);
    return NextResponse.json({
      input,
      ...chart,
      solarReturn: {
        targetAge: returnEpoch.targetAge,
        ageMode: returnEpoch.ageMode,
        utc: returnEpoch.epoch.toISOString(),
        ascendant: returnChart.ascendant,
        planets: returnChart.planets,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ephemeris calculation failed.";
    const isInputError = /must |outside |valid |unsupported |choose one|is required/i.test(message);
    console.error("[ephemeris] Calculation failed", error);
    return NextResponse.json({ error: message }, { status: isInputError ? 400 : 500 });
  }
}

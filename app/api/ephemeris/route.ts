import { NextResponse } from "next/server";
import swe from "swisseph";
import type { EphemerisRequest, DashaPeriod, PlanetPosition } from "@/lib/kundali-types";
import { calculateBirthGhati } from "@/lib/astrology/ghati-calculator";
import { calculateGrahaAvasthas } from "@/lib/astrology/graha-avastha-service";
import { calculateAvasthaReport } from "@/lib/astrology/avastha/engine";
import { avasthaConfigSchema } from "@/lib/astrology/avastha/validation";
import { GRAHAS } from "@/lib/astrology/avastha/types";
import type { Graha } from "@/lib/astrology/avastha/types";
import { getInterceptedSigns } from "@/lib/astrology/intercepted-signs";
import { mapPositionsToHouses } from "@/lib/astrology/house-placements";
import { getPlanetaryDignity } from "@/lib/astrology/planetary-dignity-service";
import { localDateTimeToUtc } from "@/lib/astrology/timezone";
import { calculateGulikaMandi } from "@/lib/astrology/upagrahas";

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
const DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const DASHA_YEARS: Record<string, number> = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
const AYANAMSA_MODES: Record<string, number> = {
  "fagan-bradley": swe.SE_SIDM_FAGAN_BRADLEY,
  lahiri: swe.SE_SIDM_LAHIRI,
  raman: swe.SE_SIDM_RAMAN,
  krishnamurti: swe.SE_SIDM_KRISHNAMURTI,
  yukteshwar: swe.SE_SIDM_YUKTESHWAR,
};

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
  { id: "chiron", name: "Chiron", symbol: "Ch", code: swe.SE_CHIRON },
  { id: "lilith", name: "Lilith", symbol: "Li", code: swe.SE_MEAN_APOG },
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

function validateRequest(value: unknown): EphemerisRequest {
  if (!isRecord(value)) throw new Error("Request body must be a JSON object.");
  const { date, time, lat, lng, timezone, ayanamsa, nodeType, targetAge, ageMode, dashaSeed, zodiacMode, customAyanamsaDegrees, avasthaConfig, nameFirstLetter, gender } = value;
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
  const normalizedZodiacMode = zodiacMode === undefined ? "sidereal" : zodiacMode;
  if (normalizedZodiacMode !== "sidereal" && normalizedZodiacMode !== "tropical") throw new Error("zodiacMode must be 'sidereal' or 'tropical'.");
  if (normalizedAyanamsa === "custom") {
    if (typeof customAyanamsaDegrees !== "number" || !Number.isFinite(customAyanamsaDegrees) || customAyanamsaDegrees < -360 || customAyanamsaDegrees > 360) {
      throw new Error("customAyanamsaDegrees must be a number from -360 to 360 for a custom ayanamsa.");
    }
  } else if (!Object.hasOwn(AYANAMSA_MODES, normalizedAyanamsa)) {
    throw new Error(`Unsupported ayanamsa. Choose one of: ${Object.keys(AYANAMSA_MODES).join(", ")}, custom.`);
  }
  if (nodeType !== "true" && nodeType !== "mean") throw new Error("nodeType must be 'true' or 'mean'.");
  if (targetAge !== undefined && (typeof targetAge !== "number" || !Number.isInteger(targetAge) || targetAge < 0 || targetAge > 120)) throw new Error("targetAge must be a whole number from 0 to 120.");
  if (ageMode !== undefined && ageMode !== "completed" && ageMode !== "ongoing") throw new Error("ageMode must be 'completed' or 'ongoing'.");
  if (dashaSeed !== undefined && dashaSeed !== "moon" && dashaSeed !== "ascendant" && dashaSeed !== "sun") throw new Error("dashaSeed must be 'moon', 'ascendant', or 'sun'.");
  if (nameFirstLetter !== undefined && (typeof nameFirstLetter !== "string" || nameFirstLetter.length > 12)) throw new Error("nameFirstLetter must be a string of at most 12 characters.");
  if (gender !== undefined && gender !== "male" && gender !== "female" && gender !== "not-applicable") throw new Error("gender must be 'male', 'female', or 'not-applicable'.");
  let validatedAvasthaConfig: EphemerisRequest["avasthaConfig"];
  if (avasthaConfig !== undefined) {
    const parsedConfig = avasthaConfigSchema.safeParse(avasthaConfig);
    if (!parsedConfig.success) throw new Error(`Invalid avasthaConfig: ${parsedConfig.error.issues.map(({ message }) => message).join("; ")}`);
    validatedAvasthaConfig = parsedConfig.data;
  }
  return {
    date, time, lat, lng, timezone: timezone.trim(), ayanamsa: normalizedAyanamsa, nodeType,
    zodiacMode: normalizedZodiacMode,
    ...(typeof customAyanamsaDegrees === "number" ? { customAyanamsaDegrees } : {}),
    ...(typeof targetAge === "number" ? { targetAge } : {}),
    ...(ageMode !== undefined ? { ageMode } : {}),
    ...(dashaSeed !== undefined ? { dashaSeed } : {}),
    ...(validatedAvasthaConfig ? { avasthaConfig: validatedAvasthaConfig } : {}),
    ...(typeof nameFirstLetter === "string" ? { nameFirstLetter } : {}),
    ...(gender !== undefined ? { gender } : {}),
  };
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
    dignity: getPlanetaryDignity(name, sign, degree), ...(jaimini ? { jaimini } : {}),
  };
}

function buildDashaTimeline(moonLongitude: number, birthDate: Date, now: Date, nestedLevels = 3): DashaPeriod[] {
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
      periods: createSubPeriods(cursor, end, lord, nestedLevels),
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
  const customAyanamsa = input.zodiacMode === "sidereal" && input.ayanamsa === "custom";
  if (input.zodiacMode === "sidereal" && !customAyanamsa) swe.swe_set_sid_mode(AYANAMSA_MODES[input.ayanamsa], 0, 0);
  const ayanamsaResult = input.zodiacMode === "sidereal" && !customAyanamsa
    ? swe.swe_get_ayanamsa_ex_ut(julianDay, swe.SEFLG_MOSEPH)
    : null;
  if (ayanamsaResult && "error" in ayanamsaResult) throw new Error(ayanamsaResult.error);
  const ayanamsaDegrees = input.zodiacMode === "tropical" ? 0
    : customAyanamsa ? input.customAyanamsaDegrees ?? 0
      : ayanamsaResult && "ayanamsa" in ayanamsaResult ? ayanamsaResult.ayanamsa : 0;
  const longitudeOffset = customAyanamsa ? -ayanamsaDegrees : 0;
  const siderealFlag = input.zodiacMode === "sidereal" && !customAyanamsa ? swe.SEFLG_SIDEREAL : 0;
  const flags = swe.SEFLG_MOSEPH | swe.SEFLG_SPEED | siderealFlag;
  const equatorialFlags = swe.SEFLG_MOSEPH | swe.SEFLG_SPEED | swe.SEFLG_EQUATORIAL;
  const nodeCode = input.nodeType === "true" ? swe.SE_TRUE_NODE : swe.SE_MEAN_NODE;
  const node = swe.swe_calc_ut(julianDay, nodeCode, flags) as EclipticResult;
  const nodeEquatorial = swe.swe_calc_ut(julianDay, nodeCode, equatorialFlags) as EquatorialResult;
  if (node.error || nodeEquatorial.error) throw new Error(node.error || nodeEquatorial.error || "Failed to calculate lunar nodes.");

  let bhavaSystem = "Placidus";
  let bhavaResult = swe.swe_houses_ex(julianDay, siderealFlag, input.lat, input.lng, "P") as HousesResult;
  if (bhavaResult.error) {
    bhavaSystem = "Whole Sign (polar fallback)";
    bhavaResult = swe.swe_houses_ex(julianDay, siderealFlag, input.lat, input.lng, "W") as HousesResult;
  }
  const wholeSignResult = swe.swe_houses_ex(julianDay, siderealFlag, input.lat, input.lng, "W") as HousesResult;
  if (bhavaResult.error || wholeSignResult.error) throw new Error(bhavaResult.error || wholeSignResult.error || "Failed to calculate houses.");
  const ascendantLongitude = normalizeDegrees(wholeSignResult.ascendant + longitudeOffset);
  const ascSign = Math.floor(normalizeDegrees(ascendantLongitude) / 30);
  const ascSpeed = (swe.swe_houses_ex2(julianDay, swe.SEFLG_SIDEREAL, input.lat, input.lng, "W") as HousesResult).ascendantSpeed ?? 0;
  const eclipticNutation = swe.swe_calc_ut(julianDay, swe.SE_ECL_NUT, swe.SEFLG_MOSEPH) as EclipticResult;
  if (eclipticNutation.error) throw new Error(eclipticNutation.error);
  const ascEquatorial = swe.swe_cotrans([normalizeDegrees(ascendantLongitude + ayanamsaDegrees), 0, 1], eclipticNutation.latitude) as { latitude: number };

  const ascendant = makePosition({
    id: "ascendant", name: "Ascendant", symbol: "As", longitude: ascendantLongitude,
    speed: ascSpeed, declination: ascEquatorial.latitude, ascendantLongitude,
  });

  const planets: PlanetPosition[] = BODIES.flatMap((body) => {
    const ecliptic = swe.swe_calc_ut(julianDay, body.code, flags) as EclipticResult;
    const equatorial = swe.swe_calc_ut(julianDay, body.code, equatorialFlags) as EquatorialResult;
    if (ecliptic.error || equatorial.error) {
      const reason = ecliptic.error || equatorial.error || `Failed to calculate ${body.name}.`;
      if (body.name === "Chiron") {
        return [];
      }
      throw new Error(reason);
    }
    return [makePosition({
      ...body,
      longitude: ecliptic.longitude + longitudeOffset,
      speed: ecliptic.longitudeSpeed,
      declination: equatorial.declination,
      ascendantLongitude,
    })];
  });

  const rahu = makePosition({
    id: "rahu", name: "Rahu", symbol: "Ra", longitude: node.longitude + longitudeOffset, speed: node.longitudeSpeed,
    declination: nodeEquatorial.declination, ascendantLongitude,
  });
  const ketu = makePosition({
    id: "ketu", name: "Ketu", symbol: "Ke", longitude: node.longitude + longitudeOffset + 180, speed: node.longitudeSpeed,
    declination: -nodeEquatorial.declination, ascendantLongitude,
  });
  const karakaPlanets = [...planets.filter(({ name }) => ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].includes(name))]
    .sort((a, b) => b.degree - a.degree || a.name.localeCompare(b.name));
  const karakaLabels = ["AK", "AmK", "BK", "MK", "PK", "GK", "DK"];
  const jaiminiByName = new Map(karakaPlanets.map((planet, index) => [planet.name, karakaLabels[index]]));
  const taggedPlanets = planets.map((planet) => ({ ...planet, jaimini: jaiminiByName.get(planet.name) }));
  const houseCusps = bhavaResult.house.map((longitude, index) => {
    const adjustedLongitude = normalizeDegrees(longitude + longitudeOffset);
    const sign = Math.floor(adjustedLongitude / 30);
    return { house: index + 1, longitude: adjustedLongitude, sign, signName: SIGNS[sign] };
  });
  const interceptedSigns = getInterceptedSigns(houseCusps.map((cusp) => cusp.sign));
  const chartPlanets = [
    ...taggedPlanets.filter(({ name }) => ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].includes(name)),
    rahu,
    ketu,
    ...taggedPlanets.filter(({ name }) => ["Uranus", "Neptune", "Pluto", "Chiron", "Lilith"].includes(name)),
  ].map((planet) => ({
    ...planet,
    house: ((planet.sign - ascSign + 12) % 12) + 1,
  }));
  const bhavChalitPlanets = mapPositionsToHouses(chartPlanets, houseCusps);
  const moon = planets.find(({ name }) => name === "Moon");
  const sun = planets.find(({ name }) => name === "Sun");
  if (!moon || !sun) throw new Error("Sun and Moon positions are required for the ephemeris calculation.");
  const solarHorizon = swe.swe_azalt(
    julianDay,
    swe.SE_ECL2HOR,
    input.lng,
    input.lat,
    0,
    1013.25,
    15,
    normalizeDegrees(sun.longitude + ayanamsaDegrees),
    0,
    1,
  );
  const isDayBirth = solarHorizon.trueAltitude >= 0;
  const fortuneLongitude = normalizeDegrees(
    ascendantLongitude + (isDayBirth ? moon.longitude - sun.longitude : sun.longitude - moon.longitude),
  );
  const fortuneEquatorial = swe.swe_cotrans(
    [normalizeDegrees(fortuneLongitude + ayanamsaDegrees), 0, 1],
    eclipticNutation.latitude,
  ) as { latitude: number };
  const partOfFortune = makePosition({
    id: "part-of-fortune",
    name: "Part of Fortune",
    symbol: "PoF",
    longitude: fortuneLongitude,
    speed: 0,
    declination: fortuneEquatorial.latitude,
    ascendantLongitude,
  });
  const upagrahas = calculateGulikaMandi({
    date: input.date,
    time: input.time,
    timezone: input.timezone,
    latitude: input.lat,
    longitude: input.lng,
    siderealFlag,
    longitudeOffset,
  });
  const makeUpagraha = (id: "gulika" | "mandi", name: "Gulika" | "Mandi", symbol: "Gu" | "Ma", longitude: number) => {
    const equatorial = swe.swe_cotrans(
      [normalizeDegrees(longitude + ayanamsaDegrees), 0, 1],
      eclipticNutation.latitude,
    ) as { latitude: number };
    return makePosition({
      id,
      name,
      symbol,
      longitude,
      speed: 0,
      declination: equatorial.latitude,
      ascendantLongitude,
    });
  };
  const gulika = makeUpagraha("gulika", "Gulika", "Gu", upagrahas.gulikaLongitude);
  const mandi = makeUpagraha("mandi", "Mandi", "Ma", upagrahas.mandiLongitude);
  const chartPoints = [
    { ...partOfFortune, house: ((partOfFortune.sign - ascSign + 12) % 12) + 1 },
    { ...gulika, house: ((gulika.sign - ascSign + 12) % 12) + 1 },
    { ...mandi, house: ((mandi.sign - ascSign + 12) % 12) + 1 },
  ];
  const bhavChalitPoints = mapPositionsToHouses(chartPoints, houseCusps);
  const birthGhati = calculateBirthGhati({
    date: input.date,
    time: input.time,
    timezone: input.timezone,
    latitude: input.lat,
    longitude: input.lng,
  });
  const avasthaReport = calculateAvasthaReport({
    planets: chartPlanets
      .filter((planet): planet is typeof planet & { name: Graha } => GRAHAS.includes(planet.name as Graha))
      .map(({ name, longitude, speed }) => ({ planet: name, longitude, speed })),
    ascendantLongitude,
    birthDateTimeUTC: birthGhati.birthUtc,
    sunriseUTC: birthGhati.sunriseUtc,
    nameFirstLetter: input.nameFirstLetter,
    config: input.avasthaConfig,
  });
  const grahaAvasthas = calculateGrahaAvasthas(chartPlanets, birthGhati, avasthaReport);

  return {
    julianDay,
    ayanamsa: { name: input.zodiacMode === "tropical" ? "Tropical" : input.ayanamsa, degrees: ayanamsaDegrees },
    zodiacMode: input.zodiacMode,
    ascendant,
    planets: chartPlanets,
    bhavChalitPlanets,
    points: chartPoints,
    bhavChalitPoints,
    houseCusps,
    interceptedSigns,
    houseCuspSystem: bhavaSystem,
    grahaAvasthas,
    avasthaReport,
    dashas: buildDashaTimeline(
      input.dashaSeed === "ascendant" ? ascendantLongitude
        : input.dashaSeed === "sun" ? planets.find(({ name }) => name === "Sun")?.longitude ?? 0
          : moon.longitude,
      utcDate,
      new Date(),
      3,
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
  const customAyanamsa = input.zodiacMode === "sidereal" && input.ayanamsa === "custom";
  if (input.zodiacMode !== "tropical" && !customAyanamsa) swe.swe_set_sid_mode(AYANAMSA_MODES[input.ayanamsa], 0, 0);
  const siderealFlag = input.zodiacMode !== "tropical" && !customAyanamsa ? swe.SEFLG_SIDEREAL : 0;
  const flags = swe.SEFLG_MOSEPH | swe.SEFLG_SPEED | siderealFlag;
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

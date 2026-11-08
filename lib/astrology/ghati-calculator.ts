import swe from "swisseph";
import { localDateTimeToUtc, shiftLocalDate } from "./timezone";

export interface SunriseResult {
  localDate: string;
  sunriseUtc: Date;
}

export interface GhatiResult {
  birthUtc: string;
  sunriseUtc: string;
  sunriseLocalDate: string;
  elapsedMinutes: number;
  runningGhati: number;
  convention: "ceiling(elapsed minutes / 24)";
}

type RiseResult = { transitTime: number; error?: string };

function toJulianDay(date: Date): number {
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

export function calculateRunningGhati(elapsedMinutes: number): number {
  if (!Number.isFinite(elapsedMinutes) || elapsedMinutes < 0) {
    throw new Error("Elapsed time from sunrise must be a non-negative number of minutes.");
  }
  return Math.ceil(elapsedMinutes / 24);
}

export function selectBirthSunrise(
  birthUtc: Date,
  sunriseOnBirthDate: SunriseResult,
  sunriseOnPreviousDate: SunriseResult,
): SunriseResult {
  return birthUtc.getTime() < sunriseOnBirthDate.sunriseUtc.getTime()
    ? sunriseOnPreviousDate
    : sunriseOnBirthDate;
}

function calculateLocalSunrise(localDate: string, timezone: string, latitude: number, longitude: number): SunriseResult {
  const localMidnightUtc = localDateTimeToUtc(localDate, "00:00:00", timezone);
  const result = swe.swe_rise_trans(
    toJulianDay(localMidnightUtc),
    swe.SE_SUN,
    "",
    swe.SEFLG_MOSEPH,
    swe.SE_CALC_RISE,
    longitude,
    latitude,
    0,
    1013.25,
    15,
  ) as RiseResult;
  if (result.error || !Number.isFinite(result.transitTime)) {
    throw new Error(`Swiss Ephemeris could not calculate local sunrise for ${localDate}: ${result.error ?? "no sunrise event"}`);
  }
  return { localDate, sunriseUtc: new Date((result.transitTime - 2_440_587.5) * 86_400_000) };
}

export function calculateBirthGhati({
  date,
  time,
  timezone,
  latitude,
  longitude,
}: {
  date: string;
  time: string;
  timezone: string;
  latitude: number;
  longitude: number;
}): GhatiResult {
  const birthUtc = localDateTimeToUtc(date, time, timezone);
  const sunriseToday = calculateLocalSunrise(date, timezone, latitude, longitude);
  const sunrisePrevious = birthUtc.getTime() < sunriseToday.sunriseUtc.getTime()
    ? calculateLocalSunrise(shiftLocalDate(date, -1), timezone, latitude, longitude)
    : sunriseToday;
  const sunrise = selectBirthSunrise(birthUtc, sunriseToday, sunrisePrevious);
  const elapsedMinutes = (birthUtc.getTime() - sunrise.sunriseUtc.getTime()) / 60_000;

  return {
    birthUtc: birthUtc.toISOString(),
    sunriseUtc: sunrise.sunriseUtc.toISOString(),
    sunriseLocalDate: sunrise.localDate,
    elapsedMinutes: Number(elapsedMinutes.toFixed(6)),
    runningGhati: calculateRunningGhati(elapsedMinutes),
    convention: "ceiling(elapsed minutes / 24)",
  };
}

import swe from "swisseph";
import { localDateTimeToUtc, shiftLocalDate } from "./timezone";

type RiseResult = { transitTime: number; error?: string };
type HousesResult = { house: number[]; ascendant: number; error?: string };
type SolarEvent = { utc: Date; localDate: string };

const DAY_GULIKA_SEGMENT = [7, 6, 5, 4, 3, 2, 1] as const;
const NIGHT_GULIKA_SEGMENT = [4, 3, 2, 1, 7, 6, 5] as const;

function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

function toJulianDay(date: Date) {
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 +
    (date.getUTCSeconds() + date.getUTCMilliseconds() / 1000) / 3600;
  return swe.swe_julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    hour,
    swe.SE_GREG_CAL,
  );
}

function solarEvent(localDate: string, timezone: string, latitude: number, longitude: number, event: "rise" | "set"): SolarEvent {
  const midnight = localDateTimeToUtc(localDate, "00:00:00", timezone);
  const result = swe.swe_rise_trans(
    toJulianDay(midnight),
    swe.SE_SUN,
    "",
    swe.SEFLG_MOSEPH,
    event === "rise" ? swe.SE_CALC_RISE : swe.SE_CALC_SET,
    longitude,
    latitude,
    0,
    1013.25,
    15,
  ) as RiseResult;
  if (result.error || !Number.isFinite(result.transitTime)) {
    throw new Error(`Swiss Ephemeris could not calculate ${event} for ${localDate}: ${result.error ?? "no solar event"}`);
  }
  return {
    localDate,
    utc: new Date((result.transitTime - 2_440_587.5) * 86_400_000),
  };
}

export function gulikaSegment(weekday: number, isDaytime: boolean): number {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    throw new RangeError("Weekday must be 0 (Sunday) through 6 (Saturday).");
  }
  return isDaytime ? DAY_GULIKA_SEGMENT[weekday] : NIGHT_GULIKA_SEGMENT[weekday];
}

function ascendantAt(date: Date, latitude: number, longitude: number, siderealFlag: number, longitudeOffset: number) {
  const result = swe.swe_houses_ex(toJulianDay(date), siderealFlag, latitude, longitude, "W") as HousesResult;
  if (result.error || !Number.isFinite(result.ascendant)) {
    throw new Error(`Swiss Ephemeris could not calculate the upagraha ascendant: ${result.error ?? "invalid ascendant"}`);
  }
  return normalizeDegrees(result.ascendant + longitudeOffset);
}

export function calculateGulikaMandi({
  date,
  time,
  timezone,
  latitude,
  longitude,
  siderealFlag,
  longitudeOffset,
}: {
  date: string;
  time: string;
  timezone: string;
  latitude: number;
  longitude: number;
  siderealFlag: number;
  longitudeOffset: number;
}) {
  const birthUtc = localDateTimeToUtc(date, time, timezone);
  let sunrise = solarEvent(date, timezone, latitude, longitude, "rise");
  let sunset = solarEvent(date, timezone, latitude, longitude, "set");
  let isDaytime = birthUtc >= sunrise.utc && birthUtc < sunset.utc;

  if (birthUtc < sunrise.utc) {
    const previousDate = shiftLocalDate(date, -1);
    sunrise = solarEvent(date, timezone, latitude, longitude, "rise");
    sunset = solarEvent(previousDate, timezone, latitude, longitude, "set");
    isDaytime = false;
  } else if (birthUtc >= sunset.utc) {
    sunrise = solarEvent(shiftLocalDate(date, 1), timezone, latitude, longitude, "rise");
    sunset = solarEvent(date, timezone, latitude, longitude, "set");
    isDaytime = false;
  }

  const intervalStart = isDaytime ? solarEvent(date, timezone, latitude, longitude, "rise").utc : sunset.utc;
  const intervalEnd = isDaytime ? solarEvent(date, timezone, latitude, longitude, "set").utc : sunrise.utc;
  const weekdayDate = isDaytime || birthUtc >= solarEvent(date, timezone, latitude, longitude, "set").utc
    ? date
    : shiftLocalDate(date, -1);
  const weekday = new Date(`${weekdayDate}T00:00:00Z`).getUTCDay();
  const segmentDuration = (intervalEnd.getTime() - intervalStart.getTime()) / 8;
  if (!(segmentDuration > 0)) throw new Error("Solar day/night interval is invalid for upagraha calculation.");
  const segmentStart = intervalStart.getTime() + (gulikaSegment(weekday, isDaytime) - 1) * segmentDuration;
  const gulikaUtc = new Date(segmentStart);
  const mandiUtc = new Date(segmentStart + segmentDuration / 2);

  return {
    gulikaLongitude: ascendantAt(gulikaUtc, latitude, longitude, siderealFlag, longitudeOffset),
    mandiLongitude: ascendantAt(mandiUtc, latitude, longitude, siderealFlag, longitudeOffset),
    gulikaUtc: gulikaUtc.toISOString(),
    mandiUtc: mandiUtc.toISOString(),
    weekday,
    segment: gulikaSegment(weekday, isDaytime),
    isDaytime,
    convention: "Gulika at the start and Mandi at the midpoint of Saturn's 1/8 solar segment",
  };
}

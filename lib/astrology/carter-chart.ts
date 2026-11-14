import { carterCusps } from "./engines/carter";
import type { CarterZodiac } from "@/lib/kundali-types";
import { houseOf } from "./engines/carter";
import { localDateTimeToUtc } from "./timezone";

export interface CarterChartSource {
  input: {
    date: string;
    time: string;
    lat: number;
    lng: number;
    timezone: string;
  };
  ayanamsa: { degrees: number };
}

export function getTimezoneOffsetHours(date: string, time: string, timezone: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  const localAsUtc = new Date(0);
  localAsUtc.setUTCFullYear(year, month - 1, day);
  localAsUtc.setUTCHours(hour, minute, second, 0);
  const utc = localDateTimeToUtc(date, time, timezone);
  return (localAsUtc.getTime() - utc.getTime()) / 3_600_000;
}

export function calculateCarterCusps(data: CarterChartSource) {
  return carterCusps({
    date: data.input.date,
    time: data.input.time,
    tzHours: getTimezoneOffsetHours(data.input.date, data.input.time, data.input.timezone),
    longitude: data.input.lng,
    latitude: data.input.lat,
    ayanamsaOverride: data.ayanamsa.degrees,
  });
}

export function getCarterPlacementCusps(
  result: ReturnType<typeof carterCusps>,
  zodiacMode: CarterZodiac,
) {
  return result.cusps.map((cusp) => zodiacMode === "nirayanaB" ? cusp.nirayanaB : cusp.nirayanaA);
}

export function placeInCarterHouses<T extends { longitude: number }>(positions: T[], cuspLongitudes: number[]) {
  return positions.map((position) => ({
    ...position,
    house: houseOf(position.longitude, cuspLongitudes),
  }));
}

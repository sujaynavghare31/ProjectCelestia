import { carterCusps, type CuspMethod } from "./engines/carter";
import type { CarterZodiac } from "@/lib/kundali-types";
import { houseOf } from "./engines/carter";
import { getTimezoneOffsetHours } from "./timezone";
export { getTimezoneOffsetHours } from "./timezone";

export interface CarterChartSource {
  input: {
    date: string;
    time: string;
    lat: number;
    lng: number;
    timezone: string;
  };
  ayanamsa: { degrees: number };
  /** Defaults to "ascPlus30"; "raSteps" preserves the previous RA-per-house calculation. */
  cuspMethod?: CuspMethod;
}

export function calculateCarterCusps(data: CarterChartSource) {
  return carterCusps({
    date: data.input.date,
    time: data.input.time,
    tzHours: getTimezoneOffsetHours(data.input.date, data.input.time, data.input.timezone),
    longitude: data.input.lng,
    latitude: data.input.lat,
    ayanamsaOverride: data.ayanamsa.degrees,
    cuspMethod: data.cuspMethod ?? "ascPlus30",
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

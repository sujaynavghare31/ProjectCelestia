import { carterCusps, houseOf, placementCusps, type CuspZodiac, type HouseSystem } from "./engines/carter";
import type { CarterZodiac } from "@/lib/kundali-types";
import { getTimezoneOffsetHours } from "./timezone";
export { getTimezoneOffsetHours } from "./timezone";

export const DEFAULT_HOUSE_SYSTEM: HouseSystem = "equal";

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
  system: HouseSystem = DEFAULT_HOUSE_SYSTEM,
) {
  return placementCusps(result, system, zodiacMode as CuspZodiac).map((longitude, index) => ({
    house: index + 1,
    longitude,
  }));
}

export function placeInCarterHouses<T extends { longitude: number }>(positions: T[], cuspLongitudes: number[]) {
  return positions.map((position) => ({
    ...position,
    house: houseOf(position.longitude, cuspLongitudes),
  }));
}

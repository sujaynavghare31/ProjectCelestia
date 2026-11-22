import { getTimezoneOffsetHours } from "@/lib/astrology/timezone";
import type { BirthInput } from "@/src/lib/matchmaking/astro";
import { formatPlaceLabel, type Place } from "./place";

export interface MatchBirthDetails {
  name: string;
  date: string;
  time: string;
  place: Place;
}

export function matchBirthInput(person: MatchBirthDetails): BirthInput & { name: string; placeName: string } {
  const tzHours = getTimezoneOffsetHours(person.date, person.time, person.place.timezone);
  return {
    name: person.name,
    date: person.date,
    time: person.time,
    tzHours,
    latitude: person.place.latitude,
    longitude: person.place.longitude,
    placeName: formatPlaceLabel(person.place),
  };
}

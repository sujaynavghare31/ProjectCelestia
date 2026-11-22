import { mod } from "./constants";

export type AscendantAt = (dateTimeMs: number) => number;

export interface TimeUpagrahaInput {
  birthMs: number;
  sunriseMs: number;
  sunsetMs: number;
  nextSunriseMs: number;
  weekday: number;
  upagrahaPoint?: "start" | "middle";
}

export interface UpagrahaInput extends TimeUpagrahaInput {
  ascendantAt: AscendantAt;
}

export interface TimeUpagraha {
  name: string;
  planet: number;
  startMinutes: number;
  momentMs: number;
  longitude: number;
}

const DAY_LORDS = [0, 1, 2, 3, 4, 5, 6] as const;
const TIME_UPAGRAHAS = [
  { name: "Kala", planet: 0 },
  { name: "Mrityu", planet: 2 },
  { name: "Ardhaprahara", planet: 3 },
  { name: "Yamaghantaka", planet: 4 },
  { name: "Gulika", planet: 6 },
] as const;

export function sunUpagrahas(sunLongitude: number): Record<"dhuma" | "vyatipata" | "parivesha" | "indrachapa" | "upaketu", number> {
  const dhuma = mod(sunLongitude + 133 + 20 / 60, 360);
  const vyatipata = mod(360 - dhuma, 360);
  const parivesha = mod(vyatipata + 180, 360);
  const indrachapa = mod(360 - parivesha, 360);
  const upaketu = mod(indrachapa + 16 + 40 / 60, 360);
  return { dhuma, vyatipata, parivesha, indrachapa, upaketu };
}

export function weekdayAtSunrise(utcWeekday: number, birthMinutes: number, sunriseMinutes: number): number {
  const weekday = mod(utcWeekday, 7);
  return birthMinutes < sunriseMinutes ? mod(weekday - 1, 7) : weekday;
}

export function timeUpagrahaMoments(input: TimeUpagrahaInput): Omit<TimeUpagraha, "longitude">[] {
  const { birthMs, sunriseMs, sunsetMs, nextSunriseMs } = input;
  if (![birthMs, sunriseMs, sunsetMs, nextSunriseMs].every(Number.isFinite)
    || !(sunriseMs < sunsetMs && sunsetMs < nextSunriseMs)
    || birthMs < sunriseMs
    || birthMs >= nextSunriseMs) {
    throw new Error("Time-based upagrahas require ordered sunrise, sunset, next sunrise, and birth instants.");
  }

  const isDay = birthMs < sunsetMs;
  const startMs = isDay ? sunriseMs : sunsetMs;
  const endMs = isDay ? sunsetMs : nextSunriseMs;
  const partLengthMs = (endMs - startMs) / 8;
  const weekdayLord = mod(input.weekday, 7);
  const firstLord = isDay ? DAY_LORDS[weekdayLord] : mod(weekdayLord + 4, 7);
  const partStart = (planet: number) => {
    const partIndex = mod(planet - firstLord, 7);
    return startMs + partIndex * partLengthMs;
  };
  const pointOffset = input.upagrahaPoint === "middle" ? partLengthMs / 2 : 0;
  const positions: Omit<TimeUpagraha, "longitude">[] = TIME_UPAGRAHAS.map((upagraha) => {
    const momentMs = partStart(upagraha.planet) + pointOffset;
    return {
      ...upagraha,
      momentMs,
      startMinutes: ((momentMs - sunriseMs) / 60_000 % 1440 + 1440) % 1440,
    };
  });
  const saturnPartStart = partStart(6);
  const mandiMs = saturnPartStart + partLengthMs / 2;
  positions.push({
    name: "Mandi",
    planet: 6,
    momentMs: mandiMs,
    startMinutes: ((mandiMs - sunriseMs) / 60_000 % 1440 + 1440) % 1440,
  });
  return positions;
}

export function timeUpagrahas(input: UpagrahaInput): TimeUpagraha[] {
  return timeUpagrahaMoments(input).map((upagraha) => ({
    ...upagraha,
    longitude: mod(input.ascendantAt(upagraha.momentMs), 360),
  }));
}

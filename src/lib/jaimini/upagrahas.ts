import { mod, sign } from "./constants";

export type AscendantAt = (dateTimeMs: number) => number;

export interface UpagrahaInput {
  sunLongitude: number;
  birthMs: number;
  birthMinutes: number;
  sunriseMinutes: number;
  sunsetMinutes: number;
  weekday: number;
  ascendantAt: AscendantAt;
  mandiMiddle?: boolean;
}

export interface TimeUpagraha {
  name: string;
  planet: number;
  startMinutes: number;
  longitude: number;
}

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

export function timeUpagrahas(input: UpagrahaInput): TimeUpagraha[] {
  const wd = mod(input.weekday, 7);
  const isDay = input.birthMinutes >= input.sunriseMinutes && input.birthMinutes < input.sunsetMinutes;
  const dayStart = [0, 1, 2, 3, 4, 5, 6];
  const nightStart = mod(wd + 4, 7);
  const startLord = isDay ? dayStart[wd] : nightStart;
  const start = isDay ? input.sunriseMinutes : input.sunsetMinutes;
  const length = isDay
    ? (input.sunsetMinutes - input.sunriseMinutes) / 8
    : mod(input.sunriseMinutes + 1440 - input.sunsetMinutes, 1440) / 8;
  const definitions = [
    { name: "Kala", planet: 0 },
    { name: "Mrityu", planet: 2 },
    { name: "Ardhaprahara", planet: 3 },
    { name: "Yamaghantaka", planet: 4 },
    { name: "Gulika", planet: 6 },
  ];
  return definitions.map((d) => {
    const part = mod(d.planet - startLord, 7) + 1;
    let startMinutes = start + (part - 1) * length;
    if (d.name === "Gulika" && input.mandiMiddle) startMinutes += length / 2;
    const dateTimeMs = input.birthMs + (startMinutes - input.birthMinutes) * 60000;
    return { ...d, startMinutes: mod(startMinutes, 1440), longitude: mod(input.ascendantAt(dateTimeMs), 360) };
  });
}

import { DEFAULT_TIMING_CONFIG, mergeTimingConfig } from "./config";
import { derivePosition, normalizeLongitude, SIGN_LORDS } from "../avastha/graha";
import { GRAHAS } from "../avastha/types";
import type { Graha } from "../avastha/types";
import type { TimingChart, TimingInput, TimingPlanetInfo } from "./types";

export const TIMING_ENGINE_VERSION = "1.0.0";
export const YEAR_LENGTH_DAYS: Record<TimingChart["config"]["yearLength"], number> = {
  "solar365.2425": 365.2425,
  savana360: 360,
  "sidereal365.256363": 365.256363,
};

export function addYears(date: Date, years: number, yearLength: TimingChart["config"]["yearLength"] = DEFAULT_TIMING_CONFIG.yearLength) {
  return new Date(date.getTime() + years * YEAR_LENGTH_DAYS[yearLength] * 86_400_000);
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

export function getTimingChart(input: TimingInput): TimingChart {
  if (!input || !Array.isArray(input.planets) || input.planets.length !== GRAHAS.length) {
    throw new Error("Exactly one position for each of the nine grahas is required.");
  }
  const planets: TimingPlanetInfo[] = input.planets.map((entry) => {
    if (!GRAHAS.includes(entry.planet) || !Number.isFinite(entry.longitude) || entry.longitude < 0 || entry.longitude >= 360 ||
        !Number.isFinite(entry.speed)) {
      throw new Error("Each planet requires a supported name, a longitude in [0, 360), and finite speed.");
    }
    const position = derivePosition(entry.longitude);
    return {
      planet: entry.planet,
      sign: position.sign,
      degree: position.degree,
      house: 1,
      speed: entry.speed,
      longitude: normalizeLongitude(entry.longitude),
    };
  });
  if (new Set(planets.map(({ planet }) => planet)).size !== GRAHAS.length) throw new Error("Each graha must appear exactly once.");
  if (!Number.isFinite(input.ascendantLongitude) || input.ascendantLongitude < 0 || input.ascendantLongitude >= 360) {
    throw new Error("ascendantLongitude must be in [0, 360).");
  }
  const birth = new Date(input.birthDateTimeUTC);
  if (!Number.isFinite(birth.getTime())) throw new Error("birthDateTimeUTC must be a valid ISO datetime.");
  if (!input.timezone || !isValidTimezone(input.timezone)) throw new Error("timezone must be a valid IANA timezone.");
  const config = mergeTimingConfig(input.config);
  const lagnaSign = derivePosition(input.ascendantLongitude).sign;
  for (const planet of planets) planet.house = signDistance(lagnaSign, planet.sign);
  const from = input.fromDate ? new Date(input.fromDate) : birth;
  const to = input.toDate ? new Date(input.toDate) : addYears(birth, 120, config.yearLength);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || to <= from) throw new Error("fromDate/toDate must define a valid increasing date range.");
  return { input, birth, from, to, lagnaSign, planets, byPlanet: new Map(planets.map((planet) => [planet.planet, planet])), config };
}

export function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function signDistance(fromSign: number, toSign: number) {
  return ((toSign - fromSign + 12) % 12) + 1;
}

export function signAt(startSign: number, offset: number) {
  return ((startSign - 1 + offset + 1200) % 12) + 1;
}

export function getSignLord(sign: number): Graha {
  const lord = SIGN_LORDS[sign];
  if (!lord) throw new Error(`Unknown sign number ${sign}.`);
  return lord;
}

export function getJaiminiSignAspects(sign: number) {
  const modality = sign % 3;
  const result: number[] = [];
  for (let other = 1; other <= 12; other += 1) {
    if (other === sign) continue;
    if (modality === 1 && other % 3 === 2 && signDistance(sign, other) !== 2 && signDistance(sign, other) !== 12) result.push(other);
    else if (modality === 2 && other % 3 === 1 && signDistance(sign, other) !== 2 && signDistance(sign, other) !== 12) result.push(other);
    else if (modality === 0 && other % 3 === 0) result.push(other);
  }
  return result;
}

export function getPlanetAt(chart: TimingChart, planet: Graha) {
  const result = chart.byPlanet.get(planet);
  if (!result) throw new Error(`Chart is missing ${planet}.`);
  return result;
}

export function getDashaSeedLongitude(chart: TimingChart) {
  const seed = chart.input.dashaSeed ?? "moon";
  if (seed === "ascendant") return chart.input.ascendantLongitude;
  if (seed === "sun") return getPlanetAt(chart, "Sun").longitude;
  if (seed === "ascendant-lord") return getPlanetAt(chart, getSignLord(chart.lagnaSign)).longitude;
  return getPlanetAt(chart, "Moon").longitude;
}

export function localDisplay(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function dedupePlanets(planets: Graha[]) {
  return [...new Set(planets)];
}

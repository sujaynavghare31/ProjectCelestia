import { calculateNadiTimeline } from "./timeline";
import { calculateSwissTransit } from "./swiss-transit-provider";
import { getTimingChart, YEAR_LENGTH_DAYS } from "./core";
import type { Graha } from "../avastha/types";
import type { NadiYearView, TimingInput } from "./types";

export interface NadiProgressedPlanet {
  planet: Graha;
  natalLongitude: number;
  progressedLongitude: number;
  progressedSign: number;
  progressedDegree: number;
  natalHouse: number;
  progressedHouse: number;
  signAtOnePerTwelveYears: number;
}

export interface NadiEngineResult {
  system: "nadi";
  title: "Nadi Progression";
  ageYears: number;
  lagnaSign: number;
  activeBcpHouse: number;
  progressedPlanets: NadiProgressedPlanet[];
  timeline: NadiYearView[];
}

const DAY_MS = 86_400_000;

function normalizeLongitude(longitude: number) {
  return ((longitude % 360) + 360) % 360;
}

export async function calculateNadiSystem(input: TimingInput, now = new Date()): Promise<NadiEngineResult> {
  const chart = getTimingChart(input);
  const timeline = await calculateNadiTimeline(input, calculateSwissTransit);
  const ageYears = (now.getTime() - chart.birth.getTime()) / (YEAR_LENGTH_DAYS[chart.config.yearLength] * DAY_MS);
  const elapsedYears = Math.max(0, ageYears);
  const activeBcpHouse = (Math.floor(elapsedYears) % 12) + 1;
  const progressedPlanets = chart.planets.map((planet) => {
    const progressedLongitude = normalizeLongitude(planet.longitude + elapsedYears);
    const progressedSign = Math.floor(progressedLongitude / 30) + 1;
    const progressedHouse = ((planet.house - 1 + Math.floor(elapsedYears / 12)) % 12) + 1;
    return {
      planet: planet.planet,
      natalLongitude: planet.longitude,
      progressedLongitude,
      progressedSign,
      progressedDegree: progressedLongitude % 30,
      natalHouse: planet.house,
      progressedHouse,
      signAtOnePerTwelveYears: ((planet.sign - 1 + Math.floor(elapsedYears / 12)) % 12) + 1,
    };
  });
  return {
    system: "nadi",
    title: "Nadi Progression",
    ageYears: Math.max(0, ageYears),
    lagnaSign: chart.lagnaSign,
    activeBcpHouse,
    progressedPlanets,
    timeline,
  };
}

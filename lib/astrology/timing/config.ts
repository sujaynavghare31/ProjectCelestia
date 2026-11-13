import type { TimingConfig } from "./types";

export const DEFAULT_TIMING_CONFIG: TimingConfig = {
  yearLength: "solar365.2425",
  charaMethod: "KNRao",
  charaExaltAdjust: true,
  dualLordRule: "KNRao",
  adDirection: "byMDSign",
  charaLevels: 2,
  karakaScheme: 7,
  sankataLord: "Rahu",
  bcpPlanetProgression: true,
  bcpYearBoundary: "birthday",
  bnnStepDays: 30,
  bnnIncludeRetroPrevSign: true,
  bnnExchange: true,
  bnnTransitPlanets: ["Jupiter", "Saturn", "Rahu", "Ketu"],
  bbOrb: 1,
  nadiModules: ["BCP", "BNN_TRANSIT", "BHRIGU_BINDU"],
};

export function mergeTimingConfig(partial: Partial<TimingConfig> = {}): TimingConfig {
  const config = { ...DEFAULT_TIMING_CONFIG, ...partial };
  if (!Number.isFinite(config.bnnStepDays) || config.bnnStepDays < 1 || config.bnnStepDays > 366) {
    throw new Error("bnnStepDays must be between 1 and 366.");
  }
  if (!Number.isFinite(config.bbOrb) || config.bbOrb < 0 || config.bbOrb > 15) {
    throw new Error("bbOrb must be between 0 and 15 degrees.");
  }
  return config;
}

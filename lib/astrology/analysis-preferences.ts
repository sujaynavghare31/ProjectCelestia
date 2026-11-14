import { PLANET_ORDER } from "./engines/midpoints";
import type { MidpointMode } from "./engines/midpoints";
import type { CarterZodiac, HouseSystem, MidpointPreferences } from "@/lib/kundali-types";

const STORAGE_KEY = "celestia-analysis-preferences";
const MIDPOINT_MODES: MidpointMode[] = ["conjunction", "conjOpp", "hard", "hard45"];
const CUSP_RECEIVERS: MidpointPreferences["cuspReceivers"][] = ["axes", "all", "none"];

export interface AnalysisPreferences {
  houseSystem: HouseSystem;
  carterZodiac: CarterZodiac;
  midpointPreferences: MidpointPreferences;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readMidpointPreferences(value: unknown, fallback: MidpointPreferences): MidpointPreferences {
  if (!isRecord(value)) return fallback;
  const validPlanetFilters = ["all", "Ascendant", "MC", ...PLANET_ORDER];
  const isOrb = (orb: unknown): orb is number => typeof orb === "number" && Number.isFinite(orb) && orb >= 0 && orb <= 30;
  return {
    mode: MIDPOINT_MODES.includes(value.mode as MidpointMode) ? value.mode as MidpointMode : fallback.mode,
    orbConjOpp: isOrb(value.orbConjOpp) ? value.orbConjOpp : fallback.orbConjOpp,
    orbSquare: isOrb(value.orbSquare) ? value.orbSquare : fallback.orbSquare,
    orbSemi: isOrb(value.orbSemi) ? value.orbSemi : fallback.orbSemi,
    cuspReceivers: CUSP_RECEIVERS.includes(value.cuspReceivers as MidpointPreferences["cuspReceivers"])
      ? value.cuspReceivers as MidpointPreferences["cuspReceivers"]
      : fallback.cuspReceivers,
    includeKetu: typeof value.includeKetu === "boolean" ? value.includeKetu : fallback.includeKetu,
    onlyActivated: typeof value.onlyActivated === "boolean" ? value.onlyActivated : fallback.onlyActivated,
    dialSort: typeof value.dialSort === "boolean" ? value.dialSort : fallback.dialSort,
    planetFilter: typeof value.planetFilter === "string" && validPlanetFilters.includes(value.planetFilter)
      ? value.planetFilter
      : fallback.planetFilter,
    showAllTrees: typeof value.showAllTrees === "boolean" ? value.showAllTrees : fallback.showAllTrees,
  };
}

export function readAnalysisPreferences(fallback: AnalysisPreferences): AnalysisPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed)) throw new Error("Stored analysis preferences must be an object.");
    return {
      houseSystem: parsed.houseSystem === "carter" || parsed.houseSystem === "placidus" ? parsed.houseSystem : fallback.houseSystem,
      carterZodiac: parsed.carterZodiac === "sayana" || parsed.carterZodiac === "nirayanaA" || parsed.carterZodiac === "nirayanaB"
        ? parsed.carterZodiac
        : fallback.carterZodiac,
      midpointPreferences: readMidpointPreferences(parsed.midpointPreferences, fallback.midpointPreferences),
    };
  } catch (error) {
    console.error("[kundali] Unable to read saved analysis preferences.", error);
    return null;
  }
}

export function writeAnalysisPreferences(preferences: AnalysisPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error("[kundali] Unable to save analysis preferences.", error);
  }
}

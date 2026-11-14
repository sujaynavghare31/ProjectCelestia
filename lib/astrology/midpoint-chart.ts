import {
  MODE_LABELS,
  PLANET_ORDER,
  SHORT,
  activatedOnly,
  midpointReport,
  sortByDial,
  type MidpointReportInput,
} from "./engines/midpoints";
import type { MidpointPreferences } from "@/lib/kundali-types";
import type { EphemerisResponse } from "@/lib/kundali-types";

type MidpointChartSource = {
  input: Pick<EphemerisResponse["input"], "zodiacMode">;
  planets: EphemerisResponse["planets"];
  ascendant: EphemerisResponse["ascendant"];
  mc: EphemerisResponse["mc"];
  houseCusps: EphemerisResponse["houseCusps"];
};

export function createMidpointReport(data: MidpointChartSource | null, preferences: MidpointPreferences) {
  if (!data || data.input.zodiacMode === "tropical") return null;

  const planets: NonNullable<MidpointReportInput["planets"]> = {};
  for (const name of PLANET_ORDER) {
    if (name === "Ketu") continue;
    const position = data.planets.find((planet) => planet.name === name);
    if (!position) throw new Error(`The chart is missing ${name}, required for midpoint analysis.`);
    planets[name] = { longitude: position.longitude, speed: position.speed };
  }

  return midpointReport({
    planets,
    ascendant: data.ascendant.longitude,
    mc: data.mc.longitude,
    cusps: data.houseCusps.map(({ longitude }) => longitude),
    usePairs: { Ketu: preferences.includeKetu },
    cuspReceivers: preferences.cuspReceivers,
    settings: {
      mode: preferences.mode,
      orbConjOpp: preferences.orbConjOpp,
      orbSquare: preferences.orbSquare,
      orbSemi: preferences.orbSemi,
    },
  });
}

export type MidpointChartReport = NonNullable<ReturnType<typeof createMidpointReport>>;

export function visibleMidpointRows(report: MidpointChartReport, preferences: MidpointPreferences) {
  const rows = preferences.dialSort ? sortByDial(report.midpoints) : report.midpoints.filter(({ active }) => active);
  const filteredRows = preferences.onlyActivated ? activatedOnly(rows) : rows;
  if (preferences.planetFilter === "all") return filteredRows;
  const short = preferences.planetFilter === "Ascendant"
    ? "As"
    : SHORT[preferences.planetFilter] ?? preferences.planetFilter;
  return filteredRows.filter((row) =>
    row.a === short
    || row.b === short
    || row.activations.some(({ receiver }) => receiver === short),
  );
}

export function visibleMidpointTrees(report: MidpointChartReport, showAll: boolean) {
  return showAll ? report.trees : report.trees.filter(({ count }) => count > 0);
}

export const MIDPOINT_MODE_LABELS = MODE_LABELS;

import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, type MidpointSettings } from "./engines/midpoints";
import { createMidpointReport, visibleMidpointRows } from "./midpoint-chart";
import type { MidpointPreferences } from "@/lib/kundali-types";

const positions = {
  Sun: 151.535447,
  Moon: 259.751114,
  Mars: 277.663322,
  Mercury: 149.403425,
  Jupiter: 205.758033,
  Venus: 191.718867,
  Saturn: 248.548519,
  Rahu: 100.604294,
  Uranus: 7.765964,
  Neptune: 320.667433,
  Pluto: 264.679819,
};

const preferences: MidpointPreferences = {
  ...DEFAULT_SETTINGS,
  cuspReceivers: "axes",
  includeKetu: false,
  onlyActivated: false,
  dialSort: false,
  planetFilter: "all",
  showAllTrees: false,
};

function exampleChart() {
  const planets = Object.entries(positions).map(([name, longitude]) => ({
    id: name.toLowerCase(),
    name,
    symbol: name.slice(0, 2),
    longitude,
    sign: 0,
    signName: "Aries",
    degree: 0,
    speed: 0,
    motion: "D" as const,
    declination: 0,
    nakshatra: 1,
    nakshatraName: "Ashwini",
    pada: 1,
    nakshatraLord: "Ketu",
    house: 1,
    dignity: "Neutral",
  }));
  const point = {
    id: "point",
    name: "Ascendant",
    symbol: "As",
    longitude: 8.703172,
    sign: 0,
    signName: "Aries",
    degree: 8.703172,
    speed: 0,
    motion: "D" as const,
    declination: 0,
    nakshatra: 1,
    nakshatraName: "Ashwini",
    pada: 1,
    nakshatraLord: "Ketu",
    house: 1,
    dignity: "Neutral",
  };
  return {
    input: { zodiacMode: "sidereal" as const },
    planets,
    ascendant: point,
    mc: { ...point, id: "mc", name: "MC", symbol: "MC", longitude: 270.228605 },
    houseCusps: Array.from({ length: 12 }, (_, index) => ({
      house: index + 1,
      longitude: index * 30,
      sign: index,
      signName: "Aries",
    })),
  };
}

describe("midpoint chart integration", () => {
  it("matches the sample chart's first midpoint and activation", () => {
    const report = createMidpointReport(exampleChart(), preferences);
    expect(report?.midpoints[0]).toMatchObject({
      label: "Su/Mo",
      text: "Libra 25° 38′ 35.81″",
      activationsText: "Ju ☌ 0.11°",
    });
  });

  it("updates the visible results when the mode changes", () => {
    const chart = exampleChart();
    const defaultReport = createMidpointReport(chart, preferences);
    const conjunctionSettings: MidpointSettings = { ...DEFAULT_SETTINGS, mode: "conjunction" };
    const conjunctionReport = createMidpointReport(chart, { ...preferences, ...conjunctionSettings });

    expect(defaultReport?.midpoints.some((row) => row.activations.some(({ angle }) => angle === 45))).toBe(true);
    expect(conjunctionReport?.midpoints.some((row) => row.activations.some(({ angle }) => angle === 45))).toBe(false);
    expect(conjunctionReport?.settings.mode).toBe("conjunction");
  });

  it("filters midpoint rows by pair membership or activation", () => {
    const report = createMidpointReport(exampleChart(), preferences);
    expect(report).not.toBeNull();
    expect(visibleMidpointRows(report!, { ...preferences, planetFilter: "Jupiter" }).every((row) =>
      row.a === "Ju" || row.b === "Ju" || row.activations.some(({ receiver }) => receiver === "Ju"),
    )).toBe(true);
  });

  it("does not treat tropical positions as sidereal midpoint inputs", () => {
    expect(createMidpointReport({ ...exampleChart(), input: { zodiacMode: "tropical" } }, preferences)).toBeNull();
  });
});

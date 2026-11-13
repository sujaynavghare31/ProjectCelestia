import { describe, expect, it } from "vitest";
import { calculateDashaSystem, calculateNadiSystem, ASHTOTTARI_SEQUENCE } from "./DashaEngine";
import type { Graha } from "../avastha/types";
import type { TimingInput } from "./types";

const GRAHAS: Graha[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

function chart(moonLongitude: number, toDate = "2120-01-01T00:00:00.000Z"): TimingInput {
  return {
    birthDateTimeUTC: "2000-01-01T00:00:00.000Z",
    timezone: "UTC",
    ascendantLongitude: 1,
    planets: GRAHAS.map((planet, index) => ({
      planet,
      longitude: planet === "Moon" ? moonLongitude : (index * 37 + 20) % 360,
      speed: planet === "Rahu" || planet === "Ketu" ? -1 : 1,
    })),
    fromDate: "2000-01-01T00:00:00.000Z",
    toDate,
  };
}

describe("Unified DashaEngine", () => {
  it("generates a 120-year Vimshottari timeline from the Moon's exact nakshatra fraction", () => {
    const result = calculateDashaSystem("vimshottari", chart(0));
    expect(result.periods[0].lord).toBe("Ketu");
    expect(result.nakshatra).toMatchObject({ number: 1, name: "Ashwini", progress: 0 });
    expect(result.cycleYears).toBe(120);
    expect(result.periods[0].start).toBe("2000-01-01T00:00:00.000Z");
    expect(result.periods[0].subPeriods).toHaveLength(9);
    expect(result.periods[0].subPeriods[0].lord).toBe("Ketu");
    expect(new Date(result.periods.at(-1)!.end).getTime()).toBeGreaterThanOrEqual(Date.parse("2120-01-01T00:00:00.000Z"));
  });

  it("starts Ashtottari with Sun for Krittika and uses the 108-year sequence", () => {
    const result = calculateDashaSystem("ashtottari", chart(360 / 27 * 2));
    expect(ASHTOTTARI_SEQUENCE.map(({ lord }) => lord)).toEqual(["Sun", "Moon", "Mars", "Mercury", "Saturn", "Jupiter", "Rahu", "Venus"]);
    expect(result.periods[0].lord).toBe("Sun");
    expect(result.cycleYears).toBe(108);
    expect(result.nakshatra?.name).toBe("Krittika");
  });

  it("uses the established Yogini and Jaimini engines with the shared timeline shape", () => {
    const yogini = calculateDashaSystem("yogini", chart(0));
    const chara = calculateDashaSystem("chara", chart(0));
    expect(yogini.periods[0].name).toBe("Maha Dasha");
    expect(yogini.periods[0].subPeriods.length).toBeGreaterThan(0);
    expect(yogini.cycleYears).toBe(36);
    expect(chara.periods[0].name).toBe("Maha Dasha");
    expect(chara.periods[0].subPeriods.length).toBeGreaterThan(0);
  });

  it("calculates progressed longitudes at one degree per year and sign shifts per twelve years", async () => {
    const result = await calculateNadiSystem(chart(0, "2120-01-01T00:00:00.000Z"), new Date("2012-01-01T00:00:00.000Z"));
    expect(result.ageYears).toBeCloseTo(12, 3);
    expect(result.activeBcpHouse).toBe(1);
    const moon = result.progressedPlanets.find(({ planet }) => planet === "Moon")!;
    expect(moon.progressedLongitude).toBeCloseTo(12, 3);
    expect(moon.signAtOnePerTwelveYears).toBe(2);
    expect(moon.progressedHouse).toBe(2);
  });
});

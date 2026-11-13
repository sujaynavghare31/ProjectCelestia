import { describe, expect, it } from "vitest";
import { calculateAvasthaReport, calculateShayanadiState, getPlanetaryRelationship } from "./engine";
import { GRAHAS } from "./types";
import type { AvasthaPlanet, Graha } from "./types";

function makeInput(overrides: Partial<Record<Graha, { longitude: number; speed?: number }>> = {}) {
  const planets: AvasthaPlanet[] = GRAHAS.map((planet, index) => ({
    planet,
    longitude: overrides[planet]?.longitude ?? (index * 37 + 3),
    speed: overrides[planet]?.speed ?? 1,
  }));
  return {
    planets,
    ascendantLongitude: 0,
    birthDateTimeUTC: "2000-01-01T12:00:00.000Z",
    sunriseUTC: "2000-01-01T06:00:00.000Z",
  };
}

function byPlanet(report: ReturnType<typeof calculateAvasthaReport>, planet: Graha) {
  const result = report.planets.find((position) => position.planet === planet);
  if (!result) throw new Error(`${planet} is missing from Avastha report.`);
  return result;
}

describe("calculateAvasthaReport", () => {
  it("applies Baladi segments and odd/even sign ordering at exact boundaries", () => {
    const cases: Array<{ longitude: number; expected: string }> = [
      { longitude: 3, expected: "Bala" },
      { longitude: 33, expected: "Mrita" },
      { longitude: 15, expected: "Yuva" },
      { longitude: 6, expected: "Kumara" },
      { longitude: 89.99, expected: "Mrita" },
      { longitude: 119.99, expected: "Bala" },
    ];
    for (const { longitude, expected } of cases) {
      const report = calculateAvasthaReport(makeInput({ Sun: { longitude } }));
      expect(byPlanet(report, "Sun").baladi.state).toBe(expected);
    }
  });

  it("applies Jagrat, Swapna, and Sushupti precedence", () => {
    const exaltedJupiter = calculateAvasthaReport(makeInput({ Jupiter: { longitude: 95 } }));
    const debilitatedSun = calculateAvasthaReport(makeInput({
      Sun: { longitude: 190 },
      Moon: { longitude: 90 },
      Venus: { longitude: 65 },
      Mars: { longitude: 345 },
    }));
    const friendlyMoon = calculateAvasthaReport(makeInput({ Moon: { longitude: 65 } }));
    expect(byPlanet(exaltedJupiter, "Jupiter").jagradadi.state).toBe("Jagrat");
    expect(byPlanet(debilitatedSun, "Sun").jagradadi.state).toBe("Sushupti");
    expect(byPlanet(friendlyMoon, "Moon").jagradadi.state).toBe("Swapna");
  });

  it("uses configured direct and retrograde Venus combustion orbs", () => {
    const direct = calculateAvasthaReport(makeInput({
      Sun: { longitude: 10 },
      Venus: { longitude: 19, speed: 1 },
    }));
    const retrograde = calculateAvasthaReport(makeInput({
      Sun: { longitude: 10 },
      Venus: { longitude: 19, speed: -1 },
    }));
    expect(byPlanet(direct, "Venus").isCombust).toBe(true);
    expect(byPlanet(retrograde, "Venus").isCombust).toBe(false);
  });

  it("returns both fifth-house Lajjita and Saturn Kshudhita states", () => {
    const report = calculateAvasthaReport(makeInput({
      Saturn: { longitude: 121 },
      Venus: { longitude: 123 },
    }));
    expect(byPlanet(report, "Venus").house).toBe(5);
    expect(byPlanet(report, "Venus").lajjitadi?.map(({ state }) => state)).toEqual(expect.arrayContaining(["Lajjita", "Kshudhita"]));
  });

  it("returns Garvita for an exalted planet and Kshobhita for an aspected solar conjunction", () => {
    const report = calculateAvasthaReport(makeInput({
      Jupiter: { longitude: 95 },
      Sun: { longitude: 165 },
      Mercury: { longitude: 167 },
      Mars: { longitude: 300 },
    }));
    expect(byPlanet(report, "Jupiter").lajjitadi?.map(({ state }) => state)).toContain("Garvita");
    expect(byPlanet(report, "Mercury").lajjitadi?.map(({ state }) => state)).toContain("Kshobhita");
  });

  it("only assigns Baladi and Jagradadi to Rahu and Ketu", () => {
    const report = calculateAvasthaReport(makeInput());

    for (const node of ["Rahu", "Ketu"] as const) {
      const result = byPlanet(report, node);
      expect(result.baladi.state).toBeTruthy();
      expect(result.jagradadi.state).toBeTruthy();
      expect(result).not.toHaveProperty("shayanadi");
      expect(result).not.toHaveProperty("lajjitadi");
      expect(result).not.toHaveProperty("deeptadi");
      expect(result).not.toHaveProperty("strengthSummary");
    }
  });

  it("uses compound friendship when classifying a sign lord", () => {
    const positions = [
      { planet: "Sun" as const, sign: 1 },
      { planet: "Jupiter" as const, sign: 5 },
    ];
    expect(getPlanetaryRelationship("Sun", "Jupiter", positions)).toBe("Mitra");
    expect(getPlanetaryRelationship("Sun", "Jupiter", [
      { planet: "Sun", sign: 1 },
      { planet: "Jupiter", sign: 2 },
    ])).toBe("Adhimitra");
    expect(getPlanetaryRelationship("Mars", "Mercury", [
      { planet: "Mars", sign: 1 },
      { planet: "Mercury", sign: 2 },
    ])).toBe("Sama");
    expect(getPlanetaryRelationship("Moon", "Mars", [
      { planet: "Moon", sign: 1 },
      { planet: "Mars", sign: 2 },
    ])).toBe("Mitra");
  });

  it("uses Neecha Bhanga for Jagradadi only when a cancellation lord is in a kendra", () => {
    const cancelled = calculateAvasthaReport(makeInput({
      Sun: { longitude: 190 },
      Moon: { longitude: 90 },
      Venus: { longitude: 5 },
    }));
    const notCancelled = calculateAvasthaReport(makeInput({
      Sun: { longitude: 190 },
      Moon: { longitude: 90 },
      Venus: { longitude: 65 },
      Mars: { longitude: 345 },
    }));
    expect(byPlanet(cancelled, "Sun").dignity).toBe("Debilitated");
    expect(byPlanet(cancelled, "Sun").jagradadi).toMatchObject({
      state: "Swapna",
      ruleId: "JAGRADADI_NEECHA_BHANGA",
    });
    expect(byPlanet(notCancelled, "Sun").jagradadi).toMatchObject({
      state: "Sushupti",
      ruleId: "JAGRADADI_DEBILITATED",
    });
  });

  it("computes Shayanadi with the documented hand-checkable formula", () => {
    expect(calculateShayanadiState({
      nakshatra: 5,
      planetNumber: 3,
      navamsaNumber: 7,
      moonNakshatra: 12,
      ghati: 20,
      lagnaSign: 4,
    })).toEqual({ total: 141, remainder: 9, state: "Bhojana" });
  });

  it("accepts birth at sunrise and maps remainder zero to state 12 (Nidra)", () => {
    expect(calculateShayanadiState({
      nakshatra: 1,
      planetNumber: 1,
      navamsaNumber: 1,
      moonNakshatra: 1,
      ghati: 0,
      lagnaSign: 10,
    })).toEqual({ total: 12, remainder: 12, state: "Nidra" });

    const input = makeInput();
    input.sunriseUTC = input.birthDateTimeUTC;
    const ketu = byPlanet(calculateAvasthaReport(input), "Ketu");
    expect(ketu).not.toHaveProperty("shayanadi");
  });

  it("rejects out-of-range formula indices and keeps exact-Ghati states discrete", () => {
    expect(() => calculateShayanadiState({
      nakshatra: 28,
      planetNumber: 1,
      navamsaNumber: 1,
      moonNakshatra: 1,
      ghati: 0,
      lagnaSign: 1,
    })).toThrow("nakshatra must be an integer from 1 to 27.");
    expect(calculateShayanadiState({
      nakshatra: 1,
      planetNumber: 1,
      navamsaNumber: 1,
      moonNakshatra: 1,
      ghati: 0.6,
      lagnaSign: 9,
    })).toEqual({ total: 11.6, remainder: 12, state: "Nidra" });
  });

  it("produces one primary result for each requested state system", () => {
    const report = calculateAvasthaReport(makeInput());
    expect(report.planets).toHaveLength(9);
    for (const planet of report.planets.filter(({ planet }) => planet !== "Rahu" && planet !== "Ketu")) {
      expect(planet.baladi.state).toBeTruthy();
      expect(planet.jagradadi.state).toBeTruthy();
      expect(planet.deeptadi?.state).toBeTruthy();
      expect(planet.shayanadi?.state).toBeTruthy();
      expect(planet.baladi.reasons.length).toBeGreaterThan(0);
    }
  });
});

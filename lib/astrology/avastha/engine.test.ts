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
    const debilitatedSun = calculateAvasthaReport(makeInput({ Sun: { longitude: 190 } }));
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
    expect(byPlanet(report, "Venus").lajjitadi.map(({ state }) => state)).toEqual(expect.arrayContaining(["Lajjita", "Kshudhita"]));
  });

  it("returns Garvita for an exalted planet and Kshobhita for an aspected solar conjunction", () => {
    const report = calculateAvasthaReport(makeInput({
      Jupiter: { longitude: 95 },
      Sun: { longitude: 165 },
      Mercury: { longitude: 167 },
      Mars: { longitude: 300 },
    }));
    expect(byPlanet(report, "Jupiter").lajjitadi.map(({ state }) => state)).toContain("Garvita");
    expect(byPlanet(report, "Mercury").lajjitadi.map(({ state }) => state)).toContain("Kshobhita");
  });

  it("uses compound friendship when classifying a sign lord", () => {
    const positions = [
      { planet: "Sun" as const, sign: 1 },
      { planet: "Jupiter" as const, sign: 5 },
    ];
    expect(getPlanetaryRelationship("Sun", "Jupiter", positions)).toBe("Sama");
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

  it("produces one primary result for each requested state system", () => {
    const report = calculateAvasthaReport(makeInput());
    expect(report.planets).toHaveLength(9);
    for (const planet of report.planets) {
      expect(planet.baladi.state).toBeTruthy();
      expect(planet.jagradadi.state).toBeTruthy();
      expect(planet.deeptadi.state).toBeTruthy();
      expect(planet.shayanadi.state).toBeTruthy();
      expect(planet.baladi.reasons.length).toBeGreaterThan(0);
    }
  });
});

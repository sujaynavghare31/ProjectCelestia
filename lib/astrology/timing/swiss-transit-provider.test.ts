import { describe, expect, it } from "vitest";
import { calculateSwissTransit } from "./swiss-transit-provider";

describe("Swiss Ephemeris transit provider", () => {
  it("returns valid Lahiri sidereal positions and opposite node motion", () => {
    const date = new Date("2024-01-01T00:00:00.000Z");
    const sun = calculateSwissTransit(date, "Sun");
    const rahu = calculateSwissTransit(date, "Rahu");
    const ketu = calculateSwissTransit(date, "Ketu");
    expect(sun.longitude).toBeGreaterThanOrEqual(0);
    expect(sun.longitude).toBeLessThan(360);
    expect(Math.abs(((ketu.longitude - rahu.longitude + 360) % 360) - 180)).toBeLessThan(1e-8);
    expect(ketu.speed).toBeCloseTo(-rahu.speed, 10);
  });
});

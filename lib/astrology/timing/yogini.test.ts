import { describe, expect, it } from "vitest";
import { calculateYoginiDasha } from "./yogini";
import type { Graha } from "../avastha/types";
import type { TimingInput } from "./types";

const names: Graha[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

function chart(moonLongitude: number, toDate = "2040-01-01T00:00:00.000Z"): TimingInput {
  return {
    birthDateTimeUTC: "2000-01-01T00:00:00.000Z",
    timezone: "Asia/Kolkata",
    ascendantLongitude: 1,
    planets: names.map((planet, index) => ({
      planet,
      longitude: planet === "Moon" ? moonLongitude : (index * 37 + 20) % 360,
      speed: planet === "Rahu" || planet === "Ketu" ? -1 : 1,
    })),
    toDate,
  };
}

describe("Yogini Dasha", () => {
  it("uses the prescribed starting yogini and balance at birth", () => {
    const ashvini = calculateYoginiDasha(chart(0));
    const endOfAshwini = calculateYoginiDasha(chart(13.3332));
    expect(ashvini[0].lord).toBe("Bhramari");
    expect(ashvini[0].years).toBeCloseTo(4, 8);
    expect(new Date(endOfAshwini[0].end).getTime() - Date.parse("2000-01-01T00:00:00.000Z")).toBeLessThan(0.0001 * 365.2425 * 86_400_000);
    expect(endOfAshwini[0].details?.virtualStart).toBeDefined();
  });

  it("maps Ardra to Mangala and Revati to Ulka", () => {
    const ardra = calculateYoginiDasha(chart(66.667));
    const revati = calculateYoginiDasha(chart(360 - 0.001));
    expect(ardra[0].lord).toBe("Mangala");
    expect(revati[0].lord).toBe("Ulka");
  });

  it("divides each full MD into ADs and PDs proportional to yogini years", () => {
    const periods = calculateYoginiDasha(chart(0));
    const fullMd = periods.find((period) => !period.clipped)!;
    expect(fullMd.children).toHaveLength(8);
    expect(fullMd.children?.every((period) => period.children?.length === 8)).toBe(true);
    expect(fullMd.children?.reduce((sum, period) => sum + period.years, 0)).toBeCloseTo(fullMd.years, 8);
  });

  it("repeats the eight-yogini cycle in the same order", () => {
    const periods = calculateYoginiDasha(chart(0, "2100-01-01T00:00:00.000Z"));
    const full = periods.filter((period) => !period.clipped);
    expect(full.slice(0, 8).map(({ lord }) => lord)).toEqual(full.slice(8, 16).map(({ lord }) => lord));
  });
});

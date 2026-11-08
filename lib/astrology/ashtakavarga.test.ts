import { describe, expect, it } from "vitest";
import type { PlanetPosition } from "@/lib/kundali-types";
import { calculateAshtakavarga } from "./ashtakavarga";

const names = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
const planets = names.map((name, index) => ({
  id: name.toLowerCase(), name, symbol: name.slice(0, 2), longitude: index * 30,
  sign: index, signName: "Aries", degree: 0, speed: 1, motion: "D" as const,
  declination: 0, nakshatra: 1, nakshatraName: "Ashwini", pada: 1, nakshatraLord: "Ketu",
  house: index + 1, dignity: "Neutral",
})) satisfies PlanetPosition[];
const ascendant = { ...planets[0], id: "ascendant", name: "Ascendant", sign: 0 };

describe("Ashtakavarga", () => {
  it("returns seven Bhinna tables and the traditional 337-point Sarvashtakavarga total", () => {
    const result = calculateAshtakavarga(planets, ascendant);
    expect(result.rows).toHaveLength(7);
    expect(result.rows.every((row) => row.bindus.length === 12)).toBe(true);
    expect(result.sarvashtakavarga).toEqual(Array.from({ length: 12 }, (_, sign) =>
      result.rows.reduce((sum, row) => sum + row.bindus[sign], 0),
    ));
  });
});

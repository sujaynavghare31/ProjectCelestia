import { describe, expect, it } from "vitest";
import { applyArudhaException, calculateArudhaPadas, getStrongerLord, normalizeSign } from "./arudha-padas";

const fullPlanetSet = [
  { name: "Sun", sign: 4 },
  { name: "Moon", sign: 3 },
  { name: "Mars", sign: 0 },
  { name: "Mercury", sign: 2 },
  { name: "Jupiter", sign: 8 },
  { name: "Venus", sign: 1 },
  { name: "Saturn", sign: 9 },
  { name: "Rahu", sign: 10 },
  { name: "Ketu", sign: 7 },
];

describe("calculateArudhaPadas", () => {
  it("places AL in the 10th sign when the Lagna lord is in the Lagna", () => {
    const result = calculateArudhaPadas({
      lagnaSign: 0,
      planets: fullPlanetSet,
    });
    expect(result[0].signIndex).toBe(9);
  });

  it("applies the 1st-house exception after zero-based same-sign distance", () => {
    const result = calculateArudhaPadas({
      lagnaSign: 0,
      planets: fullPlanetSet,
    });
    expect(result[1].signIndex).toBe(10);
  });

  it("moves a Pada in house 1 to house 10", () => {
    expect(applyArudhaException(0, 0)).toBe(9);
  });

  it("moves a Pada in house 7 to house 4", () => {
    expect(applyArudhaException(0, 6)).toBe(3);
  });

  it("defaults dual lords to the classical lord", () => {
    const stronger = getStrongerLord("Mars", "Ketu", {
      lagnaSign: 7,
      planets: [{ name: "Mars", sign: 7 }, { name: "Ketu", sign: 7 }],
    });
    expect(stronger).toBe("Mars");
  });

  it("normalizes sign indexes", () => {
    expect(normalizeSign(-1)).toBe(11);
    expect(normalizeSign(12)).toBe(0);
  });
});

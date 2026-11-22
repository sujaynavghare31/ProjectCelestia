import { describe, expect, it } from "vitest";
import { bhavaOf, buildChartViewModel } from "./bhava";

const cusps = Array.from({ length: 12 }, (_, index) => (82.8775 + index * 30) % 360);

describe("shared Bhava placement", () => {
  it("uses cusp-to-cusp houses, wraps at 360 degrees, and includes the starting cusp", () => {
    expect(bhavaOf(215 + 7 / 60, cusps)).toBe(5);
    expect(bhavaOf(195 + 39 / 60, cusps)).toBe(4);
    expect(bhavaOf(124 + 1 / 60, cusps)).toBe(2);
    expect(bhavaOf(cusps[9], cusps)).toBe(10);
  });

  it("builds consistent rasi and bhava view models without assuming equal houses", () => {
    const positions = [
      { longitude: 215 + 7 / 60, signIndex: 7, wholeSignHouse: 6 },
      { longitude: 124 + 1 / 60, signIndex: 4, wholeSignHouse: 3 },
    ];

    expect(buildChartViewModel(positions, cusps, "bhava").bodies.map(({ house }) => house)).toEqual([5, 2]);
    expect(buildChartViewModel(positions, cusps, "rasi").bodies.map(({ house }) => house)).toEqual([6, 3]);
  });

  it("rejects cusp positions from an incomplete or invalid chart", () => {
    expect(() => bhavaOf(0, cusps.slice(0, 11))).toThrow("Exactly 12 finite house cusps are required.");
    expect(() => bhavaOf(Number.NaN, cusps)).toThrow("Planet longitude must be finite.");
  });
});

import { describe, expect, it } from "vitest";
import { getHouseForLongitude, mapPositionsToHouses } from "./house-placements";

const cusps = [
  { house: 1, longitude: 350 },
  { house: 2, longitude: 20 },
  { house: 3, longitude: 50 },
  { house: 4, longitude: 80 },
  { house: 5, longitude: 110 },
  { house: 6, longitude: 140 },
  { house: 7, longitude: 170 },
  { house: 8, longitude: 200 },
  { house: 9, longitude: 230 },
  { house: 10, longitude: 260 },
  { house: 11, longitude: 290 },
  { house: 12, longitude: 320 },
];

describe("Bhava house placement", () => {
  it("maps longitudes across the 360-degree boundary and includes each cusp in its house", () => {
    expect(getHouseForLongitude(359, cusps)).toBe(1);
    expect(getHouseForLongitude(0, cusps)).toBe(1);
    expect(getHouseForLongitude(19.999, cusps)).toBe(1);
    expect(getHouseForLongitude(20, cusps)).toBe(2);
    expect(getHouseForLongitude(320, cusps)).toBe(12);
  });

  it("uses cusp spans instead of 30-degree sign boundaries", () => {
    const positions = mapPositionsToHouses([
      { longitude: 35, name: "Planet inside second bhava" },
      { longitude: 50, name: "Planet on third cusp" },
    ], cusps);

    expect(positions.map(({ house }) => house)).toEqual([2, 3]);
  });

  it("rejects incomplete or malformed cusp data", () => {
    expect(() => getHouseForLongitude(10, cusps.slice(0, 11))).toThrow("Exactly 12 house cusps are required.");
    expect(() => getHouseForLongitude(Number.NaN, cusps)).toThrow("Planet longitude must be finite.");
  });
});

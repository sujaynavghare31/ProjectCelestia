import { describe, expect, it } from "vitest";
import { getBhavaCusps, houseOfBhava } from "./cusps";

const ayanamsa = { id: "lahiri", degrees: 23.8 };
const birth = {
  ascendantLongitude: 350,
  midheavenLongitude: 260,
  placidusCusps: Array.from({ length: 12 }, (_, index) => (350 + index * 30) % 360),
  latitude: 19,
  ayanamsaId: "lahiri",
};

describe("Bhava cusp systems", () => {
  it("builds Equal cusps from the Ascendant and wraps across 0°", () => {
    const cusps = getBhavaCusps("equal", birth, ayanamsa);
    expect(cusps).toEqual([350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320]);
    expect(houseOfBhava(5, cusps)).toBe(1);
    expect(houseOfBhava(25, cusps)).toBe(2);
  });

  it("places Sripati cusps halfway between sequential bhava madhyas", () => {
    const cusps = getBhavaCusps("sripati", birth, ayanamsa);
    expect(cusps).toHaveLength(12);
    expect(cusps[0]).toBeCloseTo(335, 8);
    expect(cusps.every((cusp, index) => cusp !== cusps[(index + 1) % 12])).toBe(true);
  });

  it("requires the matching ayanamsa and falls back to Equal at polar latitudes", () => {
    expect(() => getBhavaCusps("kp", birth, ayanamsa)).toThrow(/Krishnamurti ayanamsa/);
    const polar = { ...birth, latitude: 67 };
    expect(getBhavaCusps("placidus", polar, ayanamsa)).toEqual(getBhavaCusps("equal", polar, ayanamsa));
  });
});

import { describe, expect, it } from "vitest";
import { findAspectPatterns } from "./aspect-patterns";

const bodies = (positions: Array<[string, number]>) => positions.map(([name, longitude]) => ({ name, longitude }));

describe("western aspect patterns", () => {
  it("detects a T-square from an opposition and two squares", () => {
    expect(findAspectPatterns(bodies([["Sun", 0], ["Moon", 180], ["Mars", 90]]))).toContainEqual({
      type: "T-square",
      planets: ["Sun", "Moon", "Mars"],
      orb: 0,
      apex: "Mars",
    });
  });

  it("detects a Yod from a sextile base and two quincunxes", () => {
    expect(findAspectPatterns(bodies([["Sun", 0], ["Moon", 60], ["Mars", 210]]))).toContainEqual({
      type: "Yod",
      planets: ["Sun", "Moon", "Mars"],
      orb: 0,
      apex: "Mars",
    });
  });

  it("detects a Mystic Rectangle from opposite pairs and two trines plus two sextiles", () => {
    expect(findAspectPatterns(bodies([["Sun", 0], ["Moon", 180], ["Mars", 60], ["Venus", 240]]))).toContainEqual({
      type: "Mystic Rectangle",
      planets: ["Sun", "Moon", "Mars", "Venus"],
      orb: 0,
    });
  });

  it("detects a Grand Square from two oppositions and four squares", () => {
    expect(findAspectPatterns(bodies([["Sun", 0], ["Moon", 90], ["Mars", 180], ["Venus", 270]]))).toContainEqual({
      type: "Grand Square",
      planets: ["Sun", "Moon", "Mars", "Venus"],
      orb: 0,
    });
  });

  it("does not detect patterns when their required aspects are missing", () => {
    expect(findAspectPatterns(bodies([["Sun", 0], ["Moon", 42], ["Mars", 117], ["Venus", 251]]))).toEqual([]);
  });
});

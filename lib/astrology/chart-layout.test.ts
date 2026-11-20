import { describe, expect, it } from "vitest";
import { splitHouseBodies } from "./chart-layout";

describe("chart house body layout", () => {
  it("keeps collision-free upagraha labels with five bodies in a crowded house", () => {
    expect(splitHouseBodies(["Mars", "Saturn", "Neptune", "Gulika", "Mandi"])).toEqual({
      inline: ["Mars", "Saturn", "Neptune", "Gulika", "Mandi"],
      overflow: [],
    });
  });

  it("preserves every body when a house still needs overflow", () => {
    expect(splitHouseBodies(["Ascendant", "Sun", "Moon", "Mars", "Venus", "Jupiter"])).toEqual({
      inline: ["Ascendant", "Sun", "Moon", "Mars", "Venus"],
      overflow: ["Jupiter"],
    });
  });

  it("does not create overflow for a house that fits its inline capacity", () => {
    expect(splitHouseBodies(["Sun", "Moon", "Mars", "Venus", "Jupiter"])).toEqual({
      inline: ["Sun", "Moon", "Mars", "Venus", "Jupiter"],
      overflow: [],
    });
  });
});

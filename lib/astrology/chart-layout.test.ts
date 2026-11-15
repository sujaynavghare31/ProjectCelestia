import { describe, expect, it } from "vitest";
import { splitHouseBodies } from "./chart-layout";

describe("chart house body layout", () => {
  it("keeps Mandi and Gulika together with the other bodies in their house", () => {
    expect(splitHouseBodies(["Saturn", "Neptune", "Gulika", "Mandi"])).toEqual({
      inline: ["Saturn", "Neptune", "Gulika", "Mandi"],
      overflow: [],
    });
  });

  it("preserves every body when a house still needs overflow", () => {
    expect(splitHouseBodies(["Ascendant", "Sun", "Moon", "Mars", "Venus"])).toEqual({
      inline: ["Ascendant", "Sun", "Moon", "Mars"],
      overflow: ["Venus"],
    });
  });

  it("does not create overflow for a house that fits its inline capacity", () => {
    expect(splitHouseBodies(["Sun", "Moon", "Mars", "Venus"])).toEqual({
      inline: ["Sun", "Moon", "Mars", "Venus"],
      overflow: [],
    });
  });
});

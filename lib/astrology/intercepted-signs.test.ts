import { describe, expect, it } from "vitest";
import { getInterceptedSigns } from "./intercepted-signs";

describe("intercepted signs", () => {
  it("flags signs absent from all twelve quadrant-house cusps", () => {
    expect(getInterceptedSigns([0, 1, 2, 4, 5, 6, 7, 9, 10, 11, 0, 6])).toEqual([3, 8]);
  });
});

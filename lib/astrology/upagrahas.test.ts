import { describe, expect, it } from "vitest";
import { gulikaSegment } from "./upagrahas";

describe("Gulika segment", () => {
  it("uses Saturn's weekday segment during daytime", () => {
    expect(Array.from({ length: 7 }, (_, weekday) => gulikaSegment(weekday, true))).toEqual([7, 6, 5, 4, 3, 2, 1]);
  });

  it("uses the traditional night segment sequence", () => {
    expect(Array.from({ length: 7 }, (_, weekday) => gulikaSegment(weekday, false))).toEqual([4, 3, 2, 1, 7, 6, 5]);
  });

  it("rejects invalid weekday indices", () => {
    expect(() => gulikaSegment(7, true)).toThrow(RangeError);
  });
});

import { describe, expect, it } from "vitest";
import { calculateGulikaMandi, gulikaSegment } from "./upagrahas";

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

  it("keeps post-midnight before sunrise in the previous Vedic day", () => {
    const result = calculateGulikaMandi({
      date: "2026-11-19",
      time: "00:33:36",
      timezone: "Asia/Kolkata",
      latitude: 19.02288,
      longitude: 72.83861,
      siderealFlag: 2,
      longitudeOffset: -24.147,
    });

    expect(result.isDaytime).toBe(false);
    expect(result.weekday).toBe(3);
  });
});

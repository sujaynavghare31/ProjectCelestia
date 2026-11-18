import { describe, expect, it } from "vitest";
import { calculateGulikaMandi, calculateMaandiSunDegree, gulikaSegment } from "./upagrahas";

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

  it("matches Jamakkol method 5 at 2026-11-19 00:35:01 Mumbai", () => {
    const mandi = calculateMaandiSunDegree({
      date: "2026-11-19",
      time: "00:35:01",
      timezone: "Asia/Kolkata",
      latitude: 19.0228787,
      longitude: 72.8386057,
      sunLongitude: 212.2412938,
    });

    expect(mandi).toBeCloseTo(188.2412938, 6);
  });
});

import { describe, expect, it } from "vitest";
import {
  calculateRunningGhati,
  selectBirthSunrise,
  type SunriseResult,
} from "./ghati-calculator";

describe("GhatiCalculator", () => {
  it("uses the previous local sunrise for a birth before today's sunrise", () => {
    const birthUtc = new Date("2026-11-05T00:00:00.000Z");
    const today: SunriseResult = {
      localDate: "2026-11-05",
      sunriseUtc: new Date("2026-11-05T00:30:00.000Z"),
    };
    const previous: SunriseResult = {
      localDate: "2026-11-04",
      sunriseUtc: new Date("2026-11-04T00:30:00.000Z"),
    };

    expect(selectBirthSunrise(birthUtc, today, previous)).toBe(previous);
  });

  it("uses today's sunrise at the exact sunrise boundary", () => {
    const sunriseUtc = new Date("2026-11-05T06:00:00.000Z");
    const today: SunriseResult = { localDate: "2026-11-05", sunriseUtc };
    const previous: SunriseResult = {
      localDate: "2026-11-04",
      sunriseUtc: new Date("2026-11-04T06:00:00.000Z"),
    };

    expect(selectBirthSunrise(sunriseUtc, today, previous)).toBe(today);
    expect(calculateRunningGhati(0)).toBe(0);
  });

  it("rounds elapsed Ghatis to the nearest whole value", () => {
    expect(calculateRunningGhati(11.999)).toBe(0);
    expect(calculateRunningGhati(12)).toBe(1);
    expect(calculateRunningGhati(35.999)).toBe(1);
    expect(calculateRunningGhati(36)).toBe(2);
  });
});

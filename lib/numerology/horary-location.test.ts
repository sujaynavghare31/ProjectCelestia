import { describe, expect, it } from "vitest";
import {
  calculateLocalSunrise,
  createHoraryLocation,
  getLocalQuestionMoment,
  parseCitySearchResults,
  PRESET_HORARY_LOCATIONS,
} from "./horary-location";

function minutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

describe("Horary location and local time", () => {
  it("captures a date and time in the requested local timezone, including DST", () => {
    const instant = new Date("2026-03-29T01:30:00.000Z");

    expect(getLocalQuestionMoment(instant, "Europe/London")).toMatchObject({
      date: "2026-03-29",
      time: "02:30",
      timeZone: "Europe/London",
    });
    expect(getLocalQuestionMoment(new Date("2026-03-29T00:30:00.000Z"), "America/New_York")).toMatchObject({
      date: "2026-03-28",
      time: "20:30",
      timeZone: "America/New_York",
    });
  });

  it("calculates distinct local sunrises for Mumbai and New Delhi", () => {
    const sunriseMumbai = calculateLocalSunrise(
      "2026-06-21",
      PRESET_HORARY_LOCATIONS.find(({ name }) => name === "Mumbai")!,
    );
    const sunriseDelhi = calculateLocalSunrise(
      "2026-06-21",
      PRESET_HORARY_LOCATIONS.find(({ name }) => name === "New Delhi")!,
    );

    expect(sunriseMumbai.timeZone).toBe("Asia/Kolkata");
    expect(sunriseDelhi.timeZone).toBe("Asia/Kolkata");
    expect(sunriseMumbai.time).not.toBe(sunriseDelhi.time);
    expect(sunriseMumbai.time).toBe("06:01");
    expect(sunriseDelhi.time).toBe("05:23");
  });

  it("uses the location timezone's daylight-saving offset when formatting sunrise", () => {
    const location = PRESET_HORARY_LOCATIONS.find(({ name }) => name === "New York")!;
    const summer = calculateLocalSunrise("2026-07-01", location);
    const winter = calculateLocalSunrise("2026-01-01", location);

    expect(location.timeZone).toBe("America/New_York");
    expect(Math.abs(minutes(summer.time!) - minutes("05:28"))).toBeLessThanOrEqual(5);
    expect(Math.abs(minutes(winter.time!) - minutes("07:20"))).toBeLessThanOrEqual(5);
  });

  it("reports missing sunrise and invalid date or coordinates instead of a default time", () => {
    const tromso = createHoraryLocation("Tromso", "Norway", 69.6492, 18.9553);

    expect(calculateLocalSunrise("2026-06-21", tromso)).toMatchObject({
      time: null,
      reason: expect.stringContaining("Sunrise does not occur"),
    });
    expect(calculateLocalSunrise("2026-02-30", tromso)).toMatchObject({
      time: null,
      reason: expect.stringContaining("valid question date"),
    });
    expect(() => createHoraryLocation("Invalid", "", 91, 0)).toThrow(RangeError);
  });

  it("parses valid city results, deduplicates coordinates, and skips malformed entries", () => {
    const results = parseCitySearchResults({
      results: [
        { name: "Mumbai", country: "India", latitude: 19.076, longitude: 72.8777 },
        { name: "Mumbai duplicate", country: "India", latitude: 19.076, longitude: 72.8777 },
        { name: "Invalid", country: "Nowhere", latitude: 100, longitude: 0 },
        { name: "Missing coordinates", country: "Nowhere" },
      ],
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ name: "Mumbai", country: "India", timeZone: "Asia/Kolkata" });
    expect(parseCitySearchResults(null)).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { calculateCarterCusps, getCarterPlacementCusps, getTimezoneOffsetHours, placeInCarterHouses } from "./carter-chart";

const MUMBAI_2018 = {
  date: "2018-09-18",
  time: "20:33:00",
  tzHours: 5.5,
  longitude: 73 + 1 / 60,
  latitude: 19 + 1 / 60,
};

describe("Carter chart integration", () => {
  it("uses the birth-place timezone offset at the birth instant, including DST", () => {
    expect(getTimezoneOffsetHours("2024-07-01", "12:00:00", "America/New_York")).toBe(-4);
    expect(getTimezoneOffsetHours("2024-01-01", "12:00:00", "America/New_York")).toBe(-5);
    expect(getTimezoneOffsetHours("2018-09-18", "20:33:00", "Asia/Kolkata")).toBe(5.5);
  });

  it("calculates the Mumbai Carter and Equal reference chart", () => {
    const result = calculateCarterCusps({
      input: { date: MUMBAI_2018.date, time: MUMBAI_2018.time, lat: MUMBAI_2018.latitude, lng: MUMBAI_2018.longitude, timezone: "Asia/Kolkata" },
      ayanamsa: { degrees: 24.1185105937086 },
    });
    expect(result.step1.ramc.text).toBe("296° 15′ 08.40″");
    expect(result.step2.ascendant.text).toBe("Taurus 2° 49′ 18.06″");
    expect(result.cusps[9].sayana.text).toBe("Capricorn 28° 30′ 00.48″");
    expect(result.equal.filter((row) => !row.sameSignAsCarter).map((row) => row.house)).toEqual([4, 5, 10, 11]);
  });

  it("places Capricorn 6° in different houses under Equal and Carter", () => {
    const result = calculateCarterCusps({
      input: { date: MUMBAI_2018.date, time: MUMBAI_2018.time, lat: MUMBAI_2018.latitude, lng: MUMBAI_2018.longitude, timezone: "Asia/Kolkata" },
      ayanamsa: { degrees: 24.1185105937086 },
    });
    const equal = getCarterPlacementCusps(result, "nirayanaA", "equal").map(({ longitude }) => longitude);
    const carter = getCarterPlacementCusps(result, "nirayanaA", "carter").map(({ longitude }) => longitude);
    expect(placeInCarterHouses([{ longitude: 276 }], equal)[0].house).toBe(9);
    expect(placeInCarterHouses([{ longitude: 276 }], carter)[0].house).toBe(10);
  });
});

import { describe, expect, it } from "vitest";
import { carterCusps } from "./engines/carter";
import { calculateCarterCusps, getCarterPlacementCusps, getTimezoneOffsetHours, placeInCarterHouses } from "./carter-chart";

describe("Carter chart integration", () => {
  it("uses the birth-place timezone offset at the birth instant, including DST", () => {
    expect(getTimezoneOffsetHours("2024-07-01", "12:00:00", "America/New_York")).toBe(-4);
    expect(getTimezoneOffsetHours("2024-01-01", "12:00:00", "America/New_York")).toBe(-5);
    expect(getTimezoneOffsetHours("2018-09-18", "20:33:00", "Asia/Kolkata")).toBe(5.5);
  });

  it("matches the supplied Mumbai Carter example and honors the portal ayanamsa", () => {
    const result = carterCusps({
      date: "2018-09-18",
      time: "20:33",
      tzHours: 5.5,
      longitude: 73 + 1 / 60,
      latitude: 19 + 1 / 60,
    });

    expect(result.step1.ramc.text).toBe("296° 15′ 08.40″");
    expect(result.step2.ascendant.text).toBe("Taurus 2° 49′ 18.06″");
    expect(result.cusps[0].nirayanaA.text).toBe("Aries 8° 42′ 11.42″");
    expect(result.cusps[9].nirayanaA.text).toBe("Capricorn 4° 22′ 53.84″");
    expect(result.cusps[1].nirayanaB.text).toBe("Taurus 8° 53′ 01.35″");

    const portalResult = calculateCarterCusps({
      input: {
        date: "2018-09-18",
        time: "20:33:00",
        lat: 19 + 1 / 60,
        lng: 73 + 1 / 60,
        timezone: "Asia/Kolkata",
      },
      ayanamsa: { degrees: 24.1185105 },
    });
    expect(portalResult.step2.ayanamsa.value).toBe(24.1185105);
  });

  it("places planets using the selected Carter method and wraps across 360 degrees", () => {
    const result = carterCusps({
      date: "2018-09-18",
      time: "20:33",
      tzHours: 5.5,
      longitude: 73 + 1 / 60,
      latitude: 19 + 1 / 60,
    });
    const methodA = getCarterPlacementCusps(result, "nirayanaA").map(({ longitude }) => longitude);
    const methodB = getCarterPlacementCusps(result, "nirayanaB").map(({ longitude }) => longitude);
    expect(methodB).toEqual(result.cusps.map(({ nirayanaB }) => nirayanaB.longitude));
    expect(methodA).toEqual(result.cusps.map(({ nirayanaA }) => nirayanaA.longitude));
    expect(placeInCarterHouses([{ longitude: methodA[0] }, { longitude: methodA[11] + 0.5 }], methodA).map(({ house }) => house)).toEqual([1, 12]);
  });
});

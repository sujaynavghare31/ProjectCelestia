import { describe, expect, it } from "vitest";
import { carterCusps } from "./engines/carter";
import { calculateCarterCusps, getCarterPlacementCusps, getTimezoneOffsetHours, placeInCarterHouses } from "./carter-chart";

const MUMBAI_2018 = {
  date: "2018-09-18",
  time: "20:33",
  tzHours: 5.5,
  longitude: 73 + 1 / 60,
  latitude: 19 + 1 / 60,
};
const gap = (a: number, b: number) => (((b - a) % 360) + 360) % 360;

describe("Carter chart integration", () => {
  it("uses the birth-place timezone offset at the birth instant, including DST", () => {
    expect(getTimezoneOffsetHours("2024-07-01", "12:00:00", "America/New_York")).toBe(-4);
    expect(getTimezoneOffsetHours("2024-01-01", "12:00:00", "America/New_York")).toBe(-5);
    expect(getTimezoneOffsetHours("2018-09-18", "20:33:00", "Asia/Kolkata")).toBe(5.5);
  });

  it("uses Ascendant + 30° longitude steps by default", () => {
    const result = carterCusps(MUMBAI_2018);
    expect(result.cuspMethod).toBe("ascPlus30");
    expect(result.step1.ramc.text).toBe("296° 15′ 08.40″");
    expect(result.step2.ascendant.text).toBe("Taurus 2° 49′ 18.06″");
    expect(result.cusps[0].nirayanaA.text).toBe("Aries 8° 42′ 11.42″");
    expect(result.cusps[1].nirayanaA.text).toBe("Taurus 8° 42′ 11.42″");
    expect(result.cusps[9].nirayanaA.text).toBe("Capricorn 8° 42′ 11.42″");
    expect(result.cusps[11].nirayanaA.text).toBe("Pisces 8° 42′ 11.42″");
    expect(result.cusps[0].nirayanaB.text).toBe("Aries 7° 04′ 34.59″");
    expect(result.cusps[1].nirayanaB.text).toBe("Taurus 7° 04′ 34.59″");
    expect(result.cusps[3].sayana.text).toBe("Leo 2° 49′ 18.06″");
  });

  it("keeps every cusp exactly 30° after the previous one", () => {
    const result = carterCusps(MUMBAI_2018);
    for (let n = 0; n < 12; n++) {
      const next = (n + 1) % 12;
      expect(gap(result.cusps[n].sayana.longitude, result.cusps[next].sayana.longitude)).toBeCloseTo(30, 9);
      expect(gap(result.cusps[n].nirayanaA.longitude, result.cusps[next].nirayanaA.longitude)).toBeCloseTo(30, 9);
      expect(gap(result.cusps[n].nirayanaB.longitude, result.cusps[next].nirayanaB.longitude)).toBeCloseTo(30, 9);
    }
    expect(result.cusps[0].sayana.longitude).toBeCloseTo(result.step2.ascendant.longitude, 12);
  });

  it("preserves the previous RA-per-house results when requested", () => {
    const old = carterCusps({ ...MUMBAI_2018, cuspMethod: "raSteps" });
    expect(old.cuspMethod).toBe("raSteps");
    expect(old.cusps[0].nirayanaA.text).toBe("Aries 8° 42′ 11.42″");
    expect(old.cusps[9].nirayanaA.text).toBe("Capricorn 4° 22′ 53.84″");
    expect(old.cusps[1].nirayanaB.text).toBe("Taurus 8° 53′ 01.35″");
  });

  it("honors the portal ayanamsa and Ascendant + 30° through calculateCarterCusps", () => {
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
    expect(portalResult.cuspMethod).toBe("ascPlus30");
    const asc = portalResult.step2.ascendant.longitude;
    portalResult.cusps.forEach((cusp, index) => {
      const expected = asc - 24.1185105 + index * 30;
      const distance = gap(expected, cusp.nirayanaA.longitude);
      expect(Math.min(distance, 360 - distance)).toBeCloseTo(0, 9);
    });
  });

  it("places planets using selected cusps and handles house boundaries", () => {
    const result = carterCusps(MUMBAI_2018);
    const methodA = getCarterPlacementCusps(result, "nirayanaA").map(({ longitude }) => longitude);
    const methodB = getCarterPlacementCusps(result, "nirayanaB").map(({ longitude }) => longitude);
    expect(methodB).toEqual(result.cusps.map(({ nirayanaB }) => nirayanaB.longitude));
    expect(methodA).toEqual(result.cusps.map(({ nirayanaA }) => nirayanaA.longitude));
    expect(placeInCarterHouses([{ longitude: methodA[0] }, { longitude: methodA[11] + 0.5 }], methodA).map(({ house }) => house)).toEqual([1, 12]);
    expect(placeInCarterHouses([{ longitude: methodA[0] + 29.9 }, { longitude: methodA[0] + 30.1 }], methodA).map(({ house }) => house)).toEqual([1, 2]);
  });
});

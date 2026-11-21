import { describe, expect, it } from "vitest";
import swe from "swisseph";
import { formatAyanamsa, kpAyanamsaAt } from "./ayanamsa";
import { julianDayUT } from "./placidus";

describe("KP ayanamsa", () => {
  const calibration = new Date("2026-11-20T12:40:51.000Z");

  it("matches the KP New calibration to within one arcsecond", () => {
    const secondsFromReference = (kpAyanamsaAt(calibration, "KP_NEW") - (24 + 8 / 60 + 32 / 3600)) * 3600;
    expect(Math.abs(secondsFromReference)).toBeLessThanOrEqual(1);
    expect(formatAyanamsa(kpAyanamsaAt(calibration, "KP_NEW"))).toBe("24°08′32.00″");
  });

  it("changes with the instant and distinguishes KP New from KP Old", () => {
    const later = new Date("2027-11-20T12:40:51.000Z");
    expect(kpAyanamsaAt(later, "KP_NEW")).not.toBe(kpAyanamsaAt(calibration, "KP_NEW"));
    expect(kpAyanamsaAt(calibration, "KP_OLD")).not.toBe(kpAyanamsaAt(calibration, "KP_NEW"));
  });

  it("matches Swiss Ephemeris Krishnamurti ayanamsa within one arcsecond", () => {
    const jdUt = julianDayUT("2026-11-20", "12:40:51", 0);
    swe.swe_set_sid_mode(swe.SE_SIDM_KRISHNAMURTI, 0, 0);
    const swissValue = swe.swe_get_ayanamsa_ut(jdUt);
    swe.swe_set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);

    expect(Math.abs((kpAyanamsaAt(calibration, "KP_OLD") - swissValue) * 3600)).toBeLessThan(1);
  });
});

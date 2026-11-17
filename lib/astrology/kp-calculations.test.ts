import { describe, expect, it } from "vitest";
import { calculateKpDetails, normalizeKpLongitude } from "./kp-calculations";

describe("KP calculations", () => {
  it("normalizes longitudes at the zodiac boundary", () => {
    expect(normalizeKpLongitude(-1)).toBe(359);
    expect(normalizeKpLongitude(721)).toBe(1);
  });

  it("calculates sign, star, sub, and sub-sub lords", () => {
    const details = calculateKpDetails(0);
    expect(details).toMatchObject({
      signLord: "Mars",
      nakshatra: "Ashwini",
      nakshatraIndex: 1,
      starLord: "Ketu",
      subLord: "Ketu",
      subSubLord: "Ketu",
    });

    const midAshwini = calculateKpDetails(6.6666667);
    expect(midAshwini.starLord).toBe("Ketu");
    expect(midAshwini.subLord).toBe("Rahu");
    expect(midAshwini.subSubLord).toBe("Mercury");
  });

  it("keeps all outputs within the expected KP lord set", () => {
    const valid = new Set(["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]);
    for (let longitude = 0; longitude < 360; longitude += 0.25) {
      const details = calculateKpDetails(longitude);
      expect(valid.has(details.starLord)).toBe(true);
      expect(valid.has(details.subLord)).toBe(true);
      expect(valid.has(details.subSubLord)).toBe(true);
      expect(details.subProgress).toBeGreaterThanOrEqual(0);
      expect(details.subProgress).toBeLessThanOrEqual(1);
    }
  });
});

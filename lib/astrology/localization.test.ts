import { describe, expect, it } from "vitest";
import { formatPlanetDegree, planetChartDisplayName, planetChartName, planetName, signName } from "./localization";

describe("chart localization", () => {
  it("translates Swiss Ephemeris names without changing their canonical keys", () => {
    expect(planetName("Sun", "hi")).toBe("सूर्य");
    expect(planetName("Mars", "mr")).toBe("मंगळ");
    expect(signName("Leo", "hi")).toBe("सिंह");
    expect(planetName("Sun", "initials")).toBe("Su");
  });

  it("formats chart positions as degree and minute labels", () => {
    expect(formatPlanetDegree(14 + 28 / 60)).toBe("14°28'");
    expect(formatPlanetDegree(7 + 59 / 60)).toBe("7°59'");
    expect(formatPlanetDegree(Number.NaN)).toBe("—");
  });

  it("uses English initials and translated Hindi planet labels in charts", () => {
    expect(planetChartName("Sun", "en")).toBe("Su");
    expect(planetChartName("Sun", "initials")).toBe("Su");
    expect(planetChartName("Ascendant", "hi")).toBe("लग्‍न");
  });

  it("uses distinct full names for upagrahas and the default Fortuna glyph", () => {
    expect(planetChartDisplayName("Mars", "en", false, "♂", "Mars")).toBe("Ma");
    expect(planetChartDisplayName("Mandi", "en", false, "Ma", "Mandi")).toBe("Mandi");
    expect(planetChartDisplayName("Gulika", "en", false, "Gu", "Gulika")).toBe("Kulika");
    expect(planetChartDisplayName("Part of Fortune", "en", false, "⊗", "Part of Fortune")).toBe("⊗");
  });
});

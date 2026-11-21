import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EphemerisResponse, PlanetPosition } from "../../lib/kundali-types";
import { GRAHAS } from "../../lib/astrology/avastha/types";
import DashaLagnaChart from "./DashaLagnaChart";

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

function position(name: string, sign: number): PlanetPosition {
  return {
    id: name.toLowerCase(),
    name,
    symbol: name.slice(0, 2),
    longitude: sign * 30,
    sign,
    signName: SIGNS[sign],
    degree: 0,
    speed: 0,
    motion: "D",
    declination: 0,
    nakshatra: 1,
    nakshatraName: "Ashwini",
    pada: 1,
    nakshatraLord: "Ketu",
    house: 1,
    dignity: "Neutral",
  };
}

describe("Dasha Lagna chart", () => {
  it("renders a zero-based Aries sign and wraps the twelfth house to Pisces", () => {
    const data = {
      ascendant: position("Ascendant", 0),
      planets: GRAHAS.map((name, index) => position(name, index)),
    } as EphemerisResponse;

    const markup = renderToStaticMarkup(createElement(DashaLagnaChart, { data, activeLord: "Sun" }));

    expect(markup).toContain("Sun rising · Aries");
    expect(markup).toContain("H1 · ARIES");
    expect(markup).toContain("H12 · PISCES");
    expect(markup).toContain("#fff1f2");
    expect(markup).toContain('font-size="27"');
    expect(markup).toContain("Dasha Lagna planet");
  });
});

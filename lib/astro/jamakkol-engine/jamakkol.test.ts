import { describe, expect, it } from "vitest";
import { jamakkol } from "./jamakkol";
import { renderJamakkolChart } from "./chartSvg";

describe("Jamakkol outer grahas", () => {
  it("keeps the Wednesday night Jamam #4 positions, renders them on their sign edges, and includes Maandi", () => {
    const result = jamakkol({
      date: "2026-11-18",
      time: "23:27:38",
      tz: 5.5,
      lat: 19.02288,
      lon: 72.83861,
      place: "Mumbai",
      planets: { Mars: 0, Mercury: 0, Jupiter: 0, Venus: 0, Saturn: 0 },
      mandiLongitude: 188 + 11 / 60,
    });

    expect(result.jamam).toMatchObject({ weekday: "Wednesday", half: "Night", number: 4 });
    const expectedLongitudes = [331 + 11 / 60, 286 + 11 / 60, 241 + 11 / 60, 196 + 11 / 60, 151 + 11 / 60, 106 + 11 / 60, 61 + 11 / 60, 16 + 11 / 60];
    result.jamaGrahas.forEach((point, index) => {
      expect(point.longitude).toBeCloseTo(expectedLongitudes[index], 1);
    });

    const svg = renderJamakkolChart(result);
    for (const label of [
      "J.SN 16° 11′ ←",
      "J.MO 61° 11′ ←",
      "J.SA 106° 11′ ←",
      "J.VE 151° 11′ →",
      "J.ME 196° 11′ →",
      "J.JU 241° 11′ →",
      "J.MA 286° 11′ ←",
      "J.SU 331° 11′ ←",
    ]) {
      expect(svg).toContain(label);
    }

    const mandi = result.points.find((point) => point.name === "Mandi");
    expect(mandi).toMatchObject({ short: "md", signIndex: 6 });
    expect(svg).toContain(">md<");
    expect(svg).toContain("md</text>");
    expect(svg).toContain("8° 11′ 00″");
  });
});

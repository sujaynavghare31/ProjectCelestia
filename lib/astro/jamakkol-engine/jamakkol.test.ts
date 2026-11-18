import { describe, expect, it } from "vitest";
import { FIXED_OUTER_SIGN_INDEXES, jamakkol, outerRingSignIndex, PLANET_COLORS } from "./jamakkol";
import { renderJamakkolChart } from "./chartSvg";

describe("Jamakkol outer grahas", () => {
  it("skips fixed signs and jumps Jama grahas to the next sign on the outer ring", () => {
    for (const fixedSignIndex of FIXED_OUTER_SIGN_INDEXES) {
      const displaySignIndex = outerRingSignIndex(fixedSignIndex);
      expect(displaySignIndex).toBe((fixedSignIndex + 1) % 12);
      expect(FIXED_OUTER_SIGN_INDEXES).not.toContain(displaySignIndex);
    }

    expect(outerRingSignIndex(10)).toBe(11);
  });
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

  it("matches the reference Jama ring at 11:51 PM and keeps each graha in its calculated sign", () => {
    const result = jamakkol({
      date: "2026-11-18",
      time: "23:51:25",
      tz: 5.5,
      lat: 18.97457,
      lon: 72.83189,
      place: "Mumbai City",
      ascendant: 114 + 41 / 60 + 54 / 3600,
      planets: {
        Sun: 212 + 12 / 60 + 38 / 3600,
        Moon: 316 + 41 / 60 + 23 / 3600,
        Mars: 122 + 46 / 60 + 27 / 3600,
        Mercury: 192 + 58 / 60 + 11 / 3600,
        Jupiter: 121 + 52 / 60 + 19 / 3600,
        Venus: 179 + 5 / 60 + 27 / 3600,
        Saturn: 344 + 9 / 60 + 24 / 3600,
        Rahu: 300 + 55 / 60 + 23 / 3600,
      },
      mandiLongitude: 188 + 12 / 60 + 38 / 3600,
    });

    const expectedLongitudes = [
      319 + 17.5 / 60, 274 + 17.5 / 60, 229 + 17.5 / 60, 184 + 17.5 / 60,
      139 + 17.5 / 60, 94 + 17.5 / 60, 49 + 17.5 / 60, 4 + 17.5 / 60,
    ];
    result.jamaGrahas.forEach((point, index) => {
      expect(point.longitude).toBeCloseTo(expectedLongitudes[index], 5);
      expect(point.signIndex).toBe(Math.floor(expectedLongitudes[index] / 30));
    });
    expect(result.aarudam.longitude).toBe(308.5);
    expect(result.kavippu.longitude).toBe(141.5);

    const svg = renderJamakkolChart(result);
    for (const label of [
      "J.SN 4° 17′ ←",
      "J.MO 49° 17′ ←",
      "J.SA 94° 17′ ←",
      "J.VE 139° 17′ ←",
      "J.ME 184° 17′ →",
      "J.JU 229° 17′ →",
      "J.MA 274° 17′ ←",
      "J.SU 319° 17′ ←",
      "UD - Udayam",
      "AR - Aarudam",
      "KV - Kavippu",
    ]) {
      expect(svg).toContain(label);
    }
    expect(svg).toContain(`fill="${PLANET_COLORS.Sun}"`);
    expect(svg).toContain(`fill="${PLANET_COLORS.Mars}"`);
    expect(svg).toContain(`fill="${PLANET_COLORS.Rahu}"`);
  });

  it("moves Jama planets across sign boundaries instead of pinning them to fixed signs", () => {
    const planets = { Mars: 0, Mercury: 0, Jupiter: 0, Venus: 0, Saturn: 0 };
    const beforeMidnight = jamakkol({ date: "2026-11-18", time: "23:59:00", planets });
    const afterMidnight = jamakkol({ date: "2026-11-19", time: "00:01:00", planets });
    const before = beforeMidnight.jamaGrahas.find((point) => point.name === "Jama Pambu (Rahu)")!;
    const after = afterMidnight.jamaGrahas.find((point) => point.name === "Jama Pambu (Rahu)")!;

    expect(before.longitude).toBeCloseTo(0.5, 6);
    expect(before.signIndex).toBe(0);
    expect(after.longitude).toBeCloseTo(359.5, 6);
    expect(after.signIndex).toBe(11);
  });

  it("uses the Kundali elemental sign fills and a pastel-yellow outer canvas", () => {
    const result = jamakkol({
      date: "2026-11-18",
      time: "23:51:25",
      planets: { Mars: 0, Mercury: 0, Jupiter: 0, Venus: 0, Saturn: 0 },
    });
    const svg = renderJamakkolChart(result);

    expect(svg).toContain('fill="#FFFBEB"');
    expect(svg).toContain('x="206" y="46" width="160" height="160" fill="#FFF4F3"');
    expect(svg).toContain('x="366" y="46" width="160" height="160" fill="#F9FDEB"');
    expect(svg).toContain('x="526" y="46" width="160" height="160" fill="#F5FAFC"');
    expect(svg).toContain('x="526" y="206" width="160" height="160" fill="#F2FDFC"');
  });
});

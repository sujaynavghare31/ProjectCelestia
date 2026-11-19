import { describe, expect, it } from "vitest";
import { calculateOuterJamaGrahas, jamakkol, outerRingSignIndex, PLANET_COLORS } from "./jamakkol";
import { renderJamakkolChart } from "./chartSvg";

describe("Jamakkol outer grahas", () => {
  it("plots Jama grahas in their calculated sign", () => {
    expect(outerRingSignIndex(1)).toBe(1);
    expect(outerRingSignIndex(10)).toBe(10);
  });
  it("uses the fixed 6 AM / 6 PM outer Jama formula", () => {
    const localDate = new Date(2026, 10, 18, 23, 27, 38);
    const result = calculateOuterJamaGrahas(localDate);
    const expected = [331 + 11 / 60, 286 + 11 / 60, 241 + 11 / 60, 196 + 11 / 60, 151 + 11 / 60, 106 + 11 / 60, 61 + 11 / 60, 16 + 11 / 60];
    result.forEach((point, index) => {
      expect(point.longitude).toBeCloseTo(expected[index], 5);
    });
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
    const expectedLongitudes = [331 + 10.999999 / 60, 286 + 10.999999 / 60, 241 + 10.999999 / 60, 196 + 10.999999 / 60, 151 + 10.999999 / 60, 106 + 10.999999 / 60, 61 + 10.999999 / 60, 16 + 10.999999 / 60];
    result.jamaGrahas.forEach((point, index) => {
      expect(point.longitude).toBeCloseTo(expectedLongitudes[index], 1);
    });

    const svg = renderJamakkolChart(result);
    for (const label of [
      "J.SN 16° 10′ ←",
      "J.MO 61° 10′ ←",
      "J.SA 106° 10′ ←",
      "J.VE 151° 10′ ←",
      "J.ME 196° 10′ →",
      "J.JU 241° 10′ →",
      "J.MA 286° 10′ ←",
      "J.SU 331° 10′ ←",
    ]) {
      expect(svg).toContain(label);
    }

    const mandi = result.points.find((point) => point.name === "Mandi");
    expect(mandi).toMatchObject({ short: "Mandi", signIndex: 6 });
    expect(svg).toContain(">Mandi<");
    expect(svg).toContain("Mandi</text>");
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
    expect(result.kavippu.longitude).toBeCloseTo(141.5, 6);

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

  it("matches Kavippu and outer Jama results after midnight", () => {
    const result = jamakkol({
      date: "2026-11-19",
      time: "00:35:01",
      tz: 5.5,
      lat: 19.02288,
      lon: 72.83861,
      place: "Mumbai",
      planets: {
        Sun: 212 + 14 / 60,
        Moon: 316 + 41 / 60,
        Mars: 122 + 46 / 60,
        Mercury: 192 + 58 / 60,
        Jupiter: 121 + 52 / 60,
        Venus: 179 + 5 / 60,
        Saturn: 344 + 9 / 60,
        Rahu: 300 + 55 / 60,
      },
      mandiLongitude: 189 + 14 / 60,
    });

    expect(result.aarudam.longitude).toBeCloseTo(210.1, 1);
    expect(result.kavippu.signIndex).toBe(8);
    expect(result.kavippu.longitude).toBeCloseTo(269 + 54 / 60, 0);
    expect(result.points.find((point) => point.name === "Mandi")?.longitude).toBeCloseTo(189 + 14 / 60, 6);

    const svg = renderJamakkolChart(result);
    expect(svg.match(/J\.SN /g)?.length).toBe(1);
    expect(svg.match(/J\.SA /g)?.length).toBe(1);
    expect(svg.match(/J\.ME /g)?.length).toBe(1);
    expect(svg.match(/J\.MA /g)?.length).toBe(1);
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

    expect(svg).toContain('fill="#FFE8CC"');
    expect(svg).toContain('x="206" y="46" width="160" height="160" fill="#FFF4F3"');
    expect(svg).toContain('x="366" y="46" width="160" height="160" fill="#F9FDEB"');
    expect(svg).toContain('x="526" y="46" width="160" height="160" fill="#F5FAFC"');
    expect(svg).toContain('x="526" y="206" width="160" height="160" fill="#F2FDFC"');
  });
});

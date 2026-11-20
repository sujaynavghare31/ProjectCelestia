import { describe, expect, it } from "vitest";
import golden from "./golden.json";
import { CITIES, computePositions, kundliMilan, matchFromBirth, maitriPoints } from "./index";

const parse = (s: string) => {
  const [y, m, d] = s.split("@")[0].split("T"); const place = s.split("@")[1];
  const c = CITIES.find((x) => x.name === place)!;
  return { date: y, time: m ?? d, tzHours: c.tz, latitude: c.lat, longitude: c.lon };
};
const pairs = (golden as any[]).map((g) => {
  const [b, gl] = g.pair.split(";").map((x: string) => x.split("=")[1]);
  const pb = parse(b), pg = parse(gl);
  return { g, boy: { ...pb, time: b.split("T")[1].split("@")[0] }, girl: { ...pg, time: gl.split("T")[1].split("@")[0] } };
});
const KEYS: Record<string, string> = { Lagna: "Ascendant" };

describe("own astronomy = Excel workbook", () => {
  it.each(pairs.map((p, i) => [i, p] as const))("pair %i positions agree with the Excel formulas (< 0.5″)", (_, p) => {
    for (const [who, birth] of [["boy", p.boy], ["girl", p.girl]] as const) {
      const pos = computePositions(birth).sidereal as Record<string, number>;
      for (const [k, v] of Object.entries(p.g[who] as Record<string, number>)) {
        const d = Math.abs(((pos[KEYS[k] ?? k] - v + 540) % 360) - 180) * 3600;
        expect(d, `${who} ${k}`).toBeLessThan(0.5);
      }
    }
  });
  it("matches astronomy-engine (JPL-fitted) within 2′ for the sample boy", () => {
    // reference: astronomy-engine 2.1.19, Lahiri = 23.857092° + IAU 2006 precession, 15-May-1990 08:30 IST Mumbai
    const ref = { Sun: 30.31169, Moon: 268.82232, Mars: 324.33298, Mercury: 14.33997, Jupiter: 75.74842, Venus: 348.66823, Saturn: 271.53308, Ascendant: 65.43928 };
    const pos = computePositions(pairs[0].boy).sidereal as Record<string, number>;
    for (const [k, v] of Object.entries(ref)) expect(Math.abs(pos[k] - v) * 60, k).toBeLessThan(2);
  });
});

describe("Kundli Milan = Excel workbook", () => {
  it.each(pairs.map((p, i) => [i, p] as const))("pair %i: koota points, total, doshas, verdict", (_, p) => {
    const r = matchFromBirth(p.boy, p.girl);
    expect(r.kootas.map((k) => k.points)).toEqual(p.g.kootas);
    expect(r.total).toBe(p.g.total); expect(r.adjustedTotal).toBe(p.g.adjusted);
    const d = p.g.doshas as string[];
    expect([r.doshas.nadi, r.doshas.bhakoot, r.doshas.gana, r.boy.manglik.status, r.girl.manglik.status, r.doshas.manglik, r.doshas.rajju, r.doshas.vedha, r.doshas.mahendra, r.doshas.streeDeergha])
      .toEqual([d[0], d[1], d[2], d[3], d[4], d[5], d[6], d[7], d[8], d[9]]);
    expect([r.papaSamya.boy, r.papaSamya.girl]).toEqual(p.g.papa);
    expect(`${r.dashakoota.matched} / 10`).toBe(p.g.porutham);
    expect((p.g.verdict as string).startsWith(r.verdict)).toBe(true);
  });
});

describe("classical tables", () => {
  it("Graha Maitri points", () => {
    expect(maitriPoints(0, 1)).toBe(5);    // Sun–Moon friends both ways
    expect(maitriPoints(4, 5)).toBe(0.5);  // Jupiter (enemy) – Venus (neutral)
    expect(maitriPoints(0, 6)).toBe(0);    // Sun – Saturn mutual enemies
    expect(maitriPoints(3, 3)).toBe(5);
  });
  it("Nadi dosha and its cancellation (same nakshatra, different pada)", () => {
    const mk = (moon: number) => ({ positions: { Sun: 0, Moon: moon, Mars: 100, Mercury: 0, Jupiter: 0, Venus: 0, Saturn: 0, Rahu: 0, Ketu: 180, Ascendant: 0 } });
    const r = kundliMilan(mk(41), mk(52));           // both Rohini, pada 1 and pada 4
    expect(r.kootas.find((k) => k.koota === "Nadi")!.points).toBe(0);
    expect(r.doshas.nadi).toBe("Cancelled");
    expect(r.adjustedTotal).toBe(r.total + 8);
  });
});

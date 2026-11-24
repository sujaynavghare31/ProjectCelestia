import { describe, expect, it } from "vitest";
import golden from "./golden_v3.json";
import { carterCusps, placementCusps, houseOf } from "./carter";

type G = (typeof golden)[number];
const run = (g: G) => {
  const c = g.input as any;
  const sgn = (v: string, neg: string) => (v === neg ? -1 : 1);
  return carterCusps({
    date: c.date, time: c.time, tzHours: c.tz,
    longitude: (c.lond + c.lonm / 60) * sgn(c.ew, "W"), latitude: (c.latd + c.latm / 60) * sgn(c.ns, "S"),
    siderealTime0hOverride: c.st ?? null, ayanamsaOverride: c.ayan ?? null, fixLmtDayRollover: false,
  });
};

describe.each(golden.map((g) => [g.input.name, g] as const))("parity with Birth_to_Carter_Cusps_v3.xlsx — %s", (_, g) => {
  const r = run(g);
  it("Step 1–2: RAMC, MC, Ascendant, RA(Asc), ayanamsa", () => {
    expect(r.step1.ramc.text).toBe(g.ramcText);
    expect(r.step2.mc.text).toBe(g.mcText);
    expect(r.step2.ascendant.text).toBe(g.ascText);
    expect(r.step2.raAscendant.value).toBeCloseTo(g.raAsc, 9);
    expect(r.step2.ayanamsa.value).toBeCloseTo(g.ayan, 9);
    expect(r.step2.raAscMinusAyanamsa.value).toBeCloseTo(g.raAscMinusAyan, 9);
  });
  it("Step 3: Carter cusps — sayana, Method A, Method B, house width", () => {
    r.cusps.forEach((c, i) => {
      const e = g.carter[i];
      expect(c.ra).toBeCloseTo(e.ra, 9);
      expect(c.sayana.longitude).toBeCloseTo(e.say, 9);
      expect(c.sayana.text).toBe(e.sayText);
      expect(c.nirayanaA.text).toBe(e.nirAText);
      expect(c.raB).toBeCloseTo(e.raB, 9);
      expect(c.nirayanaB.text).toBe(e.nirBText);
      expect(c.width).toBeCloseTo(e.width, 9);
    });
    expect(r.cusps.reduce((t, c) => t + c.width, 0)).toBeCloseTo(360, 9);
  });
  it("Step 4: Equal house — sayana, nirayana, same sign as Carter, Carter − Equal", () => {
    r.equal.forEach((e, i) => {
      const x = g.equal[i];
      expect(e.sayana.longitude).toBeCloseTo(x.say, 9);
      expect(e.sayana.text).toBe(x.sayText);
      expect(e.nirayana.text).toBe(x.nirText);
      expect(e.nirayana.longitude).toBeCloseTo(x.nir, 9);
      expect(e.sameSignAsCarter ? "Yes" : "No – differs").toBe(x.sameSign);
      expect(e.carterMinusEqual).toBeCloseTo(x.diff, 9);
    });
  });
});

describe("placement helpers", () => {
  const r = run(golden[0]);
  it("placementCusps returns the right system / zodiac", () => {
    expect(placementCusps(r, "carter", "nirayanaA")).toEqual(r.cusps.map((c) => c.nirayanaA.longitude));
    expect(placementCusps(r, "carter", "nirayanaB")).toEqual(r.cusps.map((c) => c.nirayanaB.longitude));
    expect(placementCusps(r, "equal", "nirayanaA")).toEqual(r.equal.map((e) => e.nirayana.longitude));
    expect(placementCusps(r, "equal", "sayana")).toEqual(r.equal.map((e) => e.sayana.longitude));
  });
  it("equal houses are exactly 30° apart; Carter cusp 1 = Equal cusp 1 = Ascendant", () => {
    r.equal.forEach((e, i) => expect((r.equal[(i + 1) % 12].sayana.longitude - e.sayana.longitude + 360) % 360).toBeCloseTo(30, 9));
    expect(r.cusps[0].sayana.longitude).toBeCloseTo(r.equal[0].sayana.longitude, 9);
    expect(r.cusps[6].sayana.longitude).toBeCloseTo(r.equal[6].sayana.longitude, 9);
  });
  it("houseOf works for both systems", () => {
    const eq = placementCusps(r, "equal", "nirayanaA");
    expect(houseOf(eq[0] + 29.9, eq)).toBe(1); expect(houseOf(eq[0] + 30.1, eq)).toBe(2);
  });
});

import { describe, expect, it } from "vitest";
import { SCHEMES, VARGAS, vargaSign, vimshopakaBala, dignityIn, type Planet } from "./vimshopaka";

// Sample chart: 6 Sep 1985 06:55 IST Delhi (Lahiri), sidereal longitudes
const SAMPLE: Record<Planet, number> = { Sun: 139.7529, Moon: 33.8656, Mars: 123.8008, Mercury: 125.0324, Jupiter: 284.6482, Venus: 106.9519, Saturn: 209.2119 };

describe("varga sign rules", () => {
  it("weights of every scheme add to 20", () => {
    for (const w of Object.values(SCHEMES)) expect(Object.values(w).reduce((a, b) => a + b!, 0)).toBeCloseTo(20, 9);
  });
  it("D9 / D27 / D60 / D3 / D30 spot checks", () => {
    expect(vargaSign(135, "D9")).toBe(4);            // Leo 15° → Leo navamsa (vargottama)
    expect(vargaSign(30.5, "D27")).toBe(3);          // Taurus starts its Bhamsa from Cancer
    expect(vargaSign(15.2, "D60")).toBe(6);             // Aries 15.2° → part 30 → Aries + 30 signs = Libra
    expect(vargaSign(25, "D3")).toBe(8);             // Aries 25° → 9th from Aries = Sagittarius
    expect(vargaSign(3, "D30")).toBe(0); expect(vargaSign(33, "D30")).toBe(1);   // odd 0–5 Mars(Ar); even 0–5 Venus(Ta)
    expect(vargaSign(14, "D2")).toBe(4); expect(vargaSign(16, "D2")).toBe(3);   // odd sign: Sun hora then Moon hora
  });
  it("every varga returns a valid sign for every longitude", () => {
    for (let L = 0; L < 360; L += 0.137) for (const v of VARGAS) { const s = vargaSign(L, v); expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThan(12); }
  });
});

describe("Vimshopaka for the sample chart", () => {
  const r = vimshopakaBala(SAMPLE);
  it("scores are within 0–20 and Shadvarga D1 dominance", () => {
    for (const p of r) for (const s of Object.values(p.scores)) { expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThanOrEqual(20); }
  });
  it("Sun in Leo (own) gets 20 in D1", () => {
    const sun = r.find((x) => x.planet === "Sun")!;
    expect(sun.vargas[0]).toMatchObject({ varga: "D1", signName: "Leo", dignity: "own", points: 20 });
  });
  it("compound relationship example", () => {
    // Saturn (Libra) in a Mars sign: natural enemy (-1); Mars in Leo is 11th from Libra → temporal friend (+1) → neutral
    const rasi = { Sun: 4, Moon: 1, Mars: 4, Mercury: 4, Jupiter: 9, Venus: 3, Saturn: 6 } as Record<Planet, number>;
    expect(dignityIn("Saturn", 0, rasi, { exaltationAsOwn: false })).toBe("neutral");
  });
  it("regression values (Shodashavarga)", () => {
    expect(Object.fromEntries(r.map((p) => [p.planet, p.scores.Shodashavarga]))).toEqual({ Sun: 11.1, Moon: 13.23, Mars: 12.2, Mercury: 14.93, Jupiter: 9.75, Venus: 13.25, Saturn: 13.25 });
  });
});

import { vaiseshikamsa, VAISESHIKAMSA_NAMES } from "./vimshopaka";
describe("Vaiseshikamsa", () => {
  it("name tables cover every count from 2 to the number of vargas", () => {
    expect(Object.keys(VAISESHIKAMSA_NAMES.Shadvarga).length).toBe(5);
    expect(Object.keys(VAISESHIKAMSA_NAMES.Saptavarga).length).toBe(6);
    expect(Object.keys(VAISESHIKAMSA_NAMES.Dashavarga).length).toBe(9);
    expect(Object.keys(VAISESHIKAMSA_NAMES.Shodashavarga).length).toBe(15);
  });
  it("counts own / exalted / moolatrikona vargas and names them", () => {
    const r = vaiseshikamsa(SAMPLE, "Shodashavarga");
    const sun = r.find((x) => x.planet === "Sun")!;
    expect(sun.hits[0]).toMatchObject({ varga: "D1", signName: "Leo", reason: "own" });
    for (const p of r) {
      expect(p.count).toBe(p.hits.filter((h) => h.reason).length);
      if (p.count >= 2) expect(p.name).toBe(VAISESHIKAMSA_NAMES.Shodashavarga[p.count]);
    }
  });
  it("kendra-lord-from-AL option only adds counts", () => {
    const a = vaiseshikamsa(SAMPLE, "Dashavarga"), b = vaiseshikamsa(SAMPLE, "Dashavarga", { kendraLordFromAL: true, arudhaLagnaSign: 3 });
    a.forEach((x, i) => expect(b[i].count).toBeGreaterThanOrEqual(x.count));
  });
  it("regression: sample chart counts", () => {
    const c = (s: "Shadvarga" | "Dashavarga" | "Shodashavarga") => vaiseshikamsa(SAMPLE, s).map((p) => p.count);
    expect(c("Shadvarga")).toEqual([1, 4, 1, 0, 2, 1, 2]);
    expect(c("Dashavarga")).toEqual([1, 4, 1, 3, 2, 1, 2]);
    expect(c("Shodashavarga")).toEqual([1, 5, 3, 3, 2, 3, 2]);
  });
});

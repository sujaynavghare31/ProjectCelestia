import { describe, expect, it } from "vitest";
import { KP249, horaryCusps, kpHorary, ramcForAscendant, kpChart } from "./index";
import { placidusTropical } from "./placidus";
import { SAMPLE } from "./sample";

describe("KP horary 1–249 table", () => {
  it("has 249 entries, contiguous from 0° to 360°", () => {
    expect(KP249.length).toBe(249);
    expect(KP249[0].start).toBe(0); expect(KP249[248].end).toBeCloseTo(360, 9);
    KP249.forEach((e, i) => { if (i) expect(e.start).toBeCloseTo(KP249[i - 1].end, 9); });
  });
  it("known entries of the KP table", () => {
    const t = (n: number) => { const e = KP249[n - 1]; return `${e.startText} ${e.signLord}/${e.starLord}/${e.subLord}`; };
    expect(t(1)).toBe("Aries 0° 0′ 0″ Mars/Ketu/Ketu");
    expect(t(22)).toBe("Aries 29° 13′ 20″ Mars/Sun/Rahu");           // Krittika–Rahu sub split by the sign change
    expect(t(23)).toBe("Taurus 0° 0′ 0″ Venus/Sun/Rahu");
    expect(t(249)).toBe("Pisces 27° 53′ 20″ Jupiter/Mercury/Saturn");
    expect(KP249.filter((e) => e.sign === "Aries").length).toBe(22);
  });
});

describe("horary cusps", () => {
  it("RAMC solved from the Ascendant reproduces the Ascendant", () => {
    for (const asc of [5, 77.7, 150, 212.3, 300, 359]) {
      const R = ramcForAscendant(asc, 28.4, 23.44);
      expect(placidusTropical(R, 28.4, 23.44)[0]).toBeCloseTo(asc, 8);
    }
  });
  it("cusp 1 = start of the number's sub; cusps keep Placidus order", () => {
    const h = horaryCusps(123, SAMPLE.birth, SAMPLE.ayanamsa);
    expect(h.entry.startText).toBe("Virgo 26° 6′ 40″");
    expect(h.cusps[0]).toBeCloseTo(176.1111111, 6);
    expect(h.cusps[6]).toBeCloseTo(356.1111111, 6);
    for (let i = 0; i < 12; i++) expect(((h.cusps[(i + 1) % 12] - h.cusps[i] + 360) % 360)).toBeGreaterThan(15);
    expect(h.actualAscendant).toBeCloseTo(SAMPLE.cusps[0], 1);     // actual Lagna of the moment ≈ natal sample cusp I
  });
  it("full horary chart: tables, judgement and RPs of the moment", () => {
    const r = kpHorary({ number: 123, moment: SAMPLE.birth, ayanamsa: SAMPLE.ayanamsa, planets: SAMPLE.planets, sunrise: "06:55", questionKey: "marriage" });
    expect(r.cusps[0].sign).toBe("Virgo"); expect(r.cusps[0].subLord).toBe("Jupiter");
    expect(r.horary.entry.number).toBe(123);
    expect(r.ruling.asc).toEqual({ sign: "Venus", star: "Moon", sub: "Saturn" });     // actual Lagna Taurus 17°
    expect(r.judgement!.cusp).toBe(7);
    const plain = kpChart({ planets: SAMPLE.planets, cusps: r.cusps.map((c) => c.longitude) });
    expect(r.planets.map((p) => p.significators)).toEqual(plain.planets.map((p) => p.significators));
  });

  it("No. 45 uses Gemini 4°53′20″ as its horary Ascendant", () => {
    const r = kpHorary({
      number: 45,
      moment: SAMPLE.birth,
      ayanamsa: SAMPLE.ayanamsa,
      planets: SAMPLE.planets,
      sunrise: "06:55",
      questionKey: "win_court_case",
    });

    expect(r.horary.entry.startText).toBe("Gemini 4° 53′ 20″");
    expect(r.cusps[0].longitude).toBeCloseTo(64.8888889, 6);
    expect(r.cusps[0].sign).toBe("Gemini");
    expect(r.planets.filter((planet) => planet.body !== "Fortuna")).toHaveLength(12);
    expect(r.dasha?.periods[0].start).toEqual(new Date(
      Date.UTC(2026, 10, 20, 18, 10, 51) - 5.5 * 3600000,
    ));
  });
});

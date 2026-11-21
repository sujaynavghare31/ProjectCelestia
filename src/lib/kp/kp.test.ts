import { describe, expect, it } from "vitest";
import { kpChart, kpLords, kpCusps, dashaBalance, vimshottari, vimshottariFromMoment, utcMillis, ABBR, type Body } from "./index";
import { SAMPLE } from "./sample";

const chart = kpChart({ planets: SAMPLE.planets, cusps: SAMPLE.cusps, birth: SAMPLE.birth, ayanamsa: SAMPLE.ayanamsa });
const P = (b: Body) => chart.planets.find((p) => p.body === b)!;
const ab = (xs: (Body | string)[]) => xs.map((x) => (x in ABBR ? ABBR[x as Body] : x)).join(" ");
const sortAb = (xs: Body[]) => xs.map((x) => ABBR[x]).sort().join(" ");

describe("KP lords (sign / star / sub / sub-sub)", () => {
  const exp: [Body, string][] = [
    ["Sun", "MAR SAT SAT KET"], ["Moon", "JUP SAT VEN SAT"], ["Mars", "SUN KET SUN VEN"], ["Mercury", "VEN RAH KET VEN"], ["Jupiter", "SUN KET VEN JUP"],
    ["Venus", "MER MAR SAT RAH"], ["Saturn", "JUP SAT RAH KET"], ["Rahu", "SAT MAR MER MON"], ["Ketu", "SUN KET VEN VEN"],
    ["Uranus", "VEN SUN VEN MER"], ["Neptune", "JUP SAT KET MAR"], ["Pluto", "SAT SUN VEN SAT"], ["Fortuna", "MER MON VEN KET"],
  ];
  it.each(exp)("%s", (b, s) => { const r = P(b); expect([r.signLord, r.starLord, r.subLord, r.subSubLord].map((x) => ABBR[x]).join(" ")).toBe(s); });
  it("cusps", () => {
    const exp2 = ["VEN MON SAT MAR", "MER RAH SAT VEN", "MON SAT SAT MON", "SUN KET KET JUP", "MER SUN JUP VEN", "VEN RAH JUP VEN",
      "MAR MER MER VEN", "JUP KET SAT JUP", "SAT SUN SAT RAH", "SAT MAR MER VEN", "JUP JUP RAH MER", "MAR KET SAT MER"];
    chart.cusps.forEach((c, i) => expect([c.signLord, c.starLord, c.subLord, c.subSubLord].map((x) => ABBR[x]).join(" ")).toBe(exp2[i]));
  });
  it("Part of Fortune = Asc + Moon − Sun → Virgo 22° 38′", () => expect(P("Fortuna").degreeText.startsWith("22° 38′")).toBe(true));
});

describe("houses and significators", () => {
  it("occupation (bhava, cusp to cusp)", () => {
    const occ: [Body, number][] = [["Sun", 6], ["Moon", 11], ["Mars", 4], ["Mercury", 6], ["Jupiter", 4], ["Venus", 5], ["Saturn", 11], ["Rahu", 10], ["Ketu", 4],
      ["Uranus", 12], ["Neptune", 11], ["Pluto", 9], ["Fortuna", 5]];
    occ.forEach(([b, h]) => expect(P(b).occupies, b).toBe(h));
  });
  it("4-level significators exactly as the KP software", () => {
    const exp: [Body, string][] = [["Sun", "11 6 9 10 4"], ["Moon", "11 9 10 3"], ["Mars", "4 7 12"], ["Mercury", "10 6 2 5"], ["Jupiter", "4 8 11"],
      ["Venus", "4 5 7 12 1 6"], ["Saturn", "11 9 10"], ["Rahu", "4 10 7 12"], ["Ketu", "4"]];
    exp.forEach(([b, s]) => expect(P(b).significators.join(" "), b).toBe(s));
  });
  it("cusp lordship, star-lord-of and sub-lord-of", () => {
    expect(P("Venus").owns).toEqual([1, 6]); expect(P("Mercury").owns).toEqual([2, 5]); expect(P("Saturn").owns).toEqual([9, 10]);
    expect(P("Sun").starLordOfCusps).toEqual([5, 9]); expect(P("Rahu").starLordOfCusps).toEqual([2, 6]); expect(P("Ketu").starLordOfCusps).toEqual([4, 8, 12]);
    expect(P("Mercury").subLordOfCusps).toEqual([7, 10]); expect(P("Saturn").subLordOfCusps).toEqual([1, 2, 3, 8, 9, 12]); expect(P("Jupiter").subLordOfCusps).toEqual([5, 6]);
  });
  it("marks: # own star, * no planet in its star", () => {
    expect(P("Saturn").selfStar).toBe(true); expect(P("Ketu").selfStar).toBe(true);
    (["Sun", "Moon", "Mercury", "Jupiter", "Venus"] as Body[]).forEach((b) => expect(P(b).noPlanetInStar, b).toBe(true));
    expect(P("Mars").noPlanetInStar).toBe(false);
  });
  it("Nadi significators", () => {
    const exp: [Body, number[]][] = [["Ketu", [4, 6, 7, 8, 11, 12]], ["Venus", [1, 5, 6]], ["Sun", [4, 6]], ["Moon", [3, 11]], ["Mars", [4, 7, 12]],
      ["Rahu", [4, 7, 8, 9, 10, 11, 12]], ["Jupiter", [4, 8, 11]], ["Saturn", [9, 10, 11]], ["Mercury", [2, 5, 6]]];
    exp.forEach(([b, s]) => expect(P(b).nadi, b).toEqual(s));
    const ke = chart.nadi.find((n) => n.planet === "Ketu")!;
    expect(ke.mark).toBe("#"); expect(ke.subLord).toBe("Venus"); expect(ke.subLordSignificators).toEqual([1, 5, 6]);
  });
  it("cusp significators A/B/C/D", () => {
    const iv = chart.cusps[3], x = chart.cusps[9];
    expect(sortAb(iv.a)).toBe("JUP KET MAR RAH VEN"); expect(ab(iv.b)).toBe("KET JUP MAR"); expect(iv.c).toEqual([]); expect(ab(iv.d)).toBe("SUN");
    expect(ab(x.a)).toBe("MER"); expect(ab(x.b)).toBe("RAH"); expect(sortAb(x.c)).toBe("MON SAT SUN"); expect(ab(x.d)).toBe("SAT");
    expect(sortAb(chart.cusps[5].b)).toBe("MER SUN"); expect(ab(chart.cusps[0].significators)).toBe("VEN");
  });
});

describe("aspects (Vedic, in degrees with orb)", () => {
  it("conjunct / aspected by", () => {
    const exp: [Body, string][] = [["Sun", "MAR"], ["Moon", "MAR SAT NEP"], ["Mars", "JUP KET"], ["Mercury", ""], ["Jupiter", "MAR KET"], ["Venus", ""],
      ["Saturn", "MON"], ["Rahu", "MAR JUP"], ["Ketu", "MAR JUP"], ["Uranus", "SUN SAT"], ["Neptune", "MON MAR"]];
    exp.forEach(([b, s]) => expect(sortAb(P(b).conjunctOrAspectedBy), b).toBe(s.split(" ").filter(Boolean).sort().join(" ")));
  });
  it("aspects to", () => {
    const exp: [Body, string][] = [["Sun", "URA"], ["Moon", "V"], ["Mars", "SUN MON RAH NEP X XI"], ["Mercury", "XII"], ["Jupiter", "RAH X XII"],
      ["Venus", ""], ["Saturn", "URA Asc VIII"], ["Pluto", "III"]];
    exp.forEach(([b, s]) => expect(ab(P(b).aspectsTo), b).toBe(s));
  });
  it("cusp aspected-by and cuspal aspect", () => {
    const by = chart.cusps.map((c) => ab(c.aspectedBy)), cu = chart.cusps.map((c) => ab(c.cuspalAspect));
    expect(by).toEqual(["SAT", "", "PLU", "", "MON", "", "", "SAT", "", "MAR JUP", "MAR", "MER JUP"]);
    expect(cu).toEqual(["SAT", "", "", "", "", "", "", "SAT", "", "MAR JUP", "MAR", ""]);
  });
});

describe("ruling planets, dasha, Placidus", () => {
  it("ruling planets (Friday evening)", () => {
    const r = chart.ruling;
    expect(r.dayLord).toBe("Venus"); expect(r.moon).toEqual({ sign: "Jupiter", star: "Saturn", sub: "Venus" });
    expect(r.asc).toEqual({ sign: "Venus", star: "Moon", sub: "Saturn" }); expect(r.nodes).toEqual(["Rahu"]);
  });
  it("dasha balance: Saturn 10 Years 0 Months 8 Days", () => {
    const b = dashaBalance(SAMPLE.planets.Moon);
    expect(b.lord).toBe("Saturn"); expect(b.text).toBe("10 Years 0 Months 8 Days");
  });
  it("antardasha dates match the KP software", () => {
    const birth = utcMillis(SAMPLE.birth.date, SAMPLE.birth.time, SAMPLE.birth.tzHours);
    const ant = vimshottari(SAMPLE.planets.Moon, birth, 3).periods;
    const day = (d: Date) => new Date(d.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
    const find = (l: string) => ant.find((p) => p.lords.map((x) => ABBR[x]).join("-") === l)!;
    expect(day(find("SAT-VEN-SAT").end)).toBe("2027-04-02");
    expect(day(find("SAT-VEN-KET").end)).toBe("2027-11-20");
    expect(day(find("SAT-SUN-SUN").end)).toBe("2027-12-07");
    expect(day(find("SAT-SUN-RAH").start)).toBe("2028-01-25");
    expect(day(find("SAT-MON-MON").end)).toBe("2028-12-19");
  });
  it("starts the displayed Maha dasha at the chart moment with the remaining balance", () => {
    const birth = utcMillis(SAMPLE.birth.date, SAMPLE.birth.time, SAMPLE.birth.tzHours);
    const result = vimshottariFromMoment(SAMPLE.planets.Moon, birth);
    expect(result.periods).toHaveLength(9);
    expect(result.periods[0].start.getTime()).toBeCloseTo(birth, -1);
    expect(result.periods[0].end.getTime()).toBeCloseTo(
      birth + result.balance.balanceYears * 365.2425 * 86400000,
      -2,
    );
    expect(result.periods[1].start).toEqual(result.periods[0].end);
    expect(result.periods[0].lords).toEqual([result.balance.lord]);
  });
  it("Placidus cusps from birth data agree with the KP software within 0.5′", () => {
    const c = kpCusps(SAMPLE.birth, SAMPLE.ayanamsa);
    c.forEach((v, i) => expect(Math.abs(((v - SAMPLE.cusps[i] + 540) % 360) - 180) * 60, `cusp ${i + 1}`).toBeLessThan(0.5));
  });
});

describe("computed cusps and transit", () => {
  it("chart built from birth data only (Placidus computed) gives the same significators", () => {
    const c2 = kpChart({ planets: SAMPLE.planets, birth: SAMPLE.birth, ayanamsa: SAMPLE.ayanamsa });
    expect(c2.planets.map((p) => p.significators.join(" "))).toEqual(chart.planets.map((p) => p.significators.join(" ")));
    expect(c2.cusps.map((c) => c.subLord)).toEqual(chart.cusps.map((c) => c.subLord));
  });
  it("transit planets get their NATAL house (Cusp N)", async () => {
    const { kpTransit } = await import("./index");
    const t = kpTransit(SAMPLE.planets, SAMPLE.cusps);
    expect(t.map((x) => x.natalHouse)).toEqual([6, 11, 4, 6, 4, 5, 11, 10, 4, 12, 11, 9]);
  });
});

// ---------------------------------------------------------------------------
// Kundli Milan engine: Ashtakoota (36 Guna) + doshas & cancellations + Dashakoota + Manglik + Papa Samya
// + verdict and recommendations. Same rules/tables as Vedic_Match_Making.xlsx.
// Input = sidereal positions of Boy (Var / Groom) and Girl (Vadhu / Bride).
// ---------------------------------------------------------------------------
import { norm360, type GrahaName } from "./astro";

export const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;
export const RASHI = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"] as const;
export const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
  "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
  "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"] as const;
export const PLANETS7 = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as const;
const SIGN_LORD = [2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4];
export const VARNA = ["Shudra", "Vaishya", "Kshatriya", "Brahmin"] as const;
const SIGN_VARNA = [2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3];
export const VASHYA = ["Chatushpada", "Manava", "Jalachara", "Vanachara", "Keeta"] as const;
const VASHYA_M = [[2, 1, 1, 0.5, 1], [1, 2, 0.5, 0, 1], [1, 0.5, 2, 1, 1], [0, 0, 0, 2, 0], [1, 1, 1, 0, 2]];          // rows boy, cols girl
export const YONI = ["Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Tiger", "Deer", "Monkey", "Mongoose", "Lion"] as const;
const NAK_YONI = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];
const YONI_M = [[4,2,2,3,2,2,2,1,0,1,3,3,2,1],[2,4,3,3,2,2,2,2,3,1,2,3,2,0],[2,3,4,2,1,2,1,3,3,1,2,0,3,1],[3,3,2,4,2,1,1,1,1,2,2,2,0,2],
  [2,2,1,2,4,2,1,2,2,1,0,2,1,1],[2,2,2,1,2,4,0,2,2,1,3,3,2,1],[2,2,1,1,1,0,4,2,2,2,2,2,1,2],[1,2,3,1,2,2,2,4,3,0,3,2,2,1],
  [0,3,3,1,2,2,2,3,4,1,2,2,2,1],[1,1,1,2,1,1,2,0,1,4,1,1,2,1],[3,2,2,2,0,3,2,3,2,1,4,2,2,1],[3,3,0,2,2,3,2,2,2,1,2,4,3,2],
  [2,2,3,0,1,2,1,2,2,2,2,3,4,2],[1,0,1,2,1,1,2,1,1,1,1,2,2,4]];
export const GANA = ["Deva", "Manushya", "Rakshasa"] as const;
const NAK_GANA = [0,1,2,1,0,1,0,0,2,2,1,1,0,2,0,2,0,2,2,1,1,0,2,2,1,1,0];
const GANA_M = [[6, 5, 1], [6, 6, 0], [0, 0, 6]];   // rows GIRL, cols BOY
export const NADI = ["Adi (Vata)", "Madhya (Pitta)", "Antya (Kapha)"] as const;
export const RAJJU = ["Paada (feet)", "Kati (waist)", "Nabhi (navel)", "Kantha (neck)", "Siro (head)"] as const;
const FRIENDS: number[][] = [[1, 2, 4], [0, 3], [0, 1, 4], [0, 5], [0, 1, 2], [3, 6], [3, 5]];
const ENEMIES: number[][] = [[5, 6], [], [3], [1], [3, 5], [0, 1], [0, 1, 2]];
const VEDHA_PAIRS: [number, number][] = [[0, 17], [1, 16], [2, 15], [3, 14], [5, 21], [6, 20], [7, 19], [8, 18], [9, 26], [10, 25], [11, 24], [12, 23], [4, 13], [13, 22], [4, 22]];

const rel = (a: number, b: number) => (FRIENDS[a].includes(b) ? "F" : ENEMIES[a].includes(b) ? "E" : "N");
export function maitriPoints(a: number, b: number): number {
  if (a === b) return 5;
  const k = [rel(a, b), rel(b, a)].sort().join("");
  return ({ FF: 5, FN: 4, NN: 3, EF: 1, EN: 0.5, EE: 0 } as Record<string, number>)[k];
}
const mod = (a: number, n: number) => ((a % n) + n) % n;
const nadiOf = (n: number) => [0, 1, 2, 2, 1, 0][n % 6];
const rajjuOf = (n: number) => [0, 1, 2, 3, 4, 3, 2, 1, 0][n % 9];
const vashyaOf = (sign: number, deg: number, byDegree: boolean) =>
  sign === 8 ? (!byDegree || deg < 15 ? 1 : 0) : sign === 9 ? (byDegree && deg < 15 ? 0 : 2) : [0, 0, 1, 2, 3, 1, 1, 4, 1, 0, 1, 2][sign];
const taraBad = (from: number, to: number) => [3, 5, 7].includes(mod(mod(to - from, 27) + 1, 9));

export interface Person { name?: string; positions: Record<GrahaName, number> }   // sidereal degrees
export interface MilanOptions { vashyaByDegree?: boolean }

export function personDetails(p: Person) {
  const m = norm360(p.positions.Moon), sign = Math.floor(m / 30), deg = m - sign * 30, nak = Math.floor((m * 3) / 40);
  const pada = Math.floor(((m % (40 / 3)) * 3) / 10) + 1, lagna = Math.floor(norm360(p.positions.Ascendant) / 30);
  const signOf = (g: GrahaName) => Math.floor(norm360(p.positions[g]) / 30);
  return {
    moonSign: sign, moonDeg: deg, nakshatra: nak, pada, lagna, navamsaMoon: mod(Math.floor(m * 0.3 + 1e-9), 12), signOf,
    rashi: RASHI[sign], nakshatraName: NAKSHATRAS[nak], varna: VARNA[SIGN_VARNA[sign]], yoni: YONI[NAK_YONI[nak]], gana: GANA[NAK_GANA[nak]],
    nadi: NADI[nadiOf(nak)], rajju: RAJJU[rajjuOf(nak)], moonLord: PLANETS7[SIGN_LORD[sign]], lagnaSign: SIGNS[lagna],
  };
}
type Details = ReturnType<typeof personDetails>;
const MANGLIK_HOUSES = [1, 2, 4, 7, 8, 12];
export function manglik(d: Details) {
  const mars = d.signOf("Mars"), jup = d.signOf("Jupiter");
  const from = { lagna: mod(mars - d.lagna, 12) + 1, moon: mod(mars - d.moonSign, 12) + 1, venus: mod(mars - d.signOf("Venus"), 12) + 1 };
  const count = Object.values(from).filter((h) => MANGLIK_HOUSES.includes(h)).length;
  const hl = from.lagna, ja = mod(mars - jup, 12);
  const cancelled = [0, 7, 9].includes(mars) || ja === 0 || ja === 4 || ja === 6 || ja === 8 ||
    (hl === 2 && [2, 5].includes(mars)) || (hl === 4 && [0, 7].includes(mars)) || (hl === 7 && [3, 9].includes(mars)) ||
    (hl === 8 && [8, 11].includes(mars)) || (hl === 12 && [1, 6].includes(mars));
  const status = count === 0 ? "Not Manglik" : cancelled ? "Manglik — cancelled" : count >= 2 ? "Manglik (strong)" : "Manglik (mild)";
  return { marsHouseFrom: from, count, cancelled: count > 0 && cancelled, active: count > 0 && !cancelled, status };
}
function papaPoints(d: Details) {
  const bases = [d.lagna, d.moonSign, d.signOf("Venus")];
  return ([["Mars", 1], ["Saturn", 1], ["Sun", 0.5], ["Rahu", 1], ["Ketu", 1]] as [GrahaName, number][])
    .reduce((t, [g, w]) => t + bases.filter((b) => MANGLIK_HOUSES.includes(mod(d.signOf(g) - b, 12) + 1)).length * w, 0);
}

export function kundliMilan(boy: Person, girl: Person, opts: MilanOptions = {}) {
  const byDeg = opts.vashyaByDegree ?? true;
  const B = personDetails(boy), G = personDetails(girl);
  const vb = vashyaOf(B.moonSign, B.moonDeg, byDeg), vg = vashyaOf(G.moonSign, G.moonDeg, byDeg);
  const lb = SIGN_LORD[B.moonSign], lg = SIGN_LORD[G.moonSign];
  const bh = mod(G.moonSign - B.moonSign, 12) + 1;           // girl counted from boy
  const kootas = [
    { koota: "Varna", boy: B.varna, girl: G.varna, max: 1, points: SIGN_VARNA[B.moonSign] >= SIGN_VARNA[G.moonSign] ? 1 : 0, meaning: "Spiritual / ego compatibility" },
    { koota: "Vashya", boy: VASHYA[vb], girl: VASHYA[vg], max: 2, points: VASHYA_M[vb][vg], meaning: "Mutual attraction and control" },
    { koota: "Tara", boy: `Tara ${mod(mod(G.nakshatra - B.nakshatra, 27), 9) + 1}`, girl: `Tara ${mod(mod(B.nakshatra - G.nakshatra, 27), 9) + 1}`, max: 3,
      points: (taraBad(G.nakshatra, B.nakshatra) ? 0 : 1.5) + (taraBad(B.nakshatra, G.nakshatra) ? 0 : 1.5), meaning: "Destiny, health and well-being" },
    { koota: "Yoni", boy: B.yoni, girl: G.yoni, max: 4, points: YONI_M[NAK_YONI[B.nakshatra]][NAK_YONI[G.nakshatra]], meaning: "Physical & sexual compatibility" },
    { koota: "Graha Maitri", boy: PLANETS7[lb], girl: PLANETS7[lg], max: 5, points: maitriPoints(lb, lg), meaning: "Mental compatibility" },
    { koota: "Gana", boy: B.gana, girl: G.gana, max: 6, points: GANA_M[NAK_GANA[G.nakshatra]][NAK_GANA[B.nakshatra]], meaning: "Temperament" },
    { koota: "Bhakoot", boy: B.rashi, girl: G.rashi, max: 7, points: [2, 12, 5, 9, 6, 8].includes(bh) ? 0 : 7, meaning: "Love, family welfare & finance" },
    { koota: "Nadi", boy: B.nadi, girl: G.nadi, max: 8, points: nadiOf(B.nakshatra) === nadiOf(G.nakshatra) ? 0 : 8, meaning: "Health & progeny" },
  ];
  const total = kootas.reduce((t, k) => t + k.points, 0);
  const K = Object.fromEntries(kootas.map((k) => [k.koota, k.points])) as Record<string, number>;

  // ---- doshas
  const sameNadi = nadiOf(B.nakshatra) === nadiOf(G.nakshatra);
  const nadiCancel = (B.moonSign === G.moonSign && B.nakshatra !== G.nakshatra) || (B.nakshatra === G.nakshatra && B.moonSign !== G.moonSign) || (B.nakshatra === G.nakshatra && B.pada !== G.pada);
  const nadi = !sameNadi ? "No dosha" : nadiCancel ? "Cancelled" : "Present";
  const bhakoot = K.Bhakoot === 7 ? "No dosha" : lb === lg || maitriPoints(lb, lg) >= 4 ? "Cancelled" : "Present";
  const gana = K.Gana <= 1 ? (K["Graha Maitri"] >= 4 || K.Bhakoot === 7 ? "Cancelled" : "Present") : "No dosha";
  const mb = manglik(B), mg = manglik(G);
  const manglikMatch = mb.active && mg.active ? "Both Manglik — matched" : mb.active || mg.active ? "Mismatch — dosha" : "No dosha";
  const rajju = rajjuOf(B.nakshatra) === rajjuOf(G.nakshatra) ? "Dosha" : "OK";
  const vedha = VEDHA_PAIRS.some(([a, b]) => (B.nakshatra === a && G.nakshatra === b) || (B.nakshatra === b && G.nakshatra === a)) ? "Dosha" : "OK";
  const cnt = mod(B.nakshatra - G.nakshatra, 27) + 1;          // boy's star counted from girl's
  const mahendra = [4, 7, 10, 13, 16, 19, 22, 25].includes(cnt) ? "Good" : "Not present";
  const streeDeergha = cnt >= 13 ? "Good" : cnt >= 9 ? "Medium" : "Weak";
  const adjusted = total + (K.Nadi === 0 && nadi === "Cancelled" ? 8 : 0) + (K.Bhakoot === 0 && bhakoot === "Cancelled" ? 7 : 0);

  const porutham = [
    { name: "Dinam (Tara)", ok: !taraBad(G.nakshatra, B.nakshatra) }, { name: "Ganam", ok: K.Gana >= 5 }, { name: "Mahendram", ok: mahendra === "Good" },
    { name: "Stree Deergham", ok: streeDeergha === "Good" }, { name: "Yoni", ok: K.Yoni >= 2 }, { name: "Rasi", ok: K.Bhakoot === 7 },
    { name: "Rasi Adhipathi", ok: K["Graha Maitri"] >= 3 }, { name: "Vasya", ok: K.Vashya >= 1 }, { name: "Rajju", ok: rajju === "OK" }, { name: "Vedha", ok: vedha === "OK" },
  ];
  const papa = { boy: papaPoints(B), girl: papaPoints(G) };
  const lagnaLords = { boy: PLANETS7[SIGN_LORD[B.lagna]], girl: PLANETS7[SIGN_LORD[G.lagna]], points: maitriPoints(SIGN_LORD[B.lagna], SIGN_LORD[G.lagna]) };
  const navamsaLords = { boy: PLANETS7[SIGN_LORD[B.navamsaMoon]], girl: PLANETS7[SIGN_LORD[G.navamsaMoon]], points: maitriPoints(SIGN_LORD[B.navamsaMoon], SIGN_LORD[G.navamsaMoon]) };

  const grade = total >= 28 ? "Excellent match" : total >= 24 ? "Very good match" : total >= 18 ? "Average — acceptable (check doshas)" : "Below 18 — not recommended";
  const clean = nadi !== "Present" && bhakoot !== "Present" && manglikMatch !== "Mismatch — dosha" && rajju !== "Dosha";
  const verdict = adjusted >= 18 && clean ? (adjusted >= 28 ? "HIGHLY RECOMMENDED" : "RECOMMENDED")
    : adjusted >= 18 ? "PROCEED WITH CAUTION" : "NOT RECOMMENDED";
  const recommendations = [
    nadi === "Present" ? "Nadi dosha: Maha Mrityunjaya jaap (1.25 lakh), Nadi dosha nivaran puja, daan of gold / grains."
      : nadi === "Cancelled" ? "Nadi dosha is cancelled by a classical exception — no remedy needed." : "Nadi: clean (8/8).",
    bhakoot === "Present" ? "Bhakoot dosha: worship the Moon-sign lords, Bhakoot dosha shanti; check the 7th house & Navamsa."
      : bhakoot === "Cancelled" ? "Bhakoot dosha cancelled (Moon-sign lords same / friends)." : "Bhakoot: clean (7/7).",
    manglikMatch === "Mismatch — dosha" ? "Manglik mismatch: Kumbh / Ashwattha vivah for the Manglik partner, Mangal shanti puja, Hanuman Chalisa on Tuesdays."
      : manglikMatch === "Both Manglik — matched" ? "Both are Manglik — dosha neutralised." : "Manglik: no active dosha (none, or cancelled by classical exceptions).",
    rajju === "Dosha" ? "Same Rajju: avoided in South Indian tradition — get a detailed porutham reading." : "Rajju: OK.",
    gana === "Present" ? "Gana dosha (Rakshasa vs Deva/Manushya): patience and understanding needed; Gauri-Shankar puja." : "Gana: acceptable.",
    K["Graha Maitri"] < 3 ? "Graha Maitri low: mental wavelength differs — encourage communication; strengthen the Moon-sign lords." : "Graha Maitri: good mental compatibility.",
    K.Yoni < 2 ? "Yoni low: physical compatibility needs care." : "Yoni: good physical compatibility.",
    "Always confirm with the 7th house, 7th lord, Venus/Jupiter, Navamsa and running dashas of both charts.",
  ];
  return {
    boy: { ...B, signOf: undefined, manglik: mb }, girl: { ...G, signOf: undefined, manglik: mg },
    kootas, total, maxTotal: 36, grade, adjustedTotal: adjusted,
    doshas: { nadi, bhakoot, gana, manglik: manglikMatch, rajju, vedha, mahendra, streeDeergha, bhakootDistance: bh, starCount: cnt },
    dashakoota: { items: porutham, matched: porutham.filter((p) => p.ok).length },
    papaSamya: { ...papa, balanced: papa.boy >= papa.girl },
    lagnaLords, navamsaLords, verdict, recommendations,
  };
}
export type MilanResult = ReturnType<typeof kundliMilan>;

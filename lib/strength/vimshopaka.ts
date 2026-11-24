// ---------------------------------------------------------------------------
// Vimshopaka Bala (BPHS) — strength out of 20 from dignity in the divisional charts.
// All 16 Parashara vargas: D1 D2 D3 D4 D7 D9 D10 D12 D16 D20 D24 D27 D30 D40 D45 D60.
// Schemes: Shadvarga, Saptavarga, Dashavarga, Shodashavarga. Pure TypeScript.
// ---------------------------------------------------------------------------
export const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;
export const PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as const;
export type Planet = (typeof PLANETS)[number];
export type Varga = "D1" | "D2" | "D3" | "D4" | "D7" | "D9" | "D10" | "D12" | "D16" | "D20" | "D24" | "D27" | "D30" | "D40" | "D45" | "D60";
export const VARGAS: Varga[] = ["D1", "D2", "D3", "D4", "D7", "D9", "D10", "D12", "D16", "D20", "D24", "D27", "D30", "D40", "D45", "D60"];
export const VARGA_NAMES: Record<Varga, string> = {
  D1: "Rasi", D2: "Hora", D3: "Drekkana", D4: "Chaturthamsa", D7: "Saptamsa", D9: "Navamsa", D10: "Dasamsa", D12: "Dwadasamsa",
  D16: "Shodasamsa", D20: "Vimsamsa", D24: "Chaturvimsamsa", D27: "Saptavimsamsa (Bhamsa)", D30: "Trimsamsa", D40: "Khavedamsa", D45: "Akshavedamsa", D60: "Shashtiamsa",
};
const SIGN_LORD: Planet[] = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
const EXALT: Record<Planet, number> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };

export const SCHEMES: Record<"Shadvarga" | "Saptavarga" | "Dashavarga" | "Shodashavarga", Partial<Record<Varga, number>>> = {
  Shadvarga: { D1: 6, D2: 2, D3: 4, D9: 5, D12: 2, D30: 1 },
  Saptavarga: { D1: 5, D2: 2, D3: 3, D7: 2.5, D9: 4.5, D12: 2, D30: 1 },
  Dashavarga: { D1: 3, D2: 1.5, D3: 1.5, D7: 1.5, D9: 1.5, D10: 1.5, D12: 1.5, D16: 1.5, D30: 1.5, D60: 5 },
  Shodashavarga: { D1: 3.5, D2: 1, D3: 1, D4: 0.5, D7: 0.5, D9: 3, D10: 0.5, D12: 0.5, D16: 2, D20: 0.5, D24: 0.5, D27: 0.5, D30: 1, D40: 0.5, D45: 0.5, D60: 4 },
};
export type Scheme = keyof typeof SCHEMES;

const mod = (a: number, n: number) => ((a % n) + n) % n;
const EPS = 1e-9;
const part = (deg: number, size: number) => Math.floor(deg / size + EPS);

/** Sign index (0 = Aries) of a sidereal longitude in a Parashara varga. */
export function vargaSign(longitude: number, v: Varga): number {
  const L = mod(longitude, 360), s = Math.floor(L / 30 + EPS) % 12, d = L - s * 30, odd = s % 2 === 0, m3 = s % 3;
  switch (v) {
    case "D1": return s;
    case "D2": return odd ? (d < 15 ? 4 : 3) : (d < 15 ? 3 : 4);                          // Sun's hora = Leo, Moon's = Cancer
    case "D3": return mod(s + 4 * part(d, 10), 12);                                       // 1st, 5th, 9th
    case "D4": return mod(s + 3 * part(d, 7.5), 12);                                      // 1st, 4th, 7th, 10th
    case "D7": return mod((odd ? s : s + 6) + part(d, 30 / 7), 12);
    case "D9": return mod(Math.floor((L * 9) / 30 + EPS), 12);
    case "D10": return mod((odd ? s : s + 8) + part(d, 3), 12);
    case "D12": return mod(s + part(d, 2.5), 12);
    case "D16": return mod([0, 4, 8][m3] + part(d, 1.875), 12);                          // movable Ar, fixed Le, dual Sg
    case "D20": return mod([0, 8, 4][m3] + part(d, 1.5), 12);                            // movable Ar, fixed Sg, dual Le
    case "D24": return mod((odd ? 4 : 3) + part(d, 1.25), 12);                           // odd Le, even Cn
    case "D27": return mod(Math.floor((L * 27) / 30 + EPS), 12);                         // fire Ar, earth Cn, air Li, water Cp
    case "D30": return odd ? (d < 5 ? 0 : d < 10 ? 10 : d < 18 ? 8 : d < 25 ? 2 : 6)    // Ma Sa Ju Me Ve
                           : (d < 5 ? 1 : d < 12 ? 5 : d < 20 ? 11 : d < 25 ? 9 : 7);   // Ve Me Ju Sa Ma
    case "D40": return mod((odd ? 0 : 6) + part(d, 0.75), 12);                           // odd Ar, even Li
    case "D45": return mod([0, 4, 8][m3] + part(d, 2 / 3), 12);                          // movable Ar, fixed Le, dual Sg
    case "D60": return mod(s + part(d, 0.5), 12);
  }
}

// Natural relationships (Parashara): 1 friend, 0 neutral, -1 enemy
const NATURAL: Record<Planet, Record<Planet, number>> = (() => {
  const F: Record<Planet, Planet[]> = { Sun: ["Moon", "Mars", "Jupiter"], Moon: ["Sun", "Mercury"], Mars: ["Sun", "Moon", "Jupiter"], Mercury: ["Sun", "Venus"],
    Jupiter: ["Sun", "Moon", "Mars"], Venus: ["Mercury", "Saturn"], Saturn: ["Mercury", "Venus"] };
  const E: Record<Planet, Planet[]> = { Sun: ["Venus", "Saturn"], Moon: [], Mars: ["Mercury"], Mercury: ["Moon"], Jupiter: ["Mercury", "Venus"], Venus: ["Sun", "Moon"],
    Saturn: ["Sun", "Moon", "Mars"] };
  const r = {} as Record<Planet, Record<Planet, number>>;
  for (const a of PLANETS) { r[a] = {} as Record<Planet, number>; for (const b of PLANETS) r[a][b] = F[a].includes(b) ? 1 : E[a].includes(b) ? -1 : 0; }
  return r;
})();
export const naturalRelation = (a: Planet, b: Planet) => NATURAL[a][b];
/** Temporal (tatkalika): friend if b is in the 2,3,4,10,11,12th sign from a in the RASI chart. */
export const temporalRelation = (signA: number, signB: number) => ([2, 3, 4, 10, 11, 12].includes(mod(signB - signA, 12) + 1) ? 1 : -1);

export const DIGNITY_POINTS = { own: 20, exalted: 20, greatFriend: 18, friend: 15, neutral: 10, enemy: 7, greatEnemy: 5 } as const;
export type Dignity = keyof typeof DIGNITY_POINTS;

export interface VimshopakaOptions { exaltationAsOwn?: boolean }       // default true (exalted = 20 like own)

/** Dignity of `planet` in a varga sign, using the compound (panchadha) relationship with that sign's lord. */
export function dignityIn(planet: Planet, vSign: number, rasiSigns: Record<Planet, number>, opts: VimshopakaOptions = {}): Dignity {
  const lord = SIGN_LORD[vSign];
  if (lord === planet) return "own";
  if ((opts.exaltationAsOwn ?? true) && EXALT[planet] === vSign) return "exalted";
  const c = NATURAL[planet][lord] + temporalRelation(rasiSigns[planet], rasiSigns[lord]);
  return c >= 2 ? "greatFriend" : c === 1 ? "friend" : c === 0 ? "neutral" : c === -1 ? "enemy" : "greatEnemy";
}

/** Full Vimshopaka report. `longitudes` = SIDEREAL longitudes of the 7 planets. */
export function vimshopakaBala(longitudes: Record<Planet, number>, opts: VimshopakaOptions = {}) {
  const rasi = Object.fromEntries(PLANETS.map((p) => [p, vargaSign(longitudes[p], "D1")])) as Record<Planet, number>;
  return PLANETS.map((planet) => {
    const vargas = VARGAS.map((v) => {
      const sign = vargaSign(longitudes[planet], v), dignity = dignityIn(planet, sign, rasi, opts);
      return { varga: v, sign, signName: SIGNS[sign], lord: SIGN_LORD[sign], dignity, points: DIGNITY_POINTS[dignity] };
    });
    const scores = Object.fromEntries((Object.keys(SCHEMES) as Scheme[]).map((sch) => {
      const w = SCHEMES[sch];
      const total = vargas.reduce((t, x) => t + ((w[x.varga] ?? 0) * x.points) / 20, 0);
      return [sch, Math.round(total * 100) / 100];
    })) as Record<Scheme, number>;
    const ownOrExalted = vargas.filter((x) => x.dignity === "own" || x.dignity === "exalted").length;
    return { planet, vargas, scores, grade: grade(scores.Shodashavarga), vargaVishesha: vishesha(vargas, ["D1","D2","D3","D7","D9","D10","D12","D16","D30","D60"]) , ownOrExalted };
  });
}
export const grade = (s: number) => (s >= 15 ? "Very strong" : s >= 10 ? "Good" : s >= 5 ? "Medium" : "Weak");

/** Varga Vishesha amsha in Dashavarga: count of own/exalted vargas → name. */
const VISHESHA = ["", "", "Parijatamsha", "Uttamamsha", "Gopuramsha", "Simhasanamsha", "Paravatamsha", "Devalokamsha", "Brahmalokamsha", "Airavatamsha", "Sridhamamsha"];
function vishesha(vargas: { varga: Varga; dignity: Dignity }[], set: Varga[]) {
  const n = vargas.filter((x) => set.includes(x.varga) && (x.dignity === "own" || x.dignity === "exalted")).length;
  return { count: n, name: VISHESHA[n] ?? "" };
}

// ---------------------------------------------------------------------------
// Vaiseshikamsa (BPHS): number of vargas of a scheme in which the planet occupies its
// own sign, exaltation sign or moolatrikona sign (optionally also the sign of a kendra lord
// from the Arudha Lagna) — each count has a classical name per scheme.
// ---------------------------------------------------------------------------
const MOOLATRIKONA: Record<Planet, number> = { Sun: 4, Moon: 1, Mars: 0, Mercury: 5, Jupiter: 8, Venus: 6, Saturn: 10 };
export const VAISESHIKAMSA_NAMES: Record<Scheme, Record<number, string>> = {
  Shadvarga: { 2: "Kimsukamsa", 3: "Vyanjanamsa", 4: "Chamaramsa", 5: "Chhatramsa", 6: "Kundalamsa" },
  Saptavarga: { 2: "Kimsukamsa", 3: "Vyanjanamsa", 4: "Chamaramsa", 5: "Chhatramsa", 6: "Kundalamsa", 7: "Mukutamsa" },
  Dashavarga: { 2: "Parijatamsa", 3: "Uttamamsa", 4: "Gopuramsa", 5: "Simhasanamsa", 6: "Paravatamsa", 7: "Devalokamsa", 8: "Brahmalokamsa",
    9: "Airavatamsa", 10: "Sridhamamsa" },
  Shodashavarga: { 2: "Bhedakamsa", 3: "Kusumamsa", 4: "Nagapushpamsa", 5: "Kandukamsa", 6: "Keralamsa", 7: "Kalpavrikshamsa", 8: "Chandanavanamsa",
    9: "Poornachandramsa", 10: "Uchchaisravamsa", 11: "Dhanvantaryamsa", 12: "Suryakantamsa", 13: "Vidrumamsa", 14: "Sakrasimhasanamsa",
    15: "Golokamsa", 16: "Srivallabhamsa" },
};
export interface VaiseshikamsaOptions {
  /** also count a varga when the planet is in a sign ruled by a lord of a kendra (1/4/7/10) from the Arudha Lagna (BPHS variant). Default false. */
  kendraLordFromAL?: boolean;
  arudhaLagnaSign?: number;   // rasi sign of AL (0 = Aries), needed when kendraLordFromAL = true
}
export function vaiseshikamsa(longitudes: Record<Planet, number>, scheme: Scheme, opts: VaiseshikamsaOptions = {}) {
  const vargas = (Object.keys(SCHEMES[scheme]) as Varga[]);
  const kendraLords = new Set<Planet>(opts.kendraLordFromAL && opts.arudhaLagnaSign != null
    ? [0, 3, 6, 9].map((k) => SIGN_LORD[mod(opts.arudhaLagnaSign! + k, 12)]) : []);
  return PLANETS.map((planet) => {
    const hits = vargas.map((v) => {
      const sign = vargaSign(longitudes[planet], v), lord = SIGN_LORD[sign];
      const reason = lord === planet ? "own" : EXALT[planet] === sign ? "exalted" : MOOLATRIKONA[planet] === sign ? "moolatrikona"
        : kendraLords.has(lord) ? "kendra lord from AL" : null;
      return { varga: v, sign, signName: SIGNS[sign], reason };
    });
    const count = hits.filter((h) => h.reason).length;
    return { planet, scheme, total: vargas.length, count, name: VAISESHIKAMSA_NAMES[scheme][count] ?? (count <= 1 ? "—" : ""), hits };
  });
}

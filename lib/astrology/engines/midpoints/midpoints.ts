// ---------------------------------------------------------------------------
// Midpoints • points falling on midpoints (conjunction + hard aspects) • midpoint trees.
// Port of the Midpoints sheets of Midpoints_Aspects_Timing.xlsx.
// Pure functions, sidereal (Nirayana) longitudes in decimal degrees.
// ---------------------------------------------------------------------------
import { norm360, zodiac } from "./format";

// ----------------------------- types -----------------------------
export type PointKind = "planet" | "node" | "angle" | "cusp";
export interface ChartPoint {
  name: string;          // "Sun", "Ascendant", "Cusp 5"
  short: string;         // "Su", "As", "C5"
  kind: PointKind;
  longitude: number;     // sidereal, 0..360
  speed?: number | null; // °/day (informational)
  usePairs: boolean;     // part of midpoint pairs
  useReceiver: boolean;  // can "sit on" a midpoint
}

export type MidpointMode = "conjunction" | "conjOpp" | "hard" | "hard45";
export const MODE_LABELS: Record<MidpointMode, string> = {
  conjunction: "Conjunction only",
  conjOpp: "Conjunction + opposition",
  hard: "Hard aspects (0/90/180) – 90° dial",
  hard45: "Hard + 45°/135° (Ebertin)",
};
export interface MidpointSettings {
  mode: MidpointMode;              // default hard45
  orbConjOpp: number;              // default 1.5
  orbSquare: number;               // default 1.5
  orbSemi: number;                 // 45° / 135°, default 1.0
}
export const DEFAULT_SETTINGS: MidpointSettings = { mode: "hard45", orbConjOpp: 1.5, orbSquare: 1.5, orbSemi: 1.0 };

/** k = multiple of 45° (0..7) → symbol */
export const HARD_SYMBOLS = ["☌", "∠", "□", "⚼", "☍", "⚼", "□", "∠"] as const;
export const PLANET_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu", "Uranus", "Neptune", "Pluto"] as const;
export type PlanetName = (typeof PLANET_ORDER)[number];
export const SHORT: Record<string, string> = {
  Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me", Jupiter: "Ju", Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke",
  Uranus: "Ur", Neptune: "Ne", Pluto: "Pl", Ascendant: "As", MC: "MC",
};

// ----------------------------- small helpers -----------------------------
/** Excel ROUND (half away from zero). */
export function excelRound(x: number, d = 0): number {
  const f = 10 ** d; const v = Math.round(Math.abs(x) * f + 1e-9) / f; return x < 0 ? -v : v;
}
const fmt2 = (x: number) => excelRound(x, 2).toFixed(2);
const modeAllows = (mode: MidpointMode, k: number) =>
  mode === "conjunction" ? k === 0 : mode === "conjOpp" ? k === 0 || k === 4 : mode === "hard" ? k % 2 === 0 : true;

export interface Hit { k: number; angle: number; symbol: string; orb: number }
/**
 * Is a point at `lon` on the midpoint `mp`? Nearest multiple of 45° of (lon − mp);
 * conj/opp use orbConjOpp, squares orbSquare, 45°/135° orbSemi. Returns null when outside orb / not allowed by mode.
 */
export function hitOnMidpoint(lon: number, mp: number, s: MidpointSettings, sameOrbForAll?: number): Hit | null {
  const x = norm360(lon - mp);
  const q = excelRound(x / 45);
  const k = ((q % 8) + 8) % 8;
  const orb = Math.abs(x - q * 45);
  if (!modeAllows(s.mode, k)) return null;
  const lim = sameOrbForAll ?? (k === 0 || k === 4 ? s.orbConjOpp : k % 2 === 0 ? s.orbSquare : s.orbSemi);
  return orb <= lim ? { k, angle: k * 45, symbol: HARD_SYMBOLS[k], orb } : null;
}

/** Near midpoint of a and b (half the shorter arc). The far midpoint is +180°. */
export function midpointOf(a: number, b: number): number {
  const d = norm360(b - a);
  return norm360(a + d / 2 + (d > 180 ? 180 : 0));
}

// ----------------------------- build the point list -----------------------------
export interface BuildPointsInput {
  /** sidereal planets (Ketu optional – derived from Rahu) */
  planets: Partial<Record<PlanetName, { longitude: number; speed?: number | null }>>;
  ascendant: number;          // sidereal
  mc: number;                 // sidereal
  /** 12 sidereal house-cusp longitudes, house 1..12 (Placidus bhava cusps, Carter cusps, …) */
  cusps?: number[];
  /** include in midpoint pairs (default: all true except Ketu) */
  usePairs?: Partial<Record<PlanetName | "Ascendant" | "MC", boolean>>;
  /** usable as receivers (default all true) */
  useReceiver?: Partial<Record<PlanetName | "Ascendant" | "MC", boolean>>;
  /** cusps as receivers: all 2–12, 2–6 (each standing for its axis), or none. Default "axes". */
  cuspReceivers?: "all" | "axes" | "none";
}
/** Order matters: it is the workbook's order (pairs, lists and tie-breaks follow it). */
export function buildPoints(input: BuildPointsInput): ChartPoint[] {
  const pts: ChartPoint[] = [];
  const pair = (n: string) => input.usePairs?.[n as PlanetName] ?? n !== "Ketu";
  const rec = (n: string) => input.useReceiver?.[n as PlanetName] ?? true;
  for (const n of PLANET_ORDER) {
    let p = input.planets[n];
    // Ketu is always Rahu + 180°
    if (n === "Ketu" && input.planets.Rahu) p = { longitude: input.planets.Rahu.longitude + 180, speed: input.planets.Rahu.speed ?? null };
    if (!p) throw new Error(`Missing planet ${n}`);
    pts.push({ name: n, short: SHORT[n], kind: n === "Rahu" || n === "Ketu" ? "node" : "planet", longitude: norm360(p.longitude), speed: p.speed ?? null, usePairs: pair(n), useReceiver: rec(n) });
  }
  pts.push({ name: "Ascendant", short: "As", kind: "angle", longitude: norm360(input.ascendant), speed: null, usePairs: pair("Ascendant"), useReceiver: rec("Ascendant") });
  pts.push({ name: "MC", short: "MC", kind: "angle", longitude: norm360(input.mc), speed: null, usePairs: pair("MC"), useReceiver: rec("MC") });
  if (input.cusps) {
    if (input.cusps.length !== 12) throw new Error("cusps must have 12 values");
    const mode = input.cuspReceivers ?? "axes";
    for (let n = 2; n <= 12; n++)
      pts.push({ name: `Cusp ${n}`, short: `C${n}`, kind: "cusp", longitude: norm360(input.cusps[n - 1]), speed: null, usePairs: false,
        useReceiver: mode === "all" || (mode === "axes" && n <= 6) });
  }
  return pts;
}

// ----------------------------- midpoints + activations -----------------------------
export interface Activation { receiver: string; receiverIndex: number; symbol: string; angle: number; orb: number; text: string }
export interface MidpointRow {
  index: number;            // 1-based pair number
  a: string; b: string;     // shorts
  ia: number; ib: number;   // 1-based indices into points
  label: string;            // "Su/Mo"
  active: boolean;
  longitude: number;
  text: string;             // near midpoint, "Libra 25° 38′ 35.81″"
  farText: string;
  dial90: number;
  activations: Activation[];
  activationsText: string;  // "Ju ☌ 0.11°, …"
}

/** Pair list: all pairs of non-cusp points in order, except Rahu/Ketu. */
export function pairIndices(points: ChartPoint[]): [number, number][] {
  const cand = points.map((p, i) => ({ p, i: i + 1 })).filter((x) => x.p.kind !== "cusp");
  const out: [number, number][] = [];
  for (let x = 0; x < cand.length; x++)
    for (let y = x + 1; y < cand.length; y++) {
      const s = [cand[x].p.short, cand[y].p.short].sort().join("/");
      if (s === "Ke/Ra") continue;
      out.push([cand[x].i, cand[y].i]);
    }
  return out;
}

export function computeMidpoints(points: ChartPoint[], s: MidpointSettings = DEFAULT_SETTINGS): MidpointRow[] {
  return pairIndices(points).map(([ia, ib], idx) => {
    const A = points[ia - 1], B = points[ib - 1];
    const mp = midpointOf(A.longitude, B.longitude);
    const active = A.usePairs && B.usePairs;
    const activations: Activation[] = [];
    if (active)
      points.forEach((R, ri) => {
        if (!R.useReceiver || ri + 1 === ia || ri + 1 === ib) return;
        const h = hitOnMidpoint(R.longitude, mp, s);
        if (h) activations.push({ receiver: R.short, receiverIndex: ri + 1, symbol: h.symbol, angle: h.angle, orb: h.orb, text: `${R.short} ${h.symbol} ${fmt2(h.orb)}°` });
      });
    return {
      index: idx + 1, a: A.short, b: B.short, ia, ib, label: `${A.short}/${B.short}`, active, longitude: mp,
      text: zodiac(mp).text, farText: zodiac(mp + 180).text, dial90: mp % 90,
      activations, activationsText: activations.map((x) => x.text).join(", "),
    };
  });
}

/** Midpoint trees: for each point, the midpoints it sits on ("Su/Mo ☌ 0.11°"). */
export function midpointTrees(points: ChartPoint[], mids: MidpointRow[]) {
  return points.map((P, i) => {
    const items = mids.flatMap((m) => m.activations.filter((a) => a.receiverIndex === i + 1)
      .map((a) => ({ midpoint: m.label, symbol: a.symbol, angle: a.angle, orb: a.orb, text: `${m.label} ${a.symbol} ${fmt2(a.orb)}°` })));
    return { point: P.name, short: P.short, text: zodiac(P.longitude).text, dial90: P.longitude % 90, items, list: items.map((x) => x.text).join(", "), count: items.length };
  });
}

// ----------------------------- views -----------------------------
/** Midpoints sorted on the 90° dial (Ebertin "midpoint sort"), active ones only. */
export const sortByDial = (mids: MidpointRow[]) => mids.filter((m) => m.active).slice().sort((a, b) => a.dial90 - b.dial90 || a.index - b.index);
/** Only midpoints that have at least one point on them. */
export const activatedOnly = (mids: MidpointRow[]) => mids.filter((m) => m.active && m.activations.length > 0);

// ----------------------------- one-call convenience -----------------------------
export interface MidpointReportInput extends BuildPointsInput { settings?: Partial<MidpointSettings> }
export function midpointReport(input: MidpointReportInput) {
  const settings = { ...DEFAULT_SETTINGS, ...input.settings };
  const points = buildPoints(input);
  const midpoints = computeMidpoints(points, settings);
  return { settings, points, midpoints, trees: midpointTrees(points, midpoints), dialSort: sortByDial(midpoints), activated: activatedOnly(midpoints) };
}

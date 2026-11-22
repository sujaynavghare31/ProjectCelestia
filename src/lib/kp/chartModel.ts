import { bhavaOf } from "./engine";
import { SIGNS, norm360, type Outer } from "./constants";
import { dmsInSign } from "./lords";
import type { ZodiacMode } from "./ayanamsa";

export type ChartBodyKey =
  | "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn"
  | "Rahu" | "Ketu" | Outer | "Asc";

export interface ChartBody {
  key: ChartBodyKey;
  abbr: string;
  sayana: number;
  nirayana: number;
  signIndex: number;
  degreeText: string;
  retrograde: boolean;
  bhava: number;
}

export interface ChartPoint {
  key: "Fortuna";
  abbr: "PoF";
  sayana: number;
  nirayana: number;
  signIndex: number;
  degreeText: string;
  retrograde: false;
  bhava: number;
}

export interface KpChartModel {
  mode: "natal" | "horary";
  ayanamsa: { kind: ZodiacMode; value: number; text: string; at: string };
  lagna: { nirayana: number; signIndex: number; degreeText: string };
  cusps: { house: number; nirayana: number; signIndex: number; degreeText: string }[];
  bodies: ChartBody[];
  points: ChartPoint[];
}

export interface SayanaPosition {
  longitude: number;
  speed?: number;
  retrograde?: boolean;
}

export type SayanaPlanets = Partial<Record<Exclude<ChartBodyKey, "Asc">, number | SayanaPosition>>;

const BODY_ABBREVIATIONS: Record<ChartBodyKey, string> = {
  Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me", Jupiter: "Ju", Venus: "Ve",
  Saturn: "Sa", Rahu: "Ra", Ketu: "Ke", Uranus: "Ur", Neptune: "Ne", Pluto: "Pl", Asc: "As",
};

function longitudeOf(position: number | SayanaPosition): number {
  const longitude = typeof position === "number" ? position : position.longitude;
  if (!Number.isFinite(longitude)) throw new Error("KP chart positions must have finite longitudes.");
  return norm360(longitude);
}

function degreeText(longitude: number): string {
  return dmsInSign(longitude, 0).replace(/ 0″$/, "″").replace(/° /, "°").replace(/′ /, "′");
}

export function buildChartModel(args: {
  mode: "natal" | "horary";
  sayanaPlanets: SayanaPlanets;
  sayanaCusps: number[];
  ayanamsa: KpChartModel["ayanamsa"];
  lagnaSayana: number;
  retro?: Partial<Record<Exclude<ChartBodyKey, "Asc">, boolean>>;
}): KpChartModel {
  const { sayanaPlanets, sayanaCusps, ayanamsa, mode, retro = {} } = args;
  if (sayanaCusps.length !== 12 || !sayanaCusps.every(Number.isFinite)) {
    throw new Error("KP chart model requires 12 finite sayana cusps.");
  }
  if (!Number.isFinite(ayanamsa.value) || !Number.isFinite(args.lagnaSayana)) {
    throw new Error("KP chart model requires finite ayanamsa and Lagna values.");
  }

  const cusps = sayanaCusps.map((sayana, index) => {
    const nirayana = norm360(sayana - ayanamsa.value);
    return {
      house: index + 1,
      nirayana,
      signIndex: Math.floor(nirayana / 30),
      degreeText: degreeText(nirayana),
    };
  });
  const siderealCusps = cusps.map(({ nirayana }) => nirayana);
  const entries = Object.entries(sayanaPlanets) as [Exclude<ChartBodyKey, "Asc">, number | SayanaPosition][];
  const bodyKeys: Exclude<ChartBodyKey, "Asc">[] = [
    "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn",
    "Rahu", "Ketu", "Uranus", "Neptune", "Pluto",
  ];
  const positions = new Map(entries);
  if (positions.get("Ketu") === undefined && positions.get("Rahu") !== undefined) {
    positions.set("Ketu", norm360(longitudeOf(positions.get("Rahu")!) + 180));
  }
  const bodies: ChartBody[] = bodyKeys.flatMap((key) => {
    const position = positions.get(key);
    if (position === undefined) return [];
    const sayana = longitudeOf(position);
    const nirayana = norm360(sayana - ayanamsa.value);
    const retrograde = retro[key] ?? (
      typeof position === "number" ? false : position.retrograde ?? (position.speed !== undefined && position.speed < 0)
    );
    return [{
      key,
      abbr: BODY_ABBREVIATIONS[key],
      sayana,
      nirayana,
      signIndex: Math.floor(nirayana / 30),
      degreeText: degreeText(nirayana),
      retrograde: key === "Rahu" || key === "Ketu" ? true : retrograde,
      bhava: bhavaOf(nirayana, siderealCusps),
    }];
  });

  const lagna = norm360(args.lagnaSayana - ayanamsa.value);
  const sun = positions.get("Sun");
  const moon = positions.get("Moon");
  const points: ChartPoint[] = sun === undefined || moon === undefined ? [] : (() => {
    const fortuneSayana = norm360(args.lagnaSayana + longitudeOf(moon) - longitudeOf(sun));
    const nirayana = norm360(fortuneSayana - ayanamsa.value);
    return [{
      key: "Fortuna",
      abbr: "PoF",
      sayana: fortuneSayana,
      nirayana,
      signIndex: Math.floor(nirayana / 30),
      degreeText: degreeText(nirayana),
      retrograde: false,
      bhava: bhavaOf(nirayana, siderealCusps),
    }];
  })();

  const ascendant: ChartBody = {
    key: "Asc",
    abbr: BODY_ABBREVIATIONS.Asc,
    sayana: norm360(args.lagnaSayana),
    nirayana: lagna,
    signIndex: Math.floor(lagna / 30),
    degreeText: degreeText(lagna),
    retrograde: false,
    bhava: bhavaOf(lagna, siderealCusps),
  };

  return {
    mode,
    ayanamsa: { ...ayanamsa },
    lagna: { nirayana: lagna, signIndex: Math.floor(lagna / 30), degreeText: degreeText(lagna) },
    cusps,
    bodies: [...bodies, ascendant],
    points,
  };
}

export function signName(signIndex: number): string {
  return SIGNS[signIndex] ?? SIGNS[0];
}

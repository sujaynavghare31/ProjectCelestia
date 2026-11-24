export const PLANET_BODIES = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
] as const;

export const ASTEROID_BODIES = [
  "Ceres",
  "Pallas",
  "Juno",
  "Vesta",
  "Hygiea",
  "Astraea",
  "Psyche",
  "Eros",
  "Fortuna",
  "Lilith1181",
  "Chiron",
  "Pholus",
  "Nessus",
  "Eris",
  "Sedna",
  "Makemake",
  "Haumea",
  "Quaoar",
  "Orcus",
] as const;

export type BodyKey =
  | (typeof PLANET_BODIES)[number]
  | (typeof ASTEROID_BODIES)[number]
  | "MeanNode"
  | "TrueNode";

export type AyanamsaKind = "lahiri" | "kp_new" | "kp_old";
export type EphemerisGroup = "planets" | "asteroids";
export type PositionSource = "local" | "api" | "fallback";

export interface Position {
  body: BodyKey;
  longitude: number;
  latitude: number;
  speed: number;
  latSpeed: number;
  retrograde: boolean;
  declination: number;
  rightAscension: number;
  outOfBounds: boolean;
  sidereal?: number;
  source: PositionSource;
}

export interface PositionFallbacks {
  api(body: BodyKey, utc: Date): Promise<Position>;
  astronomyEngine?(body: BodyKey, utc: Date): Promise<Position>;
}

export interface BodySamples {
  step: number;
  lon: number[];
  lat: number[];
}

export interface EphemerisYearData {
  year: number;
  schema: 1;
  t0: number;
  bodies: Partial<Record<BodyKey, BodySamples>>;
}

export interface EphemerisFileManifest {
  file: string;
  sha256: string;
  bytes: number;
}

export interface EphemerisManifest {
  schema: 1;
  source: {
    planets: string;
    asteroids: string;
  };
  frame: string;
  timeScale: "TT";
  years: Record<string, Partial<Record<EphemerisGroup, EphemerisFileManifest>>>;
}

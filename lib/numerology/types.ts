// ---------------------------------------------------------------------------
// Shared types for the numerology engine
// ---------------------------------------------------------------------------

/** A number 1..9 ("root"). 0 is used only for "nothing" (e.g. empty input). */
export type Root = number;

export type Relation = "Friend" | "Neutral" | "Enemy";
export type CompoundRating = "Lucky" | "Neutral" | "Caution" | "Avoid";

export interface NumberInfo {
  planet: string; keyword: string; personality: string; strengths: string; weaknesses: string;
  health: string; professions: string; luckyDays: string; luckyColours: string; avoidColours: string;
  gemstone: string; direction: string; remedies: string; tradingText: string; tradingScore: number;
  houseMeaning: string; placeVibration: string;
}

export interface HoraryCategory {
  group: string; question: string; yes: string; no: string;
  speed: "Fast" | "Medium" | "Slow"; yesMeans: string; advice: string;
}

export interface HoraryNumberInfo {
  planet: string; direction: string; distance: string; whereToLook: string; personDescription: string;
  deity: string; mantra: string; timingUnit: "Days" | "Weeks" | "Months"; weekday: string;
  significations: string; businessIdeas: string;
}

export interface Tables {
  chaldean: Record<string, number>;
  pythagorean: Record<string, number>;
  vowels: string;
  chaldeanLettersByValue: Record<string, string>;
  /** compatibility[person][other] */
  compatibility: Record<string, Record<string, Relation>>;
  numberInfo: Record<string, NumberInfo>;
  /** Cheiro compound numbers 1..52. 53+ are derived (see compound()). */
  compound: Record<string, { rating: CompoundRating; keyword: string }>;
  compoundScore: Record<CompoundRating, number>;
  loShu: Record<string, { elementDirection: string; missingEffect: string; remedy: string; excessEffect: string }>;
  pythMeanings: Record<string, { keyword: string; strengths: string; challenges: string; career: string }>;
  planes: { name: string; digits: number[]; meaning: string }[];
  loShuGridLayout: number[][];
  horaryCategories: HoraryCategory[];
  horaryNumbers: Record<string, HoraryNumberInfo>;
  /** Chaldean hora order as planet numbers: Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon */
  horaOrder: number[];
  /** Index into horaOrder of the first hora after sunrise. Index 0 = Sunday … 6 = Saturday */
  horaDayStart: number[];
  /** Planet number ruling each weekday. Index 0 = Sunday … 6 = Saturday */
  weekdayLord: number[];
  industries: { industry: string; roots: string }[];
  commercialMeaning: Record<string, string>;
  fancyVehicleNumbers: string[];
  presetCities: string[];
}

/** Minimum context about the person that most modules need. Build it with buildContext(). */
export interface PersonContext {
  moolank: Root;
  bhagyank: Root;
  nameNumber: Root;
  /** Lo Shu digit counts, index 1..9 (index 0 unused) */
  loShuCounts: number[];
}

export type Verdict = string;

/** ISO calendar date "YYYY-MM-DD" */
export type ISODate = string;
/** 24h clock "HH:MM" */
export type HHMM = string;

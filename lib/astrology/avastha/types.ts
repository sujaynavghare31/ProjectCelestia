export const GRAHAS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] as const;
export type Graha = (typeof GRAHAS)[number];
export type SignNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface AvasthaPlanet {
  planet: Graha;
  longitude: number;
  speed: number;
}

export interface AvasthaInput {
  planets: AvasthaPlanet[];
  ascendantLongitude: number;
  birthDateTimeUTC: string;
  sunriseUTC: string;
  nameFirstLetter?: string;
  config?: Partial<import("./config").AvasthaConfig>;
}

export type AvasthaNature = "auspicious" | "mixed" | "inauspicious";
export type AvasthaSystem = "Baladi" | "Jagradadi" | "Deeptadi" | "Lajjitadi" | "Shayanadi" | "ShayanadiCheshta";
export interface AvasthaResult {
  system: AvasthaSystem;
  state: string;
  sanskrit: string;
  resultPercent?: number;
  nature: AvasthaNature;
  reasons: string[];
  ruleId: string;
}

export interface ShayanadiFormulaInputs {
  nakshatra: number;
  planetNumber: number;
  navamsaNumber: number;
  moonNakshatra: number;
  ghati: number;
  lagnaSign: number;
}

export interface ShayanadiAvasthaResult extends AvasthaResult {
  remainder: number;
  total: number;
  formulaInputs: ShayanadiFormulaInputs;
  cheshta?: "Drishti" | "Cheshta" | "Vicheshta";
}

export interface PlanetAvasthaReport {
  planet: Graha;
  sign: SignNumber;
  degree: number;
  house: number;
  nakshatra: number;
  navamsaIndex: number;
  dignity: "Exalted" | "Moolatrikona" | "Own" | "Adhimitra" | "Mitra" | "Sama" | "Shatru" | "Adhishatru" | "Debilitated";
  isCombust: boolean;
  isRetrograde: boolean;
  warStatus?: "winner" | "loser";
  baladi: AvasthaResult;
  jagradadi: AvasthaResult;
  deeptadi?: AvasthaResult & { secondaryStates: AvasthaResult[] };
  lajjitadi?: AvasthaResult[];
  shayanadi?: ShayanadiAvasthaResult;
  strengthSummary?: { score: number; label: "Strong" | "Moderate" | "Weak" };
}

export interface AvasthaReport {
  planets: PlanetAvasthaReport[];
  configUsed: import("./config").AvasthaConfig;
  engineVersion: string;
}

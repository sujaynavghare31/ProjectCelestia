import type { Graha } from "../avastha/types";

export interface TimingPlanet {
  planet: Graha;
  longitude: number;
  speed: number;
}

export interface TimingInput {
  birthDateTimeUTC: string;
  timezone: string;
  planets: TimingPlanet[];
  ascendantLongitude: number;
  gender?: "male" | "female";
  fromDate?: string;
  toDate?: string;
  config?: Partial<TimingConfig>;
}

export interface Period {
  level: 1 | 2 | 3;
  lord: string;
  start: string;
  end: string;
  years: number;
  reasons: string[];
  clipped?: boolean;
  details?: Record<string, unknown>;
  children?: Period[];
}

export type TimingConfig = {
  yearLength: "solar365.2425" | "savana360" | "sidereal365.256363";
  charaMethod: "KNRao" | "Iranganti";
  charaExaltAdjust: boolean;
  dualLordRule: "KNRao" | "custom";
  adDirection: "byMDSign" | "sameAsMD";
  charaLevels: 2 | 3;
  karakaScheme: 7 | 8;
  sankataLord: "Rahu" | "Ketu";
  bcpPlanetProgression: boolean;
  bcpYearBoundary: "birthday" | "solarReturn";
  jeevaKaraka?: "Jupiter" | "Venus";
  bnnStepDays: number;
  bnnIncludeRetroPrevSign: boolean;
  bnnExchange: boolean;
  bnnTransitPlanets: Graha[];
  bbOrb: number;
  nadiModules: Array<"BCP" | "BNN_TRANSIT" | "BHRIGU_BINDU">;
};

export interface TimingPlanetInfo {
  planet: Graha;
  sign: number;
  degree: number;
  house: number;
  speed: number;
  longitude: number;
}

export interface TimingChart {
  input: TimingInput;
  birth: Date;
  from: Date;
  to: Date;
  lagnaSign: number;
  planets: TimingPlanetInfo[];
  byPlanet: Map<Graha, TimingPlanetInfo>;
  config: TimingConfig;
}

export interface ActivationConnection {
  planet: Graha;
  relation: "conj" | "trine" | "2nd" | "12th" | "7th";
  retrograde?: boolean;
  exchange?: boolean;
}

export interface ActivationEvent {
  date: string;
  transitPlanet: Graha;
  transitSign: number;
  natalPlanetsConnected: ActivationConnection[];
  themes: string[];
  flags: string[];
  reasons: string[];
}

export interface BcpYear {
  ageYear: number;
  start: string;
  end: string;
  activatedHouse: number;
  activatedSign: number;
  progressedLagnaSign: number;
  signLord: Graha;
  lordNatalHouse: number;
  natalOccupants: Graha[];
  natalAspects: Graha[];
  karaka: Graha[];
  progressedContacts: Array<{ progressedPlanet: Graha; progressedSign: number; natalPlanet: Graha; relation: "conj" | "aspect" }>;
  reasons: string[];
}

export interface BhriguBinduHit {
  date: string;
  transitPlanet: "Jupiter" | "Saturn";
  transitLongitude: number;
  binduLongitude: number;
  kind: "conjunction" | "sign-ingress";
  orb: number;
  reasons: string[];
}

export interface NadiYearView {
  ageYear: number;
  start: string;
  end: string;
  bcp?: BcpYear;
  transitEvents: ActivationEvent[];
  bhriguBinduHits: BhriguBinduHit[];
  runningChara?: { md?: Period; ad?: Period };
  runningYogini?: { md?: Period; ad?: Period };
}

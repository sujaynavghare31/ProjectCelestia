export type NodeType = "true" | "mean";
export type ChartStyle = "diamond" | "south" | "east" | "placidus";
export type CelestialLanguage = "en" | "hi" | "mr" | "initials";
export type ZodiacMode = "sidereal" | "tropical";

export interface ViewPreferences {
  showHouseLabels: boolean;
  showOuterPlanets: boolean;
  showAsteroids: boolean;
  showUpagrahas: boolean;
  showFortune: boolean;
  usePlanetIcons: boolean;
  useSignIcons: boolean;
  showEqualHouses: boolean;
  showSignDivisions: boolean;
  showSignNumbers: boolean;
  showBhavaCusps: boolean;
}

export interface ChartSettings {
  zodiacMode: ZodiacMode;
  ayanamsa: string;
  customAyanamsaDegrees: number;
  language: CelestialLanguage;
  viewPreferences: ViewPreferences;
}

export interface EphemerisRequest {
  date: string;
  time: string;
  lat: number;
  lng: number;
  timezone: string;
  ayanamsa: string;
  zodiacMode?: ZodiacMode;
  customAyanamsaDegrees?: number;
  nodeType: NodeType;
  targetAge?: number;
  ageMode?: "completed" | "ongoing";
  dashaSeed?: "moon" | "ascendant" | "sun";
  avasthaConfig?: Partial<import("@/lib/astrology/avastha/config").AvasthaConfig>;
  nameFirstLetter?: string;
  gender?: "male" | "female" | "not-applicable";
}

export interface PlanetPosition {
  id: string;
  name: string;
  symbol: string;
  longitude: number;
  sign: number;
  signName: string;
  degree: number;
  speed: number;
  motion: "D" | "R";
  declination: number;
  nakshatra: number;
  nakshatraName: string;
  pada: number;
  nakshatraLord: string;
  house: number;
  dignity: string;
  jaimini?: string;
}

export interface DashaPeriod {
  lord: string;
  start: string;
  end: string;
  active: boolean;
  periods?: DashaPeriod[];
}

export interface GrahaAvasthaReport {
  planet: string;
  sign: string;
  dignity: string;
  jagradadi: {
    state: string;
    signLord: string;
    naturalRelationship: string;
    compoundRelationship?: string;
    explanation: string;
  } | null;
  shayanadi: {
    state: string;
    remainder: number;
  } | null;
  calculationTrace: Record<string, unknown>;
}

export interface EphemerisResponse {
  input: EphemerisRequest;
  julianDay: number;
  ayanamsa: { name: string; degrees: number };
  ascendant: PlanetPosition;
  planets: PlanetPosition[];
  bhavChalitPlanets: PlanetPosition[];
  points: PlanetPosition[];
  bhavChalitPoints: PlanetPosition[];
  houseCusps: Array<{ house: number; longitude: number; sign: number; signName: string }>;
  interceptedSigns: number[];
  houseCuspSystem: string;
  ashtakavarga?: Array<{ planet: string; bindus: number[]; total: number }>;
  sarvashtakavarga?: number[];
  dashas: DashaPeriod[];
  grahaAvasthas: GrahaAvasthaReport[];
  avasthaReport?: import("@/lib/astrology/avastha/types").AvasthaReport;
  solarReturn?: {
    targetAge: number;
    ageMode: "completed" | "ongoing";
    utc: string;
    ascendant: PlanetPosition;
    planets: PlanetPosition[];
  };
  calculatedAt: string;
  engine: string;
}

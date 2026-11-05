export type NodeType = "true" | "mean";
export type ChartStyle = "diamond" | "circular" | "south";

export interface EphemerisRequest {
  date: string;
  time: string;
  lat: number;
  lng: number;
  timezone: string;
  ayanamsa: string;
  nodeType: NodeType;
  targetAge?: number;
  ageMode?: "completed" | "ongoing";
  dashaSeed?: "moon" | "ascendant" | "sun";
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

export interface EphemerisResponse {
  input: EphemerisRequest;
  julianDay: number;
  ayanamsa: { name: string; degrees: number };
  ascendant: PlanetPosition;
  planets: PlanetPosition[];
  houseCusps: Array<{ house: number; longitude: number; sign: number; signName: string }>;
  houseCuspSystem: string;
  dashas: DashaPeriod[];
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

import type { Graha } from "./types";

export type FriendshipMode = "compound" | "natural";
export type AvasthaConfig = {
  friendshipMode: FriendshipMode;
  nodeAspects: boolean;
  includeNodesInBaladi: boolean;
  vriddhaResultPercent: number;
  jagratIncludesMoolatrikona: boolean;
  deeptadiVariant: "BPHS" | "Phaladeepika";
  deeptadiPercentages: Record<string, number>;
  vikalaIncludesDefeatedWar: boolean;
  yuddhaWinnerRule: "lowerLongitude" | "brightness";
  conjunctionOrb?: number;
  moonBeneficRule: "paksha" | "shuklaAshtami";
  wateryExtended: boolean;
  kshobhitaUseCombustionOrb: boolean;
  ketuNumber: 8 | 9;
  navamsaMode: "indexInSign" | "navamsaSign";
  ghatiRounding: "nearest" | "ceil" | "floor" | "exact";
  rahuExaltSign: number;
  ketuExaltSign: number;
  rahuDebilSign: number;
  ketuDebilSign: number;
  rahuMoolatrikonaSigns: number[];
  ketuMoolatrikonaSigns: number[];
  rahuOwnSigns: number[];
  ketuOwnSigns: number[];
  nodeFriends: Graha[];
  nodeNeutral: Graha[];
  nodeEnemies: Graha[];
  strengthWeights: { baladi: number; jagradadi: number; deeptadi: number; lajjitadi: number };
  nameLetterAnkas: Record<string, number>;
};

const INITIAL_ANKAS: Record<string, number> = Object.fromEntries(
  Object.entries({
    1: "A",
    2: "KG",
    3: "CJ",
    4: "T",
    5: "DN",
    6: "PBM",
    7: "YRLVW",
    8: "SH",
  }).flatMap(([number, letters]) => [...letters].map((letter) => [letter, Number(number)])),
);

export const DEFAULT_AVASTHA_CONFIG: AvasthaConfig = {
  friendshipMode: "compound",
  nodeAspects: true,
  includeNodesInBaladi: true,
  vriddhaResultPercent: 12.5,
  jagratIncludesMoolatrikona: true,
  deeptadiVariant: "BPHS",
  deeptadiPercentages: {
    Deepta: 100,
    Sukhita: 90,
    Swastha: 75,
    Mudita: 60,
    Shanta: 50,
    Shakta: 75,
    Deena: 25,
    Dukhita: 12,
    Khala: 0,
  },
  vikalaIncludesDefeatedWar: true,
  yuddhaWinnerRule: "lowerLongitude",
  moonBeneficRule: "paksha",
  wateryExtended: false,
  kshobhitaUseCombustionOrb: false,
  ketuNumber: 9,
  navamsaMode: "indexInSign",
  ghatiRounding: "nearest",
  rahuExaltSign: 2,
  ketuExaltSign: 8,
  rahuDebilSign: 8,
  ketuDebilSign: 2,
  rahuMoolatrikonaSigns: [3, 6],
  ketuMoolatrikonaSigns: [9, 12],
  rahuOwnSigns: [11],
  ketuOwnSigns: [8],
  nodeFriends: ["Mercury", "Venus", "Saturn"],
  nodeNeutral: ["Jupiter"],
  nodeEnemies: ["Sun", "Moon", "Mars"],
  strengthWeights: { baladi: 20, jagradadi: 25, deeptadi: 30, lajjitadi: 25 },
  nameLetterAnkas: INITIAL_ANKAS,
};

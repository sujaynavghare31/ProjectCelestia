import type { Graha } from "./types";

export const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

export const SIGN_LORDS: Record<number, Graha> = {
  1: "Mars", 2: "Venus", 3: "Mercury", 4: "Moon", 5: "Sun", 6: "Mercury",
  7: "Venus", 8: "Mars", 9: "Jupiter", 10: "Saturn", 11: "Saturn", 12: "Jupiter",
};

export const OWN_SIGNS: Record<Graha, number[]> = {
  Sun: [5], Moon: [4], Mars: [1, 8], Mercury: [3, 6], Jupiter: [9, 12],
  Venus: [2, 7], Saturn: [10, 11], Rahu: [11], Ketu: [8],
};

export const EXALTATION: Record<Graha, { sign: number; degree: number }> = {
  Sun: { sign: 1, degree: 10 }, Moon: { sign: 2, degree: 3 }, Mars: { sign: 10, degree: 28 },
  Mercury: { sign: 6, degree: 15 }, Jupiter: { sign: 4, degree: 5 }, Venus: { sign: 12, degree: 27 },
  Saturn: { sign: 7, degree: 20 }, Rahu: { sign: 2, degree: 0 }, Ketu: { sign: 8, degree: 0 },
};

export const DEBILITATION: Record<Graha, number> = {
  Sun: 7, Moon: 8, Mars: 4, Mercury: 12, Jupiter: 10, Venus: 6, Saturn: 1, Rahu: 8, Ketu: 2,
};

export const MOOLATRIKONA: Partial<Record<Graha, { sign: number; from: number; to: number }>> = {
  Sun: { sign: 5, from: 0, to: 20 },
  Moon: { sign: 2, from: 4, to: 30 },
  Mars: { sign: 1, from: 0, to: 12 },
  Mercury: { sign: 6, from: 16, to: 20 },
  Jupiter: { sign: 9, from: 0, to: 10 },
  Venus: { sign: 7, from: 0, to: 15 },
  Saturn: { sign: 11, from: 0, to: 20 },
};

export const NATURAL_FRIENDS: Record<Graha, Graha[]> = {
  Sun: ["Moon", "Mars", "Jupiter"],
  Moon: ["Sun", "Mercury"],
  Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"],
  Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
  Rahu: ["Mercury", "Venus", "Saturn"],
  Ketu: ["Mercury", "Venus", "Saturn"],
};

export const NATURAL_ENEMIES: Record<Graha, Graha[]> = {
  Sun: ["Venus", "Saturn"],
  Moon: [],
  Mars: ["Mercury"],
  Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"],
  Venus: ["Sun", "Moon"],
  Saturn: ["Sun", "Moon", "Mars"],
  Rahu: ["Sun", "Moon", "Mars"],
  Ketu: ["Sun", "Moon", "Mars"],
};

export const COMBUSTION_ORBS: Partial<Record<Graha, { direct: number; retrograde?: number }>> = {
  Moon: { direct: 12 },
  Mars: { direct: 17 },
  Mercury: { direct: 14, retrograde: 12 },
  Jupiter: { direct: 11 },
  Venus: { direct: 10, retrograde: 8 },
  Saturn: { direct: 15 },
};

export const SHAYANADI_STATES = [
  "Nidra", "Shayana", "Upaveshana", "Netrapani", "Prakashana", "Gamana",
  "Agamana", "Sabha", "Agama", "Bhojana", "Nrityalipsa", "Kautuka",
] as const;

export const SHAYANADI_SANSKRIT: Record<string, string> = {
  Nidra: "निद्रा", Shayana: "शयन", Upaveshana: "उपवेशन", Netrapani: "नेत्रपाणि",
  Prakashana: "प्रकाशन", Gamana: "गमन", Agamana: "आगमन", Sabha: "सभा",
  Agama: "आगम", Bhojana: "भोजन", Nrityalipsa: "नृत्यलिप्सा", Kautuka: "कौतुक",
};

export const PLANET_NUMBER: Record<Graha, number> = {
  Sun: 1, Moon: 2, Mars: 3, Mercury: 4, Jupiter: 5, Venus: 6, Saturn: 7, Rahu: 8, Ketu: 8,
};

export const CHESHTA_CONSTANT: Record<Graha, number> = {
  Sun: 5, Moon: 2, Mars: 2, Mercury: 3, Jupiter: 5, Venus: 3, Saturn: 3, Rahu: 4, Ketu: 4,
};

export function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

export function derivePosition(longitude: number) {
  const normalized = normalizeLongitude(longitude);
  const sign = Math.floor(normalized / 30) + 1;
  const degree = normalized % 30;
  const nakSpan = 360 / 27;
  const nakshatra = Math.floor(normalized / nakSpan) + 1;
  const pada = Math.floor((normalized % nakSpan) / (nakSpan / 4)) + 1;
  const navamsaIndex = Math.floor(degree / (30 / 9)) + 1;
  const modality = sign % 3;
  const navamsaStart = modality === 1 ? sign : modality === 2 ? ((sign + 7) % 12) + 1 : ((sign + 3) % 12) + 1;
  const navamsaSign = ((navamsaStart + navamsaIndex - 2) % 12) + 1;
  return { longitude: normalized, sign, degree, nakshatra, pada, navamsaIndex, navamsaSign };
}

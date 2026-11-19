export const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;
export const SIGN_NAMES = SIGNS;
export const SIGN_SHORT = ["Ar","Ta","Ge","Cn","Le","Vi","Li","Sc","Sg","Cp","Aq","Pi"] as const;

export const SIGN_NAMES_SANSKRIT = [
  "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
  "Tula", "Vrischika", "Dhanu", "Makara", "Kumbha", "Meena",
] as const;

export const PLANET_NAMES = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] as const;
export const PLANET_SHORT = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"] as const;
export type PlanetIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type PlanetName = (typeof PLANET_NAMES)[number];

export const LORD1 = [2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4] as const;
export const LORD2: Readonly<Record<number, PlanetIndex>> = { 7: 8, 10: 7 };
export const EXALT = [0, 1, 9, 5, 3, 11, 6, 1, 7] as const;
export const KALA = [30, 16, 6, 8, 10, 12, 1] as const;
export const OWN: Readonly<Record<PlanetIndex, readonly number[]>> = {
  0: [4], 1: [3], 2: [0, 7], 3: [2, 5], 4: [8, 11],
  5: [1, 6], 6: [9, 10], 7: [10], 8: [7],
};
export const NATURAL_BENEFICS: readonly PlanetIndex[] = [1, 3, 4, 5];
export const NATURAL_MALEFICS: readonly PlanetIndex[] = [0, 2, 6, 7, 8];
export const DEITY = [
  "Shiva / Rama", "Gauri / Parvati / Krishna", "Skanda / Hanuman / Narasimha",
  "Vishnu", "Sambasiva / Dattatreya / Guru", "Lakshmi / Parashurama",
  "Shasta / Kurma / Narayana", "Durga", "Ganesha / Skanda",
] as const;
export const YEAR_DAYS = 365.2425;
export const SAVYA: readonly number[] = [0, 1, 2, 6, 7, 8];
export const KARAKA_NAMES_7 = ["AK", "AmK", "BK", "MK", "PK", "GK", "DK"] as const;
export const KARAKA_NAMES_8 = ["AK", "AmK", "BK", "MK", "PiK", "PK", "GK", "DK"] as const;

export function mod(x: number, n: number): number {
  return ((x % n) + n) % n;
}

export function sign(lon: number): number {
  return mod(Math.floor(lon / 30), 12);
}

export function deg(lon: number): number {
  return lon - 30 * mod(Math.floor(lon / 30), 12);
}

export function navamsa(lon: number): number {
  return mod(Math.floor(lon * 9 / 30 + 1e-9), 12);
}

export function houseFrom(x: number, base: number): number {
  return mod(x - base, 12) + 1;
}

export function kendra(a: number, b: number): boolean {
  return mod(b - a, 3) === 0;
}

export function trine(a: number, b: number): boolean {
  return mod(b - a, 4) === 0;
}

export type PlanetPositionMap = Partial<Record<PlanetName, number>> & Partial<Record<"Su" | "Mo" | "Ma" | "Me" | "Ju" | "Ve" | "Sa" | "Ra" | "Ke", number>>;
export type PlanetPositions = readonly number[] | PlanetPositionMap | Readonly<Record<number, number>>;

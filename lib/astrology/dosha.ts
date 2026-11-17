import type { PlanetPosition } from "@/lib/kundali-types";

export type DoshaName = "Vata" | "Pitta" | "Kapha";

export interface DoshaScore {
  name: DoshaName;
  percentage: number;
  description: string;
}

export interface DoshaCalculation {
  scores: DoshaScore[];
  dominant: DoshaName | null;
  sourceSigns: {
    lagna: string | null;
    moon: string | null;
    sixthHouseLord: string | null;
  };
}

const DOSHA_BY_SIGN: Record<string, DoshaName> = {
  Aries: "Pitta",
  Taurus: "Kapha",
  Gemini: "Vata",
  Cancer: "Kapha",
  Leo: "Pitta",
  Virgo: "Vata",
  Libra: "Vata",
  Scorpio: "Pitta",
  Sagittarius: "Pitta",
  Capricorn: "Kapha",
  Aquarius: "Vata",
  Pisces: "Kapha",
};

const SIGN_LORDS: Record<string, string> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter",
};

const SIGN_NAMES = Object.keys(DOSHA_BY_SIGN);

const DOSHA_DESCRIPTIONS: Record<DoshaName, string> = {
  Vata: "Air and ether bring movement, imagination, and a finely tuned sensitivity.",
  Pitta: "Fire brings clear perception, purposeful energy, and a bright inner drive.",
  Kapha: "Earth and water bring steadiness, nourishment, and an enduring calm.",
};

function normalizeSignName(signName: string | null | undefined) {
  return SIGN_NAMES.find((name) => name.toLowerCase() === signName?.trim().toLowerCase()) ?? null;
}

function doshaForSign(signName: string | null | undefined) {
  const normalized = normalizeSignName(signName);
  return normalized ? DOSHA_BY_SIGN[normalized] : null;
}

function getWeightedSign(
  contributions: Partial<Record<DoshaName, number>>,
  signName: string | null | undefined,
  weight: number,
) {
  const dosha = doshaForSign(signName);
  if (dosha) contributions[dosha] = (contributions[dosha] ?? 0) + weight;
}

export function calculateDosha(
  ascendantSign: number | null,
  planets: PlanetPosition[],
): DoshaCalculation {
  const contributions: Partial<Record<DoshaName, number>> = {};
  const ascendant = typeof ascendantSign === "number" ? SIGN_NAMES[(ascendantSign + 12) % 12] : null;
  const moon = planets.find((planet) => planet.name.toLowerCase() === "moon");
  const sixthHouseSign = ascendant
    ? SIGN_NAMES[(SIGN_NAMES.indexOf(ascendant) + 5) % 12]
    : null;
  const sixthHouseLord = sixthHouseSign ? SIGN_LORDS[sixthHouseSign] : null;
  const sixthHouseLordPlanet = sixthHouseLord
    ? planets.find((planet) => planet.name.toLowerCase() === sixthHouseLord.toLowerCase())
    : null;

  getWeightedSign(contributions, ascendant, 40);
  getWeightedSign(contributions, moon?.signName, 40);
  getWeightedSign(contributions, sixthHouseLordPlanet?.signName, 20);

  const scores = (["Vata", "Pitta", "Kapha"] as const).map((name) => ({
    name,
    percentage: contributions[name] ?? 0,
    description: DOSHA_DESCRIPTIONS[name],
  }));
  const dominant = scores.some((score) => score.percentage > 0)
    ? scores.reduce((highest, score) => score.percentage > highest.percentage ? score : highest).name
    : null;

  return {
    scores,
    dominant,
    sourceSigns: {
      lagna: ascendant,
      moon: normalizeSignName(moon?.signName),
      sixthHouseLord: sixthHouseLordPlanet?.signName ? normalizeSignName(sixthHouseLordPlanet.signName) : null,
    },
  };
}

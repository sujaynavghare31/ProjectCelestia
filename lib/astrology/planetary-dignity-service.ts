const SIGN_LORDS = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];

const FRIENDS: Record<string, string[]> = {
  Sun: ["Moon", "Mars", "Jupiter"],
  Moon: ["Sun", "Mercury"],
  Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"],
  Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
};

const ENEMIES: Record<string, string[]> = {
  Sun: ["Venus", "Saturn"],
  Moon: [],
  Mars: ["Mercury"],
  Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"],
  Venus: ["Sun", "Moon"],
  Saturn: ["Sun", "Moon", "Mars"],
};

const OWN_SIGNS: Record<string, number[]> = {
  Sun: [4],
  Moon: [3],
  Mars: [0, 7],
  Mercury: [2, 5],
  Jupiter: [8, 11],
  Venus: [1, 6],
  Saturn: [9, 10],
};

const EXALTATION: Record<string, number> = {
  Sun: 0,
  Moon: 1,
  Mars: 9,
  Mercury: 5,
  Jupiter: 3,
  Venus: 11,
  Saturn: 6,
};

const DEBILITATION: Record<string, number> = {
  Sun: 6,
  Moon: 7,
  Mars: 3,
  Mercury: 11,
  Jupiter: 9,
  Venus: 5,
  Saturn: 0,
};

const MOOLATRIKONA: Record<string, { sign: number; from: number; to: number }> = {
  Sun: { sign: 4, from: 0, to: 20 },
  Moon: { sign: 1, from: 4, to: 30 },
  Mars: { sign: 0, from: 0, to: 12 },
  Mercury: { sign: 5, from: 16, to: 20 },
  Jupiter: { sign: 8, from: 0, to: 10 },
  Venus: { sign: 6, from: 0, to: 15 },
  Saturn: { sign: 10, from: 0, to: 20 },
};

export type NaturalRelationship = "Friend" | "Enemy" | "Neutral" | "Unknown";
export type PlanetaryDignity = "Exalted" | "Debilitated" | "Own" | "Moolatrikona" | "Friend" | "Enemy" | "Neutral" | "—";

export function getSignLord(sign: number): string {
  return SIGN_LORDS[sign] ?? "Unknown";
}

export function getNaturalRelationship(planet: string, signLord: string): NaturalRelationship {
  if (!Object.hasOwn(FRIENDS, planet)) return "Unknown";
  if (FRIENDS[planet].includes(signLord)) return "Friend";
  if (ENEMIES[planet].includes(signLord)) return "Enemy";
  return "Neutral";
}

export function getPlanetaryDignity(planet: string, sign: number, degree = 0): PlanetaryDignity {
  if (!Object.hasOwn(OWN_SIGNS, planet)) return "—";
  if (EXALTATION[planet] === sign) return "Exalted";
  if (DEBILITATION[planet] === sign) return "Debilitated";
  if (MOOLATRIKONA[planet].sign === sign && degree >= MOOLATRIKONA[planet].from && degree < MOOLATRIKONA[planet].to) {
    return "Moolatrikona";
  }
  if (OWN_SIGNS[planet].includes(sign)) return "Own";
  const relationship = getNaturalRelationship(planet, getSignLord(sign));
  return relationship === "Unknown" ? "—" : relationship;
}

export function getNaturalFriendship(planet: string, sign: number): NaturalRelationship {
  return getNaturalRelationship(planet, getSignLord(sign));
}

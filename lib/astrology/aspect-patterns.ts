import type { PlanetPosition } from "@/lib/kundali-types";

export const WESTERN_ASPECTS = [
  { name: "Conjunction", angle: 0, orb: 8, symbol: "☌", color: "text-violet-700 dark:text-violet-300" },
  { name: "Semi-sextile", angle: 30, orb: 2, symbol: "⚺", color: "text-slate-600 dark:text-slate-400" },
  { name: "Sextile", angle: 60, orb: 5, symbol: "⚹", color: "text-cyan-700 dark:text-cyan-300" },
  { name: "Square", angle: 90, orb: 6, symbol: "□", color: "text-rose-700 dark:text-rose-300" },
  { name: "Trine", angle: 120, orb: 6, symbol: "△", color: "text-emerald-700 dark:text-emerald-300" },
  { name: "Sesquiquadrate", angle: 135, orb: 2.5, symbol: "⚼", color: "text-rose-700 dark:text-rose-300" },
  { name: "Quincunx", angle: 150, orb: 3, symbol: "⚻", color: "text-amber-700 dark:text-amber-300" },
  { name: "Opposition", angle: 180, orb: 8, symbol: "☍", color: "text-violet-700 dark:text-violet-300" },
] as const;

type AspectBody = Pick<PlanetPosition, "name" | "longitude">;
type WesternAspect = (typeof WESTERN_ASPECTS)[number];

export type AspectPattern = {
  type: "T-square" | "Yod" | "Mystic Rectangle" | "Grand Square";
  planets: string[];
  orb: number;
  apex?: string;
};

export function findWesternAspect(first: AspectBody, second: AspectBody) {
  const rawDifference = Math.abs(first.longitude - second.longitude) % 360;
  const separation = Math.min(rawDifference, 360 - rawDifference);
  const candidates = WESTERN_ASPECTS
    .map((aspect) => ({ aspect, orb: Math.abs(separation - aspect.angle) }))
    .filter(({ aspect, orb }) => orb <= aspect.orb)
    .sort((a, b) => a.orb - b.orb);
  return candidates[0] ?? null;
}

function combinations<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  const collect = (start: number, current: T[]) => {
    if (current.length === size) {
      result.push(current);
      return;
    }
    for (let index = start; index <= items.length - (size - current.length); index += 1) {
      collect(index + 1, [...current, items[index]]);
    }
  };
  collect(0, []);
  return result;
}

function matchingAspect(first: AspectBody, second: AspectBody, name: WesternAspect["name"]) {
  const match = findWesternAspect(first, second);
  return match?.aspect.name === name ? match : null;
}

export function findAspectPatterns(planets: AspectBody[]): AspectPattern[] {
  const bodies = planets.filter(({ longitude }) => Number.isFinite(longitude));
  const patterns: AspectPattern[] = [];

  const addPattern = (type: AspectPattern["type"], members: AspectBody[], matches: Array<{ orb: number }>, apex?: string) => {
    patterns.push({
      type,
      planets: members.map(({ name }) => name),
      orb: Math.max(...matches.map(({ orb }) => orb)),
      ...(apex ? { apex } : {}),
    });
  };

  for (const [first, second, third] of combinations(bodies, 3)) {
    const members = [first, second, third];
    for (let apex = 0; apex < members.length; apex += 1) {
      const endpoints = members.filter((_, index) => index !== apex);
      const opposition = matchingAspect(endpoints[0], endpoints[1], "Opposition");
      const firstSquare = matchingAspect(members[apex], endpoints[0], "Square");
      const secondSquare = matchingAspect(members[apex], endpoints[1], "Square");
      if (opposition && firstSquare && secondSquare) {
        addPattern("T-square", members, [opposition, firstSquare, secondSquare], members[apex].name);
      }

      const sextile = matchingAspect(endpoints[0], endpoints[1], "Sextile");
      const firstQuincunx = matchingAspect(members[apex], endpoints[0], "Quincunx");
      const secondQuincunx = matchingAspect(members[apex], endpoints[1], "Quincunx");
      if (sextile && firstQuincunx && secondQuincunx) {
        addPattern("Yod", members, [sextile, firstQuincunx, secondQuincunx], members[apex].name);
      }
    }
  }

  const partitions = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]];
  for (const members of combinations(bodies, 4)) {
    for (const [firstA, firstB, secondA, secondB] of partitions) {
      const firstOpposition = matchingAspect(members[firstA], members[firstB], "Opposition");
      const secondOpposition = matchingAspect(members[secondA], members[secondB], "Opposition");
      if (!firstOpposition || !secondOpposition) continue;

      const crossAspectCandidates = [
        matchingAspect(members[firstA], members[secondA], "Square")
          ?? matchingAspect(members[firstA], members[secondA], "Trine")
          ?? matchingAspect(members[firstA], members[secondA], "Sextile"),
        matchingAspect(members[firstA], members[secondB], "Square")
          ?? matchingAspect(members[firstA], members[secondB], "Trine")
          ?? matchingAspect(members[firstA], members[secondB], "Sextile"),
        matchingAspect(members[firstB], members[secondA], "Square")
          ?? matchingAspect(members[firstB], members[secondA], "Trine")
          ?? matchingAspect(members[firstB], members[secondA], "Sextile"),
        matchingAspect(members[firstB], members[secondB], "Square")
          ?? matchingAspect(members[firstB], members[secondB], "Trine")
          ?? matchingAspect(members[firstB], members[secondB], "Sextile"),
      ];
      if (crossAspectCandidates.some((aspect) => !aspect)) continue;
      const validCrossAspects = crossAspectCandidates.filter(
        (aspect): aspect is NonNullable<typeof aspect> => aspect !== null,
      );
      if (validCrossAspects.every(({ aspect }) => aspect.name === "Square")) {
        addPattern("Grand Square", members, [firstOpposition, secondOpposition, ...validCrossAspects]);
      } else {
        const trines = validCrossAspects.filter(({ aspect }) => aspect.name === "Trine").length;
        const sextiles = validCrossAspects.filter(({ aspect }) => aspect.name === "Sextile").length;
        if (trines === 2 && sextiles === 2) {
          addPattern("Mystic Rectangle", members, [firstOpposition, secondOpposition, ...validCrossAspects]);
        }
      }
    }
  }

  return patterns;
}

import { OWN, PLANET_NAMES, PLANET_SHORT, EXALT, mod, deg, sign } from "./constants";
import { lordOf, signStrength, signRanks, planetSigns, planetLongitudes, isExalted, isDebilitated } from "./core";
import type { PlanetPositions } from "./constants";

export interface SignStrengthRow {
  sign: number;
  planets: number[];
  lord: number;
  lordSign: number;
  jupiterMercuryLordAspectCount: number;
  nature: "Movable" | "Fixed" | "Dual";
  score: number;
  rank: number;
}

export interface PlanetStrengthRow {
  planet: number;
  sign: number;
  dignity: "Exalted" | "Debilitated" | "Own sign" | "—";
  karaka: string;
  signScore: number;
  house: number;
}

export function signStrengthTable(planets: PlanetPositions, lagna: number): SignStrengthRow[] {
  const ranks = signRanks(planets);
  const ps = planetSigns(planets);
  const longs = planetLongitudes(planets);
  return Array.from({ length: 12 }, (_, s) => {
    const lord = lordOf(s, planets);
    const relevant = [1, 3, lord];
    let count = 0;
    for (const p of relevant) {
      const psn = sign(longs[p] ?? 0);
      const d = mod(psn - s, 12);
      if (psn === s || [2, 5, 8].includes(d) || [3, 6, 9].includes(d) || [4, 7, 10].includes(d)) count++;
    }
    return {
      sign: s,
      planets: ps.map((p, i) => p === s ? i : -1).filter((p) => p >= 0),
      lord,
      lordSign: sign(longs[lord] ?? 0),
      jupiterMercuryLordAspectCount: count,
      nature: mod(s, 3) === 0 ? "Movable" : mod(s, 3) === 1 ? "Fixed" : "Dual",
      score: signStrength(s, planets),
      rank: ranks[s],
    };
  });
}

export function planetStrengthTable(planets: PlanetPositions, lagna: number, karakas: Array<{ name: string; planet: number }> = []): PlanetStrengthRow[] {
  const longs = planetLongitudes(planets);
  return PLANET_NAMES.map((_, p) => {
    const ps = sign(longs[p] ?? 0);
    const karaka = karakas.find((k) => k.planet === p)?.name ?? "—";
    const dignity = isExalted(p as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, planets)
      ? "Exalted"
      : isDebilitated(p as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, planets)
        ? "Debilitated"
        : ((OWN[p as keyof typeof OWN] ?? []) as readonly number[]).includes(ps) ? "Own sign" : "—";
    return {
      planet: p,
      sign: ps,
      dignity,
      karaka,
      signScore: signStrength(ps, planets),
      house: mod(ps - mod(lagna, 12), 12) + 1,
    };
  });
}

import {
  EXALT, LORD1, LORD2, OWN, PLANET_NAMES, PLANET_SHORT,
  deg, houseFrom, mod, navamsa, sign,
  type PlanetIndex, type PlanetPositions,
} from "./constants";

export function planetLongitudes(planets: PlanetPositions): number[] {
  if (Array.isArray(planets)) return Array.from(planets);
  const map = planets as Record<string, number>;
  return PLANET_NAMES.map((name, index) => {
    const short = PLANET_SHORT[index];
    return map[name] ?? map[short] ?? map[String(index)] ?? 0;
  });
}

export function planetSigns(planets: PlanetPositions): number[] {
  return planetLongitudes(planets).map(sign);
}

export function aspects(a: number, b: number): boolean {
  a = mod(a, 12);
  b = mod(b, 12);
  const d = mod(b - a, 12);
  const m = mod(a, 3);
  return mod(d, 3) === mod(m + 1, 3) && d !== [1, 11, 0][m];
}

export function associated(a: number, b: number): boolean {
  a = mod(a, 12);
  b = mod(b, 12);
  return a === b || aspects(a, b);
}

export function exalted(p: PlanetIndex, planets: PlanetPositions = []): boolean {
  void planets;
  return sign(planetLongitudes(planets)[p] ?? 0) === EXALT[p];
}

export function debilitated(p: PlanetIndex): boolean {
  return false;
}

export function planetInSign(p: PlanetIndex, s: number, planets: PlanetPositions): boolean {
  return sign(planetLongitudes(planets)[p] ?? 0) === mod(s, 12);
}

export function planetsInSign(s: number, planets: PlanetPositions): PlanetIndex[] {
  s = mod(s, 12);
  return planetSigns(planets).map((ps, p) => ps === s ? p as PlanetIndex : -1).filter((p) => p >= 0) as PlanetIndex[];
}

export function lordOf(signIndex: number, planets: PlanetPositions = []): PlanetIndex {
  signIndex = mod(signIndex, 12);
  const lords: readonly PlanetIndex[] = LORD2[signIndex] !== undefined
    ? [LORD1[signIndex] as PlanetIndex, LORD2[signIndex] as PlanetIndex]
    : [LORD1[signIndex] as PlanetIndex];
  if (lords.length === 1) return lords[0];
  const [primary, co] = lords;
  const lordsInSign = lords.filter((p) => planetInSign(p, signIndex, planets));
  if (lordsInSign.length === 1) return lords.find((p) => p !== lordsInSign[0]) as PlanetIndex;
  if (lordsInSign.length === 2) return primary;

  const primaryCount = countPlanetsInSign(signForLord(primary, planets), planets);
  const coCount = countPlanetsInSign(signForLord(co, planets), planets);
  if (primaryCount !== coCount) return primaryCount > coCount ? primary : co;
  if (EXALT[primary] !== EXALT[co]) {
    const primaryExalted = planetInSign(primary, EXALT[primary], planets);
    const coExalted = planetInSign(co, EXALT[co], planets);
    if (primaryExalted !== coExalted) return primaryExalted ? primary : co;
  }
  const longs = planetLongitudes(planets);
  const primaryDegree = deg(longs[primary] ?? 0);
  const coDegree = deg(longs[co] ?? 0);
  return primaryDegree >= coDegree ? primary : co;
}

function signForLord(p: PlanetIndex, planets: PlanetPositions): number {
  return sign(planetLongitudes(planets)[p] ?? 0);
}

export function countPlanetsInSign(s: number, planets: PlanetPositions): number {
  return planetsInSign(s, planets).length;
}

export function isExalted(p: PlanetIndex, planets: PlanetPositions): boolean {
  return planetInSign(p, EXALT[p], planets);
}

export function isDebilitated(p: PlanetIndex, planets: PlanetPositions): boolean {
  return planetInSign(p, mod(EXALT[p] + 6, 12), planets);
}

export function charaKarakas(planets: PlanetPositions, scheme: 7 | 8 = 7): Array<{ name: string; planet: PlanetIndex; degree: number }> {
  const longs = planetLongitudes(planets);
  const eligible: PlanetIndex[] = scheme === 8
    ? [0, 1, 2, 3, 4, 5, 6, 7]
    : [0, 1, 2, 3, 4, 5, 6];
  const ranked = eligible.map((p) => ({
    planet: p,
    degree: p === 7 && scheme === 8 ? mod(30 - deg(longs[7] ?? 0), 30) : deg(longs[p] ?? 0),
  })).sort((a, b) => b.degree - a.degree || a.planet - b.planet).slice(0, scheme === 8 ? 8 : 7);
  const names = scheme === 8
    ? ["AK", "AmK", "BK", "MK", "PiK", "PK", "GK", "DK"]
    : ["AK", "AmK", "BK", "MK", "PK", "GK", "DK"];
  return ranked.map((item, i) => ({ name: names[i], ...item }));
}

export function karakamsha(planets: PlanetPositions, scheme: 7 | 8 = 7): number {
  const karakas = charaKarakas(planets, scheme);
  const ak = karakas.find((k) => k.name === "AK");
  const longs = planetLongitudes(planets);
  return ak ? navamsa(longs[ak.planet] ?? 0) : 0;
}

export function signStrength(s: number, planets: PlanetPositions = []): number {
  s = mod(s, 12);
  const longs = planetLongitudes(planets);
  const l = lordOf(s, planets);
  let aspectCount = 0;
  const relevant = new Set<PlanetIndex>([1, 3, 4, l]);
  for (const p of relevant) {
    const ps = sign(longs[p] ?? 0);
    if (ps === s || aspects(ps, s)) aspectCount += 1;
  }
  const modality = mod(s, 3);
  return 1000 * countPlanetsInSign(s, planets)
    + 100 * aspectCount
    + 10 * (modality + 1)
    + deg(longs[l] ?? 0) / 3;
}

export function signRanks(planets: PlanetPositions = []): number[] {
  const scores = Array.from({ length: 12 }, (_, s) => signStrength(s, planets));
  const greaterCount = (score: number) => scores.filter((candidate) => candidate > score).length;
  const ranks = scores.map((score) => 1 + greaterCount(score));
  return ranks;
}

export function stronger(a: number, b: number, planets: PlanetPositions = []): number {
  a = mod(a, 12);
  b = mod(b, 12);
  return signStrength(a, planets) >= signStrength(b, planets) ? a : b;
}

export function trikonaStart(lagna: number, planets: PlanetPositions = []): number {
  lagna = mod(lagna, 12);
  const candidates = [lagna, mod(lagna + 4, 12), mod(lagna + 8, 12)];
  const scores = candidates.map((s) => signStrength(s, planets));
  let best = 0;
  for (let i = 1; i < 3; i++) if (scores[i] > scores[best]) best = i;
  return candidates[best];
}

export function brahma(lagna: number, s17: number, planets: PlanetPositions = []): PlanetIndex {
  lagna = mod(lagna, 12);
  s17 = mod(s17, 12);
  const candidates = [mod(s17 + 5, 12), mod(s17 + 7, 12), mod(s17 + 11, 12)]
    .map((s) => lordOf(s, planets));
  const uniq = Array.from(new Set(candidates));
  let best: PlanetIndex | null = null;
  let bestScore = -Infinity;
  const longs = planetLongitudes(planets);
  for (const p of uniq) {
    if (p === 7 || p === 8) continue;
    const ps = sign(longs[p] ?? 0);
    const odd = mod(ps, 2) === 0 ? 1 : 0;
    const visible = houseFrom(ps, lagna) >= 7 && houseFrom(ps, lagna) <= 12;
    const score = odd * (visible ? 1 : 0) * 1000 + odd * 100 + (p !== 6 ? 50 : 0) + deg(longs[p] ?? 0);
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return best ?? lordOf(lagna, planets);
}

export function getLagnaSign(lagnaLongitude: number): number {
  return sign(lagnaLongitude);
}

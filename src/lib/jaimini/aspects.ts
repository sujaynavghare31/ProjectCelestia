import { mod } from "./constants";
import { aspects as signAspect, associated, planetSigns } from "./core";
import type { PlanetPositions } from "./constants";

export interface AspectReport {
  signMatrix: boolean[][];
  planetMatrix: ("C" | "A" | "")[][];
  signsAspected: number[][];
  planetsAspected: number[][];
  planetsAspecting: number[][];
}

export function aspectReport(planets: PlanetPositions): AspectReport {
  const ps = planetSigns(planets);
  const signMatrix = Array.from({ length: 12 }, (_, a) =>
    Array.from({ length: 12 }, (_, b) => signAspect(a, b)));
  const planetMatrix = Array.from({ length: 9 }, () => Array<string>(9).fill("")) as ("C" | "A" | "")[][];
  const signsAspected = ps.map((p) => Array.from({ length: 12 }, (_, s) => s).filter((s) => signAspect(p, s)));
  const planetsAspected = Array.from({ length: 9 }, () => [] as number[]);
  const planetsAspecting = Array.from({ length: 9 }, () => [] as number[]);
  for (let a = 0; a < 9; a++) {
    for (let b = 0; b < 9; b++) {
      if (a === b) continue;
      if (ps[a] === ps[b]) planetMatrix[a][b] = "C";
      else if (signAspect(ps[a], ps[b])) planetMatrix[a][b] = "A";
      if (planetMatrix[a][b]) planetsAspected[a].push(b);
      if (planetMatrix[b][a]) planetsAspecting[a].push(b);
    }
  }
  return { signMatrix, planetMatrix, signsAspected, planetsAspected, planetsAspecting };
}

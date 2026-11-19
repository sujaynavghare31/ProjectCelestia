import { OWN, mod, sign } from "./constants";
import { lordOf, planetLongitudes, planetSigns } from "./core";
import type { PlanetPositions } from "./constants";

export interface DispositorChain {
  planet: number;
  chain: number[];
  finalDispositor: number | "Cycle";
  mutualExchange: boolean;
}

export function dispositorReport(planets: PlanetPositions): DispositorChain[] {
  const longs = planetLongitudes(planets);
  const ps = planetSigns(planets);
  return Array.from({ length: 9 }, (_, p) => {
    const chain: number[] = [];
    let current = p;
    for (let level = 0; level < 4; level++) {
      const lord = lordOf(ps[current] ?? 0, planets);
      chain.push(lord);
      current = lord;
    }
    const fourth = chain[3];
    const ownSigns = OWN[fourth as keyof typeof OWN] ?? [];
    const finalDispositor: number | "Cycle" = ownSigns.includes(sign(longs[fourth] ?? 0)) ? fourth : "Cycle";
    const q = lordOf(ps[p], planets);
    const mutualExchange = q !== p && lordOf(ps[q], planets) === p;
    return { planet: p, chain, finalDispositor, mutualExchange };
  });
}

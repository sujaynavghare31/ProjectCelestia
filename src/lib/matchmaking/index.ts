export * from "./astro";
export * from "./milan";
export * from "./cities";
import { computePositions, type BirthInput } from "./astro";
import { kundliMilan, type MilanOptions } from "./milan";

/** One call from birth details: computes both charts (own astronomy) and the full match. Pass `positions` instead if the portal already has Swiss Ephemeris values. */
export function matchFromBirth(boy: BirthInput & { name?: string }, girl: BirthInput & { name?: string }, opts: MilanOptions = {}) {
  const b = computePositions(boy), g = computePositions(girl);
  return { boyChart: b, girlChart: g, ...kundliMilan({ name: boy.name, positions: b.sidereal }, { name: girl.name, positions: g.sidereal }, opts) };
}

// ---------------------------------------------------------------------------
// Name_Check – test spellings, add-one-letter table, nearest favourable totals
// ---------------------------------------------------------------------------
import { TABLES } from "../data/tables";
import { chaldeanSum, pythSum, reduce } from "../core/math";
import { compound, rel, relationLabel, rootLists, score10, verdict10 } from "../core/rules";
import type { PersonContext } from "../types";

/** Rate a Chaldean total for the person (shared by name rows, add-letter rows, target rows). */
export function rateNameTotal(ctx: PersonContext, total: number) {
  const root = reduce(total);
  const c = compound(total);
  const score = score10(rel(ctx.moolank, root), rel(ctx.bhagyank, root), c.score);
  return {
    total, root, compoundMeaning: c.keyword, rating: c.rating,
    vsMoolank: relationLabel(ctx.moolank, root), vsBhagyank: relationLabel(ctx.bhagyank, root),
    score, verdict: verdict10(score),
  };
}

/** Test one spelling. */
export function checkName(ctx: PersonContext, name: string) {
  const r = rateNameTotal(ctx, chaldeanSum(name));
  const pythTotal = pythSum(name);
  return { name, ...r, pythTotal, pythRoot: reduce(pythTotal) };
}

/** Effect of adding each letter A–Z to the current name total. */
export function addOneLetterTable(ctx: PersonContext, currentTotal: number) {
  return Object.keys(TABLES.chaldean).map((letter) => {
    const value = TABLES.chaldean[letter];
    return { letter, value, ...rateNameTotal(ctx, currentTotal + value) };
  });
}

/** Totals from current−8 … current+8 (excluding 0) with how to reach them. */
export function nearestTargets(ctx: PersonContext, currentTotal: number) {
  const out = [];
  for (let delta = -8; delta <= 8; delta++) {
    if (delta === 0) continue;
    out.push({
      delta, ...rateNameTotal(ctx, currentTotal + delta),
      how: delta > 0 ? `Add letter(s) worth ${delta}` : `Remove letter(s) worth ${-delta}`,
      lettersWithThatValue: TABLES.chaldeanLettersByValue[String(Math.abs(delta))],
    });
  }
  return out;
}

export function nameCheckModule(ctx: PersonContext, currentName: string, alternatives: string[] = []) {
  const current = checkName(ctx, currentName);
  return {
    idealNameRoots: rootLists(ctx),
    current,
    alternatives: alternatives.filter((s) => s.trim()).map((s) => checkName(ctx, s)),
    addOneLetter: addOneLetterTable(ctx, current.total),
    nearestTargets: nearestTargets(ctx, current.total),
  };
}

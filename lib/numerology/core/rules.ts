// ---------------------------------------------------------------------------
// Shared scoring rules: compatibility, compound ratings, score/verdict scales.
// ---------------------------------------------------------------------------
import { TABLES } from "../data/tables";
import type { CompoundRating, PersonContext, Relation } from "../types";
import { excelRound, reduce } from "./math";

const isRoot = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 9;

/** Relation of `other` as seen by `person` (row = person, column = other). '-' if either is not 1..9. */
export function relationLabel(person: number | null | undefined, other: number | null | undefined): Relation | "-" {
  if (!isRoot(person) || !isRoot(other)) return "-";
  return TABLES.compatibility[String(person)][String(other)];
}

/** Friend = 2, Neutral = 1, Enemy = 0 (invalid input = 0). */
export function rel(person: number | null | undefined, other: number | null | undefined): number {
  const l = relationLabel(person, other);
  return l === "Friend" ? 2 : l === "Neutral" ? 1 : 0;
}

/** Numbers 1..9 that `n` treats as Friend. */
export function friendsOf(n: number): number[] {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((j) => relationLabel(n, j) === "Friend");
}

export interface CompoundResult { rating: CompoundRating | "-"; score: number; keyword: string }

/**
 * Chaldean compound-number rating.
 *  - n < 1          -> "-" / 0
 *  - 1..52          -> Cheiro table
 *  - 53..150        -> rating of the root; keyword "Reduces to r – <root keyword>"
 *  - > 150          -> exactly the root's entry
 */
export function compound(n: number): CompoundResult {
  if (!(n >= 1)) return { rating: "-", score: 0, keyword: "-" };
  if (n > 150) return compound(reduce(n));
  if (n <= 52) {
    const e = TABLES.compound[String(n)];
    return { rating: e.rating, score: TABLES.compoundScore[e.rating], keyword: e.keyword };
  }
  const r = reduce(n);
  const base = TABLES.compound[String(r)];
  return { rating: base.rating, score: TABLES.compoundScore[base.rating], keyword: `Reduces to ${r} – ${base.keyword}` };
}

/** Standard 0-10 score: (Moolank fit + Bhagyank fit × 1.5 + compound score) / 7 × 10, rounded to 1 dp. */
export function score10(mFit: number, bFit: number, compoundScore: number): number {
  return excelRound(((mFit + bFit * 1.5 + compoundScore) / 7) * 10, 1);
}

/** Standard verdict scale used everywhere a score is out of 10. */
export function verdict10(score: number, bad = "Not suitable – change"): string {
  if (score >= 8) return "Excellent";
  if (score >= 6.5) return "Good";
  if (score >= 5) return "Average";
  return bad;
}

/** Root suitability for the person (used by root tables on House/Bank/Vehicle). */
export function rootSuitability(ctx: PersonContext, k: number): "Excellent" | "Good" | "Avoid" | "Average" {
  const m = rel(ctx.moolank, k), b = rel(ctx.bhagyank, k);
  if (m === 2 && b === 2) return "Excellent";
  if (m + b >= 3) return "Good";
  if (m === 0 || b === 0) return "Avoid";
  return "Average";
}

/** Best / good / avoid root lists (Mobile, Name_Check, Bank, Vehicle headers). */
export function rootLists(ctx: PersonContext) {
  const all = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const m = (k: number) => rel(ctx.moolank, k), b = (k: number) => rel(ctx.bhagyank, k);
  return {
    best: all.filter((k) => m(k) === 2 && b(k) === 2),
    good: all.filter((k) => m(k) + b(k) === 3),
    avoid: all.filter((k) => m(k) === 0 || b(k) === 0),
    /** digits that fill a missing Lo Shu number and are not enemies of Moolank */
    digitsToInclude: all.filter((k) => ctx.loShuCounts[k] === 0 && m(k) >= 1),
    /** enemies of Moolank */
    digitsToMinimise: all.filter((k) => m(k) === 0),
  };
}

/** Enemy-digit count and "missing Lo Shu digits filled" for a digit string. */
export function digitQuality(ctx: PersonContext, s: string) {
  let enemy = 0, filled = 0, zeros = 0;
  for (const ch of s) if (ch === "0") zeros++;
  for (let d = 1; d <= 9; d++) {
    const c = s.split(String(d)).length - 1;
    if (rel(ctx.moolank, d) === 0) enemy += c;
    if (c > 0 && ctx.loShuCounts[d] === 0) filled++;
  }
  return { zeros, enemyDigits: enemy, loShuFilled: filled };
}

export const joinNums = (a: (number | string)[]) => a.join(", ");

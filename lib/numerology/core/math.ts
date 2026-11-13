// ---------------------------------------------------------------------------
// Basic numerology arithmetic. Every function is pure.
// Excel equivalents are noted so behaviour can be checked against the workbook.
// ---------------------------------------------------------------------------
import { TABLES } from "../data/tables";

/** Reduce to a single digit 1..9 (digital root). 0 or negative -> 0.
 *  Excel: IF(x<=0,0,MOD(x-1,9)+1) */
export function reduce(x: number): number {
  if (!Number.isFinite(x) || x <= 0) return 0;
  return ((Math.trunc(x) - 1) % 9) + 1;
}

/** Sum of every digit character 0-9 in the value; all other characters are ignored.
 *  Excel: SUMPRODUCT((LEN(s)-LEN(SUBSTITUTE(s,Digits,"")))*Digits) */
export function digitSum(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  let s = 0;
  for (const ch of String(value)) if (ch >= "0" && ch <= "9") s += ch.charCodeAt(0) - 48;
  return s;
}

function letterSum(text: string | null | undefined, map: Record<string, number>, only?: (ch: string) => boolean): number {
  if (!text) return 0;
  let s = 0;
  for (const ch of text.toUpperCase()) {
    const v = map[ch];
    if (v !== undefined && (!only || only(ch))) s += v;
  }
  return s;
}

/** Chaldean letter total (A=1,B=2,C=3,D=4,E=5,F=8,…; digits/spaces ignored). */
export const chaldeanSum = (t: string | null | undefined) => letterSum(t, TABLES.chaldean);
/** Pythagorean letter total (A=1 … I=9, J=1 …). */
export const pythSum = (t: string | null | undefined) => letterSum(t, TABLES.pythagorean);
/** Pythagorean total of vowels A E I O U only (Y counted as consonant). */
export const pythVowelSum = (t: string | null | undefined) => letterSum(t, TABLES.pythagorean, (c) => TABLES.vowels.includes(c));
/** Pythagorean total of consonants only. */
export const pythConsonantSum = (t: string | null | undefined) => letterSum(t, TABLES.pythagorean, (c) => !TABLES.vowels.includes(c));
/** Alphanumeric total: Chaldean letters + digits (used for flat numbers, plates, office units). */
export const alnumSum = (t: string | null | undefined) => chaldeanSum(t) + digitSum(t);

/** Excel ROUND (half away from zero), tolerant to binary float noise. */
export function excelRound(x: number, digits = 0): number {
  const f = 10 ** digits;
  const v = Math.round(Math.abs(x) * f + 1e-9) / f;
  return x < 0 ? -v : v;
}

/** Digit sum for numbers < 1000 exactly as the workbook does it: MOD(p,10)+MOD(INT(p/10),10)+INT(p/100) */
function ds3(p: number): number {
  return (p % 10) + (Math.floor(p / 10) % 10) + Math.floor(p / 100);
}

/** One Pythagorean reduction step that preserves master numbers 11, 22, 33. */
export function masterStep(p: number): number {
  return p < 10 || p === 11 || p === 22 || p === 33 ? p : ds3(p);
}

/** Apply masterStep n times (the workbook uses 3 steps for name numbers). */
export function masterReduce(p: number, steps = 3): number {
  let v = p;
  for (let i = 0; i < steps; i++) v = masterStep(v);
  return v;
}

/** Remove spaces, '-' and '+' and upper-case (used for phone/bank/plate numbers). */
export function cleanNumber(s: string | number | null | undefined): string {
  return String(s ?? "").toUpperCase().replace(/[ \-+]/g, "");
}

/** Count of each digit 0..9 in a string. */
export function digitCounts(s: string): number[] {
  const c = new Array(10).fill(0);
  for (const ch of s) if (ch >= "0" && ch <= "9") c[ch.charCodeAt(0) - 48]++;
  return c;
}

/** "1,3, 5" -> membership test (Excel SEARCH(","&n&",", ","&list&",")) */
export function inList(n: number | null | undefined, list: string): boolean {
  if (n === null || n === undefined) return false;
  return ("," + list.replace(/ /g, "") + ",").includes("," + n + ",");
}

/** First word of a trimmed name. */
export function firstWord(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

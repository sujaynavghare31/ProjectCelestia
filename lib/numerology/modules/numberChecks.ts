// ---------------------------------------------------------------------------
// Mobile, House_Flat, Bank_Account, Vehicle – suggestions and checks
// ---------------------------------------------------------------------------
import { TABLES } from "../data/tables";
import { alnumSum, chaldeanSum, cleanNumber, digitSum, excelRound, reduce } from "../core/math";
import { compound, digitQuality, rel, relationLabel, rootLists, rootSuitability, score10, verdict10 } from "../core/rules";
import type { PersonContext } from "../types";

const info = (n: number) => TABLES.numberInfo[String(n)];
const remarks = (parts: [boolean, string][]) => {
  const s = parts.filter(([c]) => c).map(([, t]) => t).join("");
  return s === "" ? "Well balanced" : s;
};

/** Example 4-character numbers whose digit root is k (patterns aabb, abab, abba first, then 0001…9999). */
export function exampleNumbers(k: number, n = 6): string[] {
  const out: string[] = [];
  const pats: string[] = [];
  for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++) pats.push(`${a}${a}${b}${b}`, `${a}${b}${a}${b}`, `${a}${b}${b}${a}`);
  for (let x = 1; x < 10000; x++) pats.push(String(x).padStart(4, "0"));
  for (const p of pats) {
    if (out.includes(p) || p === "0000") continue;
    if (reduce(digitSum(p)) === k) out.push(p);
    if (out.length >= n) break;
  }
  return out;
}

/** Root 1..9 table shown at the top of House / Bank / Vehicle sheets. */
export function rootTable(ctx: PersonContext, meaning: "house" | "keyword") {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => ({
    root: k, vsMoolank: relationLabel(ctx.moolank, k), vsBhagyank: relationLabel(ctx.bhagyank, k),
    suitability: rootSuitability(ctx, k), examples: exampleNumbers(k),
    meaning: meaning === "house" ? info(k).houseMeaning : info(k).keyword,
  }));
}

// ----------------------------- MOBILE -----------------------------
export function checkMobile(ctx: PersonContext, number: string) {
  const s = cleanNumber(number);
  const total = digitSum(number), root = reduce(total), c = compound(total);
  const q = digitQuality(ctx, s);
  const m = rel(ctx.moolank, root), b = rel(ctx.bhagyank, root);
  const score = excelRound(m + b * 1.5 + c.score + (q.zeros <= 1 ? 1 : 0) + (q.enemyDigits <= 2 ? 1 : 0) + (q.loShuFilled >= 1 ? 1 : 0), 1);
  return {
    number, total, root, compoundRating: c.rating, vsMoolank: relationLabel(ctx.moolank, root), vsBhagyank: relationLabel(ctx.bhagyank, root),
    ...q, score, verdict: verdict10(score),
    remarks: remarks([[q.zeros > 1, "Too many 0s; "], [q.enemyDigits > 2, "Many enemy digits; "], [q.loShuFilled === 0, "Fills no missing Lo Shu digit; "],
      [b === 0, "Total clashes with Bhagyank; "], [m === 0, "Total clashes with Moolank; "]]),
  };
}
export const mobileModule = (ctx: PersonContext, numbers: string[]) => ({
  suggestions: rootLists(ctx),
  checks: numbers.filter((n) => n.trim()).map((n) => checkMobile(ctx, n)),
});

// ----------------------------- HOUSE / FLAT -----------------------------
export function checkHouse(ctx: PersonContext, number: string) {
  const total = alnumSum(number), root = reduce(total), c = compound(total);
  const score = score10(rel(ctx.moolank, root), rel(ctx.bhagyank, root), c.score);
  return {
    number, digitTotal: digitSum(number), total, root, compoundRating: c.rating,
    vsMoolank: relationLabel(ctx.moolank, root), vsBhagyank: relationLabel(ctx.bhagyank, root),
    score, verdict: verdict10(score, "Avoid / needs remedy"), meaning: info(root).houseMeaning,
  };
}
export const houseModule = (ctx: PersonContext, numbers: string[]) => ({
  mainDoorDirection: info(ctx.moolank).direction,
  rootTable: rootTable(ctx, "house"),
  checks: numbers.filter((n) => n.trim()).map((n) => checkHouse(ctx, n)),
});

// ----------------------------- BANK ACCOUNT -----------------------------
export function checkBankAccount(ctx: PersonContext, accountNumber: string, bankName = "") {
  const s = cleanNumber(accountNumber);
  const total = digitSum(accountNumber), root = reduce(total), c = compound(total);
  const last4Root = reduce(digitSum(s.slice(-4)));
  const q = digitQuality(ctx, s);
  const m = rel(ctx.moolank, root), b = rel(ctx.bhagyank, root), l4 = rel(ctx.moolank, last4Root);
  const score = excelRound(m + b * 1.5 + c.score + (q.zeros <= 2 ? 1 : 0) + (l4 >= 1 ? 1 : 0) + (q.loShuFilled >= 1 ? 1 : 0), 1);
  const bankNum = bankName.trim() ? reduce(chaldeanSum(bankName)) : null;
  return {
    bankName, accountNumber, total, root, compoundRating: c.rating,
    vsMoolank: relationLabel(ctx.moolank, root), vsBhagyank: relationLabel(ctx.bhagyank, root),
    last4Root, ...q, score, verdict: verdict10(score),
    bankNameNumber: bankNum, bankNameFit: bankNum === null ? "" : `${bankNum} – ${relationLabel(ctx.moolank, bankNum)}`,
    remarks: remarks([[q.zeros > 2, "Many 0s; "], [q.enemyDigits > 3, "Many enemy digits; "], [l4 === 0, "Last-4 clash with Moolank; "],
      [b === 0, "Total clashes with Bhagyank; "], [m === 0, "Total clashes with Moolank; "]]),
  };
}
export function bankModule(ctx: PersonContext, accounts: { bankName?: string; accountNumber: string }[], luckyDates: number[]) {
  return {
    suggestions: rootLists(ctx),
    bestWeekdayToOpen: info(ctx.moolank).luckyDays,
    bestDatesToOpen: luckyDates,
    wealthCorner: `North (Kuber) / ${info(ctx.moolank).direction}`,
    rootTable: rootTable(ctx, "keyword"),
    checks: accounts.filter((a) => a.accountNumber?.trim()).map((a) => checkBankAccount(ctx, a.accountNumber, a.bankName ?? "")),
  };
}

// ----------------------------- VEHICLE -----------------------------
/** Score uses the 4-digit registration number (last 4 characters of the cleaned plate unless overridden). */
export function checkVehicle(ctx: PersonContext, plate: string, fourDigitOverride?: string) {
  const four = fourDigitOverride && String(fourDigitOverride).trim() ? String(fourDigitOverride) : cleanNumber(plate).slice(-4);
  const total = digitSum(four), root = reduce(total), c = compound(total);
  const plateTotal = alnumSum(plate), plateRoot = reduce(plateTotal);
  const q = digitQuality(ctx, four);
  const m = rel(ctx.moolank, root), b = rel(ctx.bhagyank, root), pr = rel(ctx.moolank, plateRoot);
  const score = excelRound(m + b * 1.5 + c.score + (q.zeros <= 1 ? 1 : 0) + (q.enemyDigits <= 1 ? 1 : 0) + (pr >= 1 ? 1 : 0), 1);
  return {
    plate, fourDigits: four, total, root, compoundRating: c.rating,
    vsMoolank: relationLabel(ctx.moolank, root), vsBhagyank: relationLabel(ctx.bhagyank, root),
    plateTotal, plateRoot, zeros: q.zeros, enemyDigits: q.enemyDigits, score, verdict: verdict10(score),
    remarks: remarks([[q.zeros > 1, "Too many 0s; "], [q.enemyDigits > 1, "Enemy digits present; "], [pr === 0, "Full plate clashes with Moolank; "],
      [b === 0, "Clashes with Bhagyank; "], [m === 0, "Clashes with Moolank; "]]),
  };
}
export function rateFancyNumber(ctx: PersonContext, n: string) {
  const total = digitSum(n), root = reduce(total);
  const score = score10(rel(ctx.moolank, root), rel(ctx.bhagyank, root), compound(total).score);
  return { number: n, total, root, vsMoolank: relationLabel(ctx.moolank, root), vsBhagyank: relationLabel(ctx.bhagyank, root), score, verdict: verdict10(score, "Avoid") };
}
export function vehicleModule(ctx: PersonContext, plates: { plate: string; fourDigitOverride?: string }[], luckyDates: number[]) {
  return {
    suggestions: rootLists(ctx),
    luckyColours: `${info(ctx.moolank).luckyColours}  (also ${info(ctx.bhagyank).luckyColours})`,
    avoidColours: info(ctx.moolank).avoidColours,
    bestWeekday: info(ctx.moolank).luckyDays,
    bestDeliveryDates: luckyDates,
    parkingDirection: info(ctx.moolank).direction,
    rootTable: rootTable(ctx, "keyword"),
    fancyNumbers: TABLES.fancyVehicleNumbers.map((n) => rateFancyNumber(ctx, n)),
    checks: plates.filter((p) => p.plate?.trim()).map((p) => checkVehicle(ctx, p.plate, p.fourDigitOverride)),
  };
}

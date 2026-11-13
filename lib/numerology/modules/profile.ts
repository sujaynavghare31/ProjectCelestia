// ---------------------------------------------------------------------------
// Personal profile – sheets Inputs, Core_Numbers, Report, LoShu_Grid
// ---------------------------------------------------------------------------
import { TABLES } from "../data/tables";
import { chaldeanSum, digitSum, firstWord, masterReduce, masterStep, pythConsonantSum, pythSum, pythVowelSum, reduce } from "../core/math";
import { compound, friendsOf, rel, relationLabel, score10, verdict10, joinNums } from "../core/rules";
import { parseISO } from "../core/date";
import type { ISODate, PersonContext } from "../types";

export interface ProfileInput {
  fullName: string;
  dob: ISODate;
  gender: "Male" | "Female";
  /** year used for Personal Year (default: current year) */
  forecastYear?: number;
  /** add Kua number to the Lo Shu grid (default true) */
  includeKua?: boolean;
  /** "today" – only used for Personal Month (default: now) */
  today?: ISODate;
}

/** Moolank / Psychic / Driver = day of birth reduced. */
export const moolankOf = (dob: ISODate) => reduce(parseISO(dob).d);
/** Bhagyank / Destiny / Conductor = all DOB digits reduced (day, month, year digit sums added). */
export function bhagyankOf(dob: ISODate): number {
  const { y, m, d } = parseISO(dob);
  return reduce(digitSum(d) + digitSum(m) + digitSum(y));
}
/** Kua: Male = reduce(11 − root(year)); Female = reduce(4 + root(year)). (Calendar year, not Chinese New Year.) */
export function kuaOf(dob: ISODate, gender: "Male" | "Female"): number {
  const yr = reduce(digitSum(parseISO(dob).y));
  return gender === "Female" ? reduce(4 + yr) : reduce(11 - yr);
}
/** Personal Year = reduce(root(day) + root(month) + root(year digits)). */
export function personalYear(dob: ISODate, year: number): number {
  const { m, d } = parseISO(dob);
  return reduce(reduce(d) + reduce(m) + reduce(digitSum(year)));
}

// ----------------------------- Lo Shu -----------------------------
export interface LoShuResult {
  /** counts index 1..9 */
  counts: number[];
  sources: { fromDob: number[]; driver: number[]; conductor: number[]; kua: number[] };
  grid: string[][];               // display strings, "" = missing
  digits: { digit: number; planet: string; count: number; status: string; missingEffect: string; remedy: string | null; excessEffect: string | null; elementDirection: string }[];
  missing: number[];
  repeated: number[];
  planes: { name: string; digits: number[]; status: "Complete ✓" | "Empty – weak area" | "Partial"; reading: string }[];
}

export function loShu(dob: ISODate, moolank: number, bhagyank: number, kua: number, includeKua = true): LoShuResult {
  const { y, m, d } = parseISO(dob);
  const s = `${d}${m}${y}`;                       // no leading zeros; zeros ignored
  const z = () => new Array(10).fill(0);
  const fromDob = z(), driver = z(), conductor = z(), kuaArr = z(), counts = z();
  for (let k = 1; k <= 9; k++) {
    fromDob[k] = s.split(String(k)).length - 1;
    driver[k] = d >= 10 && moolank === k ? 1 : 0;   // driver only added for 2-digit days
    conductor[k] = bhagyank === k ? 1 : 0;
    kuaArr[k] = includeKua && kua === k ? 1 : 0;
    counts[k] = fromDob[k] + driver[k] + conductor[k] + kuaArr[k];
  }
  const grid = TABLES.loShuGridLayout.map((row) => row.map((k) => (counts[k] ? Array(counts[k]).fill(k).join(" ") : "")));
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => {
    const c = counts[k], t = TABLES.loShu[String(k)];
    return {
      digit: k, planet: TABLES.numberInfo[String(k)].planet, count: c,
      status: c === 0 ? "MISSING" : c >= 3 ? `Excess (${c})` : c === 2 ? "Strong (2)" : "Present",
      elementDirection: t.elementDirection, missingEffect: t.missingEffect,
      remedy: c === 0 ? t.remedy : null, excessEffect: c >= 3 ? t.excessEffect : null,
    };
  });
  const planes = TABLES.planes.map((p) => {
    const present = p.digits.map((k) => counts[k] > 0);
    const status = present.every(Boolean) ? "Complete ✓" : present.every((x) => !x) ? "Empty – weak area" : "Partial";
    const reading = status === "Complete ✓" ? p.meaning : status === "Empty – weak area" ? "Lacks: " + p.meaning.toLowerCase() : "Partly active";
    return { name: p.name, digits: p.digits, status: status as LoShuResult["planes"][number]["status"], reading };
  });
  return {
    counts, sources: { fromDob, driver, conductor, kua: kuaArr }, grid, digits,
    missing: [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((k) => counts[k] === 0),
    repeated: [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((k) => counts[k] >= 3),
    planes,
  };
}

// ----------------------------- Profile -----------------------------
export function computeProfile(input: ProfileInput) {
  const { fullName, dob, gender } = input;
  const includeKua = input.includeKua ?? true;
  const { y, m, d } = parseISO(dob);
  const today = input.today ? parseISO(input.today) : (() => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }; })();
  const forecastYear = input.forecastYear ?? today.y;
  const ySum = digitSum(y);

  // Chaldean / Vedic
  const moolank = reduce(d);
  const bhagyank = reduce(digitSum(d) + digitSum(m) + ySum);
  const kua = kuaOf(dob, gender);
  const nameTotal = chaldeanSum(fullName);
  const nameNumber = reduce(nameTotal);
  const comp = compound(nameTotal);
  const nameScore = score10(rel(moolank, nameNumber), rel(bhagyank, nameNumber), comp.score);

  // Pythagorean
  const expression = masterReduce(pythSum(fullName));
  const soulUrge = masterReduce(pythVowelSum(fullName));
  const personality = masterReduce(pythConsonantSum(fullName));
  const birthday = masterStep(masterStep(d));
  const lp = masterStep(masterStep(birthday + masterStep(m) + masterStep(masterStep(ySum))));
  const maturity = masterReduce(expression + lp);
  const py = personalYear(dob, forecastYear);
  const pm = reduce(py + today.m);

  const info = (n: number) => TABLES.numberInfo[String(n)];
  const pyth = (n: number) => TABLES.pythMeanings[String(n)];
  const luckyDates: number[] = [];
  for (let dd = 1; dd <= 31; dd++) if (rel(moolank, reduce(dd)) === 2 && rel(bhagyank, reduce(dd)) >= 1) luckyDates.push(dd);

  const lo = loShu(dob, moolank, bhagyank, kua, includeKua);

  return {
    input: { ...input, includeKua, forecastYear },
    birth: { day: d, month: m, year: y, yearDigitSum: ySum },
    chaldean: {
      moolank, bhagyank, kua,
      nameTotal, nameNumber, compoundRating: comp.rating, compoundMeaning: comp.keyword,
      firstNameNumber: chaldeanSum(firstWord(fullName)),
      nameVsMoolank: relationLabel(moolank, nameNumber), nameVsBhagyank: relationLabel(bhagyank, nameNumber),
      nameScore, nameVerdict: verdict10(nameScore, "Name change recommended"),
    },
    pythagorean: {
      expression, soulUrge, personality, lifePath: lp, birthday, maturity,
      lifePathSingle: reduce(lp), lifePathMeaning: pyth(lp),
    },
    forecast: { personalYear: py, personalYearTheme: info(py).keyword, personalMonth: pm, personalMonthTheme: info(pm).keyword },
    lucky: {
      numbers: [moolank, bhagyank], friendlyNumbers: friendsOf(moolank),
      text: `${moolank}, ${bhagyank}   (friendly: ${joinNums(friendsOf(moolank))})`,
      days: info(moolank).luckyDays, daysAlso: info(bhagyank).luckyDays,
      colours: info(moolank).luckyColours, coloursAlso: info(bhagyank).luckyColours,
      avoidColours: info(moolank).avoidColours,
      gemstone: info(moolank).gemstone, destinyGem: info(bhagyank).gemstone,
      direction: info(moolank).direction,
      datesEveryMonth: luckyDates,
    },
    /** Report sheet: same aspects by Moolank, Bhagyank, Name number and Pythagorean Life Path */
    report: { byMoolank: info(moolank), byBhagyank: info(bhagyank), byNameNumber: info(nameNumber), byLifePath: pyth(lp) },
    loShu: lo,
  };
}
export type Profile = ReturnType<typeof computeProfile>;

/** Build the small context object other modules need. */
export function buildContext(input: ProfileInput): PersonContext {
  const p = computeProfile(input);
  return { moolank: p.chaldean.moolank, bhagyank: p.chaldean.bhagyank, nameNumber: p.chaldean.nameNumber, loShuCounts: p.loShu.counts };
}
export const contextFromProfile = (p: Profile): PersonContext => ({
  moolank: p.chaldean.moolank, bhagyank: p.chaldean.bhagyank, nameNumber: p.chaldean.nameNumber, loShuCounts: p.loShu.counts,
});

// ---------------------------------------------------------------------------
// Partner, Child_Name, Cities, Calendar_Trading
// ---------------------------------------------------------------------------
import { TABLES } from "../data/tables";
import { chaldeanSum, digitSum, excelRound, reduce } from "../core/math";
import { compound, rel, relationLabel, score10, verdict10 } from "../core/rules";
import { WEEKDAYS, daysInMonth, parseISO, weekdayIndex } from "../core/date";
import { bhagyankOf, moolankOf, personalYear } from "./profile";
import type { ISODate, PersonContext } from "../types";

const info = (n: number) => TABLES.numberInfo[String(n)];
const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// ----------------------------- PARTNER -----------------------------
export function checkPartner(ctx: PersonContext, partner: { name?: string; dob: ISODate }) {
  const pm = moolankOf(partner.dob), pb = bhagyankOf(partner.dob);
  const pn = partner.name?.trim() ? reduce(chaldeanSum(partner.name)) : null;
  const two = (a: number, b: number) => (rel(a, b) + rel(b, a)) / 2;
  const mm = two(ctx.moolank, pm), bb = two(ctx.bhagyank, pb);
  const cross = (rel(ctx.moolank, pb) + rel(pm, ctx.bhagyank)) / 2;
  const nn = pn === null ? 1 : two(ctx.nameNumber, pn);
  const { y, m, d } = parseISO(partner.dob);
  const s = `${d}${m}${y}`;
  const fill = ALL.filter((k) => ctx.loShuCounts[k] === 0 && s.includes(String(k))).length;
  const percent = excelRound(((mm * 3 + bb * 3 + cross * 2 + nn) / 18) * 90 + Math.min(fill, 2) * 5, 0);
  return {
    ...partner, moolank: pm, bhagyank: pb, nameNumber: pn, moolankPair: mm, bhagyankPair: bb, cross, namePair: nn,
    fillsYourMissingLoShu: fill, percent,
    verdict: percent >= 75 ? "Excellent" : percent >= 60 ? "Good" : percent >= 45 ? "Average" : "Challenging – remedies advised",
    partnerNature: `${info(pm).planet} – ${info(pm).keyword}`,
  };
}
export function partnerModule(ctx: PersonContext, partners: { name?: string; dob: ISODate }[]) {
  const mutual = (a: number) => ALL.filter((k) => rel(a, k) === 2 && rel(k, a) === 2);
  return {
    idealPartnerMoolank: mutual(ctx.moolank),
    idealPartnerBhagyank: ALL.filter((k) => rel(ctx.bhagyank, k) === 2 && rel(k, ctx.bhagyank) >= 1),
    bestPartnerBirthDates: Array.from({ length: 31 }, (_, i) => i + 1).filter((dd) => rel(ctx.moolank, reduce(dd)) === 2 && rel(reduce(dd), ctx.moolank) === 2),
    checks: partners.filter((p) => p.dob).map((p) => checkPartner(ctx, p)),
  };
}

// ----------------------------- CHILD NAME -----------------------------
export function childNameModule(surname: string, childDob: ISODate, firstNames: string[]) {
  const cm = moolankOf(childDob), cb = bhagyankOf(childDob);
  const idealRoots = ALL.filter((k) => rel(cm, k) === 2 && rel(cb, k) >= 1);
  const letters = Object.keys(TABLES.chaldean).filter((L) => rel(cm, TABLES.chaldean[L]) === 2 && rel(cb, TABLES.chaldean[L]) >= 1);
  const names = firstNames.filter((n) => n.trim()).map((first) => {
    const full = `${first} ${surname}`.trim();
    const fullTotal = chaldeanSum(full), root = reduce(fullTotal), c = compound(fullTotal);
    const starts = letters.includes(first.trim().charAt(0).toUpperCase());
    const score = excelRound(((rel(cm, root) + rel(cb, root) * 1.5 + c.score + (starts ? 1 : 0)) / 8) * 10, 1);
    return {
      firstName: first, firstNameTotal: chaldeanSum(first), fullName: full, fullTotal, root, compoundMeaning: c.keyword, rating: c.rating,
      vsMoolank: relationLabel(cm, root), vsBhagyank: relationLabel(cb, root), startsWithSuggestedLetter: starts,
      score, verdict: verdict10(score, "Not recommended"),
    };
  });
  return {
    childMoolank: cm, childBhagyank: cb, idealNameRoots: idealRoots, suggestedStartingLetters: letters,
    luckyColours: info(cm).luckyColours, luckyDays: info(cm).luckyDays, names,
  };
}

// ----------------------------- CITIES -----------------------------
export function checkCity(ctx: PersonContext, city: string) {
  const total = chaldeanSum(city), root = reduce(total), c = compound(total);
  const m = rel(ctx.moolank, root);
  const score = score10(m, rel(ctx.bhagyank, root), c.score);
  return {
    city, total, root, rating: c.rating, vsMoolank: relationLabel(ctx.moolank, root), vsBhagyank: relationLabel(ctx.bhagyank, root),
    score, verdict: verdict10(score, "Avoid / needs remedies"),
    brings: info(root).placeVibration, watchOut: m === 0 ? `Clashes with your nature – ${info(root).weaknesses}` : "–",
  };
}
export const citiesModule = (ctx: PersonContext, cities: string[] = []) => ({
  checked: cities.filter((c) => c.trim()).map((c) => checkCity(ctx, c)),
  presetList: TABLES.presetCities.map((c) => checkCity(ctx, c)),
});

// ----------------------------- CALENDAR & TRADING -----------------------------
export function calendarModule(ctx: PersonContext, dob: ISODate, month: number, year: number) {
  const aptitude = excelRound((info(ctx.moolank).tradingScore * 2 + info(ctx.bhagyank).tradingScore) / 3, 1);
  const suitability = aptitude >= 2.5 ? "Well suited – trade on favourable days"
    : aptitude >= 1.7 ? "Suitable with strict stop-loss on favourable days only"
    : aptitude >= 1 ? "Better for swing/long-term; intraday only on best days"
    : "Not suited for intraday – prefer long-term investing";
  const py = personalYear(dob, year), pm = reduce(py + month);
  const days = [];
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    const date = { y: year, m: month, d };
    const weekday = WEEKDAYS[weekdayIndex(date)];
    const dateRoot = reduce(d);
    const universal = reduce(digitSum(d) + digitSum(month) + digitSum(year));
    const personal = reduce(pm + dateRoot);
    const luckyWeekday = info(ctx.moolank).luckyDays.toLowerCase().includes(weekday.toLowerCase());
    const score = rel(ctx.moolank, dateRoot) + rel(ctx.bhagyank, universal) + rel(ctx.moolank, personal) + (luckyWeekday ? 1 : 0);
    const verdict = score >= 6 ? "★ Excellent" : score >= 5 ? "Good" : score >= 3 ? "Average" : "Avoid for new starts";
    const risky = [4, 8].includes(personal) || [4, 8].includes(universal);
    const signal = aptitude < 1 ? "Avoid intraday"
      : score >= 5 && !risky ? "Favourable"
      : score >= 4 && aptitude >= 1.7 && !risky ? "Light / cautious" : "No trade";
    days.push({ day: d, date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`, weekday, dateRoot, universal, personal, luckyWeekday, score, verdict, signal });
  }
  return {
    aptitude, suitability, personalYear: py, personalMonth: pm, monthTheme: info(pm).keyword, days,
    disclaimer: "Numerology is a traditional belief system, not financial advice.",
  };
}

// ---------------------------------------------------------------------------
// Business_Office – business name, office address, business phones, team size
// ---------------------------------------------------------------------------
import { TABLES } from "../data/tables";
import { alnumSum, chaldeanSum, cleanNumber, digitSum, excelRound, inList, pythSum, reduce } from "../core/math";
import { compound, digitQuality, rel, relationLabel, verdict10 } from "../core/rules";
import { bhagyankOf } from "./profile";
import type { ISODate, PersonContext } from "../types";

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export interface BusinessInput {
  industry: string;                 // must match TABLES.industries[].industry
  startDate?: ISODate | null;       // incorporation / start date (optional)
  names?: string[];
  addresses?: { unit: string; building?: string; fullAddress?: string }[];
  phones?: { number: string; usedFor?: string }[];
  teams?: { team: string; headcount: number }[];
}

export function businessModule(ctx: PersonContext, input: BusinessInput, luckyDates: number[]) {
  const ind = TABLES.industries.find((i) => i.industry === input.industry);
  if (!ind) throw new Error(`Unknown industry "${input.industry}"`);
  const indRoots = ind.roots;
  const fits = (k: number) => inList(k, indRoots);
  const fav = (k: number) => rel(ctx.moolank, k) === 2 && rel(ctx.bhagyank, k) >= 1;
  const dest = input.startDate ? bhagyankOf(input.startDate) : null;

  const ownerRoots = ALL.filter(fav);
  const bestRoots = ownerRoots.filter(fits);
  const nameTotals = Array.from({ length: 100 }, (_, i) => i + 1).filter((n) => compound(n).rating === "Lucky" && fav(reduce(n)));

  const names = (input.names ?? []).filter((n) => n.trim()).map((name) => {
    const total = chaldeanSum(name), root = reduce(total), c = compound(total);
    const destPart = dest === null ? 1 : rel(dest, root) >= 1 ? 1 : 0;
    const score = excelRound(((rel(ctx.moolank, root) + rel(ctx.bhagyank, root) * 1.5 + c.score + (fits(root) ? 1 : 0) + destPart) / 9) * 10, 1);
    return {
      name, total, root, compoundMeaning: c.keyword, rating: c.rating,
      vsMoolank: relationLabel(ctx.moolank, root), vsBhagyank: relationLabel(ctx.bhagyank, root),
      vsBusinessDestiny: dest === null ? "-" : relationLabel(dest, root), industryFit: fits(root),
      pythRoot: reduce(pythSum(name)), score, verdict: verdict10(score, "Change / adjust spelling"),
    };
  });

  const addresses = (input.addresses ?? []).filter((a) => a.unit?.trim()).map((a) => {
    const total = alnumSum(a.unit), root = reduce(total), c = compound(total);
    const bRoot = a.building?.trim() ? reduce(alnumSum(a.building)) : null;
    const bPart = bRoot === null ? 1 : rel(ctx.moolank, bRoot) >= 1 ? 1 : 0;
    const score = excelRound(((rel(ctx.moolank, root) + rel(ctx.bhagyank, root) * 1.5 + c.score + (fits(root) ? 1 : 0) + bPart) / 9) * 10, 1);
    return {
      ...a, total, root, rating: c.rating, vsMoolank: relationLabel(ctx.moolank, root), vsBhagyank: relationLabel(ctx.bhagyank, root),
      industryFit: fits(root), buildingRoot: bRoot, score, verdict: verdict10(score, "Avoid / needs remedy"),
      commercialMeaning: TABLES.commercialMeaning[String(root)],
    };
  });

  const phones = (input.phones ?? []).filter((p) => p.number?.trim()).map((p) => {
    const s = cleanNumber(p.number);
    const total = digitSum(p.number), root = reduce(total), c = compound(total);
    const q = digitQuality(ctx, s);
    const score = excelRound(rel(ctx.moolank, root) + rel(ctx.bhagyank, root) * 1.5 + c.score + (q.zeros <= 2 ? 1 : 0) + (q.enemyDigits <= 2 ? 1 : 0) + (fits(root) ? 1 : 0), 1);
    return { ...p, total, root, compoundRating: c.rating, vsMoolank: relationLabel(ctx.moolank, root), vsBhagyank: relationLabel(ctx.bhagyank, root),
      industryFit: fits(root), zeros: q.zeros, enemyDigits: q.enemyDigits, score, verdict: verdict10(score) };
  });

  const teams = (input.teams ?? []).filter((t) => t.headcount > 0).map((t) => {
    const n = Math.trunc(t.headcount), root = reduce(n);
    const status = fav(root) && fits(root) ? "Excellent" : fav(root) ? "Good"
      : rel(ctx.moolank, root) === 0 || rel(ctx.bhagyank, root) === 0 ? "Avoid – adjust" : "Average";
    let up: number | null = null, down: number | null = null;
    for (let k = 0; k <= 8 && up === null; k++) if (fav(reduce(n + k))) up = n + k;
    for (let k = 0; k <= 8 && down === null; k++) if (n - k >= 1 && fav(reduce(n - k))) down = n - k;
    const suggestion = status === "Excellent" ? "Keep as is"
      : status === "Good" ? `Keep (or reach ${up})` : `Move to ${up} (hire ${(up ?? n) - n}) or ${down ?? "-"}`;
    return { ...t, root, vsMoolank: relationLabel(ctx.moolank, root), vsBhagyank: relationLabel(ctx.bhagyank, root), industryFit: fits(root),
      status, nearestUp: up, nearestDown: down, suggestion };
  });

  return {
    industry: ind.industry, industryRoots: indRoots,
    businessDestiny: dest,
    destinyNote: dest === null ? "" : rel(ctx.moolank, dest) === 0 || rel(ctx.bhagyank, dest) === 0 ? "Clashes with owner – remedies / careful timing"
      : rel(ctx.moolank, dest) === 2 ? "Supports owner" : "Neutral to owner",
    ownerFavourableRoots: ownerRoots,
    bestRoots: bestRoots.length ? bestRoots : null,         // null => "None common – use owner roots"
    suggestedNameTotals: nameTotals,
    launch: { weekday: TABLES.numberInfo[String(ctx.moolank)].luckyDays, dates: luckyDates },
    cabin: `Sit in South-West zone facing ${TABLES.numberInfo[String(ctx.moolank)].direction} (your lucky direction); cash/locker in North (Kuber)`,
    rootTable: ALL.map((k) => ({ root: k, vsMoolank: relationLabel(ctx.moolank, k), vsBhagyank: relationLabel(ctx.bhagyank, k), industryFit: fits(k),
      suitability: fav(k) && fits(k) ? "Excellent" : fav(k) ? "Good" : rel(ctx.moolank, k) === 0 || rel(ctx.bhagyank, k) === 0 ? "Avoid" : "Average",
      commercialMeaning: TABLES.commercialMeaning[String(k)] })),
    favourableTeamSizes: Array.from({ length: 100 }, (_, i) => i + 1).filter((n) => fav(reduce(n))),
    names, addresses, phones, teams,
  };
}

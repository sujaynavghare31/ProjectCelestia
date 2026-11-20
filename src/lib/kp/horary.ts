// ---------------------------------------------------------------------------
// KP Horary (Prashna) — the querent gives a number 1…249.
// Number → start of that KP sub (the 243 subs, split at sign boundaries = 249 parts) = horary Ascendant.
// Cusps: Placidus for the moment & place of judgment, rotated so that cusp 1 = horary Ascendant
// (RAMC is solved from the Ascendant). Planets = positions at the moment of judgment.
// Ruling planets = moment of judgment (actual Lagna), as KP prescribes.
// ---------------------------------------------------------------------------
import { DASHA_ORDER, DASHA_YEARS, NAK_SPAN, SIGNS, SIGN_LORD, norm360, type Graha } from "./constants";
import { julianDayUT, obliquity, placidusTropical, ramc as ramcOf, geocentricLatitude, type BirthMoment } from "./placidus";
import { kpChart, rulingPlanets, vedicWeekday, type KpInput } from "./engine";
import { dmsInSign } from "./lords";

export interface Kp249 { number: number; start: number; end: number; sign: (typeof SIGNS)[number]; signLord: Graha; starLord: Graha; subLord: Graha; startText: string; endText: string }

/** The KP 1–249 horary table (sidereal longitudes). */
export const KP249: Kp249[] = (() => {
  const out: Kp249[] = [];
  for (let n = 0; n < 27; n++) {
    const star = DASHA_ORDER[n % 9], si = DASHA_ORDER.indexOf(star);
    let s = n * NAK_SPAN;
    for (let k = 0; k < 9; k++) {
      const sub = DASHA_ORDER[(si + k) % 9], e = s + (NAK_SPAN * DASHA_YEARS[sub]) / 120;
      const cut = Math.floor(s / 30 + 1e-9) * 30 + 30;                 // next sign boundary
      const parts = e > cut + 1e-9 && cut < 360 - 1e-9 ? [[s, cut], [cut, e]] : [[s, e]];
      for (const [a, b] of parts) {
        const si2 = Math.floor(a / 30 + 1e-9) % 12;
        out.push({ number: out.length + 1, start: a, end: b, sign: SIGNS[si2], signLord: SIGN_LORD[si2], starLord: star, subLord: sub,
          startText: `${SIGNS[si2]} ${dmsInSign(a, 0)}`, endText: `${dmsInSign(b, 0).replace(/^0° 0′ 0″$/, "30° 0′ 0″")}` });
      }
      s = e;
    }
  }
  return out;
})();

/** RAMC that puts ecliptic longitude `ascTropical` on the eastern horizon at latitude `lat` (OA(asc) = RAMC + 90°). */
export function ramcForAscendant(ascTropical: number, lat: number, eps: number): number {
  const R = Math.PI / 180;
  const ra = norm360(Math.atan2(Math.sin(ascTropical * R) * Math.cos(eps * R), Math.cos(ascTropical * R)) / R);
  const dec = Math.asin(Math.sin(eps * R) * Math.sin(ascTropical * R)) / R;
  const ad = Math.asin(Math.max(-1, Math.min(1, Math.tan(lat * R) * Math.tan(dec * R)))) / R;
  return norm360(ra - ad - 90);
}

export interface HoraryOptions { geocentricLatitude?: boolean; /** "start" (KP standard) or "middle" of the sub */ point?: "start" | "middle" }

/** Sidereal horary cusps for a KP number at the place/moment of judgment. */
export function horaryCusps(number: number, moment: BirthMoment, ayanamsa: number, opts: HoraryOptions = {}) {
  if (!Number.isInteger(number) || number < 1 || number > 249) throw new Error("KP horary number must be 1…249");
  const row = KP249[number - 1];
  const ascSid = opts.point === "middle" ? (row.start + row.end) / 2 : row.start;
  const jd = julianDayUT(moment.date, moment.time, moment.tzHours), eps = obliquity(jd);
  const lat = (opts.geocentricLatitude ?? true) ? geocentricLatitude(moment.latitude) : moment.latitude;
  const ascTrop = norm360(ascSid + ayanamsa);
  const R = ramcForAscendant(ascTrop, lat, eps);
  const cusps = placidusTropical(R, lat, eps).map((c) => norm360(c - ayanamsa));
  cusps[0] = ascSid;                                                    // exact (removes float noise)
  // actual Lagna of the moment (for Ruling Planets)
  const actual = placidusTropical(ramcOf(jd, moment.longitude), lat, eps).map((c) => norm360(c - ayanamsa));
  return { entry: row, ramc: R, cusps, actualCusps: actual, actualAscendant: actual[0] };
}

/** KP rule: the SUB LORD of the main cusp of the matter decides — it must signify the favourable houses. */
export const HORARY_QUESTIONS = {
  marriage: { label: "Marriage", cusp: 7, favourable: [2, 7, 11], negative: [1, 6, 10] },
  job: { label: "Job / service", cusp: 10, favourable: [2, 6, 10, 11], negative: [1, 5, 9, 12] },
  business: { label: "Business / partnership", cusp: 7, favourable: [2, 7, 10, 11], negative: [5, 8, 12] },
  promotion: { label: "Promotion", cusp: 10, favourable: [2, 6, 10, 11], negative: [5, 8, 12] },
  children: { label: "Child birth", cusp: 5, favourable: [2, 5, 11], negative: [1, 4, 10] },
  property: { label: "Property / vehicle purchase", cusp: 4, favourable: [4, 11, 12], negative: [3, 5, 10] },
  foreign: { label: "Foreign travel / settlement", cusp: 12, favourable: [3, 9, 12], negative: [2, 4, 11] },
  education: { label: "Education / exam success", cusp: 4, favourable: [4, 9, 11], negative: [3, 5, 8] },
  litigation: { label: "Win in litigation", cusp: 6, favourable: [6, 11], negative: [5, 8, 12] },
  recovery: { label: "Recovery from illness", cusp: 1, favourable: [1, 5, 11], negative: [6, 8, 12] },
  money: { label: "Money / loan received", cusp: 11, favourable: [2, 6, 11], negative: [5, 8, 12] },
  lost: { label: "Lost article found", cusp: 2, favourable: [2, 6, 11], negative: [5, 8, 12] },
} as const;
export type HoraryQuestionKey = keyof typeof HORARY_QUESTIONS;

export function judgeQuestion(chart: ReturnType<typeof kpChart>, key: HoraryQuestionKey) {
  const q = HORARY_QUESTIONS[key];
  const cusp = chart.cusps[q.cusp - 1];
  const sl = cusp.subLord;
  const sig = chart.planets.find((p) => p.body === sl)!.significators;
  const fav = q.favourable.filter((h) => sig.includes(h)), neg = q.negative.filter((h) => sig.includes(h));
  const verdict = fav.length === 0 ? "NO — sub lord does not signify the matter" : neg.length > fav.length ? "DOUBTFUL — negating houses are stronger"
    : neg.length ? "YES, with obstacles / delay" : "YES — promised";
  return { question: q.label, cusp: q.cusp, subLord: sl, subLordSignificators: sig, favourableFound: fav, negativeFound: neg, verdict,
    timing: "Time the event by the dasha / bhukti / antara of significators that are also Ruling Planets." };
}

export interface KpHoraryInput extends Omit<KpInput, "cusps" | "birth"> {
  number: number;                 // 1…249 given by the querent
  moment: BirthMoment;            // date/time/place of judgment
  ayanamsa: number;
  question?: string;
  questionKey?: HoraryQuestionKey;
  horary?: HoraryOptions;
}

/** Full KP horary chart: same tables as the natal KP chart + horary number details + RPs of the moment. */
export function kpHorary(input: KpHoraryInput) {
  const h = horaryCusps(input.number, input.moment, input.ayanamsa, input.horary);
  const chart = kpChart({ ...input, cusps: h.cusps, birth: input.moment });
  const moon = typeof input.planets.Moon === "number" ? input.planets.Moon : input.planets.Moon.longitude;
  const rahu = typeof input.planets.Rahu === "number" ? input.planets.Rahu : input.planets.Rahu.longitude;
  const wd = input.weekday ?? vedicWeekday(input.moment.date, input.moment.time, input.sunrise ?? "06:00");
  const ruling = rulingPlanets(moon, h.actualAscendant, wd, rahu, norm360(rahu + 180));
  return {
    ...chart,
    judgement: input.questionKey ? judgeQuestion(chart, input.questionKey) : null,
    dasha: null,                                            // dashas are not used in horary
    ruling,                                                 // RPs of the moment of judgment (actual Lagna)
    horary: { number: input.number, question: input.question ?? "", entry: h.entry, ascendant: h.cusps[0], ramc: h.ramc,
      actualAscendant: h.actualAscendant, actualAscendantText: `${SIGNS[Math.floor(h.actualAscendant / 30)]} ${dmsInSign(h.actualAscendant)}` },
  };
}

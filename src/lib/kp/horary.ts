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
import { HORARY_QUESTIONS, type HoraryQuestionKey } from "./horaryQuestions";
export { HORARY_QUESTIONS, HORARY_QUESTION_GROUPS, detectQuestionCategory } from "./horaryQuestions";
export type { HoraryQuestionKey } from "./horaryQuestions";

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

export function judgeQuestion(chart: ReturnType<typeof kpChart>, key: HoraryQuestionKey) {
  const q = HORARY_QUESTIONS[key];
  const judgeCusp = (house: number) => {
    const cusp = chart.cusps[house - 1];
    const subLord = cusp.subLord;
    const significators = chart.planets.find((planet) => planet.body === subLord)?.significators ?? [];
    return {
      cusp: house,
      subLord,
      significators,
      favourableFound: q.favourable.filter((candidate) => significators.includes(candidate)),
      negativeFound: q.negative.filter((candidate) => significators.includes(candidate)),
    };
  };
  const main = judgeCusp(q.cusp);
  const secondary = q.secondaryCusp ? judgeCusp(q.secondaryCusp) : null;
  const verdict = main.favourableFound.length === 0
    ? "NO — sub lord does not signify a favourable house"
    : main.negativeFound.length > 0
      ? "YES, with obstacles / delay"
      : "YES — promised";
  const favourableSignificators = chart.planets
    .filter((planet) => planet.significators.some((house) => q.favourable.includes(house)))
    .map((planet) => planet.body);
  const timingPlanets = chart.ruling.all.filter((planet) => favourableSignificators.includes(planet));
  return {
    question: q.label,
    cusp: main.cusp,
    subLord: main.subLord,
    subLordSignificators: main.significators,
    favourableFound: main.favourableFound,
    negativeFound: main.negativeFound,
    secondary,
    verdict,
    timingPlanets,
    timing: timingPlanets.length
      ? `Timing hint: ${timingPlanets.join(", ")} are Ruling Planets and significators of favourable houses.`
      : "Timing hint: check periods of planets common to the Ruling Planets and favourable-house significators.",
  };
}

export interface KpHoraryInput extends Omit<KpInput, "cusps" | "birth"> {
  number: number;                 // 1…249 given by the querent
  cusps?: number[];
  moment: BirthMoment;            // date/time/place of judgment
  ayanamsa: number;
  question?: string;
  questionKey?: HoraryQuestionKey;
  horary?: HoraryOptions;
}

/** Full KP horary chart: same tables as the natal KP chart + horary number details + RPs of the moment. */
export function kpHorary(input: KpHoraryInput) {
  const h = horaryCusps(input.number, input.moment, input.ayanamsa, input.horary);
  const cusps = input.cusps ?? h.cusps;
  if (cusps.length !== 12 || !cusps.every(Number.isFinite)) throw new Error("Horary chart requires 12 finite sidereal cusps.");
  const chart = kpChart({ ...input, cusps, birth: input.moment });
  const moon = typeof input.planets.Moon === "number" ? input.planets.Moon : input.planets.Moon.longitude;
  const rahu = typeof input.planets.Rahu === "number" ? input.planets.Rahu : input.planets.Rahu.longitude;
  const wd = input.weekday ?? vedicWeekday(input.moment.date, input.moment.time, input.sunrise ?? "06:00");
  const ruling = rulingPlanets(moon, h.actualAscendant, wd, rahu, norm360(rahu + 180));
  return {
    ...chart,
    judgement: input.questionKey ? judgeQuestion(chart, input.questionKey) : null,
    ruling,                                                 // RPs of the moment of judgment (actual Lagna)
    horary: { number: input.number, question: input.question ?? "", entry: h.entry, ascendant: cusps[0], ramc: h.ramc,
      actualAscendant: h.actualAscendant, actualAscendantText: `${SIGNS[Math.floor(h.actualAscendant / 30)]} ${dmsInSign(h.actualAscendant)}` },
  };
}

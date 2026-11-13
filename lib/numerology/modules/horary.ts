// ---------------------------------------------------------------------------
// Horary (Prashna) numerology – sheets Horary_Log, Horary_Detail, Horary_Ref
// ---------------------------------------------------------------------------
import { TABLES } from "../data/tables";
import { chaldeanSum, digitSum, excelRound, inList, reduce } from "../core/math";
import { compound, rel, relationLabel } from "../core/rules";
import { bhagyankOf } from "./profile";
import { addDays, fmtDMY, parseISO, timeFraction, toISO, weekdayIndex, WEEKDAYS } from "../core/date";
import type { HHMM, HoraryCategory, ISODate } from "../types";

export interface HoraryQuestion {
  date: ISODate;            // date the question was asked
  time: HHMM;               // local time asked
  category: string;         // exact `question` text from TABLES.horaryCategories
  number: number;           // number spontaneously given by querent, 1..249
  text?: string;            // optional free text (question / item / person)
  querentDob: ISODate;      // querent's DOB (portal: default to the logged-in profile)
}

const hn = (n: number) => TABLES.horaryNumbers[String(n)];

/** Planet number of the hora (planetary hour) running at date+time. Equal 1-hour horas from sunrise. */
export function horaLord(date: ISODate, time: HHMM, sunrise: HHMM = "06:15"): number {
  const t = timeFraction(time), sr = timeFraction(sunrise);
  const before = t < sr;                                  // before sunrise belongs to previous day
  const wd = before ? (weekdayIndex(parseISO(date)) + 6) % 7 : weekdayIndex(parseISO(date));
  const hours = Math.floor(excelRound((t - sr + (before ? 1 : 0)) * 24, 6));
  return TABLES.horaOrder[(TABLES.horaDayStart[wd] + hours) % 7];
}

export function findCategory(q: string): HoraryCategory {
  const c = TABLES.horaryCategories.find((x) => x.question === q);
  if (!c) throw new Error(`Unknown horary category "${q}"`);
  return c;
}

export function judgeHorary(q: HoraryQuestion, sunrise: HHMM = "06:15") {
  if (!(q.number >= 1 && q.number <= 249)) throw new Error("Number must be 1..249");
  const cat = findCategory(q.category);
  const asked = parseISO(q.date), dob = parseISO(q.querentDob);

  const root = reduce(q.number);
  const comp = compound(q.number);
  const hora = horaLord(q.date, q.time, sunrise);
  const universal = reduce(digitSum(asked.d) + digitSum(asked.m) + digitSum(asked.y));
  const querentMoolank = reduce(dob.d);
  const py = reduce(reduce(dob.d) + reduce(dob.m) + reduce(digitSum(asked.y)));
  const pm = reduce(py + asked.m);
  const personalDay = reduce(pm + reduce(asked.d));
  const textRoot = q.text?.trim() ? reduce(chaldeanSum(q.text)) : null;

  const cf = (n: number | null) => (n === null ? 0 : inList(n, cat.yes) ? 1 : inList(n, cat.no) ? -1 : 0);
  const relPts = rel(querentMoolank, root) === 2 ? 1 : rel(querentMoolank, root) === 0 ? -1 : 0;
  const breakdown = [
    { factor: "Prashna root (×2)", number: root, points: 2 * cf(root) },
    { factor: "Hora lord", number: hora, points: cf(hora) },
    { factor: "Universal day", number: universal, points: cf(universal) },
    { factor: "Querent personal day", number: personalDay, points: cf(personalDay) },
    { factor: "Question-text root", number: textRoot, points: cf(textRoot) },
    { factor: "Prashna root vs Querent Moolank", number: null, points: relPts },
  ];
  const score = breakdown.reduce((s, b) => s + b.points, 0);       // range −7 … +7
  const verdict = score >= 4 ? "YES – strongly indicated" : score >= 2 ? "YES – likely (with effort)"
    : score >= 0 ? "MIXED – delayed / uncertain" : score >= -2 ? "UNLIKELY – obstacles" : "NO – strongly denied";
  const confidence = excelRound((score + 7) / 14, 2);

  // timing: root × unit (unit from hora lord, adjusted by category speed)
  let unit = hn(hora).timingUnit as string;
  if (cat.speed === "Fast" && unit === "Months") unit = "Weeks";
  if (cat.speed === "Slow" && unit === "Days") unit = "Weeks";
  const unitDays = unit === "Days" ? 1 : unit === "Weeks" ? 7 : 30;
  const est = addDays(asked, root * unitDays);
  const unitText = root === 1 ? unit.toLowerCase().slice(0, -1) : unit.toLowerCase();
  const timing = `${score < 0 ? "If at all, after " : "~ "}${root} ${unitText} (around ${fmtDMY(est)})`;
  let likely = est;
  for (let k = 0; k <= 30; k++) {
    const d = addDays(est, k);
    if (reduce(d.d) === root || TABLES.weekdayLord[weekdayIndex(d)] === root) { likely = d; break; }
  }
  const lostGroups = ["Lost & Found", "Theft", "Missing"];
  return {
    question: q, category: cat,
    numbers: { root, compoundRating: comp.rating, compoundMeaning: comp.keyword, hora, horaPlanet: hn(hora).planet, universal, querentMoolank, personalDay, textRoot },
    score, verdict, confidence, yesMeans: cat.yesMeans, breakdown,
    timing: { text: timing, estimate: toISO(est), likelyDate: toISO(likely), likelyWeekday: WEEKDAYS[weekdayIndex(likely)],
      favourableWeekday: hn(root).weekday, favourableDates: [root, root + 9, root + 18, root + 27].filter((x) => x <= 31) },
    place: {
      direction: hn(root).direction, secondaryDirection: hn(hora).direction, distance: hn(root).distance,
      whereToLook: lostGroups.includes(cat.group) ? hn(root).whereToLook : null,
      personDescription: ["Theft", "Missing"].includes(cat.group) ? `${hn(root).personDescription}  •  also: ${hn(hora).personDescription}` : null,
    },
    significations: { prashna: hn(root).significations, hora: hn(hora).significations, health: TABLES.numberInfo[String(root)].health,
      businessIdeas: cat.group === "Business" ? `${hn(root).businessIdeas}  •  also suits you: ${hn(querentMoolank).businessIdeas}` : null },
    aspects: [
      { aspect: "Prashna root ↔ Hora lord", relation: relationLabel(root, hora) },
      { aspect: "Prashna root ↔ Universal day", relation: relationLabel(root, universal) },
      { aspect: "Hora lord ↔ Querent Moolank", relation: relationLabel(querentMoolank, hora) },
      { aspect: "Prashna root ↔ Querent Bhagyank", relation: relationLabel(root, bhagyankOf(q.querentDob)) },
    ].map((a) => ({ ...a, reading: a.relation === "Friend" ? "Supportive – helps the matter" : a.relation === "Enemy" ? "Obstructive – delays / friction" : "Neutral – depends on effort" })),
    remedies: {
      deityForQuestion: `${hn(root).deity}  –  ${hn(root).mantra}`,
      lifelongDeity: `${hn(querentMoolank).deity}  –  ${hn(querentMoolank).mantra}`,
      categoryAdvice: cat.advice, planetRemedy: TABLES.numberInfo[String(root)].remedies,
    },
  };
}

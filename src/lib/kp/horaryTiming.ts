import type { HoraryQuestionKey } from "./horaryQuestions";
import { vimshottari } from "./dasha";

export type HoraryTimingScale = "days" | "weeks-months" | "months-years";

export interface HoraryTiming {
  promised: boolean;
  verdict: string;
  scale: HoraryTimingScale;
  fruitful: { planet: string; level: "A" | "B" | "C" | "D"; houses: number[]; isRP: boolean }[];
  delayedBy: { planet: string; reason: "retrograde" | "in star of retrograde"; directOn?: string }[];
  windows: { lords: string[]; level: "bhukti" | "antara" | "sookshma" | "prana"; start: string; end: string; score: number }[];
  bestDate?: { date: string; reason: string };
  hints: string[];
  explanation: string;
}

export interface HoraryTimingInput {
  chart: {
    planets: Array<{
      body: string;
      retrograde: boolean;
      significators: number[];
      levels: { a: number[]; b: number[]; c: number[]; d: number[] };
    }>;
    ruling: { all: string[] };
  };
  moonLongitude: number;
  momentUtcMs: number;
  verdict: string;
  questionKey: HoraryQuestionKey;
  favourableHouses: readonly number[];
  horizonDays?: number;
  stationDates?: Partial<Record<string, Date>>;
  timezone?: string;
}

const QUESTION_SCALE: Partial<Record<HoraryQuestionKey, HoraryTimingScale>> = {
  lost_article: "days",
  missing_person: "days",
  theft_recovery: "days",
  short_travel: "days",
  interview: "days",
  exam_pass: "days",
  recovery: "days",
  visa: "weeks-months",
  foreign_travel: "weeks-months",
  offer_letter: "weeks-months",
  transfer: "weeks-months",
  promotion: "weeks-months",
  admission: "weeks-months",
  government_job: "weeks-months",
  money: "weeks-months",
  win_court_case: "weeks-months",
  marriage: "months-years",
  second_marriage: "months-years",
  divorce: "months-years",
  pregnancy: "months-years",
  childbirth: "months-years",
  buy_property: "months-years",
  sell_property: "months-years",
  settle_abroad: "months-years",
  business: "months-years",
};

const SCALE_HORIZON: Record<HoraryTimingScale, number> = {
  days: 60,
  "weeks-months": 548,
  "months-years": 1825,
};

const QUESTION_HINTS: Partial<Record<HoraryQuestionKey, (houses: readonly number[]) => string[]>> = {
  lost_article: () => ["Found if the 2nd cusp sub lord signifies 2/6/11."],
  missing_person: () => ["Judge the 4th cusp sub lord. 3/9/12 indicate that the person is still travelling or away."],
  theft_recovery: () => ["The 7th cusp sub lord is the thief; 12 may indicate recovery or capture."],
  short_travel: () => ["The journey is indicated through a fruitful RP in Moon transit."],
  offer_letter: () => ["The letter arrives when the Moon transits a fruitful RP that signifies 3 and 11."],
  marriage: () => ["Marriage window is read at Bhukti-Antara level; the Sun and Jupiter confirm the date."],
  second_marriage: () => ["Marriage window is read at Bhukti-Antara level; 9 is considered for a second marriage."],
  childbirth: () => ["Conception window is considered first; birth is approximately nine months later."],
  win_court_case: () => ["The court outcome comes from periods signifying 6 and 11."],
  recovery: () => ["Improvement begins in the Sookshma period of a fruitful RP."],
};

function formatIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function horaryTiming(input: HoraryTimingInput): HoraryTiming {
  const promised = input.verdict.startsWith("YES");
  const scale = QUESTION_SCALE[input.questionKey]
    ?? (["lost_article", "short_travel", "exam_pass", "interview"].includes(input.questionKey) ? "days" : "weeks-months");
  const base: HoraryTiming = {
    promised,
    verdict: input.verdict,
    scale,
    fruitful: [],
    delayedBy: [],
    windows: [],
    hints: QUESTION_HINTS[input.questionKey]?.(input.favourableHouses) ?? [],
    explanation: promised
      ? "KP timing = periods of significators that are also Ruling Planets, confirmed by transit."
      : "Not promised — no timing",
  };
  if (!promised) return base;

  const rulingSet = new Set(input.chart.ruling.all);
  const houses = input.favourableHouses;
  const fruitful: HoraryTiming["fruitful"] = [];
  for (const planet of input.chart.planets) {
    if (!rulingSet.has(planet.body)) continue;
    const levelEntry: ["A" | "B" | "C" | "D", number[]] | null =
      planet.levels.a.some((house) => houses.includes(house)) ? ["A", planet.levels.a] :
      planet.levels.b.some((house) => houses.includes(house)) ? ["B", planet.levels.b] :
      planet.levels.c.some((house) => houses.includes(house)) ? ["C", planet.levels.c] :
      planet.levels.d.some((house) => houses.includes(house)) ? ["D", planet.levels.d] :
      null;
    if (!levelEntry) continue;
    const matching = levelEntry[1].filter((house) => houses.includes(house));
    if (matching.length) fruitful.push({ planet: planet.body, level: levelEntry[0] as "A" | "B" | "C" | "D", houses: matching, isRP: true });
  }
  base.fruitful = fruitful.sort((a, b) => "ABCD".indexOf(a.level) - "ABCD".indexOf(b.level) || b.houses.length - a.houses.length);

  for (const planet of input.chart.planets) {
    if (!rulingSet.has(planet.body)) continue;
    if (planet.retrograde) {
      const direct = input.stationDates?.[planet.body];
      base.delayedBy.push({
        planet: planet.body,
        reason: "retrograde",
        ...(direct ? { directOn: formatIso(direct) } : {}),
      });
    }
  }
  base.delayedBy.forEach((item) => {
    base.fruitful = base.fruitful.filter((entry) => entry.planet !== item.planet);
  });

  const fruitfulNames = new Set(base.fruitful.map((entry) => entry.planet));
  const horizonMs = (input.horizonDays ?? SCALE_HORIZON[scale]) * 86400000;
  const horizonEnd = input.momentUtcMs + horizonMs;
  const levelCount: 2 | 3 | 4 = scale === "months-years" ? 3 : scale === "weeks-months" ? 3 : 4;
  const periods = vimshottari(input.moonLongitude, input.momentUtcMs, levelCount).periods;
  const windows: HoraryTiming["windows"] = [];
  for (const period of periods) {
    if (period.end.getTime() <= input.momentUtcMs || period.start.getTime() >= horizonEnd) continue;
    const lords = period.lords.map(String);
    const relevant = scale === "months-years"
      ? lords.slice(1, 3)
      : scale === "weeks-months"
        ? lords.slice(2, 3)
        : lords.slice(2);
    if (relevant.length === 0 || relevant.some((lord) => !fruitfulNames.has(lord))) continue;
    const start = new Date(Math.max(period.start.getTime(), input.momentUtcMs));
    const end = new Date(Math.min(period.end.getTime(), horizonEnd));
    if (end <= start) continue;
    const entries = base.fruitful.filter((entry) => lords.includes(entry.planet));
    const score = entries.reduce((total, entry) => total + (4 - "ABCD".indexOf(entry.level)) * 10 + entry.houses.length * 3, 0)
      + lords.filter((lord) => rulingSet.has(lord)).length * 5;
    windows.push({
      lords,
      level: scale === "months-years" ? "bhukti" : scale === "weeks-months" ? "antara" : "sookshma",
      start: formatIso(start),
      end: formatIso(end),
      score,
    });
  }

  base.windows = windows
    .sort((a, b) => b.score - a.score || a.start.localeCompare(b.start))
    .slice(0, 20);
  if (base.windows.length) {
    const first = base.windows[0];
    base.bestDate = { date: first.start, reason: `${first.lords.join("–")} is the strongest fruitful dasha window.` };
  }

  base.explanation = base.fruitful.length
    ? `Fruitful RP significators: ${base.fruitful.map((entry) => entry.planet).join(", ")}. ${base.windows.length ? `Best period: ${base.windows[0].lords.join("–")}.` : "No matching dasha window was found in the horizon."} KP timing = periods of significators that are also Ruling Planets, confirmed by transit.`
    : "No planet is common to the favourable-house significators and Ruling Planets.";
  return base;
}

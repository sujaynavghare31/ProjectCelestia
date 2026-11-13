import { DEBILITATION, EXALTATION, MOOLATRIKONA, OWN_SIGNS, SIGNS } from "../avastha/graha";
import { addYears, getJaiminiSignAspects, getSignLord, getTimingChart, signAt, signDistance } from "./core";
import type { Period, TimingChart, TimingInput } from "./types";
import type { Graha } from "../avastha/types";

const SAVYA_SIGNS = new Set([1, 2, 3, 7, 8, 9]);
const NATURAL_STRENGTH = (sign: number) => sign % 3 === 0 ? 3 : sign % 3 === 2 ? 2 : 1;
const KARAKA_NAMES_7 = ["Atmakaraka", "Amatyakaraka", "Bhratrikaraka", "Matrikaraka", "Putrakaraka", "Gnatikaraka", "Darakaraka"];
const KARAKA_NAMES_8 = ["Atmakaraka", "Amatyakaraka", "Bhratrikaraka", "Matrikaraka", "Putrakaraka", "Gnatikaraka", "PitruKaraka", "Darakaraka"];

function isSavya(sign: number, chart: TimingChart) {
  return chart.config.charaMethod === "KNRao" ? SAVYA_SIGNS.has(sign) : sign % 2 === 1;
}

function orderedLords(sign: number): Graha[] {
  if (sign === 8) return ["Mars", "Ketu"];
  if (sign === 11) return ["Saturn", "Rahu"];
  return [getSignLord(sign)];
}

function lordForDasha(sign: number, chart: TimingChart) {
  const lords = orderedLords(sign);
  if (lords.length === 1) return { lord: lords[0], reason: `Sign lord of ${SIGNS[sign - 1]} is ${lords[0]}.` };
  const positions = lords.map((lord) => ({ lord, position: chart.byPlanet.get(lord)! }));
  const inside = positions.filter(({ position }) => position.sign === sign);
  if (inside.length === 2) return { lord: inside[0].lord, reason: `Both lords occupy ${SIGNS[sign - 1]}; the 12-year exception applies.` , twelveYears: true };
  if (inside.length === 1) {
    const lord = positions.find(({ lord: candidate }) => candidate !== inside[0].lord)!.lord;
    return { lord, reason: `${inside[0].lord} occupies its own sign; the other dual lord ${lord} determines the duration.` };
  }
  const conjunctionCount = (lord: Graha) => chart.planets.filter((planet) => planet.planet !== lord && planet.sign === chart.byPlanet.get(lord)!.sign).length;
  const a = positions[0].lord;
  const b = positions[1].lord;
  const aCount = conjunctionCount(a);
  const bCount = conjunctionCount(b);
  if (aCount !== bCount) {
    const lord = aCount > bCount ? a : b;
    return { lord, reason: `${lord} has more planetary conjunctions (${Math.max(aCount, bCount)} vs ${Math.min(aCount, bCount)}).` };
  }
  const dignityRank = (lord: Graha) => {
    const position = chart.byPlanet.get(lord)!;
    if (EXALTATION[lord].sign === position.sign) return 2;
    const mt = MOOLATRIKONA[lord];
    if (mt?.sign === position.sign && position.degree >= mt.from && position.degree < mt.to) return 1;
    return 0;
  };
  const aDignity = dignityRank(a);
  const bDignity = dignityRank(b);
  if (aDignity !== bDignity) {
    const lord = aDignity > bDignity ? a : b;
    return { lord, reason: `${lord} prevails by exaltation/moolatrikona dignity.` };
  }
  const aStrength = NATURAL_STRENGTH(chart.byPlanet.get(a)!.sign);
  const bStrength = NATURAL_STRENGTH(chart.byPlanet.get(b)!.sign);
  if (aStrength !== bStrength) {
    const lord = aStrength > bStrength ? a : b;
    return { lord, reason: `${lord} occupies the sign with greater natural strength.` };
  }
  const aDegree = chart.byPlanet.get(a)!.degree;
  const bDegree = chart.byPlanet.get(b)!.degree;
  const lord = aDegree >= bDegree ? a : b;
  return { lord, reason: `The dual lords tie on strength; ${lord} has the higher degree within its sign.` };
}

function lordIsExalted(lord: Graha, chart: TimingChart) {
  const position = chart.byPlanet.get(lord)!;
  return position.sign === EXALTATION[lord].sign;
}

function lordIsDebilitated(lord: Graha, chart: TimingChart) {
  const position = chart.byPlanet.get(lord)!;
  return position.sign === DEBILITATION[lord];
}

export function getCharaDuration(sign: number, chart: TimingChart) {
  const decision = lordForDasha(sign, chart);
  if ("twelveYears" in decision && decision.twelveYears) return { lord: decision.lord, years: 12, reasons: [decision.reason] };
  const position = chart.byPlanet.get(decision.lord)!;
  const forward = isSavya(sign, chart);
  const distance = forward ? signDistance(sign, position.sign) : signDistance(position.sign, sign);
  let years = distance === 1 ? 12 : distance - 1;
  const reasons = [decision.reason, `Counted inclusively ${distance} sign${distance === 1 ? "" : "s"} ${forward ? "forward" : "backward"} from ${SIGNS[sign - 1]} to ${SIGNS[position.sign - 1]}; base duration ${years === 12 ? 12 : years} years.`];
  if (chart.config.charaExaltAdjust) {
    if (lordIsExalted(decision.lord, chart)) {
      years += 1;
      reasons.push(`${decision.lord} is exalted; add one year.`);
    } else if (lordIsDebilitated(decision.lord, chart)) {
      years -= 1;
      reasons.push(`${decision.lord} is debilitated; subtract one year.`);
    }
  }
  years = Math.max(1, Math.min(12, years));
  reasons.push(`Duration clamped to ${years} year${years === 1 ? "" : "s"} for cycle one.`);
  return { lord: decision.lord, years, reasons };
}

function getCharaOrder(lagnaSign: number, chart: TimingChart) {
  const ninthSign = signAt(lagnaSign, 8);
  const forward = isSavya(ninthSign, chart);
  return Array.from({ length: 12 }, (_, index) => signAt(lagnaSign, forward ? index : -index));
}

function getKarakas(chart: TimingChart) {
  const seven: Graha[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const ranked = seven.map((planet) => ({ planet, degree: chart.byPlanet.get(planet)!.degree }));
  if (chart.config.karakaScheme === 8) {
    const rahu = chart.byPlanet.get("Rahu")!;
    ranked.push({ planet: "Rahu", degree: 30 - rahu.degree });
  }
  ranked.sort((a, b) => b.degree - a.degree);
  const names = chart.config.karakaScheme === 8 ? KARAKA_NAMES_8 : KARAKA_NAMES_7;
  return new Map(ranked.map(({ planet }, index) => [planet, names[index]]));
}

function getArudha(lagnaSign: number, lord: Graha, chart: TimingChart) {
  const lordSign = chart.byPlanet.get(lord)!.sign;
  const count = signDistance(lagnaSign, lordSign);
  const arudha = signAt(lordSign, count - 1);
  const fromLagna = signDistance(lagnaSign, arudha);
  return fromLagna === 1 || fromLagna === 7 ? signAt(arudha, 9) : arudha;
}

function getSignDetails(sign: number, chart: TimingChart, karakas: Map<Graha, string>) {
  const lord = getSignLord(sign);
  const lordPosition = chart.byPlanet.get(lord)!;
  const atmakaraka = [...karakas].find(([, karaka]) => karaka === "Atmakaraka")?.[0];
  const occupants = chart.planets.filter((planet) => planet.sign === sign);
  const aspectingSigns = chart.planets.filter((planet) => getJaiminiSignAspects(planet.sign).includes(sign));
  return {
    sign,
    signName: SIGNS[sign - 1],
    lord,
    lordPlacement: { sign: lordPosition.sign, house: lordPosition.house },
    occupants: occupants.map(({ planet }) => planet),
    charaKarakas: [...karakas].filter(([planet]) => occupants.some((occupant) => occupant.planet === planet)).map(([planet, karaka]) => ({ planet, karaka })),
    rashiAspectingPlanets: aspectingSigns.map(({ planet }) => planet),
    arudhaLagna: getArudha(chart.lagnaSign, getSignLord(chart.lagnaSign), chart) === sign,
    upapadaLagna: getArudha(signAt(chart.lagnaSign, 11), getSignLord(signAt(chart.lagnaSign, 11)), chart) === sign,
    karakamsa: atmakaraka ? chart.byPlanet.get(atmakaraka)?.sign === sign : false,
  };
}

function directionForAd(mdSign: number, mdOrderForward: boolean, chart: TimingChart) {
  if (chart.config.adDirection === "sameAsMD") return mdOrderForward;
  return isSavya(mdSign, chart);
}

function buildSubperiods(
  parent: Period,
  sign: number,
  chart: TimingChart,
  karakas: Map<Graha, string>,
  mdOrderForward: boolean,
  depth: 2 | 3,
): Period[] {
  const forward = directionForAd(sign, mdOrderForward, chart);
  let cursor = new Date(parent.start);
  return Array.from({ length: 12 }, (_, index) => {
    const childSign = signAt(sign, forward ? index + 1 : -(index + 1));
    const childEnd = index === 11 ? new Date(parent.end) : addYears(cursor, parent.years / 12, chart.config.yearLength);
    const details = getSignDetails(childSign, chart, karakas);
    const child: Period = {
      level: (parent.level + 1) as Period["level"],
      lord: SIGNS[childSign - 1],
      start: cursor.toISOString(),
      end: childEnd.toISOString(),
      years: (childEnd.getTime() - cursor.getTime()) / (YEAR_MS(chart)),
      reasons: [`${parent.lord} period is divided into twelve equal sign subperiods.`, `${SIGNS[childSign - 1]} is ${forward ? "the next" : "the previous"} sign in the configured direction.`],
      details,
    };
    if (depth === 3 && child.level === 2) child.children = buildSubperiods(child, childSign, chart, karakas, mdOrderForward, 2);
    cursor = childEnd;
    return child;
  });
}

function YEAR_MS(chart: TimingChart) {
  return addYears(chart.birth, 1, chart.config.yearLength).getTime() - chart.birth.getTime();
}

export function calculateCharaDasha(input: TimingInput): Period[] {
  const chart = getTimingChart(input);
  const karakas = getKarakas(chart);
  const ninth = signAt(chart.lagnaSign, 8);
  const mdOrderForward = isSavya(ninth, chart);
  const order = getCharaOrder(chart.lagnaSign, chart);
  const periods: Period[] = [];
  let cursor = new Date(chart.birth);
  let cycle = 1;
  while (cursor < chart.to && cycle <= 3) {
    for (const sign of order) {
      const base = getCharaDuration(sign, chart);
      const years = cycle === 1 ? base.years : cycle === 2 ? 12 - base.years : base.years;
      if (years <= 0) continue;
      const start = new Date(cursor);
      const end = addYears(start, years, chart.config.yearLength);
      const details = getSignDetails(sign, chart, karakas);
      const period: Period = {
        level: 1,
        lord: SIGNS[sign - 1],
        start: start.toISOString(),
        end: end.toISOString(),
        years,
        reasons: [
          `Cycle ${cycle}; Chara Dasha begins from Lagna sign ${SIGNS[chart.lagnaSign - 1]}.`,
          `The ninth sign ${SIGNS[ninth - 1]} is in the ${mdOrderForward ? "Savya" : "Apasavya"} group; Mahadashas run ${mdOrderForward ? "forward" : "backward"}.`,
          ...base.reasons,
          ...(cycle === 2 ? [`Second-cycle duration is 12 - ${base.years} = ${years} years.`] : []),
        ],
        details,
      };
      if (cycle !== 2 || years > 0) period.children = buildSubperiods(period, sign, chart, karakas, mdOrderForward, chart.config.charaLevels);
      if (end > chart.from) periods.push(period);
      cursor = end;
      if (cursor >= chart.to) break;
    }
    cycle += 1;
  }
  return periods;
}

export function getCurrentPeriod(periods: Period[], date = new Date()): Period | undefined {
  return periods.find(({ start, end }) => new Date(start) <= date && date < new Date(end));
}

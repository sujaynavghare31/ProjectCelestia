import { addYears, getJaiminiSignAspects, getSignLord, getTimingChart, localDisplay, signAt } from "./core";
import { localDateTimeToUtc } from "../timezone";
import type { Graha } from "../avastha/types";
import type { BcpYear, TimingChart, TimingInput } from "./types";

const BCP_KARAKAS: Record<number, Graha[]> = {
  1: ["Sun"], 2: ["Jupiter"], 3: ["Mars"], 4: ["Moon", "Mercury"],
  5: ["Jupiter"], 6: ["Mars", "Saturn"], 7: ["Venus"], 8: ["Saturn"],
  9: ["Jupiter", "Sun"], 10: ["Sun", "Mercury", "Jupiter", "Saturn"],
  11: ["Jupiter"], 12: ["Saturn"],
};

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function birthdayAt(age: number, chart: TimingChart) {
  const parts = localParts(chart.birth, chart.input.timezone);
  const year = Number(parts.year) + age;
  const month = Number(parts.month);
  const originalDay = Number(parts.day);
  let day = originalDay;
  while (new Date(Date.UTC(year, month - 1, day)).getUTCMonth() !== month - 1) day -= 1;
  const date = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const time = `${parts.hour}:${parts.minute}:${parts.second}`;
  return localDateTimeToUtc(date, time, chart.input.timezone);
}

export function getBcpYearBoundary(age: number, chart: TimingChart) {
  if (!Number.isInteger(age) || age < 0) throw new Error("BCP age must be a non-negative integer.");
  if (chart.config.bcpYearBoundary === "birthday") return birthdayAt(age, chart);
  return addYears(chart.birth, age, chart.config.yearLength);
}

function aspectsFromSign(planet: Graha, from: number, to: number) {
  const distance = ((to - from + 12) % 12) + 1;
  return distance === 7 ||
    (planet === "Mars" && (distance === 4 || distance === 8)) ||
    (planet === "Jupiter" && (distance === 5 || distance === 9)) ||
    (planet === "Saturn" && (distance === 3 || distance === 10)) ||
    ((planet === "Rahu" || planet === "Ketu") && (distance === 5 || distance === 9));
}

export function calculateBcpYear(ageYear: number, chart: TimingChart): BcpYear {
  if (!Number.isInteger(ageYear) || ageYear < 1) throw new Error("ageYear must be an integer greater than zero.");
  const start = getBcpYearBoundary(ageYear - 1, chart);
  const end = getBcpYearBoundary(ageYear, chart);
  const activatedHouse = ((ageYear - 1) % 12) + 1;
  const activatedSign = signAt(chart.lagnaSign, activatedHouse - 1);
  const signLord = getSignLord(activatedSign);
  const lordNatalHouse = chart.byPlanet.get(signLord)!.house;
  const natalOccupants = chart.planets.filter(({ sign }) => sign === activatedSign).map(({ planet }) => planet);
  const natalAspects = chart.planets.filter(({ planet, sign }) => aspectsFromSign(planet, sign, activatedSign)).map(({ planet }) => planet);
  const progressedContacts: BcpYear["progressedContacts"] = [];
  if (chart.config.bcpPlanetProgression) {
    for (const progressed of chart.planets) {
      const progressedSign = signAt(progressed.sign, ageYear - 1);
      for (const natal of chart.planets) {
        if (progressed.planet === natal.planet) continue;
        if (progressedSign === natal.sign) {
          progressedContacts.push({ progressedPlanet: progressed.planet, progressedSign, natalPlanet: natal.planet, relation: "conj" });
        } else if (aspectsFromSign(progressed.planet, progressedSign, natal.sign)) {
          progressedContacts.push({ progressedPlanet: progressed.planet, progressedSign, natalPlanet: natal.planet, relation: "aspect" });
        }
      }
    }
  }
  return {
    ageYear,
    start: start.toISOString(),
    end: end.toISOString(),
    activatedHouse,
    activatedSign,
    progressedLagnaSign: signAt(chart.lagnaSign, ageYear - 1),
    signLord,
    lordNatalHouse,
    natalOccupants,
    natalAspects,
    karaka: BCP_KARAKAS[activatedHouse],
    progressedContacts,
    reasons: [
      `Year ${ageYear} activates house ${activatedHouse} by the 12-year BCP cycle.`,
      `${activatedHouse}th house begins in ${activatedSign}; its lord ${signLord} is natally in house ${lordNatalHouse}.`,
      `Local annual boundary (${chart.config.bcpYearBoundary}) is ${localDisplay(start.toISOString(), chart.input.timezone)} to ${localDisplay(end.toISOString(), chart.input.timezone)}.`,
    ],
  };
}

export function calculateBcpYears(input: TimingInput): BcpYear[] {
  const chart = getTimingChart(input);
  const years: BcpYear[] = [];
  for (let ageYear = 1; ageYear <= 120; ageYear += 1) {
    const bcpYear = calculateBcpYear(ageYear, chart);
    if (new Date(bcpYear.start) >= chart.to) break;
    if (new Date(bcpYear.end) > chart.from) years.push(bcpYear);
  }
  return years;
}

export function getBcpAspectedSigns(sign: number) {
  return getJaiminiSignAspects(sign);
}

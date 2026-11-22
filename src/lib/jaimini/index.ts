export * from "./constants";
export * from "./core";
export * from "./dashas";
export * from "./arudha";
export * from "./karakamsha";
export * from "./specialLagnas";
export * from "./upagrahas";
export * from "./yogas";
export * from "./argala";
export * from "./strength";
export * from "./aspects";
export * from "./dispositors";

import { mod, sign } from "./constants";
import type { PlanetPositions } from "./constants";
import { brahma, charaKarakas, karakamsha, lordOf, signRanks, stronger, trikonaStart } from "./core";
import { arudhaLagnas, grahaArudhas, arudhaReadings } from "./arudha";
import { devataForSign, karakamshaHouses } from "./karakamsha";
import { specialLagnas } from "./specialLagnas";
import type { SpecialLagnaInputs } from "./specialLagnas";
import { argalaTable } from "./argala";
import { yogas } from "./yogas";
import type { Yoga } from "./yogas";
import { charaKnRao, charaParashara, sthira, shoola, navamsaDasha, brahmaDasha, mandooka, trikonaDasha, drigDasha } from "./dashas";
import type { DashaResult } from "./dashas";
import { signStrengthTable, planetStrengthTable } from "./strength";
import { aspectReport } from "./aspects";
import { dispositorReport } from "./dispositors";
import { sunUpagrahas, timeUpagrahas } from "./upagrahas";

export interface JaiminiChartInput {
  lagnaLongitude: number;
  moonLongitude: number;
  sunLongitude: number;
  sunriseSunLongitude: number;
  rahuLongitude: number;
  birthMinutes: number;
  planets: PlanetPositions;
  scheme?: 7 | 8;
  birthMs: number;
  asOfMs: number;
  sunriseMinutes: number;
  sunriseMs: number;
  sunsetMs: number;
  nextSunriseMs: number;
  weekday: number;
  ascendantAt: (dateTimeMs: number) => number;
  upagrahaPoint?: "start" | "middle";
}

export interface JaiminiDashboardResult {
  lagna: number;
  karakas: Array<{ name: string; planet: number; degree: number }>;
  kk: number;
  ishta: ReturnType<typeof devataForSign>;
  dharma: ReturnType<typeof devataForSign>;
  s17: number;
  trikonaStart: number;
  brahma: number;
  brahmaSign: number;
  brahmaPlanet: number;
  signRanks: number[];
  arudhas: number[];
  grahaArudhas: number[];
  arudhaReadings: ReturnType<typeof arudhaReadings>;
  specialLagnas: ReturnType<typeof specialLagnas>;
  argalaLag: Array<{ house: number; sign: number; net: number; effective: number[]; counts: Record<string, number> }>;
  argalaTenth: Array<{ house: number; sign: number; net: number; effective: number[]; counts: Record<string, number> }>;
  dashas: Record<string, DashaResult>;
  yogas: Yoga[];
  signStrengthTable: ReturnType<typeof signStrengthTable>;
  planetStrengthTable: ReturnType<typeof planetStrengthTable>;
  aspects: ReturnType<typeof aspectReport>;
  dispositors: ReturnType<typeof dispositorReport>;
  karakamshaHouses: ReturnType<typeof karakamshaHouses>;
  sunUpagrahas: ReturnType<typeof sunUpagrahas>;
  timeUpagrahas: ReturnType<typeof timeUpagrahas>;
}

export function computeJaiminiDashboard(input: JaiminiChartInput): JaiminiDashboardResult {
  const lagna = sign(input.lagnaLongitude);
  const scheme = input.scheme ?? 7;
  const karakas = charaKarakas(input.planets, scheme);
  const kk = karakamsha(input.planets, scheme);
  const s17 = stronger(lagna, mod(lagna + 6, 12), input.planets);
  const trikona = trikonaStart(lagna, input.planets);
  const brahmaPlanet = brahma(lagna, s17, input.planets);
  const brahmaSign = sign(karakaSignLongitude(input.planets, brahmaPlanet));
  const arudhas = arudhaLagnas(lagna, input.planets);
  const grahaArudhaSigns = grahaArudhas(input.planets);
  const special = specialLagnas({
    lagnaLongitude: input.lagnaLongitude,
    moonLongitude: input.moonLongitude,
    sunLongitude: input.sunLongitude,
    sunriseSunLongitude: input.sunriseSunLongitude,
    rahuLongitude: input.rahuLongitude,
    birthMinutes: input.birthMinutes,
    sunriseMinutes: input.sunriseMinutes,
  });
  const argalaLag = argalaTable(lagna, input.planets);
  const argalaTenth = argalaTable(mod(lagna + 9, 12), input.planets);
  const dashas = {
    charaKnRao: charaKnRao(input.lagnaLongitude, input.planets, input.birthMs, input.asOfMs),
    charaParashara: charaParashara(input.lagnaLongitude, input.planets, input.birthMs, input.asOfMs),
    sthira: sthira(brahmaSign, input.planets, input.birthMs, input.asOfMs),
    shoola: shoola(s17, input.birthMs, input.asOfMs),
    navamsa: navamsaDasha(input.lagnaLongitude, input.birthMs, input.asOfMs),
    brahma: brahmaDasha(brahmaSign, input.planets, input.birthMs, input.asOfMs),
    mandooka: mandooka(s17, input.birthMs, input.asOfMs),
    trikona: trikonaDasha(input.lagnaLongitude, input.planets, input.birthMs, input.asOfMs),
    drig: drigDasha(input.lagnaLongitude, input.planets, input.birthMs, input.asOfMs),
  } as Record<string, DashaResult>;
  const yogaList = yogas({
    lagnaLongitude: input.lagnaLongitude,
    planets: input.planets,
    scheme,
    arudhas,
    kk,
    brahma: brahmaSign,
    horaLagna: special.hl,
    ghatiLagna: special.gl,
    induLagna: special.il,
    argalaLagna: argalaLag,
    argalaTenth,
  });
  const ishta = devataForSign(mod(kk + 11, 12), input.planets);
  const dharma = devataForSign(mod(kk + 5, 12), input.planets);
  const sunUpagrahaValues = sunUpagrahas(input.sunLongitude);
  const timeUpagrahaValues = timeUpagrahas({
    birthMs: input.birthMs,
    sunriseMs: input.sunriseMs,
    sunsetMs: input.sunsetMs,
    nextSunriseMs: input.nextSunriseMs,
    weekday: input.weekday,
    ascendantAt: input.ascendantAt,
    upagrahaPoint: input.upagrahaPoint,
  });

  return {
    lagna,
    karakas,
    kk,
    ishta,
    dharma,
    s17,
    trikonaStart: trikona,
    brahma: brahmaPlanet,
    brahmaSign,
    brahmaPlanet,
    signRanks: signRanks(input.planets),
    arudhas,
    grahaArudhas: grahaArudhaSigns,
    arudhaReadings: arudhaReadings(lagna, input.planets),
    specialLagnas: special,
    argalaLag,
    argalaTenth,
    dashas,
    yogas: yogaList,
    signStrengthTable: signStrengthTable(input.planets, lagna),
    planetStrengthTable: planetStrengthTable(input.planets, lagna, karakas),
    aspects: aspectReport(input.planets),
    dispositors: dispositorReport(input.planets),
    karakamshaHouses: karakamshaHouses(kk, input.planets),
    sunUpagrahas: sunUpagrahaValues,
    timeUpagrahas: timeUpagrahaValues,
  };
}

function karakaSignLongitude(planets: PlanetPositions, planet: number): number {
  if (Array.isArray(planets)) return planets[planet] ?? 0;
  const map = planets as Record<string, number>;
  const names = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
  const shorts = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"];
  return map[names[planet]] ?? map[shorts[planet]] ?? map[String(planet)] ?? 0;
}

import { DEFAULT_AVASTHA_CONFIG, type AvasthaConfig } from "./config";
import {
  CHESHTA_CONSTANT,
  COMBUSTION_ORBS,
  DEBILITATION,
  derivePosition,
  EXALTATION,
  MOOLATRIKONA,
  NATURAL_ENEMIES,
  NATURAL_FRIENDS,
  normalizeLongitude,
  OWN_SIGNS,
  PLANET_NUMBER,
  SHAYANADI_SANSKRIT,
  SHAYANADI_STATES,
  SIGN_LORDS,
} from "./graha";
import type {
  AvasthaInput,
  AvasthaNature,
  AvasthaPlanet,
  AvasthaReport,
  AvasthaResult,
  Graha,
  PlanetAvasthaReport,
  ShayanadiFormulaInputs,
} from "./types";
import { GRAHAS } from "./types";

const ENGINE_VERSION = "1.1.1";
const BASE_MALEFICS: Graha[] = ["Sun", "Mars", "Saturn", "Rahu", "Ketu"];
const WARRING_PLANETS: Graha[] = ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
const COMBUSTION_SANSKRIT: Record<string, string> = {
  Bala: "बाल", Kumara: "कुमार", Yuva: "युवा", Vriddha: "वृद्ध", Mrita: "मृत",
  Jagrat: "जाग्रत", Swapna: "स्वप्न", Sushupti: "सुषुप्ति",
  Kopa: "कोप", Vikala: "विकल", Deepta: "दीप्त", Sukhita: "सुखित", Swastha: "स्वस्थ",
  Mudita: "मुदित", Shanta: "शान्त", Deena: "दीन", Dukhita: "दुःखित", Khala: "खल",
  Lajjita: "लज्जित", Garvita: "गर्वित", Kshudhita: "क्षुधित", Trushita: "तृषित", Kshobhita: "क्षोभित",
  Shakta: "शक्त", Peedita: "पीडित",
};

interface DerivedPlanet extends AvasthaPlanet {
  sign: number;
  degree: number;
  nakshatra: number;
  pada: number;
  navamsaIndex: number;
  navamsaSign: number;
  house: number;
  longitude: number;
  isRetrograde: boolean;
}

interface ChartContext {
  planets: DerivedPlanet[];
  byPlanet: Map<Graha, DerivedPlanet>;
  lagna: ReturnType<typeof derivePosition>;
  birth: Date;
  sunrise: Date;
  config: AvasthaConfig;
  combust: Set<Graha>;
  war: Map<Graha, "winner" | "loser">;
  malefics: Set<Graha>;
  benefics: Set<Graha>;
}

function mergeConfig(partial: Partial<AvasthaConfig> = {}): AvasthaConfig {
  const config: AvasthaConfig = {
    ...DEFAULT_AVASTHA_CONFIG,
    ...partial,
    deeptadiPercentages: { ...DEFAULT_AVASTHA_CONFIG.deeptadiPercentages, ...partial.deeptadiPercentages },
    strengthWeights: { ...DEFAULT_AVASTHA_CONFIG.strengthWeights, ...partial.strengthWeights },
    rahuMoolatrikonaSigns: partial.rahuMoolatrikonaSigns ?? DEFAULT_AVASTHA_CONFIG.rahuMoolatrikonaSigns,
    ketuMoolatrikonaSigns: partial.ketuMoolatrikonaSigns ?? DEFAULT_AVASTHA_CONFIG.ketuMoolatrikonaSigns,
    rahuOwnSigns: partial.rahuOwnSigns ?? DEFAULT_AVASTHA_CONFIG.rahuOwnSigns,
    ketuOwnSigns: partial.ketuOwnSigns ?? DEFAULT_AVASTHA_CONFIG.ketuOwnSigns,
    nodeFriends: partial.nodeFriends ?? DEFAULT_AVASTHA_CONFIG.nodeFriends,
    nodeNeutral: partial.nodeNeutral ?? DEFAULT_AVASTHA_CONFIG.nodeNeutral,
    nodeEnemies: partial.nodeEnemies ?? DEFAULT_AVASTHA_CONFIG.nodeEnemies,
    nameLetterAnkas: { ...DEFAULT_AVASTHA_CONFIG.nameLetterAnkas, ...partial.nameLetterAnkas },
  };
  if (!Number.isFinite(config.vriddhaResultPercent) || config.vriddhaResultPercent < 0 || config.vriddhaResultPercent > 100) {
    throw new Error("vriddhaResultPercent must be between 0 and 100.");
  }
  if (config.conjunctionOrb !== undefined && (!Number.isFinite(config.conjunctionOrb) || config.conjunctionOrb < 0 || config.conjunctionOrb > 15)) {
    throw new Error("conjunctionOrb must be between 0 and 15 degrees.");
  }
  if (Object.values(config.strengthWeights).some((weight) => !Number.isFinite(weight) || weight < 0) ||
      Object.values(config.strengthWeights).reduce((sum, weight) => sum + weight, 0) <= 0) {
    throw new Error("Strength weights must be non-negative and have a positive total.");
  }
  return config;
}

function assertIsoDate(value: string, label: string): Date {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || !value.includes("T")) throw new Error(`${label} must be a valid ISO datetime.`);
  return date;
}

function relationHouse(fromSign: number, toSign: number) {
  return ((toSign - fromSign + 12) % 12) + 1;
}

export function getPlanetaryRelationship(
  planet: Graha,
  other: Graha,
  positions: Array<{ planet: Graha; sign: number }>,
  configInput: Partial<AvasthaConfig> = {},
): "Adhimitra" | "Mitra" | "Sama" | "Shatru" | "Adhishatru" {
  const config = mergeConfig(configInput);
  const natural = planet === "Rahu" || planet === "Ketu"
    ? config.nodeFriends.includes(other) ? "friend" : config.nodeEnemies.includes(other) ? "enemy" : "neutral"
    : NATURAL_FRIENDS[planet].includes(other) ? "friend" : NATURAL_ENEMIES[planet].includes(other) ? "enemy" : "neutral";
  if (config.friendshipMode === "natural") {
    return natural === "friend" ? "Mitra" : natural === "enemy" ? "Shatru" : "Sama";
  }
  const a = positions.find((position) => position.planet === planet);
  const b = positions.find((position) => position.planet === other);
  const temporalFriend = a && b && [2, 3, 4, 10, 11, 12].includes(relationHouse(a.sign, b.sign));
  if (natural === "friend") return temporalFriend ? "Adhimitra" : "Mitra";
  if (natural === "enemy") return temporalFriend ? "Sama" : "Adhishatru";
  return temporalFriend ? "Mitra" : "Shatru";
}

function getRelationship(planet: Graha, other: Graha, chart: ChartContext) {
  return getPlanetaryRelationship(planet, other, chart.planets, chart.config);
}

function relationToSignLord(planet: Graha, sign: number, chart: ChartContext) {
  const lord = SIGN_LORDS[sign];
  return getRelationship(planet, lord, chart);
}

function isMoolatrikona(planet: Graha, sign: number, degree: number, chart: ChartContext) {
  if (planet === "Rahu") return chart.config.rahuMoolatrikonaSigns.includes(sign);
  if (planet === "Ketu") return chart.config.ketuMoolatrikonaSigns.includes(sign);
  const mt = MOOLATRIKONA[planet];
  return Boolean(mt && mt.sign === sign && degree >= mt.from && degree < mt.to);
}

function getDignity(planet: Graha, position: DerivedPlanet, chart: ChartContext): PlanetAvasthaReport["dignity"] {
  const exaltSign = planet === "Rahu" ? chart.config.rahuExaltSign : planet === "Ketu" ? chart.config.ketuExaltSign : EXALTATION[planet].sign;
  const debilSign = planet === "Rahu" ? chart.config.rahuDebilSign : planet === "Ketu" ? chart.config.ketuDebilSign : DEBILITATION[planet];
  if (position.sign === exaltSign) return "Exalted";
  if (position.sign === debilSign) return "Debilitated";
  if (isMoolatrikona(planet, position.sign, position.degree, chart)) return "Moolatrikona";
  const ownSigns = planet === "Rahu" ? chart.config.rahuOwnSigns : planet === "Ketu" ? chart.config.ketuOwnSigns : OWN_SIGNS[planet];
  if (ownSigns.includes(position.sign)) return "Own";
  return relationToSignLord(planet, position.sign, chart);
}

function angularDistance(a: number, b: number) {
  const delta = Math.abs(normalizeLongitude(a) - normalizeLongitude(b));
  return Math.min(delta, 360 - delta);
}

function getCombustion(chart: ChartContext) {
  const sun = chart.byPlanet.get("Sun");
  if (!sun) return new Set<Graha>();
  const combust = new Set<Graha>();
  for (const [planet, orb] of Object.entries(COMBUSTION_ORBS) as Array<[Graha, NonNullable<(typeof COMBUSTION_ORBS)[Graha]>]>) {
    const position = chart.byPlanet.get(planet);
    if (!position) continue;
    const limit = position.isRetrograde && orb.retrograde !== undefined ? orb.retrograde : orb.direct;
    if (angularDistance(position.longitude, sun.longitude) <= limit + 1e-9) combust.add(planet);
  }
  return combust;
}

function getWarStatus(chart: ChartContext) {
  const status = new Map<Graha, "winner" | "loser">();
  for (let i = 0; i < WARRING_PLANETS.length; i += 1) {
    const a = chart.byPlanet.get(WARRING_PLANETS[i]);
    if (!a) continue;
    for (let j = i + 1; j < WARRING_PLANETS.length; j += 1) {
      const b = chart.byPlanet.get(WARRING_PLANETS[j]);
      if (!b || angularDistance(a.longitude, b.longitude) > 1 + 1e-9) continue;
      if (chart.config.yuddhaWinnerRule === "brightness") {
        throw new Error("Brightness-based Graha Yuddha requires explicit apparent-brightness data, which is not part of this chart input.");
      }
      const aWins = a.longitude < b.longitude;
      status.set(a.planet, aWins ? "winner" : "loser");
      status.set(b.planet, aWins ? "loser" : "winner");
    }
  }
  return status;
}

function aspectsFromSign(planet: Graha, distance: number, chart: ChartContext) {
  if (distance === 7) return true;
  if (planet === "Mars" && (distance === 4 || distance === 8)) return true;
  if (planet === "Jupiter" && (distance === 5 || distance === 9)) return true;
  if (planet === "Saturn" && (distance === 3 || distance === 10)) return true;
  return (planet === "Rahu" || planet === "Ketu") && chart.config.nodeAspects && (distance === 5 || distance === 9);
}

function aspecting(target: DerivedPlanet, chart: ChartContext) {
  return chart.planets.filter((source) => source.planet !== target.planet &&
    aspectsFromSign(source.planet, relationHouse(source.sign, target.sign), chart));
}

function isConjunct(a: DerivedPlanet, b: DerivedPlanet, chart: ChartContext) {
  if (a.planet === b.planet) return false;
  if (chart.config.conjunctionOrb === undefined) return a.sign === b.sign;
  return angularDistance(a.longitude, b.longitude) <= chart.config.conjunctionOrb + 1e-9;
}

function classifyBeneficMalefic(chart: ChartContext) {
  const sun = chart.byPlanet.get("Sun");
  const moon = chart.byPlanet.get("Moon");
  const elongation = sun && moon ? normalizeLongitude(moon.longitude - sun.longitude) : 180;
  const waxing = chart.config.moonBeneficRule === "paksha" ? elongation <= 180 : elongation >= 90 && elongation <= 270;
  const malefics = new Set<Graha>(BASE_MALEFICS);
  if (!waxing) malefics.add("Moon");
  const benefics = new Set<Graha>(["Jupiter", "Venus"]);
  if (waxing) benefics.add("Moon");
  for (const planet of chart.planets) {
    if (planet.planet !== "Mercury") continue;
    const joinedMalefic = chart.planets.some((other) => other.planet !== "Mercury" && malefics.has(other.planet) && isConjunct(planet, other, chart));
    if (joinedMalefic) malefics.add("Mercury");
    else benefics.add("Mercury");
  }
  return { malefics, benefics };
}

function makeResult(
  system: AvasthaResult["system"],
  state: string,
  nature: AvasthaNature,
  ruleId: string,
  reasons: string[],
  resultPercent?: number,
): AvasthaResult {
  return {
    system,
    state,
    sanskrit: COMBUSTION_SANSKRIT[state] ?? SHAYANADI_SANSKRIT[state] ?? state,
    nature,
    ruleId,
    reasons,
    ...(resultPercent === undefined ? {} : { resultPercent }),
  };
}

function baladi(planet: DerivedPlanet, chart: ChartContext): AvasthaResult {
  const slot = Math.min(4, Math.floor(planet.degree / 6));
  const oddSign = planet.sign % 2 === 1;
  const states = oddSign
    ? ["Bala", "Kumara", "Yuva", "Vriddha", "Mrita"]
    : ["Mrita", "Vriddha", "Yuva", "Kumara", "Bala"];
  const state = states[slot];
  const percentages: Record<string, number> = { Bala: 25, Kumara: 50, Yuva: 100, Vriddha: chart.config.vriddhaResultPercent, Mrita: 0 };
  return makeResult(
    "Baladi",
    state,
    state === "Mrita" ? "inauspicious" : state === "Yuva" ? "auspicious" : "mixed",
    `BALADI_${state.toUpperCase()}`,
    [`${planet.degree.toFixed(6)}° falls in the ${slot + 1}th 6° segment of ${oddSign ? "an odd" : "an even"} sign.`],
    percentages[state],
  );
}

function jagradadi(planet: DerivedPlanet, chart: ChartContext): AvasthaResult {
  const dignity = getDignity(planet.planet, planet, chart);
  if (dignity === "Exalted" || dignity === "Own" || (chart.config.jagratIncludesMoolatrikona && dignity === "Moolatrikona")) {
    return makeResult("Jagradadi", "Jagrat", "auspicious", "JAGRADADI_OWN_OR_EXALT", [`${planet.planet} is ${dignity.toLowerCase()} in sign ${planet.sign}.`], 100);
  }
  if (dignity === "Debilitated") {
    const cancellation = getNeechaBhangaReason(planet, chart);
    if (cancellation) {
      return makeResult("Jagradadi", "Swapna", "mixed", "JAGRADADI_NEECHA_BHANGA", [cancellation], 50);
    }
    return makeResult("Jagradadi", "Sushupti", "inauspicious", "JAGRADADI_DEBILITATED", [`${planet.planet} occupies its debilitation sign.`], 0);
  }
  const relationship = relationToSignLord(planet.planet, planet.sign, chart);
  if (relationship === "Adhimitra" || relationship === "Mitra" || relationship === "Sama") {
    return makeResult("Jagradadi", "Swapna", "mixed", `JAGRADADI_${relationship.toUpperCase()}`, [`The sign lord's compound relationship to ${planet.planet} is ${relationship}.`], 50);
  }
  return makeResult("Jagradadi", "Sushupti", "inauspicious", `JAGRADADI_${relationship.toUpperCase()}`, [`The sign lord's compound relationship to ${planet.planet} is ${relationship}.`], 0);
}

function getNeechaBhangaReason(planet: DerivedPlanet, chart: ChartContext): string | null {
  const debilitationSign = planet.planet === "Rahu"
    ? chart.config.rahuDebilSign
    : planet.planet === "Ketu"
      ? chart.config.ketuDebilSign
      : DEBILITATION[planet.planet];
  if (planet.sign !== debilitationSign) return null;

  const exaltationSign = planet.planet === "Rahu"
    ? chart.config.rahuExaltSign
    : planet.planet === "Ketu"
      ? chart.config.ketuExaltSign
      : EXALTATION[planet.planet].sign;
  const cancellationLords = [
    { planet: SIGN_LORDS[debilitationSign], source: "lord of the debilitation sign" },
    { planet: SIGN_LORDS[exaltationSign], source: "lord of the exaltation sign" },
  ];
  const referenceSigns = [chart.lagna.sign, chart.byPlanet.get("Moon")?.sign]
    .filter((sign): sign is number => sign !== undefined);
  for (const { planet: lord, source } of cancellationLords) {
    const lordPosition = chart.byPlanet.get(lord);
    if (lordPosition && referenceSigns.some((sign) => [1, 4, 7, 10].includes(relationHouse(sign, lordPosition.sign)))) {
      return `${planet.planet} is debilitated, but the ${source} (${lord}) is in a kendra from the Ascendant or Moon; Neecha Bhanga gives Swapna.`;
    }
  }
  return null;
}

function deeptadi(planet: DerivedPlanet, chart: ChartContext): AvasthaResult & { secondaryStates: AvasthaResult[] } {
  const dignity = getDignity(planet.planet, planet, chart);
  const relationship = relationToSignLord(planet.planet, planet.sign, chart);
  const conjunctionMalefic = chart.planets.some((other) => chart.malefics.has(other.planet) && isConjunct(planet, other, chart));
  const ruleHits: Array<{ state: string; nature: AvasthaNature; rule: string; reason: string }> = [];
  if (chart.combust.has(planet.planet)) ruleHits.push({ state: "Kopa", nature: "inauspicious", rule: "DEEPTADI_COMBUST", reason: "The planet is within its configured combustion orb from the Sun." });
  if ((conjunctionMalefic || (chart.config.vikalaIncludesDefeatedWar && chart.war.get(planet.planet) === "loser")) &&
      (chart.config.deeptadiVariant === "BPHS" || conjunctionMalefic)) {
    ruleHits.push({ state: chart.config.deeptadiVariant === "Phaladeepika" ? "Vikala" : "Vikala", nature: "inauspicious", rule: "DEEPTADI_VIKALA", reason: conjunctionMalefic ? "Conjunct a natural malefic." : "Defeated in planetary war." });
  }
  if (dignity === "Exalted") ruleHits.push({ state: "Deepta", nature: "auspicious", rule: "DEEPTADI_EXALTED", reason: "The planet occupies its exaltation sign." });
  if (dignity === "Moolatrikona") ruleHits.push({ state: "Sukhita", nature: "auspicious", rule: "DEEPTADI_MOOLATRIKONA", reason: "The planet occupies its moolatrikona range." });
  if (dignity === "Own") ruleHits.push({ state: "Swastha", nature: "auspicious", rule: "DEEPTADI_OWN_SIGN", reason: "The planet occupies its own sign." });
  if (chart.config.deeptadiVariant === "BPHS") {
    const stateByRelationship: Record<string, string> = { Adhimitra: "Mudita", Mitra: "Shanta", Sama: "Deena", Shatru: "Dukhita", Adhishatru: "Khala" };
    const state = stateByRelationship[relationship];
    if (state) ruleHits.push({
      state,
      nature: ["Mudita", "Shanta"].includes(state) ? "auspicious" : state === "Deena" ? "mixed" : "inauspicious",
      rule: `DEEPTADI_${state.toUpperCase()}`,
      reason: `The sign lord's compound relationship to ${planet.planet} is ${relationship}.`,
    });
    if (dignity === "Debilitated" && !ruleHits.some(({ state: hit }) => hit === "Khala")) {
      ruleHits.push({ state: "Khala", nature: "inauspicious", rule: "DEEPTADI_DEBILITATED", reason: "The planet occupies its debilitation sign." });
    }
  } else {
    if (["Adhimitra", "Mitra"].includes(relationship)) {
      ruleHits.push({ state: "Mudita", nature: "auspicious", rule: "DEEPTADI_FRIEND_SIGN", reason: `The sign lord's compound relationship is ${relationship}.` });
    }
    if (dignity === "Debilitated") ruleHits.push({ state: "Khala", nature: "inauspicious", rule: "DEEPTADI_DEBILITATED", reason: "The planet occupies its debilitation sign." });
    if (planet.isRetrograde) ruleHits.push({ state: "Shakta", nature: "mixed", rule: "DEEPTADI_RETROGRADE", reason: "The planet has negative longitudinal speed." });
    if (planet.degree >= 29) ruleHits.push({ state: "Peedita", nature: "inauspicious", rule: "DEEPTADI_FINAL_DEGREE", reason: "The planet is at or beyond 29° of its sign." });
  }
  if (ruleHits.length === 0) ruleHits.push({ state: "Deena", nature: "mixed", rule: "DEEPTADI_DEFAULT", reason: "No higher-precedence configured Deeptadi condition matched." });
  const toResult = ({ state, nature, rule, reason }: typeof ruleHits[number]) =>
    makeResult("Deeptadi", state, nature, rule, [reason], chart.config.deeptadiPercentages[state]);
  const primary = toResult(ruleHits[0]);
  return { ...primary, secondaryStates: ruleHits.slice(1).map(toResult) };
}

function lajjitadi(planet: DerivedPlanet, chart: ChartContext): AvasthaResult[] {
  const results: AvasthaResult[] = [];
  const dignity = getDignity(planet.planet, planet, chart);
  const relationship = relationToSignLord(planet.planet, planet.sign, chart);
  const conjunctions = chart.planets.filter((other) => isConjunct(planet, other, chart));
  const aspects = aspecting(planet, chart);
  const enemies = (other: DerivedPlanet) => getRelationship(planet.planet, other.planet, chart) === "Shatru" || getRelationship(planet.planet, other.planet, chart) === "Adhishatru";
  const friends = (other: DerivedPlanet) => getRelationship(planet.planet, other.planet, chart) === "Mitra" || getRelationship(planet.planet, other.planet, chart) === "Adhimitra";
  const hasMaleficAspect = aspects.some((source) => chart.malefics.has(source.planet) || enemies(source));
  const hasBeneficAspect = aspects.some((source) => chart.benefics.has(source.planet) && !enemies(source));
  const push = (state: string, nature: AvasthaNature, rule: string, reason: string) => results.push(makeResult("Lajjitadi", state, nature, rule, [reason]));

  if (planet.house === 5 && conjunctions.some(({ planet: name }) => ["Rahu", "Ketu", "Sun", "Saturn", "Mars"].includes(name))) {
    push("Lajjita", "inauspicious", "LAJJITADI_5TH_MALEFIC", "In the fifth house and conjunct Rahu, Ketu, Sun, Saturn, or Mars.");
  }
  if (dignity === "Exalted" || dignity === "Moolatrikona") push("Garvita", "auspicious", "LAJJITADI_EXALT_OR_MOOLATRIKONA", `Occupies ${dignity === "Exalted" ? "an exaltation sign" : "its moolatrikona range"}.`);
  if (relationship === "Shatru" || relationship === "Adhishatru" ||
      conjunctions.some(enemies) || aspects.some(enemies) || conjunctions.some(({ planet: name }) => name === "Saturn")) {
    push("Kshudhita", "inauspicious", "LAJJITADI_ENEMY_OR_SATURN", "In an enemy sign, joined/aspected by an enemy, or conjunct Saturn.");
  }
  const watery = [4, 8, 12].includes(planet.sign) || (chart.config.wateryExtended &&
    (planet.sign === 11 || (planet.sign === 10 && planet.degree >= 15)));
  if (watery && hasMaleficAspect && !hasBeneficAspect) push("Trushita", "inauspicious", "LAJJITADI_WATERY_MALEFIC_ASPECT", "In a configured watery sign, aspected by a malefic/enemy and no benefic aspect.");
  if (["Mitra", "Adhimitra"].includes(relationship) || conjunctions.some(friends) || aspects.some(friends) ||
      (planet.planet !== "Jupiter" && (conjunctions.some(({ planet: name }) => name === "Jupiter") || aspects.some(({ planet: name }) => name === "Jupiter")))) {
    push("Mudita", "auspicious", "LAJJITADI_FRIEND_OR_JUPITER", "In a friend's sign or joined/aspected by a friend or Jupiter.");
  }
  const sun = chart.byPlanet.get("Sun");
  const sunConjunct = planet.planet !== "Sun" && sun &&
    (chart.config.kshobhitaUseCombustionOrb
      ? angularDistance(planet.longitude, sun.longitude) <= (COMBUSTION_ORBS[planet.planet]?.direct ?? 0) + 1e-9
      : planet.sign === sun.sign);
  if (sunConjunct && hasMaleficAspect) push("Kshobhita", "inauspicious", "LAJJITADI_SUN_AND_MALEFIC_ASPECT", "Conjunct the Sun and aspected by a malefic or enemy.");
  return results;
}

export function calculateShayanadiState({
  nakshatra,
  planetNumber,
  navamsaNumber,
  moonNakshatra,
  ghati,
  lagnaSign,
}: {
  nakshatra: number;
  planetNumber: number;
  navamsaNumber: number;
  moonNakshatra: number;
  ghati: number;
  lagnaSign: number;
}) {
  const boundedIntegers = [
    { name: "nakshatra", value: nakshatra, min: 1, max: 27 },
    { name: "planetNumber", value: planetNumber, min: 1, max: 9 },
    { name: "navamsaNumber", value: navamsaNumber, min: 1, max: 12 },
    { name: "moonNakshatra", value: moonNakshatra, min: 1, max: 27 },
    { name: "lagnaSign", value: lagnaSign, min: 1, max: 12 },
  ];
  for (const { name, value, min, max } of boundedIntegers) {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(`${name} must be an integer from ${min} to ${max}.`);
    }
  }
  if (!Number.isFinite(ghati) || ghati < 0) throw new Error("ghati must be a non-negative finite number.");
  const total = nakshatra * planetNumber * navamsaNumber + moonNakshatra + ghati + lagnaSign;
  const remainder = Math.round(total) % 12 || 12;
  return { total, remainder, state: SHAYANADI_STATES[remainder % 12] };
}

function shayanadi(planet: DerivedPlanet, chart: ChartContext, moonNakshatra: number, nameFirstLetter?: string): AvasthaResult & {
  remainder: number;
  total: number;
  formulaInputs: ShayanadiFormulaInputs;
  cheshta?: "Drishti" | "Cheshta" | "Vicheshta";
} {
  const elapsedMinutes = (chart.birth.getTime() - chart.sunrise.getTime()) / 60_000;
  if (elapsedMinutes < 0) throw new Error("sunriseUTC must not be after birthDateTimeUTC.");
  const rawGhati = elapsedMinutes / 24;
  const ghati = chart.config.ghatiRounding === "nearest" ? Math.round(rawGhati)
    : chart.config.ghatiRounding === "ceil" ? Math.ceil(rawGhati)
      : chart.config.ghatiRounding === "floor" ? Math.floor(rawGhati) : rawGhati;
  const navamsaValue = chart.config.navamsaMode === "indexInSign" ? planet.navamsaIndex : planet.navamsaSign;
  const planetNumber = planet.planet === "Ketu" ? chart.config.ketuNumber : PLANET_NUMBER[planet.planet];
  const formulaInputs: ShayanadiFormulaInputs = {
    nakshatra: planet.nakshatra,
    planetNumber,
    navamsaNumber: navamsaValue,
    moonNakshatra,
    ghati,
    lagnaSign: chart.lagna.sign,
  };
  const { total, remainder, state } = calculateShayanadiState(formulaInputs);
  const reasons = [`X = (${planet.nakshatra} × ${planetNumber} × ${navamsaValue}) + ${moonNakshatra} + ${ghati} + ${chart.lagna.sign} = ${total}; remainder ${remainder} maps to ${state}.`];
  const result = {
    ...makeResult("Shayanadi", state, "mixed", "SHAYANADI_BIRTH_GHATI_FORMULA", reasons),
    total,
    remainder,
    formulaInputs,
  };
  if (!nameFirstLetter) return result;
  const key = nameFirstLetter.trim().toUpperCase().slice(0, 1);
  const ankas = chart.config.nameLetterAnkas[key];
  if (ankas === undefined) throw new Error(`No configured Ankas value exists for initial '${key}'.`);
  const z = ((remainder * remainder + ankas) % 12) || 12;
  const w = (z + CHESHTA_CONSTANT[planet.planet]) % 3;
  const cheshta = w === 1 ? "Drishti" : w === 2 ? "Cheshta" : "Vicheshta";
  return {
    ...result,
    system: "Shayanadi",
    reasons: [...reasons, `Initial ${key} maps to Ankas ${ankas}; Z = ${z}; W = (${z} + ${CHESHTA_CONSTANT[planet.planet]}) mod 3 = ${w}, giving ${cheshta}.`],
    cheshta,
  };
}

function getStrengthSummary(
  baladiResult: AvasthaResult,
  jagradadiResult: AvasthaResult,
  deeptadiResult: AvasthaResult & { secondaryStates: AvasthaResult[] },
  lajjitadiResults: AvasthaResult[],
  config: AvasthaConfig,
) {
  const weights = config.strengthWeights;
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const baladiScore = baladiResult.resultPercent ?? 50;
  const jagradadiScore = jagradadiResult.resultPercent ?? 50;
  const deeptadiScore = deeptadiResult.resultPercent ?? 50;
  const lajjitadiNet = lajjitadiResults.reduce((net, state) => net + (state.nature === "auspicious" ? 1 : state.nature === "inauspicious" ? -1 : 0), 0);
  const lajjitadiScore = Math.max(0, Math.min(100, 50 + lajjitadiNet * (50 / 6)));
  const score = Math.round(((baladiScore * weights.baladi + jagradadiScore * weights.jagradadi +
    deeptadiScore * weights.deeptadi + lajjitadiScore * weights.lajjitadi) / totalWeight) * 100) / 100;
  return { score, label: score >= 67 ? "Strong" as const : score >= 34 ? "Moderate" as const : "Weak" as const };
}

function createContext(input: AvasthaInput, config: AvasthaConfig): ChartContext {
  if (!Array.isArray(input.planets) || input.planets.length !== 9) throw new Error("Exactly one position for each of the nine grahas is required.");
  const names = new Set(input.planets.map(({ planet }) => planet));
  if (names.size !== GRAHAS.length || GRAHAS.some((planet) => !names.has(planet))) throw new Error("Planet input must include each graha exactly once.");
  if (!Number.isFinite(input.ascendantLongitude) || input.ascendantLongitude < 0 || input.ascendantLongitude >= 360) throw new Error("ascendantLongitude must be in [0, 360).");
  const planets: DerivedPlanet[] = input.planets.map((entry) => {
    if (!Number.isFinite(entry.longitude) || entry.longitude < 0 || entry.longitude >= 360 || !Number.isFinite(entry.speed)) {
      throw new Error(`${entry.planet} longitude must be in [0, 360), and speed must be finite.`);
    }
    const derived = derivePosition(entry.longitude);
    return { ...entry, ...derived, house: relationHouse(derivePosition(input.ascendantLongitude).sign, derived.sign), isRetrograde: entry.speed < 0 };
  });
  const chart: ChartContext = {
    planets,
    byPlanet: new Map(planets.map((planet) => [planet.planet, planet])),
    lagna: derivePosition(input.ascendantLongitude),
    birth: assertIsoDate(input.birthDateTimeUTC, "birthDateTimeUTC"),
    sunrise: assertIsoDate(input.sunriseUTC, "sunriseUTC"),
    config,
    combust: new Set(),
    war: new Map(),
    malefics: new Set(),
    benefics: new Set(),
  };
  chart.combust = getCombustion(chart);
  chart.war = getWarStatus(chart);
  const classifications = classifyBeneficMalefic(chart);
  chart.malefics = classifications.malefics;
  chart.benefics = classifications.benefics;
  return chart;
}

export function calculateAvasthaReport(input: AvasthaInput): AvasthaReport {
  const config = mergeConfig(input.config);
  const chart = createContext(input, config);
  const moon = chart.byPlanet.get("Moon");
  if (!moon) throw new Error("Moon position is required for Shayanadi calculations.");
  const output: PlanetAvasthaReport[] = chart.planets
    .filter(({ planet }) => config.includeNodesInBaladi || (planet !== "Rahu" && planet !== "Ketu"))
    .map((planet) => {
      const baladiResult = baladi(planet, chart);
      const jagradadiResult = jagradadi(planet, chart);
      const isNode = planet.planet === "Rahu" || planet.planet === "Ketu";
      const deeptadiResult = isNode ? undefined : deeptadi(planet, chart);
      const lajjitadiResults = isNode ? undefined : lajjitadi(planet, chart);
      const avastha = isNode ? undefined : shayanadi(planet, chart, moon.nakshatra, input.nameFirstLetter);
      return {
        planet: planet.planet,
        sign: planet.sign as PlanetAvasthaReport["sign"],
        degree: planet.degree,
        house: planet.house,
        nakshatra: planet.nakshatra,
        navamsaIndex: planet.navamsaIndex,
        dignity: getDignity(planet.planet, planet, chart),
        isCombust: chart.combust.has(planet.planet),
        isRetrograde: planet.isRetrograde,
        ...(chart.war.has(planet.planet) ? { warStatus: chart.war.get(planet.planet) } : {}),
        baladi: baladiResult,
        jagradadi: jagradadiResult,
        ...(deeptadiResult ? { deeptadi: deeptadiResult } : {}),
        ...(lajjitadiResults ? { lajjitadi: lajjitadiResults } : {}),
        ...(avastha ? { shayanadi: avastha } : {}),
        ...(deeptadiResult ? {
          strengthSummary: getStrengthSummary(baladiResult, jagradadiResult, deeptadiResult, lajjitadiResults ?? [], config),
        } : {}),
      };
    });
  return { planets: output, configUsed: config, engineVersion: ENGINE_VERSION };
}

import { getSignLord, getTimingChart, signAt, signDistance } from "./core";
import { derivePosition, normalizeLongitude } from "../avastha/graha";
import { buildBhriguBinduHit, getBhriguBinduTarget, isBhriguBinduConjunction } from "./bhrigu-bindu";
import type { Graha } from "../avastha/types";
import type { ActivationConnection, ActivationEvent, BhriguBinduHit, TimingInput } from "./types";

export interface TransitPosition {
  longitude: number;
  speed: number;
}

export type TransitProvider = (date: Date, planet: Graha) => Promise<TransitPosition> | TransitPosition;

const BNN_PLANETS: Graha[] = ["Jupiter", "Saturn", "Rahu", "Ketu"];

export function getBnnRelation(transitSign: number, natalSign: number): ActivationConnection["relation"] | null {
  const distance = signDistance(transitSign, natalSign);
  if (distance === 1) return "conj";
  if (distance === 5 || distance === 9) return "trine";
  if (distance === 2) return "2nd";
  if (distance === 12) return "12th";
  if (distance === 7) return "7th";
  return null;
}

export function getBnnConnections({
  transitPlanet,
  transitSign,
  transitSpeed,
  input,
}: {
  transitPlanet: Graha;
  transitSign: number;
  transitSpeed: number;
  input: TimingInput;
}): ActivationConnection[] {
  const chart = getTimingChart(input);
  const config = chart.config;
  const effectiveTransitSigns = [transitSign];
  if (config.bnnIncludeRetroPrevSign && transitSpeed < 0) effectiveTransitSigns.push(signAt(transitSign, -1));
  const result: ActivationConnection[] = [];
  for (const natal of chart.planets) {
    const relations = effectiveTransitSigns.map((sign) => ({ sign, relation: getBnnRelation(sign, natal.sign) }))
      .filter((entry): entry is { sign: number; relation: NonNullable<ReturnType<typeof getBnnRelation>> } => entry.relation !== null);
    if (relations.length) {
      const priority: Record<ActivationConnection["relation"], number> = { conj: 0, trine: 1, "2nd": 2, "12th": 3, "7th": 4 };
      relations.sort((a, b) => priority[a.relation] - priority[b.relation]);
      result.push({
        planet: natal.planet,
        relation: relations[0].relation,
        ...(relations[0].sign !== transitSign ? { retrograde: true } : {}),
      });
      continue;
    }
    if (!config.bnnExchange || natal.planet === transitPlanet) continue;
    const natalSignLord = getSignLord(natal.sign);
    const transitSignLord = getSignLord(transitSign);
    if (natalSignLord === transitPlanet && transitSignLord === natal.planet) {
      result.push({ planet: natal.planet, relation: "conj", exchange: true });
    }
  }
  return result;
}

function getSpecialFlags(transitPlanet: Graha, transitSign: number, input: TimingInput) {
  const chart = getTimingChart(input);
  const flags: string[] = [];
  const reasons: string[] = [];
  const natal = chart.byPlanet;
  const natalPosition = natal.get(transitPlanet);
  if (natalPosition && transitSign === natalPosition.sign) {
    if (transitPlanet === "Jupiter") flags.push("JUPITER_RETURN");
    if (transitPlanet === "Saturn") flags.push("SATURN_RETURN");
    if (transitPlanet === "Rahu" || transitPlanet === "Ketu") flags.push(`${transitPlanet.toUpperCase()}_RETURN`);
  }
  if (transitPlanet === "Saturn") {
    const moonSign = natal.get("Moon")!.sign;
    const distance = signDistance(transitSign, moonSign);
    if (distance === 12) flags.push("SADE_SATI_START");
    if (distance === 1) flags.push("SADE_SATI_PEAK");
    if (distance === 2) flags.push("SADE_SATI_END");
  }
  if (transitPlanet === "Jupiter") {
    const natalJupiter = natal.get("Jupiter")!;
    if ([1, 5, 9].includes(signDistance(transitSign, natalJupiter.sign))) {
      flags.push("JEEVA_ACTIVATION");
      reasons.push("Jupiter transits the natal Jupiter sign or its trines.");
    }
  }
  if (transitPlanet === "Saturn") {
    const jeeva = chart.config.jeevaKaraka ?? (input.gender === "female" ? "Venus" : "Jupiter");
    const jeevaPosition = natal.get(jeeva)!;
    if (transitSign === jeevaPosition.sign) {
      flags.push("CAREER_LIFE_PRESSURE");
      reasons.push(`Saturn transits natal ${jeeva}, configured as the ${input.gender === "female" ? "female" : "default"} Jeeva karaka.`);
    }
  }
  return { flags, reasons };
}

export function calculateBhriguBindu(input: TimingInput) {
  return getBhriguBinduTarget(getTimingChart(input));
}

export async function calculateBnnTransitEvents(
  input: TimingInput,
  transitProvider: TransitProvider,
): Promise<{ events: ActivationEvent[]; bhriguBinduHits: BhriguBinduHit[] }> {
  const chart = getTimingChart(input);
  const transitPlanets = chart.config.bnnTransitPlanets.length ? chart.config.bnnTransitPlanets : BNN_PLANETS;
  const step = chart.config.bnnStepDays * 86_400_000;
  const start = new Date(chart.from.getTime() - step);
  const previous = new Map<string, TransitPosition>();
  const events: ActivationEvent[] = [];
  const binduHits: BhriguBinduHit[] = [];
  const binduLongitude = getBhriguBinduTarget(chart);
  const binduSign = derivePosition(binduLongitude).sign;

  for (let time = start.getTime(); time <= chart.to.getTime(); time += step) {
    const date = new Date(time);
    const positions = await Promise.all(transitPlanets.map(async (planet) => ({
      planet,
      position: await transitProvider(date, planet),
    })));
    for (const { planet, position } of positions) {
      if (!Number.isFinite(position.longitude) || !Number.isFinite(position.speed)) {
        throw new Error(`TransitProvider returned an invalid ${planet} position.`);
      }
      const current = { longitude: normalizeLongitude(position.longitude), speed: position.speed };
      const key = planet;
      const prior = previous.get(key);
      const currentSign = derivePosition(current.longitude).sign;
      const priorSign = prior ? derivePosition(prior.longitude).sign : undefined;
      if (prior && priorSign !== currentSign && time >= chart.from.getTime()) {
        const connections = getBnnConnections({
          transitPlanet: planet,
          transitSign: currentSign,
          transitSpeed: current.speed,
          input,
        });
        const special = getSpecialFlags(planet, currentSign, input);
        const themes = connections.map(({ planet: natalPlanet }) => `${planet}+${natalPlanet}`);
        events.push({
          date: date.toISOString(),
          transitPlanet: planet,
          transitSign: currentSign,
          natalPlanetsConnected: connections,
          themes,
          flags: special.flags,
          reasons: [
            `${planet} ingressed sign ${currentSign}.`,
            ...special.reasons,
            ...(connections.some(({ retrograde }) => retrograde) ? ["Retrograde transit also checked from its previous sign."] : []),
            ...(connections.some(({ exchange }) => exchange) ? ["A mutual sign exchange activated this natal relationship."] : []),
          ],
        });
      }
      if (planet === "Jupiter" || planet === "Saturn") {
        const near = isBhriguBinduConjunction(current.longitude, binduLongitude, chart.config.bbOrb);
        const wasNear = prior ? isBhriguBinduConjunction(prior.longitude, binduLongitude, chart.config.bbOrb) : false;
        if (near && !wasNear && time >= chart.from.getTime()) {
          binduHits.push(buildBhriguBinduHit({
            date: date.toISOString(),
            transitPlanet: planet,
            transitLongitude: current.longitude,
            binduLongitude,
            kind: "conjunction",
          }));
        }
        if (prior && priorSign !== currentSign && currentSign === binduSign && time >= chart.from.getTime()) {
          binduHits.push(buildBhriguBinduHit({
            date: date.toISOString(),
            transitPlanet: planet,
            transitLongitude: current.longitude,
            binduLongitude,
            kind: "sign-ingress",
          }));
        }
      }
      previous.set(key, current);
    }
  }
  return { events, bhriguBinduHits: binduHits };
}

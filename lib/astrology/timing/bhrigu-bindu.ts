import { normalizeLongitude } from "../avastha/graha";
import type { BhriguBinduHit, TimingChart } from "./types";

export function calculateBhriguBindu(moonLongitude: number, rahuLongitude: number) {
  if (![moonLongitude, rahuLongitude].every(Number.isFinite)) throw new Error("Moon and Rahu longitudes must be finite.");
  return normalizeLongitude(rahuLongitude + normalizeLongitude(moonLongitude - rahuLongitude) / 2);
}

export function isBhriguBinduConjunction(longitude: number, binduLongitude: number, orb: number) {
  const delta = Math.abs(normalizeLongitude(longitude) - normalizeLongitude(binduLongitude));
  return Math.min(delta, 360 - delta) <= orb + 1e-9;
}

export function getBhriguBinduTarget(chart: TimingChart) {
  const moon = chart.byPlanet.get("Moon");
  const rahu = chart.byPlanet.get("Rahu");
  if (!moon || !rahu) throw new Error("Moon and Rahu are required to calculate Bhrigu Bindu.");
  return calculateBhriguBindu(moon.longitude, rahu.longitude);
}

export function buildBhriguBinduHit({
  date,
  transitPlanet,
  transitLongitude,
  binduLongitude,
  kind,
}: {
  date: string;
  transitPlanet: "Jupiter" | "Saturn";
  transitLongitude: number;
  binduLongitude: number;
  kind: BhriguBinduHit["kind"];
}): BhriguBinduHit {
  const delta = Math.abs(normalizeLongitude(transitLongitude) - normalizeLongitude(binduLongitude));
  const orb = Math.min(delta, 360 - delta);
  return {
    date,
    transitPlanet,
    transitLongitude: normalizeLongitude(transitLongitude),
    binduLongitude: normalizeLongitude(binduLongitude),
    kind,
    orb,
    reasons: [kind === "conjunction"
      ? `${transitPlanet} is within ${orb.toFixed(3)}° of Bhrigu Bindu.`
      : `${transitPlanet} entered Bhrigu Bindu's sign.`],
  };
}

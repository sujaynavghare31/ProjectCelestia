export const ARUDHA_LABELS = ["AL", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11", "UL"] as const;

const SIGN_LORDS = [
  ["Mars"], ["Venus"], ["Mercury"], ["Moon"], ["Sun"], ["Mercury"],
  ["Venus"], ["Mars", "Ketu"], ["Jupiter"], ["Saturn"], ["Saturn", "Rahu"], ["Jupiter"],
] as const;

export type ArudhaPadaMode = "all" | "al_ul_only";

export type ArudhaPlanet = {
  name: string;
  sign: number;
};

export type ArudhaPada = {
  house: number;
  label: (typeof ARUDHA_LABELS)[number];
  signIndex: number;
  signLord: string;
};

export type ArudhaChartData = {
  lagnaSign: number;
  planets: ArudhaPlanet[];
};

export function normalizeSign(sign: number) {
  return ((Math.floor(sign) % 12) + 12) % 12;
}

export function getSignLord(signIndex: number) {
  const lords = SIGN_LORDS[normalizeSign(signIndex)];
  return lords.length === 1 ? lords[0] : null;
}

export function getStrongerLord(
  planetA: string,
  planetB: string,
  chartData: ArudhaChartData,
) {
  const ownSigns: Record<string, number[]> = {
    Mars: [0, 7], Sun: [4], Moon: [3], Mercury: [2, 5], Venus: [1, 6],
    Jupiter: [8, 11], Saturn: [9, 10], Rahu: [10], Ketu: [7],
  };
  const planetSign = (planet: string) => chartData.planets.find((candidate) => candidate.name === planet)?.sign;

  const signA = planetSign(planetA);
  const signB = planetSign(planetB);
  const aOwn = signA !== undefined && ownSigns[planetA]?.includes(normalizeSign(signA));
  const bOwn = signB !== undefined && ownSigns[planetB]?.includes(normalizeSign(signB));

  if (aOwn !== bOwn) return bOwn ? planetA : planetB;

  const conjunctionCount = (planet: string) => {
    const sign = planetSign(planet);
    if (sign === undefined) return 0;
    return chartData.planets.filter((candidate) =>
      candidate.name !== planet
      && normalizeSign(candidate.sign) === normalizeSign(sign),
    ).length;
  };

  const countA = conjunctionCount(planetA);
  const countB = conjunctionCount(planetB);
  if (countA !== countB) return countA > countB ? planetA : planetB;

  return planetA;
}

export function applyArudhaException(houseSign: number, padaSign: number) {
  const padaSignIndex = normalizeSign(padaSign);
  const houseSignIndex = normalizeSign(houseSign);
  const padaOffsetFromHouse = (padaSignIndex - houseSignIndex + 12) % 12;
  if (padaOffsetFromHouse === 0 || padaOffsetFromHouse === 6) {
    return normalizeSign(padaSignIndex + 9);
  }
  return padaSignIndex;
}

export function calculateArudhaPadas(chartData: ArudhaChartData): ArudhaPada[] {
  const lagnaSign = normalizeSign(chartData.lagnaSign);

  return Array.from({ length: 12 }, (_, houseIndex) => {
    const houseSign = normalizeSign(lagnaSign + houseIndex);
    const lords = SIGN_LORDS[houseSign];
    const signLord = lords.length === 1
      ? lords[0]
      : houseSign === 7
        ? getStrongerLord("Mars", "Ketu", chartData)
        : getStrongerLord("Saturn", "Rahu", chartData);
    const lordPlacement = chartData.planets.find((planet) => planet.name === signLord)?.sign;
    if (lordPlacement === undefined) {
      throw new Error(`Planet placement missing for Arudha lord ${signLord}.`);
    }
    const lordSign = normalizeSign(lordPlacement);
    const steps = (lordSign - houseSign + 12) % 12;
    const rawPadaSign = (lordSign + steps) % 12;
    const padaSign = applyArudhaException(houseSign, rawPadaSign);

    return {
      house: houseIndex + 1,
      label: ARUDHA_LABELS[houseIndex],
      signIndex: padaSign,
      signLord,
    };
  });
}

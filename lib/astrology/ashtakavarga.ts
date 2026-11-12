const CONTRIBUTOR_NAMES = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Ascendant"] as const;
const TARGET_NAMES = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as const;
type SignPosition = { name: string; sign: number };

const BINDU_HOUSES: Record<(typeof TARGET_NAMES)[number], number[][]> = {
  Sun: [
    [1, 2, 4, 7, 8, 9, 10, 11], [3, 6, 10, 11], [1, 2, 4, 7, 8, 9, 10, 11],
    [3, 5, 6, 9, 10, 11, 12], [5, 6, 9, 11], [6, 7, 12], [1, 2, 4, 7, 8, 10, 11], [3, 4, 6, 10, 11, 12],
  ],
  Moon: [
    [3, 6, 7, 8, 10, 11], [1, 3, 6, 7, 10, 11], [2, 3, 5, 6, 9, 10, 11],
    [1, 3, 4, 5, 7, 8, 10, 11], [1, 4, 7, 8, 10, 11, 12], [3, 4, 5, 7, 9, 10, 11],
    [3, 5, 6, 11], [3, 6, 10, 11],
  ],
  Mars: [
    [3, 5, 6, 10, 11], [3, 6, 11], [1, 2, 4, 7, 8, 10, 11],
    [3, 5, 6, 11], [6, 10, 11, 12], [6, 8, 11, 12], [1, 4, 7, 8, 9, 10, 11], [1, 3, 6, 10, 11],
  ],
  Mercury: [
    [5, 6, 9, 11, 12], [2, 4, 6, 8, 10, 11], [1, 2, 4, 7, 8, 9, 10, 11],
    [1, 3, 5, 6, 9, 10, 11, 12], [6, 8, 11, 12], [1, 2, 3, 4, 5, 8, 9, 11],
    [1, 2, 4, 7, 8, 9, 10, 11], [1, 2, 4, 6, 8, 10, 11],
  ],
  Jupiter: [
    [1, 2, 3, 4, 7, 8, 9, 10, 11], [2, 5, 7, 9, 11], [1, 2, 4, 7, 8, 10, 11],
    [1, 2, 4, 5, 6, 9, 10, 11], [1, 2, 3, 4, 7, 8, 10, 11], [2, 5, 6, 9, 10, 11],
    [3, 5, 6, 12], [1, 2, 4, 5, 6, 7, 9, 10, 11],
  ],
  Venus: [
    [8, 11, 12], [1, 2, 3, 4, 5, 8, 9, 11, 12], [3, 4, 6, 9, 11, 12],
    [3, 5, 6, 9, 11], [5, 8, 9, 10, 11], [1, 2, 3, 4, 5, 8, 9, 10, 11],
    [3, 4, 5, 8, 9, 10, 11], [1, 2, 3, 4, 5, 8, 9, 11],
  ],
  Saturn: [
    [1, 2, 4, 7, 8, 10, 11], [3, 6, 11], [3, 5, 6, 10, 11, 12],
    [6, 8, 9, 10, 11, 12], [5, 6, 11, 12], [6, 11, 12],
    [3, 5, 6, 11], [1, 3, 4, 6, 10, 11],
  ],
};

export function calculateAshtakavarga(planets: SignPosition[], ascendant: SignPosition) {
  const contributors = new Map<string, number>();
  for (const planet of planets) contributors.set(planet.name, planet.sign);
  contributors.set("Ascendant", ascendant.sign);

  const rows = TARGET_NAMES.map((planet) => {
    const rules = BINDU_HOUSES[planet];
    const bindus = Array.from({ length: 12 }, (_, sign) =>
      rules.reduce((sum, houses, contributorIndex) => {
        const contributorSign = contributors.get(CONTRIBUTOR_NAMES[contributorIndex]);
        if (contributorSign === undefined) return sum;
        const relativeHouse = ((sign - contributorSign + 12) % 12) + 1;
        return sum + Number(houses.includes(relativeHouse));
      }, 0),
    );
    return { planet, bindus, total: bindus.reduce((sum, value) => sum + value, 0) };
  });
  const sarvashtakavarga = Array.from({ length: 12 }, (_, sign) =>
    rows.reduce((sum, row) => sum + row.bindus[sign], 0),
  );
  return { rows, sarvashtakavarga };
}

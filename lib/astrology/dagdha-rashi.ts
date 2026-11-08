const DAGDHA_SIGNS_BY_TITHI = [
  [6, 9],
  [8, 11],
  [4, 9],
  [1, 10],
  [2, 5],
  [0, 4],
  [3, 8],
  [2, 5],
  [4, 7],
  [4, 7],
  [8, 11],
  [6, 9],
  [1, 4],
  [2, 5, 8, 11],
  [],
] as const;

export function dagdhaRashis(tithiNumber: number): readonly number[] {
  if (!Number.isInteger(tithiNumber) || tithiNumber < 1 || tithiNumber > 30) {
    throw new RangeError("Tithi number must be an integer from 1 to 30.");
  }
  return DAGDHA_SIGNS_BY_TITHI[(tithiNumber - 1) % 15];
}

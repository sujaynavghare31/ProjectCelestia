const DAY_MS = 86_400_000;

export function julianDayUtc(utc: Date): number {
  if (!Number.isFinite(utc.getTime())) throw new Error("A valid UTC date is required.");
  return utc.getTime() / DAY_MS + 2_440_587.5;
}

export function deltaTSeconds(year: number): number {
  const t = year - 2000;
  if (year < 1800) {
    const u = year - 1700;
    return 8.83 + 0.1603 * u - 0.0059285 * u ** 2 + 0.00013336 * u ** 3 - u ** 4 / 1_174_000;
  }
  if (year < 1860) {
    const u = year - 1800;
    return 13.72 - 0.332447 * u + 0.0068612 * u ** 2 + 0.0041116 * u ** 3
      - 0.00037436 * u ** 4 + 0.0000121272 * u ** 5 - 0.0000001699 * u ** 6
      + 0.000000000875 * u ** 7;
  }
  if (year < 1900) {
    const u = year - 1860;
    return 7.62 + 0.5737 * u - 0.251754 * u ** 2 + 0.01680668 * u ** 3
      - 0.0004473624 * u ** 4 + u ** 5 / 233174;
  }
  if (year < 1920) {
    const u = year - 1900;
    return -2.79 + 1.494119 * u - 0.0598939 * u ** 2 + 0.0061966 * u ** 3 - 0.000197 * u ** 4;
  }
  if (year < 1941) {
    const u = year - 1920;
    return 21.20 + 0.84493 * u - 0.076100 * u ** 2 + 0.0020936 * u ** 3;
  }
  if (year < 1961) {
    const u = year - 1950;
    return 29.07 + 0.407 * u - u ** 2 / 233 + u ** 3 / 2547;
  }
  if (year < 1986) {
    const u = year - 1975;
    return 45.45 + 1.067 * u - u ** 2 / 260 - u ** 3 / 718;
  }
  if (year < 2005) {
    const u = year - 2000;
    return 63.86 + 0.3345 * u - 0.060374 * u ** 2 + 0.0017275 * u ** 3
      + 0.000651814 * u ** 4 + 0.00002373599 * u ** 5;
  }
  if (year < 2050) return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
  if (year < 2150) return -20 + 32 * ((year - 1820) / 100) ** 2 - 0.5628 * (2150 - year);
  return -20 + 32 * ((year - 1820) / 100) ** 2;
}

export function julianDayTt(utc: Date): number {
  const startOfYear = Date.UTC(utc.getUTCFullYear(), 0, 1);
  const startOfNextYear = Date.UTC(utc.getUTCFullYear() + 1, 0, 1);
  const decimalYear = utc.getUTCFullYear() + (utc.getTime() - startOfYear) / (startOfNextYear - startOfYear);
  return julianDayUtc(utc) + deltaTSeconds(decimalYear) / 86_400;
}

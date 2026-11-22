export function bhavaOf(longitude: number, cusps: readonly number[]): number {
  if (!Number.isFinite(longitude)) throw new Error("Planet longitude must be finite.");
  if (cusps.length !== 12 || cusps.some((cusp) => !Number.isFinite(cusp))) {
    throw new Error("Exactly 12 finite house cusps are required.");
  }

  const normalize = (value: number) => ((value % 360) + 360) % 360;
  const position = normalize(longitude);

  for (let index = 0; index < cusps.length; index += 1) {
    const start = normalize(cusps[index]);
    const span = normalize(cusps[(index + 1) % cusps.length] - start);
    if (span === 0) throw new Error("House cusps cannot share the same longitude.");
    if (normalize(position - start) < span) return index + 1;
  }

  throw new Error("House cusps do not cover the planetary longitude.");
}

export interface ChartViewPosition {
  longitude: number;
  signIndex: number;
  wholeSignHouse: number;
  retrograde?: boolean;
}

export interface ChartViewBody<T extends ChartViewPosition> extends ChartViewPosition {
  source: T;
  house: number;
}

export interface ChartViewModel<T extends ChartViewPosition> {
  mode: "rasi" | "bhava";
  cusps: readonly number[];
  bodies: ChartViewBody<T>[];
}

export function buildChartViewModel<T extends ChartViewPosition>(
  positions: readonly T[],
  cusps: readonly number[],
  mode: ChartViewModel<T>["mode"],
): ChartViewModel<T> {
  if (mode === "bhava" && (cusps.length !== 12 || cusps.some((cusp) => !Number.isFinite(cusp)))) {
    throw new Error("Bhava chart placement requires 12 finite cusps in the same zodiac as the positions.");
  }

  return {
    mode,
    cusps: [...cusps],
    bodies: positions.map((position) => ({
      ...position,
      source: position,
      house: mode === "bhava" ? bhavaOf(position.longitude, cusps) : position.wholeSignHouse,
    })),
  };
}

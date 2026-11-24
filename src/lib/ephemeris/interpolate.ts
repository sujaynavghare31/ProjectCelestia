import type { BodySamples } from "./types";

export interface InterpolatedValue {
  value: number;
  speed: number;
}

function cubicLagrange(samples: readonly number[], x: number): InterpolatedValue {
  let value = 0;
  let derivative = 0;

  for (let j = 0; j < 4; j += 1) {
    let denominator = 1;
    for (let k = 0; k < 4; k += 1) {
      if (j !== k) denominator *= j - k;
    }

    let basis = 1;
    for (let k = 0; k < 4; k += 1) {
      if (j !== k) basis *= x - k;
    }
    value += samples[j] * basis / denominator;

    let basisDerivative = 0;
    for (let m = 0; m < 4; m += 1) {
      if (j === m) continue;
      let term = 1;
      for (let k = 0; k < 4; k += 1) {
        if (k !== j && k !== m) term *= x - k;
      }
      basisDerivative += term;
    }
    derivative += samples[j] * basisDerivative / denominator;
  }

  return { value, speed: derivative };
}

function unwrapLongitudes(values: readonly number[]): number[] {
  return values.reduce<number[]>((unwrapped, longitude) => {
    if (unwrapped.length === 0) return [longitude];
    let next = longitude;
    const previous = unwrapped[unwrapped.length - 1];
    while (next - previous > 180) next -= 360;
    while (next - previous < -180) next += 360;
    unwrapped.push(next);
    return unwrapped;
  }, []);
}

export function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

export function interpolateSamples(
  samples: BodySamples,
  t0: number,
  julianDayTt: number,
): { longitude: InterpolatedValue; latitude: InterpolatedValue } | null {
  if (!Number.isFinite(t0) || !Number.isFinite(julianDayTt) || !Number.isFinite(samples.step) || samples.step <= 0) {
    throw new Error("Ephemeris sample time and step must be finite, and the step must be positive.");
  }
  if (samples.lon.length !== samples.lat.length || samples.lon.length < 4) {
    throw new Error("Ephemeris body samples must contain matching longitude and latitude arrays with at least four values.");
  }

  const samplePosition = (julianDayTt - t0) / samples.step;
  const lowerIndex = Math.floor(samplePosition);
  const firstIndex = lowerIndex - 1;
  if (firstIndex < 0 || firstIndex + 3 >= samples.lon.length) return null;

  const x = samplePosition - firstIndex;
  const longitudes = unwrapLongitudes(samples.lon.slice(firstIndex, firstIndex + 4));
  const longitude = cubicLagrange(longitudes, x);
  const latitude = cubicLagrange(samples.lat.slice(firstIndex, firstIndex + 4), x);
  return {
    longitude: { value: normalizeLongitude(longitude.value), speed: longitude.speed / samples.step },
    latitude: { value: latitude.value, speed: latitude.speed / samples.step },
  };
}

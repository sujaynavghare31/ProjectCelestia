import { KALA, LORD1, mod, sign } from "./constants";

export interface SpecialLagnaInputs {
  lagnaLongitude: number;
  moonLongitude: number;
  sunLongitude: number;
  sunriseSunLongitude: number;
  rahuLongitude: number;
  birthMinutes: number;
  sunriseMinutes: number;
}

export interface SpecialLagnas {
  bl: number;
  hl: number;
  gl: number;
  vgL: number;
  sl: number;
  pp: number;
  vl: number;
  il: number;
  bb: number;
}

export function moduloLongitude(longitude: number): number {
  return mod(longitude, 360);
}

export function timeMinutes(value: string | number): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Time must be finite.");
    return value;
  }
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) throw new Error("Time must use HH:MM[:SS].");
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);
  if (hours > 23 || minutes > 59 || seconds > 59) throw new Error("Time is outside the valid 24-hour range.");
  return hours * 60 + minutes + seconds / 60;
}

export function specialLagnas(input: SpecialLagnaInputs): SpecialLagnas {
  const {
    lagnaLongitude,
    moonLongitude,
    sunLongitude,
    sunriseSunLongitude,
    rahuLongitude,
    birthMinutes,
    sunriseMinutes,
  } = input;
  if (![lagnaLongitude, moonLongitude, sunLongitude, sunriseSunLongitude, rahuLongitude, birthMinutes, sunriseMinutes]
    .every(Number.isFinite)) {
    throw new Error("Special-lagna inputs must be finite.");
  }

  const elapsedMinutes = mod(birthMinutes - sunriseMinutes, 1440);
  const lagna = moduloLongitude(lagnaLongitude);
  const moon = moduloLongitude(moonLongitude);
  const sunAtBirth = moduloLongitude(sunLongitude);
  const sunAtSunrise = moduloLongitude(sunriseSunLongitude);

  const bl = moduloLongitude(sunAtSunrise + elapsedMinutes * 0.25);
  const hl = moduloLongitude(sunAtSunrise + elapsedMinutes * 0.5);
  const gl = moduloLongitude(sunAtSunrise + elapsedMinutes * 1.25);
  const vgL = moduloLongitude(sunAtSunrise + elapsedMinutes * 75);

  const nakshatraArc = 13 + 20 / 60;
  const sl = moduloLongitude(lagna + 360 * mod(moon, nakshatraArc) / nakshatraArc);
  const sunSign = sign(sunAtBirth);
  const ppOffset = [0, 240, 120][sunSign % 3];
  const pp = moduloLongitude(sunAtBirth + ppOffset + elapsedMinutes * 5);

  const lagnaIsOdd = (sign(lagna) + 1) % 2 === 1;
  const horaIsOdd = (sign(hl) + 1) % 2 === 1;
  const adjustedLagna = lagnaIsOdd ? lagna : 360 - lagna;
  const adjustedHora = horaIsOdd ? hl : 360 - hl;
  const varnadaIntermediate = mod(
    lagnaIsOdd === horaIsOdd
      ? adjustedLagna + adjustedHora
      : Math.abs(adjustedLagna - adjustedHora),
    360,
  );
  const vl = moduloLongitude(lagnaIsOdd ? varnadaIntermediate : 360 - varnadaIntermediate);

  const lagnaNinthLord = LORD1[mod(sign(lagna) + 8, 12)];
  const moonNinthLord = LORD1[mod(sign(moon) + 8, 12)];
  let count = mod(KALA[lagnaNinthLord] + KALA[moonNinthLord], 12);
  if (count === 0) count = 12;
  const il = moduloLongitude(moon + (count - 1) * 30);
  const bb = moduloLongitude(rahuLongitude + mod(moon - moduloLongitude(rahuLongitude), 360) / 2);

  return { bl, hl, gl, vgL, sl, pp, vl, il, bb };
}

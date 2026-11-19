import { mod, sign, deg, navamsa } from "./constants";
import { KALA, LORD1 } from "./constants";

export interface SpecialLagnaInputs {
  lagnaLongitude: number;
  moonLongitude: number;
  sunLongitude: number;
  birthMinutes: number;
  sunriseMinutes: number;
  planets?: readonly number[];
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
}

export function moduloLongitude(v: number): number {
  return mod(v, 360);
}

export function timeMinutes(hhmm: string | number): number {
  if (typeof hhmm === "number") return hhmm;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(hhmm);
  if (!match) throw new Error("Time must use HH:MM[:SS].");
  return Number(match[1]) * 60 + Number(match[2]) + Number(match[3] ?? 0) / 60;
}

export function specialLagnas(input: SpecialLagnaInputs): SpecialLagnas {
  const { lagnaLongitude, moonLongitude, sunLongitude } = input;
  const t = mod(input.birthMinutes - input.sunriseMinutes, 1440);
  const lagna = mod(lagnaLongitude, 360);
  const sun = mod(sunLongitude, 360);
  const bl = moduloLongitude(sun + t * 0.25);
  const hl = moduloLongitude(sun + t * 0.5);
  const gl = moduloLongitude(sun + t * 1.25);
  const vgL = moduloLongitude(sun + t * 75);
  const sl = moduloLongitude(lagna + mod(moonLongitude, 13.333333333333334) / 13.333333333333334 * 360);
  const sunSign = sign(sun);
  const ppOffset = [0, 240, 120][mod(sunSign, 3)];
  const pp = moduloLongitude(sun + ppOffset + t * 5);

  const L = sign(lagna);
  const H = sign(hl);
  const n1 = mod(L, 2) === 0 ? L + 1 : 12 - L;
  const n2 = mod(H, 2) === 0 ? H + 1 : 12 - H;
  let r = mod(L, 2) === mod(H, 2) ? n1 + n2 : Math.abs(n1 - n2);
  r = mod(r, 12);
  const vlSign = mod(L, 2) === 0 ? mod(r - 1, 12) : mod(12 - r, 12);
  const vl = moduloLongitude(vlSign * 30 + deg(lagna));

  const moonSign = sign(moonLongitude);
  const k = KALA[LORD1[mod(L + 8, 12)]] + KALA[LORD1[mod(moonSign + 8, 12)]];
  let count = mod(k, 12);
  if (count === 0) count = 12;
  const il = mod(moonSign + count - 1, 12);
  return { bl, hl, gl, vgL, sl, pp, vl, il };
}

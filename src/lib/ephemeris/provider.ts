import type { AyanamsaKind, BodyKey, Position, PositionFallbacks } from "./types";
import { ayanamsa } from "./ayanamsa";
import { eclipticToEquatorial } from "./coords";
import { interpolateSamples, normalizeLongitude } from "./interpolate";
import { loadEphemerisYear } from "./loader";
import { julianDayTt } from "./time";

const FIRST_LOCAL_YEAR = 1800;
const LAST_LOCAL_YEAR = 2100;
const PLANET_NAMES = new Set<BodyKey>([
  "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
]);

export class NotAvailable extends Error {
  constructor(body: BodyKey, utc: Date, options?: ErrorOptions) {
    super(`No ephemeris is available for ${body} at ${utc.toISOString()}.`, options);
    this.name = "NotAvailable";
  }
}

function groupFor(body: BodyKey): "planets" | "asteroids" {
  return PLANET_NAMES.has(body) || body === "MeanNode" || body === "TrueNode" ? "planets" : "asteroids";
}

function withSidereal(position: Position, kind: AyanamsaKind | undefined, utc: Date): Position {
  if (!kind) return position;
  return { ...position, sidereal: normalizeLongitude(position.longitude - ayanamsa(kind, utc)) };
}

async function fromLocal(body: BodyKey, utc: Date, kind?: AyanamsaKind): Promise<Position | null> {
  const year = utc.getUTCFullYear();
  if (year < FIRST_LOCAL_YEAR || year > LAST_LOCAL_YEAR) return null;

  const group = groupFor(body);
  const yearData = await loadEphemerisYear(year, group);
  const samples = yearData?.bodies[body];
  if (!yearData || !samples) return null;

  const interpolated = interpolateSamples(samples, yearData.t0, julianDayTt(utc));
  if (!interpolated) return null;

  const equatorial = eclipticToEquatorial(interpolated.longitude.value, interpolated.latitude.value, julianDayTt(utc));
  const position: Position = {
    body,
    longitude: interpolated.longitude.value,
    latitude: interpolated.latitude.value,
    speed: interpolated.longitude.speed,
    latSpeed: interpolated.latitude.speed,
    retrograde: body === "MeanNode" || interpolated.longitude.speed < 0,
    declination: equatorial.declination,
    rightAscension: equatorial.rightAscension,
    outOfBounds: equatorial.outOfBounds,
    source: "local",
  };
  return withSidereal(position, kind, utc);
}

export async function resolvePosition(
  body: BodyKey,
  utc: Date,
  fallbacks: PositionFallbacks,
  options?: { ayanamsa?: AyanamsaKind },
): Promise<Position> {
  if (!Number.isFinite(utc.getTime())) throw new Error("A valid UTC date is required.");
  try {
    const localPosition = await fromLocal(body, utc, options?.ayanamsa);
    if (localPosition) return localPosition;
  } catch {
    // A missing or unreadable local asset must not prevent the established API fallback.
  }

  try {
    const position = await fallbacks.api(body, utc);
    return withSidereal({ ...position, body, source: "api" }, options?.ayanamsa, utc);
  } catch (apiError) {
    if (!PLANET_NAMES.has(body)) throw new NotAvailable(body, utc, { cause: apiError });
    if (!fallbacks.astronomyEngine) {
      throw new Error(`The API failed for ${body}, and no astronomy-engine fallback is configured.`, { cause: apiError });
    }
    try {
      const position = await fallbacks.astronomyEngine(body, utc);
      return withSidereal({ ...position, body, source: "fallback" }, options?.ayanamsa, utc);
    } catch (fallbackError) {
      throw new AggregateError([apiError, fallbackError], `Could not resolve ${body} from local data, API, or astronomy fallback.`);
    }
  }

}

export function positionAt(
  body: BodyKey,
  utc: Date,
  fallbacks: PositionFallbacks,
  options?: { ayanamsa?: AyanamsaKind },
): Promise<Position> {
  return resolvePosition(body, utc, fallbacks, options);
}

export async function positionsAt(
  bodies: BodyKey[],
  utc: Date,
  fallbacks: PositionFallbacks,
  options?: { ayanamsa?: AyanamsaKind },
): Promise<Record<BodyKey, Position>> {
  const positions = await Promise.all(
    bodies.map((body) => resolvePosition(body, utc, fallbacks, options)),
  );
  return Object.fromEntries(bodies.map((body, index) => [body, positions[index]])) as Record<BodyKey, Position>;
}

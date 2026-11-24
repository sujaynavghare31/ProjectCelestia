import type { EphemerisRequest, EphemerisResponse } from "@/lib/kundali-types";

type PublicEphemerisRequest = Omit<EphemerisRequest, "nameFirstLetter" | "gender">;

const RESPONSE_CACHE_TTL_MS = 5_000;
const RESPONSE_CACHE_LIMIT = 32;
const inFlightRequests = new Map<string, Promise<EphemerisResponse>>();
const responseCache = new Map<string, { expiresAt: number; value: EphemerisResponse }>();

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function normalizeTime(time: string) {
  return /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
}

export function createEphemerisUrl(input: PublicEphemerisRequest) {
  const params: Record<string, string> = {
    date: input.date,
    time: normalizeTime(input.time),
    lat: String(Object.is(input.lat, -0) ? 0 : input.lat),
    lon: String(Object.is(input.lng, -0) ? 0 : input.lng),
    tz: input.timezone.trim(),
    ayanamsa: input.ayanamsa.toLowerCase(),
    nodeType: input.nodeType,
    zodiacMode: input.zodiacMode ?? "sidereal",
    houseSystem: input.houseSystem ?? "placidus",
  };
  if (input.calculationMode) params.calculationMode = input.calculationMode;
  if (input.kp !== undefined) params.kp = String(input.kp);
  if (input.customAyanamsaDegrees !== undefined) params.customAyanamsaDegrees = String(input.customAyanamsaDegrees);
  if (input.targetAge !== undefined) params.targetAge = String(input.targetAge);
  if (input.ageMode) params.ageMode = input.ageMode;
  if (input.dashaSeed) params.dashaSeed = input.dashaSeed;
  if (input.avasthaConfig) params.avasthaConfig = canonicalJson(input.avasthaConfig);

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)) {
    query.set(key, value);
  }
  return `/api/ephemeris?${query.toString()}`;
}

export function fetchEphemeris(input: PublicEphemerisRequest): Promise<EphemerisResponse> {
  const url = createEphemerisUrl(input);
  const cached = responseCache.get(url);
  if (cached) {
    if (cached.expiresAt > Date.now()) {
      responseCache.delete(url);
      responseCache.set(url, cached);
      return Promise.resolve(cached.value);
    }
    responseCache.delete(url);
  }

  const existing = inFlightRequests.get(url);
  if (existing) return existing;

  const request = fetch(url)
    .then(async (response) => {
      const payload: unknown = await response.json();
      if (!response.ok || typeof payload !== "object" || payload === null || !("ascendant" in payload)) {
        const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : `Ephemeris request failed (${response.status}).`;
        throw new Error(message);
      }
      const ephemeris = payload as EphemerisResponse;
      responseCache.set(url, { expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS, value: ephemeris });
      if (responseCache.size > RESPONSE_CACHE_LIMIT) {
        const oldestUrl = responseCache.keys().next().value;
        if (oldestUrl !== undefined) responseCache.delete(oldestUrl);
      }
      return ephemeris;
    })
    .finally(() => {
      inFlightRequests.delete(url);
    });

  inFlightRequests.set(url, request);
  return request;
}

import type { EphemerisRequest, EphemerisResponse, PlanetPosition } from "@/lib/kundali-types";
import { fetchEphemeris } from "@/lib/astrology/ephemeris-client";

export const CALENDAR_BODIES = [
  "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu", "Uranus", "Neptune", "Pluto",
] as const;

export type CalendarBody = typeof CALENDAR_BODIES[number];
export type TransitEventType = "ingress" | "retrograde";

export interface TransitSample {
  date: string;
  planets: PlanetPosition[];
}

export interface TransitEvent {
  date: string;
  planet: CalendarBody;
  type: TransitEventType;
  signName: string;
  retrograde: boolean;
  combust: boolean;
  personalHit: boolean;
}

export interface TransitCalendarSettings {
  ayanamsa: string;
  zodiacMode: EphemerisRequest["zodiacMode"];
  customAyanamsaDegrees: number;
  nodeType: EphemerisRequest["nodeType"];
}

const CACHE_VERSION = 1;
const CACHE_STORAGE_KEY = "celestia:transit-calendar:v1";
const memoryCache = new Map<string, TransitSample[]>();
const inFlightRequests = new Map<string, Promise<TransitSample[]>>();

function getCacheKey(
  year: number,
  profile: Pick<EphemerisRequest, "lat" | "lng" | "timezone">,
  settings: TransitCalendarSettings,
) {
  return JSON.stringify({
    version: CACHE_VERSION,
    year,
    lat: profile.lat,
    lng: profile.lng,
    timezone: profile.timezone,
    ...settings,
  });
}

function readStoredCache(key: string) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(`${CACHE_STORAGE_KEY}:${key}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { samples?: TransitSample[] };
    return Array.isArray(parsed.samples) ? parsed.samples : null;
  } catch {
    window.localStorage.removeItem(`${CACHE_STORAGE_KEY}:${key}`);
    return null;
  }
}

export function getCachedTransitSamples(
  year: number,
  profile: Pick<EphemerisRequest, "lat" | "lng" | "timezone">,
  settings: TransitCalendarSettings,
) {
  const key = getCacheKey(year, profile, settings);
  const cached = memoryCache.get(key) ?? readStoredCache(key);
  if (cached) memoryCache.set(key, cached);
  return cached ?? null;
}

function writeStoredCache(key: string, samples: TransitSample[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${CACHE_STORAGE_KEY}:${key}`, JSON.stringify({ samples }));
  } catch {
    // The in-memory cache still protects the current session when storage is unavailable.
  }
}

export function getCalendarSampleDates(year: number) {
  return Array.from({ length: 12 }, (_, month) => [1, 10, 20].map((day) => (
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  ))).flat();
}

export async function fetchTransitSamples(
  year: number,
  profile: Pick<EphemerisRequest, "lat" | "lng" | "timezone">,
  settings: TransitCalendarSettings,
) {
  const key = getCacheKey(year, profile, settings);
  const cached = memoryCache.get(key) ?? readStoredCache(key);
  if (cached) {
    memoryCache.set(key, cached);
    return cached;
  }

  const existingRequest = inFlightRequests.get(key);
  if (existingRequest) return existingRequest;

  const request = Promise.all(getCalendarSampleDates(year).map(async (date): Promise<TransitSample> => {
    const result = await fetchEphemeris({
      date,
      time: "12:00:00",
      lat: profile.lat,
      lng: profile.lng,
      timezone: profile.timezone,
      ayanamsa: settings.ayanamsa,
      zodiacMode: settings.zodiacMode,
      customAyanamsaDegrees: settings.customAyanamsaDegrees,
      nodeType: settings.nodeType,
      dashaSeed: "moon",
    });
    return { date, planets: result.planets };
  })).then((samples) => {
    memoryCache.set(key, samples);
    writeStoredCache(key, samples);
    return samples;
  }).finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, request);
  return request;
}

function isCalendarBody(name: string): name is CalendarBody {
  return (CALENDAR_BODIES as readonly string[]).includes(name);
}

function isCombust(planet: PlanetPosition, sun: PlanetPosition | undefined) {
  if (!sun || planet.name === "Sun") return false;
  const distance = Math.abs(planet.longitude - sun.longitude);
  const separation = Math.min(distance, 360 - distance);
  return separation <= 8;
}

export function deriveTransitEvents(samples: TransitSample[], natalPlanets: PlanetPosition[]): TransitEvent[] {
  const natalSigns = new Set(natalPlanets.map((planet) => planet.sign));
  const sortedSamples = [...samples].sort((a, b) => a.date.localeCompare(b.date));
  const events: TransitEvent[] = [];

  sortedSamples.forEach((sample, index) => {
    const previous = sortedSamples[index - 1];
    const sun = sample.planets.find((planet) => planet.name === "Sun");
    sample.planets.forEach((planet) => {
      if (!isCalendarBody(planet.name)) return;
      const body = planet.name;
      const oldPlanet = previous?.planets.find((candidate) => candidate.name === body);
      const combust = isCombust(planet, sun);
      const personalHit = natalSigns.has(planet.sign);
      if (oldPlanet && oldPlanet.sign !== planet.sign) {
        events.push({ date: sample.date, planet: body, type: "ingress", signName: planet.signName, retrograde: planet.motion === "R", combust, personalHit });
      }
      if (oldPlanet && oldPlanet.motion !== planet.motion) {
        events.push({ date: sample.date, planet: body, type: "retrograde", signName: planet.signName, retrograde: planet.motion === "R", combust, personalHit });
      }
    });
  });

  return events;
}

import { NextResponse } from "next/server";
import tzLookup from "tz-lookup";
import { findStaticCities } from "@/lib/geocode/city-index";
import { consumeRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = ["bom1"];

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

type GeocodeResult = {
  label: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

const CACHE_LIMIT = 500;
const CACHE_TTL_MS = 24 * 60 * 60_000;
const RESPONSE_CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const queryCache = new Map<string, { expiresAt: number; results: GeocodeResult[] }>();
let nominatimQueue = Promise.resolve();
let lastNominatimRequestAt = 0;

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  if (status < 400) responseHeaders.set("Cache-Control", RESPONSE_CACHE_CONTROL);
  return NextResponse.json(body, { status, headers: responseHeaders });
}

function normalizeQuery(query: string) {
  return query.toLowerCase().replace(/\s+/g, " ").trim();
}

function getCachedResults(key: string) {
  const cached = queryCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    queryCache.delete(key);
    return null;
  }
  queryCache.delete(key);
  queryCache.set(key, cached);
  return cached.results;
}

function cacheResults(key: string, results: GeocodeResult[]) {
  queryCache.delete(key);
  queryCache.set(key, { results, expiresAt: Date.now() + CACHE_TTL_MS });
  if (queryCache.size > CACHE_LIMIT) {
    const oldestKey = queryCache.keys().next().value;
    if (oldestKey !== undefined) queryCache.delete(oldestKey);
  }
}

function fetchNominatim(url: URL) {
  const result = nominatimQueue.then(async () => {
    const waitMs = Math.max(0, lastNominatimRequestAt + 1_000 - Date.now());
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastNominatimRequestAt = Date.now();
    return fetch(url, {
      headers: {
        "User-Agent": "ProjectCelestia/1.0 (https://jyotishi.tech)",
        "Accept-Language": "en",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
  });
  nominatimQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function GET(request: Request) {
  const limit = consumeRateLimit(request, "geocode");
  if (!limit.allowed) {
    return jsonResponse(
      { error: "Too many location requests. Please try again shortly." },
      429,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const latitudeText = searchParams.get("lat");
  const longitudeText = searchParams.get("lng");
  if (latitudeText !== null || longitudeText !== null) {
    const latitude = Number(latitudeText);
    const longitude = Number(longitudeText);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return jsonResponse({ error: "Coordinates must be valid latitude and longitude values." }, 400);
    }

    let timezone: string;
    try {
      timezone = tzLookup(latitude, longitude);
    } catch (error) {
      console.error("[geocode] Coordinate timezone lookup failed", error);
      return jsonResponse({ error: "Could not determine a time zone for these coordinates." }, 400);
    }
    if (searchParams.get("reverse") !== "true") return jsonResponse({ timezone });

    try {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.search = new URLSearchParams({
        lat: String(latitude),
        lon: String(longitude),
        format: "jsonv2",
        addressdetails: "1",
      }).toString();
      const upstream = await fetchNominatim(url);
      if (!upstream.ok) {
        console.error("[geocode] Reverse place lookup returned an error", upstream.status);
        return jsonResponse({ error: "Could not identify a city for these coordinates." }, 502);
      }

      const place = await upstream.json() as NominatimResult;
      const address = place.address ?? {};
      const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county ?? address.state;
      if (!city) return jsonResponse({ error: "Could not identify a city for these coordinates." }, 404);
      return jsonResponse({ timezone, city });
    } catch (error) {
      console.error("[geocode] Reverse place lookup failed", error);
      return jsonResponse({ error: "Could not identify a city for these coordinates." }, 502);
    }
  }

  const query = searchParams.get("q")?.trim();
  if (!query || query.length < 2 || query.length > 100) {
    return jsonResponse({ error: "Search for a place using 2 to 100 characters." }, 400);
  }

  const cacheKey = normalizeQuery(query);
  const cachedResults = getCachedResults(cacheKey);
  if (cachedResults) return jsonResponse({ results: cachedResults });

  const localResults = findStaticCities(query);
  if (localResults.length > 0) {
    cacheResults(cacheKey, localResults);
    return jsonResponse({ results: localResults });
  }

  let upstream: Response;
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.search = new URLSearchParams({
      q: query,
      format: "jsonv2",
      addressdetails: "1",
      limit: "6",
    }).toString();
    upstream = await fetchNominatim(url);
  } catch (error) {
    console.error("[geocode] Place search request failed", error);
    return jsonResponse({ error: "The place search service is temporarily unavailable." }, 502);
  }

  if (!upstream.ok) {
    console.error("[geocode] Place search returned an error", upstream.status);
    return jsonResponse({ error: "The place search service returned an error." }, 502);
  }

  let places: NominatimResult[];
  try {
    places = await upstream.json() as NominatimResult[];
  } catch (error) {
    console.error("[geocode] Place search returned invalid JSON", error);
    return jsonResponse({ error: "The place search service returned invalid data." }, 502);
  }

  const results = places.flatMap((place) => {
    const latitude = Number(place.lat);
    const longitude = Number(place.lon);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return [];
    }

    const address = place.address ?? {};
    const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county ?? address.state ?? place.display_name;
    let timezone: string;
    try {
      timezone = tzLookup(latitude, longitude);
    } catch (error) {
      console.error("[geocode] Timezone lookup failed for a valid place", error);
      return [];
    }

    return [{
      label: place.display_name,
      city: address.country ? `${city}, ${address.country}` : city,
      latitude,
      longitude,
      timezone,
    }];
  });

  cacheResults(cacheKey, results);
  return jsonResponse({ results });
}

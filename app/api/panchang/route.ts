import tzLookup from "tz-lookup";
import { calculatePanchang } from "@/lib/astrology/panchang/PanchangEngine";
import type { PanchangDay } from "@/lib/astrology/panchang/PanchangEngine";

export const runtime = "nodejs";

const CACHE_LIMIT = 128;
const CACHE_TTL_MS = 7 * 24 * 60 * 60_000;
const RESPONSE_CACHE_CONTROL = "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";
const panchangCache = new Map<string, { expiresAt: number; value: PanchangDay }>();

function getCachedPanchang(key: string) {
  const cached = panchangCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    panchangCache.delete(key);
    return null;
  }
  panchangCache.delete(key);
  panchangCache.set(key, cached);
  return cached.value;
}

function cachePanchang(key: string, value: PanchangDay) {
  panchangCache.delete(key);
  panchangCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  if (panchangCache.size > CACHE_LIMIT) {
    const oldestKey = panchangCache.keys().next().value;
    if (oldestKey) panchangCache.delete(oldestKey);
  }
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const date = searchParams.get("date");
  const latitudeText = searchParams.get("lat");
  const longitudeText = searchParams.get("lng");
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || latitudeText === null || longitudeText === null ||
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return Response.json(
      { error: "Provide a valid date, latitude, and longitude." },
      { status: 400 },
    );
  }

  let timezone: string;
  try {
    timezone = tzLookup(latitude, longitude);
  } catch (error) {
    console.error("[panchang] Could not resolve the location time zone", error);
    return Response.json(
      { error: "Could not determine a time zone for these coordinates." },
      { status: 400 },
    );
  }

  try {
    const cacheKey = `${date}:${latitude.toFixed(6)}:${longitude.toFixed(6)}:${timezone}`;
    const cached = getCachedPanchang(cacheKey);
    const result = cached ?? calculatePanchang({ date, latitude, longitude, timezone });
    if (!cached) cachePanchang(cacheKey, result);
    return Response.json(result, { headers: { "Cache-Control": RESPONSE_CACHE_CONTROL } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Swiss Ephemeris error.";
    console.error("[panchang] Daily calculation failed", error);
    return Response.json(
      { error: `Panchang calculation failed: ${message}` },
      { status: 422 },
    );
  }
}

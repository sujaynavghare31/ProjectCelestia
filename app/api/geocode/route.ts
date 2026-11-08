import { NextResponse } from "next/server";
import tzLookup from "tz-lookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const latitudeText = searchParams.get("lat");
  const longitudeText = searchParams.get("lng");
  if (latitudeText !== null || longitudeText !== null) {
    const latitude = Number(latitudeText);
    const longitude = Number(longitudeText);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Coordinates must be valid latitude and longitude values." }, { status: 400 });
    }
    try {
      return NextResponse.json({ timezone: tzLookup(latitude, longitude) });
    } catch (error) {
      console.error("[geocode] Coordinate timezone lookup failed", error);
      return NextResponse.json({ error: "Could not determine a time zone for these coordinates." }, { status: 400 });
    }
  }

  const query = searchParams.get("q")?.trim();
  if (!query || query.length < 2 || query.length > 100) {
    return NextResponse.json({ error: "Search for a place using 2 to 100 characters." }, { status: 400 });
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
    upstream = await fetch(url, {
      headers: {
        "User-Agent": "ProjectCelestia/1.0 (global city and timezone lookup)",
        "Accept-Language": "en",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
  } catch (error) {
    console.error("[geocode] Place search request failed", error);
    return NextResponse.json({ error: "The place search service is temporarily unavailable." }, { status: 502 });
  }

  if (!upstream.ok) {
    console.error("[geocode] Place search returned an error", upstream.status);
    return NextResponse.json({ error: "The place search service returned an error." }, { status: 502 });
  }

  let places: NominatimResult[];
  try {
    places = await upstream.json() as NominatimResult[];
  } catch (error) {
    console.error("[geocode] Place search returned invalid JSON", error);
    return NextResponse.json({ error: "The place search service returned invalid data." }, { status: 502 });
  }

  const results = places.flatMap((place) => {
    const latitude = Number(place.lat);
    const longitude = Number(place.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
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

  return NextResponse.json({ results });
}

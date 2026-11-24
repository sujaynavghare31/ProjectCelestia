import { existsSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import swe from "swisseph";
import { z } from "zod";
import { POINT_CATALOG } from "@/src/lib/points/catalog";
import { consumeRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

const requestSchema = z.object({
  birthUtc: z.string().datetime(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  keys: z.array(z.string()).min(1).max(30),
  zodiac: z.enum(["tropical", "sidereal"]).default("sidereal"),
  ayanamsaMode: z.string().optional(),
  houseSystem: z.string().optional(),
});

const ayanamsas: Record<string, number> = {
  lahiri: swe.SE_SIDM_LAHIRI,
  kp_new: swe.SE_SIDM_KRISHNAMURTI,
  raman: swe.SE_SIDM_RAMAN,
};

const cache = new Map<string, { expiresAt: number; body: unknown }>();
const normalize = (value: number) => ((value % 360) + 360) % 360;
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];

function houseFor(longitude: number, cusps: number[] | undefined) {
  if (!cusps?.length) return 1;
  const normalized = normalize(longitude);
  for (let house = 0; house < 12; house += 1) {
    const start = normalize(cusps[house]);
    const end = normalize(cusps[(house + 1) % 12]);
    const span = normalize(end - start);
    if (normalize(normalized - start) < span) return house + 1;
  }
  return 12;
}

export async function POST(request: Request) {
  if (!consumeRateLimit(request, "points")) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid points request.", issues: parsed.error.issues }, { status: 400 });
  }
  const { birthUtc, lat, lon, keys, zodiac, ayanamsaMode = "lahiri", houseSystem = zodiac === "tropical" ? "P" : "P" } = parsed.data;
  const cacheKey = JSON.stringify([birthUtc, lat, lon, [...keys].sort(), zodiac, ayanamsaMode, houseSystem]);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.body, { headers: { "X-Celestia-Cache": "HIT" } });
  }

  const date = new Date(birthUtc);
  const jd = swe.swe_julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600, swe.SE_GREG_CAL);
  swe.swe_set_ephe_path(join(process.cwd(), "ephe"));
  if (zodiac === "sidereal") swe.swe_set_sid_mode(ayanamsas[ayanamsaMode] ?? swe.SE_SIDM_LAHIRI, 0, 0);
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED | (zodiac === "sidereal" ? swe.SEFLG_SIDEREAL : 0);
  const houses = swe.swe_houses_ex(jd, zodiac === "sidereal" ? swe.SEFLG_SIDEREAL : 0, lat, lon, houseSystem as "P") as unknown as {
    cusps?: number[];
    ascendant: number;
    mc: number;
    ascmc?: number[];
  };
  const ascmc = houses.ascmc ?? [];
  const sun = swe.swe_calc_ut(jd, swe.SE_SUN, flags) as { longitude: number; longitudeSpeed: number; error?: string };
  const moon = swe.swe_calc_ut(jd, swe.SE_MOON, flags) as { longitude: number; longitudeSpeed: number; error?: string };
  type PointResponse = {
    key: string;
    longitude?: number;
    latitude?: number;
    speed?: number;
    retrograde?: boolean;
    distance?: number;
    sign?: string;
    degreeText?: string;
    house?: number;
    nakshatra?: string;
    pada?: number;
    error?: string;
  };
  const points: PointResponse[] = [];
  for (const key of keys) {
    const def = POINT_CATALOG.find((item) => item.key === key);
    if (!def) {
      points.push({ key, error: "unsupported point" });
      continue;
    }

    let longitude: number | undefined;
    let speed = 0;
    let latitude = 0;
    let distance = 0;
    if (def.calc === "fortuna") {
      const sunHouse = houseFor(normalize(sun.longitude), houses.cusps);
      const dayChart = sunHouse >= 7 && sunHouse <= 12;
      longitude = normalize(dayChart
        ? houses.ascendant + moon.longitude - sun.longitude
        : houses.ascendant + sun.longitude - moon.longitude);
    } else if (def.calc === "vertex") {
      longitude = normalize(ascmc[3] ?? houses.ascendant);
    } else if (def.calc === "eastpoint") {
      longitude = normalize(ascmc[4] ?? houses.ascendant);
    } else if (def.calc === "priapus") {
      const lilith = swe.swe_calc_ut(jd, swe.SE_MEAN_APOG, flags) as { longitude: number; longitudeSpeed: number; error?: string };
      longitude = normalize(lilith.longitude + 180);
      speed = -(lilith.longitudeSpeed ?? 0);
    } else {
      if (def.file) {
        const fileExists = existsSync(join(process.cwd(), "ephe", def.file));
        if (!fileExists) {
          points.push({ key, error: "data file not installed" });
          continue;
        }
      }
      const code = def.ipl ?? (def.astNumber !== undefined ? (swe as unknown as { SE_AST_OFFSET: number }).SE_AST_OFFSET + def.astNumber : undefined);
      if (code === undefined) {
        points.push({ key, error: "unsupported point" });
        continue;
      }
      const result = swe.swe_calc_ut(jd, code, flags) as { longitude: number; latitude: number; distance: number; longitudeSpeed: number; error?: string };
      if (result.error || !Number.isFinite(result.longitude)) {
        if (Number.isFinite(date.getUTCFullYear()) && (date.getUTCFullYear() < 650 || date.getUTCFullYear() > 4650)) {
          points.push({ key, error: "outside ephemeris range" });
        } else {
          points.push({ key, error: result.error || "ephemeris unavailable" });
        }
        continue;
      }
      longitude = normalize(result.longitude);
      latitude = result.latitude ?? 0;
      distance = result.distance ?? 0;
      speed = result.longitudeSpeed ?? 0;
    }

    const normalized = normalize(longitude ?? 0);
    const signIndex = Math.floor(normalized / 30);
    const nakIndex = Math.floor(normalized / (360 / 27));
    points.push({
      key,
      longitude: normalized,
      latitude,
      speed,
      retrograde: speed < 0,
      distance,
      sign: SIGNS[signIndex],
      degreeText: `${Math.floor(normalized % 30)}° ${Math.floor(((normalized % 30) % 1) * 60)}′`,
      house: houseFor(normalized, houses.cusps),
      nakshatra: zodiac === "sidereal" ? NAKSHATRAS[nakIndex] : undefined,
      pada: zodiac === "sidereal" ? Math.floor(((normalized % (360 / 27)) / (360 / 27)) * 4) + 1 : undefined,
    });
  }

  const body = {
    points,
    positions: points,
    ephemerisVersion: "Swiss Ephemeris",
    flags,
  };
  cache.set(cacheKey, { expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, body });
  return NextResponse.json(body);
}

import { NextResponse } from "next/server";
import swe from "swisseph";
import { localDateTimeToUtc, shiftLocalDate } from "@/lib/astrology/timezone";
import { consumeRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

type HousesResult = { ascendant: number; error?: string };
type RiseResult = { transitTime: number; error?: string };

function julianDay(date: Date) {
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  return swe.swe_julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), hour, swe.SE_GREG_CAL);
}

function utcFromTransit(jd: number) {
  const parts = swe.swe_revjul(jd, swe.SE_GREG_CAL) as { year: number; month: number; day: number; hour: number };
  const hour = parts.hour;
  const h = Math.floor(hour);
  const m = Math.floor((hour - h) * 60);
  const s = Math.round((((hour - h) * 60) - m) * 60);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, h, m, s));
}

function solarEvent(localDate: string, timezone: string, lat: number, lon: number, event: "rise" | "set") {
  const midnight = localDateTimeToUtc(localDate, "00:00:00", timezone);
  const result = swe.swe_rise_trans(
    julianDay(midnight),
    swe.SE_SUN,
    "",
    swe.SEFLG_MOSEPH,
    event === "rise" ? swe.SE_CALC_RISE : swe.SE_CALC_SET,
    lon,
    lat,
    0,
    1013.25,
    15,
  ) as RiseResult;
  if (result.error || !Number.isFinite(result.transitTime)) throw new Error("Unable to calculate solar event.");
  return utcFromTransit(result.transitTime);
}

function siderealAscendant(ms: number, lat: number, lon: number, ayanamsaDegrees: number) {
  const jd = julianDay(new Date(ms));
  const houses = swe.swe_houses_ex2(jd, 0, lat, lon, "P") as HousesResult;
  if (houses.error) throw new Error(houses.error);
  return ((houses.ascendant - ayanamsaDegrees) % 360 + 360) % 360;
}

export async function POST(request: Request) {
  if (!consumeRateLimit(request, "timepoints")) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  try {
    const body = await request.json() as { date: string; time: string; lat: number; lng: number; timezone: string; ayanamsa?: string; customAyanamsaDegrees?: number };
    const moment = localDateTimeToUtc(body.date, body.time, body.timezone);
    const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: body.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(moment);
    const localDate = `${dateParts.slice(0, 4)}-${dateParts.slice(5, 7)}-${dateParts.slice(8, 10)}`;
    let sunrise = solarEvent(localDate, body.timezone, body.lat, body.lng, "rise");
    let sunset = solarEvent(localDate, body.timezone, body.lat, body.lng, "set");
    if (moment < sunrise) {
      const previousDate = shiftLocalDate(localDate, -1);
      sunrise = solarEvent(previousDate, body.timezone, body.lat, body.lng, "rise");
      sunset = solarEvent(previousDate, body.timezone, body.lat, body.lng, "set");
    }
    const nextDate = shiftLocalDate(sunrise < moment ? localDate : shiftLocalDate(localDate, -1), 1);
    const nextSunrise = moment < sunset
      ? solarEvent(nextDate, body.timezone, body.lat, body.lng, "rise")
      : solarEvent(nextDate, body.timezone, body.lat, body.lng, "rise");
    const isDay = moment >= sunrise && moment < sunset;
    const start = isDay ? sunrise : sunset;
    const end = isDay ? sunset : nextSunrise;
    const partLength = (end.getTime() - start.getTime()) / 8;
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: body.timezone, weekday: "short" }).format(sunrise);
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekdayIndex = weekdays.indexOf(weekday);
    const weekdayLord = weekdayIndex;
    const lords = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
    const firstLordIndex = isDay ? weekdayLord : (weekdayLord + 4) % 7;
    const ayanamsaDegrees = body.ayanamsa === "custom"
      ? body.customAyanamsaDegrees ?? 0
      : body.ayanamsa === "lahiri" ? 24.0 : 24.0;
    const definitions = [
      ["kl", "Kala", 0], ["mr", "Mrityu", 2], ["ap", "Ardhaprahara", 3],
      ["yk", "Yamaghantaka", 4], ["gu", "Gulika", 6],
    ] as const;
    const values: Array<{ key: string; name: string; abbr: string; partNo: number; lord: string; startTime: string; longitude: number; signIndex: number; degreeText: string; nakshatra: string; pada: number }> = definitions.map(([key, name, planet]) => {
      const partIndex = (planet - firstLordIndex + 7) % 7;
      const pointStart = start.getTime() + partIndex * partLength;
      const longitude = siderealAscendant(pointStart, body.lat, body.lng, ayanamsaDegrees);
      const signIndex = Math.floor(longitude / 30);
      const startTime = new Intl.DateTimeFormat("en-GB", { timeZone: body.timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(pointStart);
      return { key, name, abbr: key === "kl" ? "Kl" : key === "mr" ? "Mr" : key === "ap" ? "Ap" : key === "yk" ? "Yk" : "Gu", partNo: partIndex + 1, lord: lords[planet], startTime, longitude, signIndex, degreeText: "", nakshatra: "", pada: 1 };
    });
    const saturnIndex = (6 - firstLordIndex + 7) % 7;
    const mandiStart = start.getTime() + saturnIndex * partLength;
    const mandiLongitude = siderealAscendant(mandiStart + partLength / 2, body.lat, body.lng, ayanamsaDegrees);
    values.push({ key: "md", name: "Mandi", abbr: "Md", partNo: saturnIndex + 1, lord: "Saturn", startTime: new Intl.DateTimeFormat("en-GB", { timeZone: body.timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(mandiStart + partLength / 2), longitude: mandiLongitude, signIndex: Math.floor(mandiLongitude / 30), degreeText: "", nakshatra: "", pada: 1 });
    return NextResponse.json({ values });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to calculate time points." }, { status: 400 });
  }
}

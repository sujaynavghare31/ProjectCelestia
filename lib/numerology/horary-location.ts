import tzLookup from "tz-lookup";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const SUNRISE_ZENITH = 90.833;

export interface HoraryLocation {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timeZone: string;
}

export interface HoraryQuestionMoment {
  date: string;
  time: string;
  timeZone: string;
}

export interface SunriseCalculation {
  time: string | null;
  timeZone: string;
  reason?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function getLocalQuestionMoment(
  now: Date = new Date(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
): HoraryQuestionMoment {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    timeZone,
  };
}

export function createHoraryLocation(
  name: string,
  country: string,
  latitude: number,
  longitude: number,
): HoraryLocation {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new RangeError("Location coordinates are outside valid latitude or longitude bounds.");
  }

  const timeZone = tzLookup(latitude, longitude);
  return {
    id: `${latitude.toFixed(4)},${longitude.toFixed(4)}`,
    name,
    country,
    latitude,
    longitude,
    timeZone,
  };
}

export const PRESET_HORARY_LOCATIONS: HoraryLocation[] = [
  createHoraryLocation("New Delhi", "India", 28.6139, 77.209),
  createHoraryLocation("Mumbai", "India", 19.076, 72.8777),
  createHoraryLocation("London", "United Kingdom", 51.5072, -0.1276),
  createHoraryLocation("New York", "United States", 40.7128, -74.006),
  createHoraryLocation("Dubai", "United Arab Emirates", 25.2048, 55.2708),
];

export function parseCitySearchResults(payload: unknown): HoraryLocation[] {
  const response = asRecord(payload);
  if (!response || !Array.isArray(response.results)) return [];

  const locations = new Map<string, HoraryLocation>();
  for (const result of response.results) {
    const place = asRecord(result);
    if (
      !place ||
      typeof place.name !== "string" ||
      typeof place.latitude !== "number" ||
      typeof place.longitude !== "number" ||
      !Number.isFinite(place.latitude) ||
      !Number.isFinite(place.longitude)
    ) {
      continue;
    }

    try {
      const location = createHoraryLocation(
        place.name.trim(),
        typeof place.country === "string" ? place.country : "",
        place.latitude,
        place.longitude,
      );
      if (location.name && !locations.has(location.id)) locations.set(location.id, location);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
    }
  }

  return [...locations.values()];
}

export function calculateLocalSunrise(date: string, location: HoraryLocation): SunriseCalculation {
  if (!isValidDate(date)) {
    return { time: null, timeZone: location.timeZone, reason: "Enter a valid question date to calculate sunrise." };
  }

  const [year, month, day] = date.split("-").map(Number);
  const dateUtc = Date.UTC(year, month - 1, day);
  const dayOfYear = Math.floor((dateUtc - Date.UTC(year, 0, 1)) / DAY_IN_MILLISECONDS) + 1;
  const latitudeRadians = (location.latitude * Math.PI) / 180;
  const longitudeHour = location.longitude / 15;
  const approximateDay = dayOfYear + (6 - longitudeHour) / 24;
  const meanAnomaly = 0.9856 * approximateDay - 3.289;
  const trueLongitude =
    meanAnomaly +
    1.916 * Math.sin((Math.PI / 180) * meanAnomaly) +
    0.02 * Math.sin((2 * Math.PI / 180) * meanAnomaly) +
    282.634;
  const normalizedLongitude = ((trueLongitude % 360) + 360) % 360;
  let rightAscension = (180 / Math.PI) * Math.atan(0.91764 * Math.tan((Math.PI / 180) * normalizedLongitude));
  rightAscension = ((rightAscension % 360) + 360) % 360;
  rightAscension += Math.floor(normalizedLongitude / 90) * 90 - Math.floor(rightAscension / 90) * 90;
  rightAscension /= 15;

  const sinDeclination = 0.39782 * Math.sin((Math.PI / 180) * normalizedLongitude);
  const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const cosHourAngle =
    (Math.cos((Math.PI / 180) * SUNRISE_ZENITH) - sinDeclination * Math.sin(latitudeRadians)) /
    (cosDeclination * Math.cos(latitudeRadians));

  if (!Number.isFinite(cosHourAngle) || cosHourAngle < -1 || cosHourAngle > 1) {
    return {
      time: null,
      timeZone: location.timeZone,
      reason: `Sunrise does not occur normally at ${location.name} on this date.`,
    };
  }

  const hourAngle = 360 - (180 / Math.PI) * Math.acos(cosHourAngle);
  const localMeanTime = hourAngle / 15 + rightAscension - 0.06571 * approximateDay - 6.622;
  const utcHours = localMeanTime - longitudeHour;
  const sunriseTimestamp = Date.UTC(year, 0, dayOfYear - 1) + utcHours * 60 * 60 * 1000;

  if (!Number.isFinite(sunriseTimestamp)) {
    return { time: null, timeZone: location.timeZone, reason: "Could not calculate sunrise for this date and location." };
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: location.timeZone,
    numberingSystem: "latn",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(sunriseTimestamp));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return { time: `${values.hour}:${values.minute}`, timeZone: location.timeZone };
}

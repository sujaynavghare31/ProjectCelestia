import { afterEach, describe, expect, it, vi } from "vitest";
import swe from "swisseph";
import { ayanamsa } from "./ayanamsa";
import { eclipticToEquatorial } from "./coords";
import { interpolateSamples } from "./interpolate";
import { clearEphemerisCache } from "./loader";
import { NotAvailable, resolvePosition } from "./provider";
import type { BodySamples, EphemerisManifest, Position } from "./types";
import { deltaTSeconds, julianDayTt, julianDayUtc } from "./time";

const fixtureSamples: BodySamples = {
  step: 1,
  lon: [359, 359.5, 0, 0.5, 1, 1.5],
  lat: [0, 1, 2, 3, 4, 5],
};

function mockManifest(year: number): EphemerisManifest {
  return {
    schema: 1,
    source: { planets: "fixture", asteroids: "fixture" },
    frame: "apparent, true ecliptic of date",
    timeScale: "TT",
    years: {
      [year]: {
        planets: { file: `planets/${year}.json`, sha256: "", bytes: 0 },
      },
    },
  };
}

function mockYearData(year: number) {
  return {
    year,
    schema: 1 as const,
    t0: julianDayUtc(new Date(`${year}-01-01T00:00:00Z`)) - 1,
    bodies: { Sun: fixtureSamples },
  };
}

const apiPosition: Position = {
  body: "Sun",
  longitude: 10,
  latitude: 0,
  speed: 1,
  latSpeed: 0,
  retrograde: false,
  declination: 4,
  rightAscension: 9,
  outOfBounds: false,
  source: "api",
};

afterEach(() => {
  clearEphemerisCache();
  vi.unstubAllGlobals();
});

describe("local ephemeris interpolation", () => {
  it("unwraps longitudes over 360 degrees and returns the derivative per day", () => {
    const value = interpolateSamples(fixtureSamples, 2_451_544.5, 2_451_547);
    expect(value?.longitude.value).toBeCloseTo(0.25, 8);
    expect(value?.longitude.speed).toBeCloseTo(0.5, 8);
    expect(value?.latitude.value).toBeCloseTo(2.5, 8);
    expect(value?.latitude.speed).toBeCloseTo(1, 8);
  });

  it("returns null when the padded samples cannot support cubic interpolation", () => {
    expect(interpolateSamples(fixtureSamples, 100, 99)).toBeNull();
  });
});

describe("ephemeris time and coordinates", () => {
  it("converts UTC to TT using the 1800-2100 delta-T polynomials", () => {
    const date = new Date("2026-11-20T00:00:00Z");
    const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
    const nextYearStart = Date.UTC(date.getUTCFullYear() + 1, 0, 1);
    const decimalYear = date.getUTCFullYear() + (date.getTime() - yearStart) / (nextYearStart - yearStart);
    expect(deltaTSeconds(2026)).toBeGreaterThan(60);
    expect(julianDayTt(date)).toBeGreaterThan(julianDayUtc(date));
    expect(julianDayTt(date) - julianDayUtc(date)).toBeCloseTo(deltaTSeconds(decimalYear) / 86_400, 8);
  });

  it("computes equatorial coordinates and sidereal longitude deterministically", () => {
    const coordinates = eclipticToEquatorial(90, 0, 2_451_545);
    expect(coordinates.rightAscension).toBeCloseTo(90, 2);
    expect(coordinates.declination).toBeCloseTo(23.4, 1);
    expect(ayanamsa("lahiri", new Date("2000-01-01T12:00:00Z"))).toBeCloseTo(23.85, 1);
  });

  it("tracks the existing Lahiri implementation within 0.1 arcsecond across the supported range", () => {
    for (const date of [
      new Date("1800-01-01T00:00:00Z"),
      new Date("1900-01-01T00:00:00Z"),
      new Date("2000-01-01T12:00:00Z"),
      new Date("2026-11-20T00:00:00Z"),
      new Date("2100-01-01T00:00:00Z"),
    ]) {
      const jdUt = swe.swe_julday(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        date.getUTCHours() + date.getUTCMinutes() / 60,
        swe.SE_GREG_CAL,
      );
      swe.swe_set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);
      const reference = swe.swe_get_ayanamsa_ut(jdUt);
      expect(Math.abs((ayanamsa("lahiri", date) - reference) * 3600)).toBeLessThan(0.1);
    }
  });
});

describe("ephemeris source resolution", () => {
  it("uses a local position without calling API fallback when the year file includes the body", async () => {
    const year = 2026;
    const manifest = mockManifest(year);
    const payload = JSON.stringify(mockYearData(year));
    const bytes = new TextEncoder().encode(payload);
    manifest.years[String(year)]!.planets!.bytes = bytes.byteLength;
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    manifest.years[String(year)]!.planets!.sha256 = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("manifest.json")) return new Response(JSON.stringify(manifest));
      return new Response(payload);
    });
    vi.stubGlobal("fetch", fetchMock);
    const api = vi.fn(async () => apiPosition);

    const position = await resolvePosition("Sun", new Date("2026-01-02T00:00:00Z"), { api });
    expect(position.source).toBe("local");
    expect(api).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a failed local file once, then falls back to the API", async () => {
    const manifest = mockManifest(2026);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("manifest.json")) return new Response(JSON.stringify(manifest));
      return new Response("unavailable", { status: 503 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const api = vi.fn(async () => apiPosition);

    const position = await resolvePosition("Sun", new Date("2026-06-01T00:00:00Z"), { api });
    expect(position.source).toBe("api");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(api).toHaveBeenCalledOnce();
  });

  it("uses the astronomy fallback for planets, but not unsupported asteroid fallbacks", async () => {
    const api = vi.fn(async () => { throw new Error("API unavailable"); });
    const astronomyEngine = vi.fn(async () => ({ ...apiPosition, source: "fallback" as const }));
    const planet = await resolvePosition("Sun", new Date("1750-01-01T00:00:00Z"), { api, astronomyEngine });
    expect(planet.source).toBe("fallback");
    await expect(resolvePosition("Ceres", new Date("1750-01-01T00:00:00Z"), { api, astronomyEngine }))
      .rejects.toThrow(NotAvailable);
  });
});

import { gzipSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import { createEphemerisUrl, fetchEphemeris } from "@/lib/astrology/ephemeris-client";
import { GET, POST } from "./route";

describe("ephemeris response cache", () => {
  it("returns identical JSON and a sub-5 ms cache hit for repeated inputs", async () => {
    const input = {
      date: "1990-01-01",
      time: "12:00:00",
      lat: 19.076,
      lng: 72.8777,
      timezone: "Asia/Kolkata",
      ayanamsa: "lahiri",
      nodeType: "true",
    };
    const request = () => new Request("http://localhost/api/ephemeris", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.12" },
      body: JSON.stringify(input),
    });

    const firstResponse = await POST(request());
    const firstBody = await firstResponse.text();
    expect(firstResponse.status).toBe(200);
    expect(firstResponse.headers.get("X-Celestia-Cache")).toBe("MISS");

    const secondResponse = await POST(request());
    const secondBody = await secondResponse.text();
    const firstServerLatency = Number(firstResponse.headers.get("Server-Timing")?.match(/total;dur=([\d.]+)/)?.[1]);
    const secondServerLatency = Number(secondResponse.headers.get("Server-Timing")?.match(/total;dur=([\d.]+)/)?.[1]);

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.headers.get("X-Celestia-Cache")).toBe("HIT");
    expect(secondResponse.headers.get("Server-Timing")).toContain('cache;desc="HIT"');
    expect(secondBody).toBe(firstBody);
    expect(secondServerLatency).toBeLessThan(5);
    console.info(`[ephemeris-cache] server first=${firstServerLatency.toFixed(2)}ms hit=${secondServerLatency.toFixed(2)}ms`);
  });

  it("profiles a typical Mumbai response", async () => {
    const request = new Request("http://localhost/api/ephemeris", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.13" },
      body: JSON.stringify({
        date: "1990-01-01",
        time: "12:00:00",
        lat: 19.076,
        lng: 72.8777,
        timezone: "Asia/Kolkata",
        ayanamsa: "lahiri",
        nodeType: "true",
      }),
    });
    const response = await POST(request);
    const raw = await response.text();
    const value = JSON.parse(raw) as Record<string, unknown>;
    const breakdown = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, Buffer.byteLength(JSON.stringify(item))]),
    );
    const jsonBytes = Buffer.byteLength(JSON.stringify(value));
    const gzipBytes = gzipSync(JSON.stringify(value)).byteLength;
    console.info(`[ephemeris-profile] raw=${jsonBytes} gzip=${gzipBytes} breakdown=${JSON.stringify(breakdown)}`);
    expect(response.status).toBe(200);
    expect(value).not.toHaveProperty("dashas");
    expect(jsonBytes).toBeLessThan(60 * 1024);
  });

  it("serves canonical GET requests with public edge caching", async () => {
    const url = createEphemerisUrl({
      date: "1990-01-01",
      time: "12:00",
      lat: 19.076,
      lng: 72.8777,
      timezone: "Asia/Kolkata",
      ayanamsa: "LAHIRI",
      nodeType: "true",
    });
    const query = new URLSearchParams(url.slice(url.indexOf("?") + 1));
    expect([...query.keys()]).toEqual([...query.keys()].sort());
    expect(query.get("time")).toBe("12:00:00");

    const request = () => new Request(`http://localhost${url}`, {
      headers: { "x-forwarded-for": "192.0.2.14" },
    });
    const response = await GET(request());
    const body = await response.json() as {
      ascendant: { longitude: number };
      planets: Array<{ longitude: number }>;
      houseCusps: Array<{ longitude: number }>;
    };
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=300, s-maxage=86400, stale-while-revalidate=604800");
    expect(body.planets.length).toBeGreaterThan(0);

    const postResponse = await POST(new Request("http://localhost/api/ephemeris", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.15" },
      body: JSON.stringify({
        date: "1990-01-01",
        time: "12:00:00",
        lat: 19.076,
        lng: 72.8777,
        timezone: "Asia/Kolkata",
        ayanamsa: "lahiri",
        nodeType: "true",
      }),
    }));
    const postBody = await postResponse.json() as typeof body;
    expect(body.ascendant).toEqual(postBody.ascendant);
    expect(body.planets).toEqual(postBody.planets);
    expect(body.houseCusps).toEqual(postBody.houseCusps);

    const cacheHit = await GET(request());
    expect(cacheHit.headers.get("X-Celestia-Cache")).toBe("HIT");
    expect(cacheHit.headers.get("Cache-Control")).toBe("public, max-age=300, s-maxage=86400, stale-while-revalidate=604800");
  });

  it("deduplicates concurrent and immediately repeated client GETs", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ascendant: {}, planets: [] })));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const input = {
        date: "1990-01-01",
        time: "12:00",
        lat: 19.076,
        lng: 72.8777,
        timezone: "Asia/Kolkata",
        ayanamsa: "lahiri",
        nodeType: "true" as const,
      };
      await Promise.all([fetchEphemeris(input), fetchEphemeris({ ...input, time: "12:00:00" })]);
      await fetchEphemeris(input);
      expect(fetchMock).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

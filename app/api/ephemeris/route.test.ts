import { describe, expect, it } from "vitest";
import { POST } from "./route";

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
});

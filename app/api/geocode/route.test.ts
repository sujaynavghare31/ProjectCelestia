import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("geocode route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves coordinate timezones offline", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await GET(new Request("http://localhost/api/geocode?lat=19.076&lng=72.8777"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ timezone: "Asia/Kolkata" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("resolves Mumbai from the static index without calling Nominatim", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await GET(new Request("http://localhost/api/geocode?q=Mumbai"));
    const body = await response.json() as { results: Array<{ city: string; timezone: string }> };

    expect(response.status).toBe(200);
    expect(body.results[0]).toMatchObject({ city: "Mumbai, India", timezone: "Asia/Kolkata" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

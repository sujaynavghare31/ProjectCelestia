import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearCachedSavedProfiles,
  fetchSavedProfiles,
  getCachedSavedProfiles,
  removeCachedSavedProfile,
  SavedProfilesRequestSupersededError,
  updateCachedSavedProfile,
  writeSavedProfilesCache,
  type SavedProfile,
} from "./saved-profiles-cache";

const userId = "clerk-user-cache-test";
const profile = (id: string): SavedProfile => ({
  id,
  chartName: id,
  fullName: `Person ${id}`,
  dateOfBirth: "2000-01-02",
  timeOfBirth: "12:30:00",
  sex: "not-applicable",
  latitude: 19.076,
  longitude: 72.8777,
  timezone: "Asia/Kolkata",
  city: "Mumbai",
  notes: "",
});

afterEach(() => {
  clearCachedSavedProfiles(userId);
  vi.unstubAllGlobals();
});

describe("saved profiles cache", () => {
  it("keeps profiles isolated by Clerk user id", () => {
    writeSavedProfilesCache(userId, [profile("chart-1")]);

    expect(getCachedSavedProfiles(userId)).toEqual([profile("chart-1")]);
    expect(getCachedSavedProfiles("another-user")).toBeNull();
  });

  it("updates and removes cached profiles without losing list order", () => {
    writeSavedProfilesCache(userId, [profile("chart-1"), profile("chart-2")]);

    updateCachedSavedProfile(userId, { ...profile("chart-2"), fullName: "Updated" });
    expect(getCachedSavedProfiles(userId)).toEqual([
      { ...profile("chart-2"), fullName: "Updated" },
      profile("chart-1"),
    ]);

    removeCachedSavedProfile(userId, "chart-1");
    expect(getCachedSavedProfiles(userId)).toEqual([{ ...profile("chart-2"), fullName: "Updated" }]);
  });

  it("deduplicates concurrent revalidation and caches the result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ userId, profiles: [profile("chart-1")] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      fetchSavedProfiles(userId),
      fetchSavedProfiles(userId),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual([profile("chart-1")]);
    expect(second).toEqual(first);
    expect(getCachedSavedProfiles(userId)).toEqual(first);
  });

  it("rejects a response belonging to a different signed-in user", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      userId: "another-user",
      profiles: [profile("chart-1")],
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));

    await expect(fetchSavedProfiles(userId)).rejects.toThrow("invalid response");
    expect(getCachedSavedProfiles(userId)).toBeNull();
  });

  it("does not return an obsolete response after the cache is invalidated", async () => {
    let resolveResponse!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    })));

    const pending = fetchSavedProfiles(userId);
    clearCachedSavedProfiles(userId);
    resolveResponse(new Response(JSON.stringify({ userId, profiles: [profile("stale")] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    await expect(pending).rejects.toBeInstanceOf(SavedProfilesRequestSupersededError);
    expect(getCachedSavedProfiles(userId)).toBeNull();
  });
});

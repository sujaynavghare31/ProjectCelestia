import type { BirthProfile } from "@/lib/kundali-store";

export type SavedProfile = {
  id: string;
  chartName: string | null;
  fullName: string;
  dateOfBirth: string;
  timeOfBirth: string;
  sex: BirthProfile["sex"];
  latitude: number;
  longitude: number;
  timezone: string;
  city: string | null;
  notes: string;
};

const STORAGE_PREFIX = "project-celestia:saved-profiles:";
const profilesByUser = new Map<string, SavedProfile[]>();
const inFlightByUser = new Map<string, Promise<SavedProfile[]>>();
const generationsByUser = new Map<string, number>();

export class SavedProfilesRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "SavedProfilesRequestError";
  }
}

export class SavedProfilesRequestSupersededError extends Error {
  constructor() {
    super("A newer saved chart update superseded this request.");
    this.name = "SavedProfilesRequestSupersededError";
  }
}

function isSavedProfile(value: unknown): value is SavedProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<SavedProfile>;
  return typeof profile.id === "string"
    && (typeof profile.chartName === "string" || profile.chartName === null)
    && typeof profile.fullName === "string"
    && typeof profile.dateOfBirth === "string"
    && typeof profile.timeOfBirth === "string"
    && (profile.sex === "male" || profile.sex === "female" || profile.sex === "not-applicable")
    && typeof profile.latitude === "number"
    && Number.isFinite(profile.latitude)
    && typeof profile.longitude === "number"
    && Number.isFinite(profile.longitude)
    && typeof profile.timezone === "string"
    && (typeof profile.city === "string" || profile.city === null)
    && typeof profile.notes === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getGeneration(userId: string) {
  return generationsByUser.get(userId) ?? 0;
}

function advanceGeneration(userId: string) {
  generationsByUser.set(userId, getGeneration(userId) + 1);
}

export function getCachedSavedProfiles(userId: string): SavedProfile[] | null {
  const memoryCache = profilesByUser.get(userId);
  if (memoryCache) return memoryCache;
  if (typeof window === "undefined") return null;

  try {
    const stored = window.sessionStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every(isSavedProfile)) {
      window.sessionStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
      return null;
    }
    profilesByUser.set(userId, parsed);
    return parsed;
  } catch (error) {
    console.warn("[saved-charts] Unable to read the saved chart cache", error);
    return null;
  }
}

export function writeSavedProfilesCache(userId: string, profiles: SavedProfile[]) {
  advanceGeneration(userId);
  profilesByUser.set(userId, profiles);
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(profiles));
  } catch (error) {
    console.warn("[saved-charts] Unable to write the saved chart cache", error);
  }
}

export function updateCachedSavedProfile(userId: string, profile: SavedProfile) {
  const cached = getCachedSavedProfiles(userId);
  if (!cached) {
    advanceGeneration(userId);
    return;
  }
  writeSavedProfilesCache(userId, [profile, ...cached.filter(({ id }) => id !== profile.id)]);
}

export function removeCachedSavedProfile(userId: string, profileId: string) {
  const cached = getCachedSavedProfiles(userId);
  if (!cached) {
    advanceGeneration(userId);
    return;
  }
  writeSavedProfilesCache(userId, cached.filter(({ id }) => id !== profileId));
}

export function clearCachedSavedProfiles(userId: string) {
  advanceGeneration(userId);
  profilesByUser.delete(userId);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
  } catch (error) {
    console.warn("[saved-charts] Unable to clear the saved chart cache", error);
  }
}

export function fetchSavedProfiles(userId: string): Promise<SavedProfile[]> {
  const pending = inFlightByUser.get(userId);
  if (pending) return pending;

  const requestGeneration = getGeneration(userId);
  const request = (async () => {
    let response: Response;
    try {
      response = await fetch("/api/profiles", { cache: "no-store" });
    } catch {
      throw new SavedProfilesRequestError("Saved charts could not be loaded. Check your connection and try again.", 0);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new SavedProfilesRequestError("The saved charts service returned an invalid response.", response.status);
    }

    if (!response.ok) {
      const error = isRecord(payload) && typeof payload.error === "string" ? payload.error : null;
      throw new SavedProfilesRequestError(
        error ?? `Saved charts could not be loaded (${response.status}).`,
        response.status,
      );
    }
    if (!isRecord(payload)
      || payload.userId !== userId
      || !Array.isArray(payload.profiles)
      || !payload.profiles.every(isSavedProfile)) {
      throw new SavedProfilesRequestError("The saved charts service returned an invalid response.", response.status);
    }

    const profiles = payload.profiles;
    if (getGeneration(userId) !== requestGeneration) {
      const currentProfiles = getCachedSavedProfiles(userId);
      if (currentProfiles) return currentProfiles;
      throw new SavedProfilesRequestSupersededError();
    }

    writeSavedProfilesCache(userId, profiles);
    return profiles;
  })();

  inFlightByUser.set(userId, request);
  void request.finally(() => {
    if (inFlightByUser.get(userId) === request) inFlightByUser.delete(userId);
  }).catch(() => {});
  return request;
}

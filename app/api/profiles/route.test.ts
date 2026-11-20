import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChartSex } from "../../../lib/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  ClerkAccountConflictError: class ClerkAccountConflictError extends Error {},
  getCurrentDatabaseUser: vi.fn(),
  findUserWithProfiles: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  findFirst: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/clerk-user", () => ({
  ClerkAccountConflictError: mocks.ClerkAccountConflictError,
  getCurrentDatabaseUser: mocks.getCurrentDatabaseUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUserWithProfiles,
    },
    profile: {
      findMany: mocks.findMany,
      create: mocks.create,
      updateMany: mocks.updateMany,
      findFirst: mocks.findFirst,
      deleteMany: mocks.deleteMany,
    },
  },
}));

import { DELETE, GET, POST } from "./route";

const savedProfile = {
  id: "profile-1",
  chartName: "Sample chart",
  fullName: "Sample Person",
  dateOfBirth: new Date("2000-01-02T00:00:00.000Z"),
  timeOfBirth: "11:22:33",
  sex: ChartSex.MALE,
  latitude: 40.7128,
  longitude: -74.006,
  timezone: "America/New_York",
  city: "Sample City",
  notes: "Synthetic chart notes",
};

function request(body: unknown) {
  return new Request("http://localhost/api/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteRequest(id?: string) {
  const url = new URL("http://localhost/api/profiles");
  if (id !== undefined) url.searchParams.set("id", id);
  return new Request(url, { method: "DELETE" });
}

describe("/api/profiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: "clerk-user-1" });
    mocks.getCurrentDatabaseUser.mockResolvedValue({ id: "user-1" });
    mocks.findUserWithProfiles.mockResolvedValue({ profiles: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns all saved chart fields when loading profiles", async () => {
    mocks.findUserWithProfiles.mockResolvedValue({ profiles: [savedProfile] });

    const response = await GET();
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("server-timing")).toMatch(/auth;dur=[\d.]+, db;dur=[\d.]+, clerk-profile;dur=[\d.]+, total;dur=[\d.]+/);
    expect(mocks.getCurrentDatabaseUser).not.toHaveBeenCalled();
    expect(mocks.findUserWithProfiles).toHaveBeenCalledWith({
      where: { clerkId: "clerk-user-1" },
      select: {
        profiles: {
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            chartName: true,
            fullName: true,
            dateOfBirth: true,
            timeOfBirth: true,
            sex: true,
            latitude: true,
            longitude: true,
            timezone: true,
            city: true,
            notes: true,
          },
        },
      },
    });
    expect(result.profiles[0]).toEqual({
      id: "profile-1",
      chartName: "Sample chart",
      fullName: "Sample Person",
      dateOfBirth: "2000-01-02",
      timeOfBirth: "11:22:33",
      sex: "male",
      latitude: 40.7128,
      longitude: -74.006,
      timezone: "America/New_York",
      city: "Sample City",
      notes: "Synthetic chart notes",
    });
    expect(result.userId).toBe("clerk-user-1");
  });

  it("persists and returns all chart details when saving a new profile", async () => {
    mocks.create.mockResolvedValue({ id: savedProfile.id });
    mocks.findFirst.mockResolvedValue(savedProfile);

    const response = await POST(request({
      name: "Sample chart",
      sex: "male",
      date: "2000-01-02",
      time: "11:22:33",
      lat: 40.7128,
      lng: -74.006,
      timezone: "America/New_York",
      city: "Sample City",
      notes: "Synthetic chart notes",
      id: null,
    }));
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        chartName: "Sample chart",
        fullName: "Sample chart",
        dateOfBirth: new Date("2000-01-02T00:00:00.000Z"),
        timeOfBirth: "11:22:33",
        sex: ChartSex.MALE,
        latitude: 40.7128,
        longitude: -74.006,
        timezone: "America/New_York",
        city: "Sample City",
        notes: "Synthetic chart notes",
      }),
      select: { id: true },
    });
    expect(result.profile).toMatchObject({
      id: "profile-1",
      chartName: "Sample chart",
      fullName: "Sample Person",
      dateOfBirth: "2000-01-02",
      timeOfBirth: "11:22:33",
      sex: "male",
      latitude: 40.7128,
      longitude: -74.006,
      timezone: "America/New_York",
      city: "Sample City",
      notes: "Synthetic chart notes",
    });
  });

  it("updates an existing profile only when it belongs to the signed-in user", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findFirst.mockResolvedValue(savedProfile);

    const response = await POST(request({
      name: "Sample chart",
      sex: "male",
      date: "2000-01-02",
      time: "11:22:33",
      lat: 40.7128,
      lng: -74.006,
      timezone: "America/New_York",
      city: "Sample City",
      notes: "Synthetic chart notes",
      id: "profile-1",
    }));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "profile-1", userId: "user-1" },
      data: expect.objectContaining({
        chartName: "Sample chart",
        fullName: "Sample chart",
        dateOfBirth: new Date("2000-01-02T00:00:00.000Z"),
        timeOfBirth: "11:22:33",
      }),
    });
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "profile-1", userId: "user-1" },
    }));
    expect(result.profile.id).toBe("profile-1");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("does not update a profile that is not owned by the signed-in user", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });

    const response = await POST(request({
      name: "Sample chart",
      sex: "male",
      date: "2000-01-02",
      time: "11:22:33",
      lat: 40.7128,
      lng: -74.006,
      timezone: "America/New_York",
      city: "Sample City",
      notes: "Synthetic chart notes",
      id: "another-users-profile",
    }));

    expect(response.status).toBe(404);
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "another-users-profile", userId: "user-1" },
    }));
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("returns a JSON error instead of an empty failure response when profile loading fails", async () => {
    mocks.findUserWithProfiles.mockRejectedValue(new Error("Database unavailable"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Saved charts are temporarily unavailable. Please try again.",
    });
  });

  it("returns an actionable conflict when the Clerk email cannot be safely reconnected", async () => {
    mocks.findUserWithProfiles.mockResolvedValue(null);
    mocks.getCurrentDatabaseUser.mockRejectedValue(new mocks.ClerkAccountConflictError(
      "This email is already linked to another account. Sign in with the original account or verify this email to reconnect it.",
    ));

    const response = await GET();

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "This email is already linked to another account. Sign in with the original account or verify this email to reconnect it.",
    });
  });

  it("uses account reconciliation only when no local Clerk identity row exists", async () => {
    mocks.findUserWithProfiles.mockResolvedValue(null);
    mocks.findMany.mockResolvedValue([savedProfile]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.getCurrentDatabaseUser).toHaveBeenCalledWith("clerk-user-1", expect.any(Function));
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-1" },
      orderBy: { updatedAt: "desc" },
    }));
    expect(response.headers.get("server-timing")).toMatch(/clerk-profile;dur=[\d.]+/);
  });

  it("does not query the database when Clerk authentication is missing", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(response.headers.get("server-timing")).toMatch(/auth;dur=[\d.]+, db;dur=0\.00/);
    expect(mocks.getCurrentDatabaseUser).not.toHaveBeenCalled();
    expect(mocks.findUserWithProfiles).not.toHaveBeenCalled();
  });

  it("deletes a saved chart only for the signed-in user", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 1 });

    const response = await DELETE(deleteRequest("profile-1"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "profile-1" });
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { id: "profile-1", userId: "user-1" },
    });
  });

  it("returns not found when the saved chart does not belong to the signed-in user", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 0 });

    const response = await DELETE(deleteRequest("another-users-profile"));

    expect(response.status).toBe(404);
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { id: "another-users-profile", userId: "user-1" },
    });
  });

  it("rejects a missing saved chart id", async () => {
    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(400);
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects a saved chart id that is too long", async () => {
    const response = await DELETE(deleteRequest("x".repeat(101)));

    expect(response.status).toBe(400);
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("requires sign-in before deleting a saved chart", async () => {
    mocks.getCurrentDatabaseUser.mockResolvedValue(null);

    const response = await DELETE(deleteRequest("profile-1"));

    expect(response.status).toBe(401);
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});

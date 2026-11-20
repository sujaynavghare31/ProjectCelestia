import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChartSex } from "../../../lib/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  getCurrentDatabaseUser: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  findFirst: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/clerk-user", () => ({
  getCurrentDatabaseUser: mocks.getCurrentDatabaseUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findMany: mocks.findMany,
      create: mocks.create,
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
    mocks.getCurrentDatabaseUser.mockResolvedValue({ id: "user-1" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns all saved chart fields when loading profiles", async () => {
    mocks.findMany.mockResolvedValue([savedProfile]);

    const response = await GET();
    const result = await response.json();

    expect(response.status).toBe(200);
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

  it("returns a JSON error instead of an empty failure response when profile loading fails", async () => {
    mocks.getCurrentDatabaseUser.mockRejectedValue(new Error("Database unavailable"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Saved charts are temporarily unavailable. Please try again.",
    });
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

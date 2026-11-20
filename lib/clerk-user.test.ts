import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      create: mocks.create,
      update: mocks.update,
    },
  },
}));

import { getCurrentDatabaseUser } from "./clerk-user";

const clerkUserId = "user_development12345678";
const clerkUser = {
  username: "local-test-user",
  primaryEmailAddress: { emailAddress: "user@example.com" },
};

describe("getCurrentDatabaseUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: clerkUserId });
    mocks.currentUser.mockResolvedValue(clerkUser);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("isolates a local Clerk identity when its email belongs to a different Clerk account", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "production-user", clerkId: "user_production", email: "user@example.com" });
    mocks.create.mockResolvedValue({ id: "local-user", clerkId: clerkUserId });

    const user = await getCurrentDatabaseUser();

    expect(user).toMatchObject({ id: "local-user", clerkId: clerkUserId });
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clerkId: clerkUserId,
        email: `${clerkUserId}@clerk.local`,
      }),
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("still rejects a conflicting account outside local development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "existing-user", clerkId: "user_other", email: "user@example.com" });

    await expect(getCurrentDatabaseUser()).rejects.toThrow("This email is already linked to another Clerk account.");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

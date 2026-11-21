import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  client: {
    user: { findUnique: vi.fn(async () => null) },
    profile: { findMany: vi.fn(async () => []) },
  },
  PrismaPg: vi.fn(function PrismaPgMock() {
    return {};
  }),
  PrismaClient: vi.fn(function PrismaClientMock() {
    return mocks.client;
  }),
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: mocks.PrismaPg,
}));

vi.mock("@/lib/generated/prisma/client", () => ({
  PrismaClient: mocks.PrismaClient,
}));

const globalForPrisma = globalThis as typeof globalThis & { prisma?: unknown };

describe("prisma client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete globalForPrisma.prisma;
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    delete globalForPrisma.prisma;
    vi.resetModules();
  });

  it("creates its client lazily and reuses it across production profile and user access", async () => {
    const { prisma } = await import("./prisma");

    expect(mocks.PrismaPg).not.toHaveBeenCalled();
    expect(mocks.PrismaClient).not.toHaveBeenCalled();

    await prisma.user.findUnique({ where: { id: "user-1" } });
    await prisma.profile.findMany({ where: { userId: "user-1" } });
    await prisma.user.findUnique({ where: { id: "user-1" } });

    expect(mocks.PrismaPg).toHaveBeenCalledTimes(1);
    expect(mocks.PrismaPg).toHaveBeenCalledWith(
      {
        connectionString: "postgresql://test:test@localhost:5432/test",
        max: 3,
        idleTimeoutMillis: 20_000,
        connectionTimeoutMillis: 10_000,
      },
      { onPoolError: expect.any(Function), onConnectionError: expect.any(Function) },
    );
    expect(mocks.PrismaClient).toHaveBeenCalledTimes(1);
    expect(mocks.PrismaClient).toHaveBeenCalledWith({ adapter: mocks.PrismaPg.mock.results[0].value });
  });

  it("allows initialization to recover after DATABASE_URL is configured", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const { prisma } = await import("./prisma");

    expect(() => prisma.user).toThrow("DATABASE_URL must be configured before connecting to PostgreSQL.");
    expect(mocks.PrismaClient).not.toHaveBeenCalled();

    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
    expect(prisma.user).toBe(mocks.client.user);
    expect(mocks.PrismaClient).toHaveBeenCalledTimes(1);
    expect(errorLog).toHaveBeenCalledOnce();
  });
});
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    const error = new Error("DATABASE_URL must be configured before connecting to PostgreSQL.");
    console.error("[database] Missing connection URL", error);
    throw error;
  }

  const adapter = new PrismaPg(
    { connectionString: databaseUrl, connectionTimeoutMillis: 10_000 },
    {
      onPoolError: (error) => console.error("[database] PostgreSQL pool error", error),
      onConnectionError: (error) => console.error("[database] PostgreSQL connection error", error),
    },
  );
  const client = new PrismaClient({ adapter });
  globalForPrisma.prisma = client;
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

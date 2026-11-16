import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  const error = new Error("DATABASE_URL must be configured before connecting to PostgreSQL.");
  console.error("[database] Missing connection URL", error);
  throw error;
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg(
  { connectionString: databaseUrl, connectionTimeoutMillis: 10_000 },
  {
    onPoolError: (error) => console.error("[database] PostgreSQL pool error", error),
    onConnectionError: (error) => console.error("[database] PostgreSQL connection error", error),
  },
);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres?schema=public";
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function seed() {
  const password = process.env.MVP_ADMIN_PASSWORD;
  if (!password) throw new Error("Set MVP_ADMIN_PASSWORD before seeding MVP admin users.");
  const passwordHash = await bcrypt.hash(password, 12);

  for (const username of ["admin1", "admin2"]) {
    await prisma.user.upsert({
      where: { username },
      update: { passwordHash, role: "ADMIN" },
      create: {
        username,
        email: `${username}@projectcelestia.local`,
        passwordHash,
        role: "ADMIN",
      },
    });
  }
}

seed()
  .catch((error: unknown) => {
    console.error("Failed to seed MVP admin users:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

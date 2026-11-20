import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export class ClerkAccountConflictError extends Error {
  constructor() {
    super("This email is already linked to another account. Sign in with the original account or verify this email to reconnect it.");
    this.name = "ClerkAccountConflictError";
  }
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "P2002";
}

function usernameFromClerkUser(email: string, clerkUserId: string, username: string | null) {
  const source = username ?? email.split("@")[0] ?? "";
  const normalized = source.toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/^[.-]+|[.-]+$/g, "");
  const base = (normalized || "clerk-user").slice(0, 23);
  return `${base}_${clerkUserId.slice(-8)}`.slice(0, 32);
}

async function createDatabaseUser(email: string, clerkUserId: string, username: string | null) {
  try {
    return await prisma.user.create({
      data: {
        clerkId: clerkUserId,
        email,
        username: usernameFromClerkUser(email, clerkUserId, username),
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const concurrentUser = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (concurrentUser) return concurrentUser;

    const conflictingEmailUser = await prisma.user.findUnique({ where: { email } });
    if (conflictingEmailUser?.clerkId === clerkUserId) return conflictingEmailUser;

    throw error;
  }
}

export async function getCurrentDatabaseUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.primaryEmailAddress?.emailAddress?.trim().toLowerCase()
    ?? `${clerkUserId}@clerk.local`;
  const linkedUser = await prisma.user.findUnique({ where: { email } });
  if (linkedUser) {
    if (linkedUser.clerkId && linkedUser.clerkId !== clerkUserId) {
      if (process.env.NODE_ENV === "development") {
        return createDatabaseUser(`${clerkUserId}@clerk.local`, clerkUserId, clerkUser.username);
      }

      if (clerkUser.primaryEmailAddress?.verification?.status !== "verified") {
        throw new ClerkAccountConflictError();
      }

      // A verified email can safely reconnect an account after its Clerk identity changes.
      return prisma.user.update({
        where: { id: linkedUser.id },
        data: { clerkId: clerkUserId },
      });
    }
    return prisma.user.update({
      where: { id: linkedUser.id },
      data: { clerkId: clerkUserId },
    });
  }

  return createDatabaseUser(email, clerkUserId, clerkUser.username);
}

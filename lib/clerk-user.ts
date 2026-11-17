import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

function usernameFromClerkUser(email: string, clerkUserId: string, username: string | null) {
  const source = username ?? email.split("@")[0] ?? "";
  const normalized = source.toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/^[.-]+|[.-]+$/g, "");
  const base = (normalized || "clerk-user").slice(0, 23);
  return `${base}_${clerkUserId.slice(-8)}`.slice(0, 32);
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
      throw new Error("This email is already linked to another Clerk account.");
    }
    return prisma.user.update({
      where: { id: linkedUser.id },
      data: { clerkId: clerkUserId },
    });
  }

  return prisma.user.create({
    data: {
      clerkId: clerkUserId,
      email,
      username: usernameFromClerkUser(email, clerkUserId, clerkUser.username),
    },
  });
}

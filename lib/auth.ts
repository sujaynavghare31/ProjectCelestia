import { auth, currentUser } from "@clerk/nextjs/server";

export async function getAuthenticatedClerkUser() {
  if (!process.env.CLERK_SECRET_KEY) return null;

  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  return {
    clerkId: userId,
    user,
    isSuperAdmin: user.publicMetadata.role === "super_admin",
  };
}

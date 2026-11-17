const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

/**
 * Production Clerk keys are bound to their deployed domain and cannot initialize
 * from localhost. Keep the public portal usable locally while the developer
 * configures a Clerk development instance.
 */
export const isLocalClerkFallback =
  process.env.NODE_ENV === "development" && publishableKey.startsWith("pk_live_");

import { SignIn, SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { isLocalClerkFallback } from "@/lib/clerk-config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; mode?: string }>;
}) {
  const { callbackUrl, mode } = await searchParams;
  const safeCallbackUrl = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
    ? callbackUrl
    : "/saved-charts";
  const isSignUp = mode === "signup";

  if (isLocalClerkFallback) {
    return (
      <main className="cosmic-grid flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card/90 p-7 shadow-[0_24px_70px_-30px_rgba(91,61,43,0.25)] backdrop-blur-xl sm:p-9">
          <Link href="/" className="text-sm font-semibold tracking-wide text-foreground">Project Celestia</Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Local preview mode</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Clerk is configured with a production key for <strong>jyotishi.tech</strong>. Replace it with Clerk development keys to test sign-in on localhost.
          </p>
          <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-lg bg-[#C64F30] px-4 text-sm font-semibold text-white hover:bg-[#A94025]">Return to portal</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="cosmic-grid flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card/90 p-7 shadow-[0_24px_70px_-30px_rgba(91,61,43,0.25)] backdrop-blur-xl sm:p-9">
        <div className="mb-8">
          <Link href="/" className="text-sm font-semibold tracking-wide text-foreground">Project Celestia</Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{isSignUp ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isSignUp ? "Create an account to save your charts and personal notes." : "Sign in to view and manage your saved charts."}
          </p>
        </div>
        {isSignUp ? (
          <SignUp routing="hash" fallbackRedirectUrl={safeCallbackUrl} />
        ) : (
          <SignIn routing="hash" fallbackRedirectUrl={safeCallbackUrl} />
        )}
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "New to Project Celestia?"}{" "}
          <Link
            href={isSignUp ? `/login?callbackUrl=${encodeURIComponent(safeCallbackUrl)}` : `/login?mode=signup&callbackUrl=${encodeURIComponent(safeCallbackUrl)}`}
            className="font-semibold text-primary underline-offset-4 hover:text-primary-hover hover:underline"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </main>
  );
}

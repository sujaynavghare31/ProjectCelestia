import LoginForm from "@/components/LoginForm";
import Link from "next/link";

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

  return (
    <main className="cosmic-grid flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/75 p-7 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-950/75 sm:p-9">
        <div className="mb-8">
          <Link href="/" className="text-sm font-semibold tracking-wide text-indigo-700 dark:text-indigo-300">Project Celestia</Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{isSignUp ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isSignUp ? "Create an account to save your charts and personal notes." : "Sign in to view and manage your saved charts."}
          </p>
        </div>
        <LoginForm callbackUrl={safeCallbackUrl} mode={isSignUp ? "signup" : "signin"} />
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "New to Project Celestia?"}{" "}
          <Link
            href={isSignUp ? `/login?callbackUrl=${encodeURIComponent(safeCallbackUrl)}` : `/login?mode=signup&callbackUrl=${encodeURIComponent(safeCallbackUrl)}`}
            className="font-semibold text-indigo-700 underline-offset-4 hover:underline dark:text-indigo-300"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </main>
  );
}

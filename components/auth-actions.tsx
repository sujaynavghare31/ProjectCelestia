"use client";

import { SignInButton, SignOutButton, SignUpButton, useAuth, useUser } from "@clerk/nextjs";

const buttonClass = "inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-cyan-800 dark:hover:text-cyan-200";

export function AuthActions() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <p className="text-xs text-slate-600 dark:text-slate-400">Guest mode</p>;
  }

  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  if (!isLoaded || !userLoaded) return null;
  const displayName = user?.firstName ?? user?.fullName ?? user?.username ?? "there";

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <p aria-label={`Welcome, ${displayName}`} className="max-w-32 truncate text-xs text-slate-600 dark:text-slate-400 sm:max-w-48">
          Welcome, <span className="font-semibold text-slate-900 dark:text-slate-100">{displayName}</span>
        </p>
        <SignOutButton><button type="button" className={buttonClass}>Sign out</button></SignOutButton>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-3">
      <p className="text-xs text-slate-600 dark:text-slate-400">Welcome, <span className="font-semibold text-slate-900 dark:text-slate-100">guest</span></p>
      <SignInButton mode="modal"><button type="button" className={buttonClass}>Sign in</button></SignInButton>
      <SignUpButton mode="modal"><button type="button" className={buttonClass}>Sign up</button></SignUpButton>
    </div>
  );
}

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginForm({
  callbackUrl,
  mode = "signin",
}: {
  callbackUrl: string;
  mode?: "signin" | "signup";
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isSignUp = mode === "signup";

  async function submit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      if (isSignUp) {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formData.get("username"),
            email: formData.get("email"),
            password: formData.get("password"),
          }),
        });
        let result: { error?: string };
        try {
          result = await response.json() as { error?: string };
        } catch {
          throw new Error(response.ok
            ? "Account creation returned an invalid response. Please try again."
            : "Account creation is temporarily unavailable. Please try again later.");
        }
        if (!response.ok) throw new Error(result.error ?? "Account creation failed. Please try again.");
      }

      const result = await signIn("credentials", {
        username: formData.get("username"),
        password: formData.get("password"),
        redirectTo: callbackUrl,
        redirect: false,
      });
      if (result?.error === "CredentialsSignin") {
        throw new Error("Username or password is incorrect. Check your details and try again.");
      }
      if (result?.error) throw new Error("Sign-in is temporarily unavailable. Please try again later.");
      if (!result?.url) throw new Error("We couldn't start your session. Please try again.");
      window.location.assign(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign in failed. Please try again.");
      setPending(false);
    }
  }

  return (
    <form action={submit} className="space-y-5">
      <label className="block text-sm font-medium">
        Username
        <input
          name="username"
          type="text"
          autoComplete="username"
          required
          minLength={3}
          maxLength={32}
          pattern="[A-Za-z0-9._-]+"
          className="mt-2 h-11 w-full rounded-xl border border-border bg-background/80 px-3 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
        />
      </label>
      {isSignUp && (
        <label className="block text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background/80 px-3 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
          />
        </label>
      )}
      <label className="block text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          minLength={8}
          maxLength={128}
          className="mt-2 h-11 w-full rounded-xl border border-border bg-background/80 px-3 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
        />
      </label>
      {error && <p role="alert" className="rounded-lg border border-rose-300/70 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 dark:bg-indigo-500 dark:hover:bg-indigo-400"
      >
        {pending ? (isSignUp ? "Creating account…" : "Signing in…") : (isSignUp ? "Create account" : "Sign in")}
      </button>
    </form>
  );
}

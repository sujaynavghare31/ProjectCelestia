"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function SavedChartsError({ error, retry }: { error: unknown; retry: () => void }) {
  const [countdown, setCountdown] = useState(5);
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);

  useEffect(() => {
    console.error(error);
    setCountdown(5);
  }, [error]);

  useEffect(() => {
    if (!autoRetryEnabled) return;
    if (countdown === 0) {
      retry();
      setCountdown(5);
      return;
    }

    const timeout = window.setTimeout(() => setCountdown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timeout);
  }, [autoRetryEnabled, countdown, retry]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <section role="alert" className="w-full max-w-lg rounded-2xl border border-border bg-card p-7 text-center shadow-lg shadow-black/5 sm:p-9">
        <div aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#C64F30]/10 text-xl font-semibold text-[#C64F30]">!</div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Your saved charts are taking a moment</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          We couldn’t connect to your chart library just now. Your charts haven’t been deleted; we’ll try loading them again automatically.
        </p>
        <p aria-live="polite" className="mt-5 text-sm font-medium text-foreground">
          {autoRetryEnabled ? `Trying again in ${countdown} seconds…` : "Automatic retry is paused."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setCountdown(5);
              retry();
            }}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#C64F30] px-4 text-sm font-semibold text-white transition hover:bg-[#A94025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C64F30]/40 focus-visible:ring-offset-2"
          >
            Try again now
          </button>
          <button
            type="button"
            onClick={() => setAutoRetryEnabled((enabled) => !enabled)}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {autoRetryEnabled ? "Stop auto-retry" : "Resume auto-retry"}
          </button>
        </div>
        <Link href="/" className="mt-5 inline-block text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Go to homepage
        </Link>
      </section>
    </main>
  );
}
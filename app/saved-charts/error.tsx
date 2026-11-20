"use client";

export default function SavedChartsError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <section role="alert" className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Saved charts couldn’t load</h1>
        <p className="mt-2 text-sm text-muted-foreground">We couldn’t load your saved charts right now. Please try again.</p>
        <button
          type="button"
          onClick={retry}
          className="mt-5 h-10 rounded-lg bg-[#C64F30] px-4 text-sm font-semibold text-white transition hover:bg-[#A94025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C64F30]/40 focus-visible:ring-offset-2"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
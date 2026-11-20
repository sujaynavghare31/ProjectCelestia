export default function SavedChartsLoading() {
  return (
    <main
      role="status"
      aria-label="Loading saved charts"
      className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-8"
    >
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="h-4 w-36 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-9 w-56 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-4 w-80 max-w-[80vw] animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </div>
          <div className="h-9 w-40 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
        </header>
        <section className="mt-9" aria-hidden="true">
          <div className="h-6 w-32 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)] sm:p-6">
                <div className="space-y-3">
                  <div className="h-5 w-48 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                  <div className="h-4 w-36 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                  <div className="h-4 w-56 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                  <div className="h-9 w-28 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-28 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                  <div className="h-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
                  <div className="h-9 w-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

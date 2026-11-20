import CelestiaLoader from "@/components/ui/CelestiaLoader";

export default function SavedChartsLoading() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-5xl">
        <CelestiaLoader label="Loading Saved Charts…" sublabel="Opening your private chart library…" tone="dashboard" />
      </div>
    </main>
  );
}

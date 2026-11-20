import CelestiaLoader from "@/components/ui/CelestiaLoader";

export default function Loading() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <CelestiaLoader label="Preparing your celestial workspace…" sublabel="Loading the selected experience…" tone="dashboard" />
      </div>
    </main>
  );
}

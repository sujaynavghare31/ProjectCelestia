"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SavedChartsError({ error }: { error: unknown }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
    const timeout = window.setTimeout(() => router.replace("/"), 1200);
    return () => window.clearTimeout(timeout);
  }, [error, router]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <p role="status" className="text-center text-base font-medium">No chart to show. Returning to homepage…</p>
    </main>
  );
}

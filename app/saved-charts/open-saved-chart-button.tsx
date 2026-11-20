"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { PROFILE_DRAFT_STORAGE_KEY } from "@/lib/astrology/profile-draft";
import type { BirthProfile } from "@/lib/kundali-store";

export default function OpenSavedChartButton({ profile }: { profile: BirthProfile }) {
  const [error, setError] = useState<string | null>(null);

  const openChart = () => {
    try {
      window.sessionStorage.setItem(PROFILE_DRAFT_STORAGE_KEY, JSON.stringify(profile));
      window.location.assign("/#kundali-charts");
    } catch {
      setError("This chart could not be opened in the workspace. Please try again.");
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={openChart}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        Open in workspace
        <ArrowUpRight aria-hidden="true" className="size-4" />
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-rose-800 dark:text-rose-200">{error}</p>}
    </div>
  );
}

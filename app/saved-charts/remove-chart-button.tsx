"use client";

import { useFormStatus } from "react-dom";

export default function RemoveChartButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm("Remove this saved chart? This action cannot be undone.")) event.preventDefault();
      }}
      className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 disabled:cursor-wait disabled:opacity-60 dark:hover:border-rose-800 dark:hover:bg-rose-950/30 dark:hover:text-rose-200"
    >
      {pending ? "Removing…" : "Remove chart"}
    </button>
  );
}
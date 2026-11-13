"use client";

import type { DashaPeriodNode, DashaSystem } from "@/lib/astrology/timing/DashaEngine";

const CARD_STYLE: Record<string, string> = {
  Sun: "bg-orange-50 text-orange-950 dark:bg-orange-950/30 dark:text-orange-100",
  Moon: "bg-sky-50 text-sky-950 dark:bg-sky-950/30 dark:text-sky-100",
  Mars: "bg-red-50 text-red-950 dark:bg-red-950/30 dark:text-red-100",
  Mercury: "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100",
  Jupiter: "bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100",
  Venus: "bg-pink-50 text-pink-950 dark:bg-pink-950/30 dark:text-pink-100",
  Saturn: "bg-blue-50 text-blue-950 dark:bg-blue-950/30 dark:text-blue-100",
  Rahu: "bg-purple-50 text-purple-950 dark:bg-purple-950/30 dark:text-purple-100",
  Ketu: "bg-indigo-50 text-indigo-950 dark:bg-indigo-950/30 dark:text-indigo-100",
};

const LEVEL_LABELS: Record<DashaSystem, string[]> = {
  vimshottari: ["Maha", "Antar", "Pratyantar", "Sookshma"],
  ashtottari: ["Maha", "Antar", "Pratyantar"],
  yogini: ["Maha", "Antar", "Pratyantar"],
  chara: ["Maha", "Antar"],
  kalachakra: ["Deha/Jeeva Maha", "Antar"],
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function DashaSummaryCards({
  system,
  activePath,
}: {
  system: DashaSystem;
  activePath: DashaPeriodNode[];
}) {
  const labels = LEVEL_LABELS[system];
  return (
    <section aria-label="Active Dasha periods" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {labels.map((label, index) => {
        const period = activePath[index];
        const style = CARD_STYLE[period?.lord ?? ""] ?? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100";
        const role = typeof period?.details?.role === "string" ? `${period.details.role} · ` : "";
        return (
          <article key={label} className={`min-w-0 rounded-lg px-3 py-2.5 ${style}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-75">{label}</p>
              {period && <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-950">Now</span>}
            </div>
            {period ? (
              <>
                <p className="mt-1 truncate text-sm font-semibold">{label}: {role}{period.lord}</p>
                <p className="mt-1 text-[10px] leading-4 tabular-nums opacity-80">{formatDate(period.start)} - {formatDate(period.end)}</p>
              </>
            ) : (
              <p className="mt-1 text-xs opacity-70">Not active in this system</p>
            )}
          </article>
        );
      })}
    </section>
  );
}

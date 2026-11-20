"use client";

import type { DashaPeriodNode, DashaSystem } from "@/lib/astrology/timing/DashaEngine";

const CARD_STYLE: Record<string, string> = {
  Sun: "bg-accent text-accent-foreground",
  Moon: "bg-muted text-foreground",
  Mars: "bg-rose-100 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100",
  Mercury: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100",
  Jupiter: "bg-accent text-accent-foreground",
  Venus: "bg-rose-50 text-rose-950 dark:bg-rose-950/30 dark:text-rose-100",
  Saturn: "bg-muted text-foreground",
  Rahu: "bg-muted text-foreground",
  Ketu: "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100",
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
  currentPath = activePath,
}: {
  system: DashaSystem;
  activePath: DashaPeriodNode[];
  currentPath?: DashaPeriodNode[];
}) {
  const labels = LEVEL_LABELS[system];
  return (
    <section aria-label="Active Dasha periods" className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {labels.map((label, index) => {
        const period = activePath[index];
        const currentPeriod = currentPath[index];
        const isCurrent = period && currentPeriod &&
          period.lord === currentPeriod.lord &&
          (period.details?.virtualStart ?? period.start) === (currentPeriod.details?.virtualStart ?? currentPeriod.start) &&
          period.end === currentPeriod.end;
        const style = CARD_STYLE[period?.lord ?? ""] ?? "bg-muted text-foreground";
        const role = typeof period?.details?.role === "string" ? `${period.details.role} · ` : "";
        return (
          <article key={label} className={`min-w-0 rounded-lg px-3 py-2.5 ${style}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-75">{label}</p>
              {isCurrent && <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-foreground">Now</span>}
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

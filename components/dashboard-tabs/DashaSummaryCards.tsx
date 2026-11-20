"use client";

import type { DashaPeriodNode, DashaSystem } from "@/lib/astrology/timing/DashaEngine";

// AI WARNING: Dasha graph colors are user-locked. Preserve this desktop palette; change only with explicit user approval.
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

// It matches the user-approved vibrant Dasha colors in portal_theme.docx.
const MOBILE_CARD_STYLE: Record<string, string> = {
  Sun: "border border-orange-300 bg-orange-100 text-orange-950 dark:border-orange-700 dark:bg-orange-950/60 dark:text-orange-100",
  Moon: "border border-sky-300 bg-sky-100 text-sky-950 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-100",
  Mars: "border border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-100",
  Mercury: "border border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-100",
  Jupiter: "border border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100",
  Venus: "border border-pink-300 bg-pink-100 text-pink-950 dark:border-pink-700 dark:bg-pink-950/60 dark:text-pink-100",
  Saturn: "border border-slate-300 bg-slate-100 text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
  Rahu: "border border-purple-300 bg-purple-100 text-purple-950 dark:border-purple-700 dark:bg-purple-950/60 dark:text-purple-100",
  Ketu: "border border-indigo-300 bg-indigo-100 text-indigo-950 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-100",
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
  vibrantMobile = false,
}: {
  system: DashaSystem;
  activePath: DashaPeriodNode[];
  currentPath?: DashaPeriodNode[];
  vibrantMobile?: boolean;
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
        const style = vibrantMobile
          ? MOBILE_CARD_STYLE[period?.lord ?? ""] ?? "border border-border bg-muted text-foreground"
          : CARD_STYLE[period?.lord ?? ""] ?? "bg-muted text-foreground";
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

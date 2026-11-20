"use client";

import type { DashaPeriodNode, DashaSystem } from "@/lib/astrology/timing/DashaEngine";

// AI WARNING: Dasha graph colors are user-locked. Do not edit either desktop/mobile palette without explicit user approval.
// These user-approved pastels match the Dasha timeline palette and portal_theme.docx.
const CARD_STYLE: Record<string, string> = {
  Sun: "border border-orange-200 bg-orange-100 text-orange-950 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-100",
  Moon: "border border-sky-200 bg-sky-100 text-sky-950 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-100",
  Mars: "border border-pink-200 bg-pink-100 text-pink-950 dark:border-pink-800 dark:bg-pink-950/50 dark:text-pink-100",
  Mercury: "border border-green-200 bg-green-100 text-green-950 dark:border-green-800 dark:bg-green-950/50 dark:text-green-100",
  Jupiter: "border border-yellow-200 bg-yellow-100 text-yellow-950 dark:border-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-100",
  Venus: "border border-rose-200 bg-rose-100 text-rose-950 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-100",
  Saturn: "border border-[#D8C0A8] bg-[#EFE0D2] text-[#593A28] dark:border-[#795C43] dark:bg-[#4A3425] dark:text-[#F4E7DA]",
  Rahu: "border border-purple-200 bg-purple-100 text-purple-950 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-100",
  Ketu: "border border-cyan-200 bg-cyan-100 text-cyan-950 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-100",
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

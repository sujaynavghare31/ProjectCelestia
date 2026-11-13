"use client";

import type { DashaSeed } from "@/lib/astrology/timing/types";
import type { DashaSystem } from "@/lib/astrology/timing/DashaEngine";

export type DashaLagnaMode = "natural" | "maha-lord" | "antar-lord";

const SYSTEMS: Array<{ value: DashaSystem; label: string }> = [
  { value: "vimshottari", label: "Vimshottari" },
  { value: "ashtottari", label: "Ashtottari" },
  { value: "yogini", label: "Yogini" },
  { value: "chara", label: "Chara Dasha" },
  { value: "kalachakra", label: "Kalachakra" },
];

const SEEDS: Array<{ value: DashaSeed; label: string }> = [
  { value: "ascendant", label: "Ascendant" },
  { value: "moon", label: "Moon" },
  { value: "sun", label: "Sun" },
  { value: "ascendant-lord", label: "Ascendant Lord" },
];

export default function DashaControlBar({
  system,
  seed,
  lagnaMode,
  onSystemChange,
  onSeedChange,
  onLagnaModeChange,
}: {
  system: DashaSystem;
  seed: DashaSeed;
  lagnaMode: DashaLagnaMode;
  onSystemChange: (value: DashaSystem) => void;
  onSeedChange: (value: DashaSeed) => void;
  onLagnaModeChange: (value: DashaLagnaMode) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
      <label className="grid min-w-0 gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Dasha seed
        <select
          aria-label="Dasha seed"
          value={seed}
          onChange={(event) => onSeedChange(event.target.value as DashaSeed)}
          className="h-10 min-w-0 rounded-lg border border-input bg-card px-3 text-xs font-medium normal-case tracking-normal text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/40"
        >
          {SEEDS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      <label className="grid min-w-0 gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Dasha system
        <select
          aria-label="Dasha system"
          value={system}
          onChange={(event) => onSystemChange(event.target.value as DashaSystem)}
          className="h-10 min-w-0 rounded-lg border border-input bg-card px-3 text-xs font-medium normal-case tracking-normal text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/40"
        >
          {SYSTEMS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      {system === "vimshottari" && (
        <label className="grid min-w-0 gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:col-span-2 xl:col-span-1">
          Dasha lagna
          <select
            aria-label="Dasha lagna"
            value={lagnaMode}
            onChange={(event) => onLagnaModeChange(event.target.value as DashaLagnaMode)}
            className="h-10 min-w-0 rounded-lg border border-input bg-card px-3 text-xs font-medium normal-case tracking-normal text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/40"
          >
            <option value="natural">Natural (Janma)</option>
            <option value="maha-lord">Active Maha Dasha Lord</option>
            <option value="antar-lord">Active Antar Dasha Lord</option>
          </select>
        </label>
      )}
    </div>
  );
}

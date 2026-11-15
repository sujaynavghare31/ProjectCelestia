"use client";

import { Maximize2, Settings } from "lucide-react";
import type { ChartStyle } from "@/lib/kundali-types";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const CHART_STYLES: Array<{ value: ChartStyle; label: string }> = [
  { value: "diamond", label: "North" },
  { value: "south", label: "South" },
  { value: "east", label: "East" },
  { value: "placidus", label: "Placidus" },
];

function ChartStyleIcon({ style }: { style: ChartStyle }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="1.5">
      {style === "diamond" && <path d="M12 2 22 12 12 22 2 12 12 2Zm0 0v20M2 12h20" />}
      {style === "south" && <path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18" />}
      {style === "east" && <path d="M3 3h18v18H3zM12 3v18M3 12h18M3 3l18 18M21 3 3 21" />}
      {style === "placidus" && <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM2 12h20M12 2v20M5 5l14 14M19 5 5 19" />}
    </svg>
  );
}

export default function ChartControls({
  chartMode,
  chartStyle,
  onChartStyleChange,
  overlayTransits,
  onOverlayTransitsChange,
  ascendantLabel,
  referenceName,
  onReferenceNameChange,
  onOpenSettings,
  onMaximize,
}: {
  chartMode: "transit" | "birth";
  chartStyle: ChartStyle;
  onChartStyleChange: (style: ChartStyle) => void;
  overlayTransits: boolean;
  onOverlayTransitsChange: (checked: boolean) => void;
  ascendantLabel: string;
  referenceName: string;
  onReferenceNameChange: (value: string) => void;
  onOpenSettings: () => void;
  onMaximize: () => void;
}) {
  const transitLabel = chartMode === "transit" ? "Show transit labels" : "Overlay current transits";

  return (
    <div className="space-y-4 border-b border-border bg-muted/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Primary chart · D1</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{chartMode === "transit" ? "Current transit chart" : "Birth chart"}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 dark:border-amber-800/70 dark:bg-amber-400/10 dark:text-amber-200">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-500" />
            {ascendantLabel}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label
            title={chartMode === "transit"
              ? "This chart already shows current-sky positions; enable labels to mark them with T and degrees."
              : "Calculate current-sky positions and draw them over the birth chart."}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:border-indigo-300 dark:hover:border-indigo-800"
          >
            <span>{transitLabel}</span>
            <Switch
              aria-label={transitLabel}
              checked={overlayTransits}
              onCheckedChange={onOverlayTransitsChange}
              className="data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:bg-indigo-400 focus-visible:ring-indigo-500"
            />
          </label>
          <button
            type="button"
            onClick={onMaximize}
            aria-label="Expand chart to fullscreen"
            title="Expand chart to fullscreen"
            className="grid size-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-indigo-300 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:border-indigo-800 dark:hover:text-indigo-300"
          >
            <Maximize2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <fieldset className="min-w-0">
          <legend className="sr-only">Chart style</legend>
          <div role="radiogroup" aria-label="Chart style" className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-background/70 p-1">
            {CHART_STYLES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={chartStyle === value}
                aria-label={`${label}${value === "diamond" ? " / Diamond" : ""} chart`}
                onClick={() => onChartStyleChange(value)}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${chartStyle === value ? "bg-indigo-600 text-white shadow-sm dark:bg-indigo-500" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <ChartStyleIcon style={value} />
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="w-full min-w-[160px] max-w-[210px] sm:w-auto">
          <Select value={referenceName} onValueChange={onReferenceNameChange}>
            <SelectTrigger aria-label="D1 reference lagna" className="h-10 w-full bg-card text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[110] !bg-white !text-slate-900 shadow-md dark:!bg-slate-950 dark:!text-slate-100">
              <SelectGroup>
                <SelectLabel>Reference Lagna</SelectLabel>
                <SelectItem value="Ascendant">Ascendant</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Planet reference</SelectLabel>
                <SelectItem value="Sun">Sun</SelectItem>
                <SelectItem value="Moon">Moon</SelectItem>
                <SelectItem value="Jupiter">Jupiter</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>House reference</SelectLabel>
                {Array.from({ length: 12 }, (_, index) => (
                  <SelectItem key={index} value={`house:${index + 1}`}>House {index + 1}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="ml-auto inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          <Settings className="mr-2 size-4" />
          Chart Settings
        </button>
      </div>
    </div>
  );
}

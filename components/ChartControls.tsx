"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Maximize2, Settings } from "lucide-react";
import type { ChartStyle } from "@/lib/kundali-types";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  transitDate,
  transitTime,
  transitMode,
  onTransitDateChange,
  onTransitTimeChange,
  onTransitModeChange,
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
  transitDate: string;
  transitTime: string;
  transitMode: "current" | "specific";
  onTransitDateChange: (value: string) => void;
  onTransitTimeChange: (value: string) => void;
  onTransitModeChange: (value: "current" | "specific") => void;
}) {
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const customPickerRef = useRef<HTMLFieldSetElement>(null);
  const transitLabel = chartMode === "transit" ? "Show transit labels" : "Overlay current transit";
  const transitOptions = [
    { value: "off", label: "Off", active: !overlayTransits },
    { value: "live", label: "Live", active: overlayTransits && transitMode === "current" },
    { value: "custom", label: "Custom", active: overlayTransits && transitMode === "specific" },
  ] as const;

  useEffect(() => {
    if (!customPickerOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (customPickerRef.current && !customPickerRef.current.contains(event.target as Node)) setCustomPickerOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCustomPickerOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [customPickerOpen]);

  return (
    <div className="space-y-4 border-b border-border bg-muted/10 p-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Primary chart · D1</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{chartMode === "transit" ? "Current transit chart" : "Birth chart"}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
            {ascendantLabel}
          </span>
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          <fieldset
            ref={customPickerRef}
            title={chartMode === "transit"
              ? "This chart already shows current-sky positions; enable labels to mark them with T and degrees."
              : "Draw a current or date-specific transit sky over the birth chart."}
            className="relative min-w-0 w-full sm:w-auto"
          >
            <legend className="sr-only">{transitLabel}</legend>
            <div role="radiogroup" aria-label="Transit overlay" className="inline-flex max-w-full items-center rounded-full bg-background/70 p-0.5">
              {transitOptions.map(({ value, label, active }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${label} transit overlay`}
                  onClick={() => {
                    if (value === "off") {
                      onOverlayTransitsChange(false);
                      setCustomPickerOpen(false);
                      return;
                    }
                    onTransitModeChange(value === "live" ? "current" : "specific");
                    onOverlayTransitsChange(true);
                    setCustomPickerOpen(value === "custom");
                  }}
                  className={`inline-flex min-h-11 items-center rounded-full px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {overlayTransits && transitMode === "specific" && customPickerOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 flex w-full max-w-[min(22rem,calc(100vw-2rem))] flex-wrap items-end justify-end gap-2 rounded-xl border border-border bg-card p-3 shadow-lg sm:w-[22rem]">
                <label className="flex min-w-[150px] flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground sm:flex-initial">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" /> Transit date</span>
                  <input aria-label="Transit date" type="date" value={transitDate} onChange={(event) => onTransitDateChange(event.target.value)} className="h-9 rounded-lg border border-input bg-card px-2.5 text-xs text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/40" />
                </label>
                <label className="flex min-w-[130px] flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground sm:flex-initial">
                  Local time
                  <input aria-label="Transit time" type="time" step="1" value={transitTime} onChange={(event) => onTransitTimeChange(event.target.value)} className="h-9 rounded-lg border border-input bg-card px-2.5 text-xs text-card-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/40" />
                </label>
              </div>
            )}
          </fieldset>
          <button
            type="button"
            onClick={onMaximize}
            aria-label="Expand chart to fullscreen"
            title="Expand chart to fullscreen"
            className="grid size-11 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Maximize2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open chart settings"
            title="Chart settings"
            className="grid size-11 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Settings className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
        <fieldset className="min-w-0">
          <legend className="sr-only">Chart style</legend>
          <div role="radiogroup" aria-label="Chart style" className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-2xl bg-background/70 p-0.5">
            {CHART_STYLES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={chartStyle === value}
                aria-label={`${label}${value === "diamond" ? " / Diamond" : ""} chart`}
                onClick={() => onChartStyleChange(value)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${chartStyle === value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <ChartStyleIcon style={value} />
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="w-full min-w-[160px] max-w-[210px] sm:w-auto">
          <Select value={referenceName} onValueChange={onReferenceNameChange}>
            <SelectTrigger aria-label="D1 reference lagna" className="h-11 w-full rounded-full bg-card text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[110] !bg-card !text-foreground shadow-md">
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
      </div>
    </div>
  );
}

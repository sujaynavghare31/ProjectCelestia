"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, LoaderCircle, Orbit, Search, Trash2, X } from "lucide-react";
import type { ChartSettings, ChartStyle, CelestialLanguage, HouseSystem, ViewPreferences } from "@/lib/kundali-types";
import { getAyanamsaLabel } from "@/lib/ayanamsa-options";
import { matchesSavedProfileQuery } from "@/lib/saved-profile-search";
import type { SavedProfile } from "@/lib/saved-profiles-cache";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const CONTROL_CLASS = "h-9 rounded-lg border border-input bg-card px-2.5 text-xs text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40";

const CHART_STYLE_LABELS: Record<ChartStyle, string> = {
  diamond: "North",
  south: "South",
  east: "East",
  placidus: "Placidus",
  bhava: "Bhava Cusps",
};

type BooleanPreferenceKey = {
  [K in keyof ViewPreferences]-?: ViewPreferences[K] extends boolean ? K : never;
}[keyof ViewPreferences];

type PreferenceOption = {
  key: BooleanPreferenceKey;
  label: string;
  description?: string;
  disabledFor?: ChartStyle[];
};

const CHART_ELEMENT_OPTIONS: PreferenceOption[] = [
  { key: "showHouseLabels", label: "House numbers", description: "Show H1–H12 around the chart; off by default." },
  { key: "showSignNumbers", label: "Sign numbers", description: "Use Aries = 1 through Pisces = 12.", disabledFor: ["bhava"] },
];

const CELESTIAL_BODY_OPTIONS: PreferenceOption[] = [
  { key: "showOuterPlanets", label: "Outer planets", description: "Include Uranus, Neptune, and Pluto." },
  { key: "showUpagrahas", label: "Upagrahas", description: "Include Mandi and Gulika; Mandi marks Saturn’s segment midpoint, while Gulika marks its start." },
  { key: "showAsteroids", label: "Asteroids & points", description: "Include Chiron and Lilith." },
  { key: "showFortune", label: "Part of Fortune", description: "Include the calculated Fortuna point." },
];

const VISUAL_STYLE_OPTIONS: PreferenceOption[] = [
  { key: "usePlanetIcons", label: "Planet glyphs", description: "Use astrological symbols instead of names." },
  { key: "useSignIcons", label: "Sign glyphs", description: "Use zodiac symbols instead of sign names." },
  { key: "showEqualHouses", label: "Equal-house guides", description: "Overlay 30° house divisions.", disabledFor: ["diamond", "south", "east"] },
  { key: "showSignDivisions", label: "Sign divisions", description: "Overlay 30° sign boundaries.", disabledFor: ["diamond", "south", "east"] },
];

export function ChartSettingsDrawer({
  open,
  onClose,
  settings,
  chartStyle,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  settings: ChartSettings;
  chartStyle: ChartStyle;
  onApply: (settings: ChartSettings) => void;
}) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (!open) return;
    setDraft(settings);
    const activeElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), [role='combobox'], [tabindex]:not([tabindex='-1'])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (activeElement instanceof HTMLElement) activeElement.focus();
    };
  }, [onClose, open, settings]);

  if (!open || typeof document === "undefined") return null;

  const setPreference = <K extends keyof ViewPreferences>(key: K, value: ViewPreferences[K]) => {
    setDraft((current) => ({
      ...current,
      viewPreferences: { ...current.viewPreferences, [key]: value },
    }));
  };
  const renderPreferenceOptions = (options: PreferenceOption[]) => (
    <div className="grid gap-2 md:grid-cols-2">
      {options.map(({ key, label, description, disabledFor }) => {
        const unavailable = disabledFor?.includes(chartStyle) ?? false;
        const helperText = unavailable
          ? `Not available for ${CHART_STYLE_LABELS[chartStyle]} charts.`
          : description;
        return (
          <div key={key} className={`flex min-h-[72px] items-start justify-between gap-3 rounded-xl border border-border bg-card p-3 transition ${unavailable ? "" : "hover:border-stone-300 dark:hover:border-stone-600"}`}>
            <span className="min-w-0">
              <span className="block text-xs font-medium">{label}</span>
              {helperText && <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{helperText}</span>}
            </span>
            <Switch
              aria-label={label}
              checked={draft.viewPreferences[key]}
              disabled={unavailable}
              onCheckedChange={(checked) => setPreference(key, checked)}
              className="mt-0.5"
            />
          </div>
        );
      })}
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-[#46332B]/40 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chart-settings-title"
        className="flex h-full w-full flex-col border-l border-border bg-background text-foreground shadow-2xl sm:max-w-md xl:max-w-xl"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top, 0px))",
          paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
          paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
        }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-1 py-4 sm:px-2 sm:py-5">
          <div>
            <h2 id="chart-settings-title" className="text-base font-semibold">Chart Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tune calculations and chart labels.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close chart settings"
            onClick={onClose}
            className="grid size-11 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:size-9"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-1 py-5 sm:px-2 sm:py-6">
          <section aria-labelledby="general-settings-title">
            <h3 id="general-settings-title" className="border-b border-border pb-2 text-sm font-semibold">Core calculations</h3>
            <div className="mt-4 space-y-5">
              <fieldset>
                <legend className="mb-2 text-xs font-medium text-foreground">Zodiac system</legend>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {([
                    ["sidereal", "Nirayana · Sidereal", "Uses an ayanamsa offset."],
                    ["tropical", "Sayana · Tropical", "Uses the seasonal zodiac."],
                  ] as const).map(([mode, label, description]) => (
                    <label key={mode} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${draft.zodiacMode === mode ? "border-primary/30 bg-accent text-accent-foreground" : "border-border bg-card hover:border-primary/40"}`}>
                      <input
                        type="radio"
                        name="chart-zodiac-mode"
                        value={mode}
                        checked={draft.zodiacMode === mode}
                        onChange={() => setDraft((current) => ({ ...current, zodiacMode: mode }))}
                        className="mt-0.5 size-4 accent-primary"
                      />
                      <span>
                        <span className="block text-xs font-semibold">{label}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-medium text-foreground">
                  House cusp system
                  <Select
                    value={draft.houseSystem}
                    onValueChange={(value) => setDraft((current) => ({ ...current, houseSystem: value as HouseSystem }))}
                  >
                    <SelectTrigger aria-label="House cusp system" className="mt-1.5 h-11 w-full md:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[110] !bg-card !text-foreground shadow-md">
                      <SelectItem value="placidus">Placidus</SelectItem>
                      <SelectItem value="equal">Equal (Asc + 30°)</SelectItem>
                      <SelectItem value="carter">Carter (Poli-Equatorial)</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label className="block text-xs font-medium text-foreground">
                  Language &amp; initials
                  <Select
                    value={draft.language}
                    onValueChange={(value) => setDraft((current) => ({ ...current, language: value as CelestialLanguage }))}
                    disabled={draft.viewPreferences.usePlanetIcons}
                  >
                    <SelectTrigger aria-label="Chart language" className="mt-1.5 h-11 w-full md:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[110] !bg-card !text-foreground shadow-md">
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="mr">Marathi</SelectItem>
                      <SelectItem value="initials">English · initials</SelectItem>
                    </SelectContent>
                  </Select>
                  {draft.viewPreferences.usePlanetIcons && <span className="mt-1.5 block text-xs text-muted-foreground">Unavailable while planet glyphs are enabled.</span>}
                </label>
              </div>
              {draft.zodiacMode === "sidereal" && (
                <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Active Ayanamsa: <span className="font-medium text-foreground">{getAyanamsaLabel(settings.ayanamsa)}</span> (switch anytime from the top bar)
                </p>
              )}
              {draft.zodiacMode === "sidereal" && draft.ayanamsa === "custom" && (
                <label className="block max-w-sm text-xs font-medium text-foreground">
                  Custom ayanamsa degrees
                  <input
                    aria-label="Custom ayanamsa degrees"
                    type="number"
                    step="0.0001"
                    min="-360"
                    max="360"
                    value={draft.customAyanamsaDegrees}
                    onChange={(event) => setDraft((current) => ({ ...current, customAyanamsaDegrees: Number(event.target.value) }))}
                    className={`${CONTROL_CLASS} mt-1.5 h-11 w-full text-sm md:h-10`}
                  />
                </label>
              )}
            </div>
          </section>
          <section aria-labelledby="display-preferences-title">
            <h3 id="display-preferences-title" className="border-b border-border pb-2 text-sm font-semibold">Display preferences</h3>
            <p className="mt-2 text-xs text-muted-foreground">Choose which labels, bodies, and structural guides appear.</p>
            <div className="mt-3 space-y-5">
              <div>
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground">House and sign labels</h4>
                {renderPreferenceOptions(CHART_ELEMENT_OPTIONS)}
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">Bhava cusp labels</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Show each house cusp in the sign where it starts.</span>
                  </span>
                  <Switch
                    aria-label="Bhava cusp labels"
                    checked={chartStyle === "bhava" || draft.viewPreferences.showBhavaCusps}
                    disabled={chartStyle === "bhava"}
                    onCheckedChange={(checked) => setPreference("showBhavaCusps", checked)}
                  />
                </div>
                {chartStyle === "bhava" && <p className="mt-2 text-xs text-muted-foreground">Always shown in the dedicated Bhava Cusps chart mode.</p>}
                <fieldset disabled={chartStyle === "bhava" || !draft.viewPreferences.showBhavaCusps} className="mt-3 grid gap-3 sm:grid-cols-3 disabled:opacity-50">
                  <label className="text-xs font-medium">
                    Cusp sign labels
                    <select
                      value={draft.viewPreferences.cuspLabelSignStyle}
                      onChange={(event) => setPreference("cuspLabelSignStyle", event.target.value as ChartSettings["viewPreferences"]["cuspLabelSignStyle"])}
                      className={`${CONTROL_CLASS} mt-1.5 h-11 w-full text-sm md:h-10`}
                    >
                      <option value="short">Short · Vi</option>
                      <option value="full">Full · Virgo</option>
                      <option value="number">Number · 6</option>
                      <option value="hindi">Hindi · कन्या</option>
                      <option value="glyph">Glyph · ♍︎</option>
                    </select>
                  </label>
                  <label className="text-xs font-medium">
                    Cusp degree format
                    <select
                      value={draft.viewPreferences.cuspLabelDegreeFormat}
                      onChange={(event) => setPreference("cuspLabelDegreeFormat", event.target.value as ChartSettings["viewPreferences"]["cuspLabelDegreeFormat"])}
                      className={`${CONTROL_CLASS} mt-1.5 h-11 w-full text-sm md:h-10`}
                    >
                      <option value="dms">DMS · 22°47′10″</option>
                      <option value="dm">Degrees/minutes</option>
                      <option value="decimal">Decimal · 22.79°</option>
                      <option value="compact">Compact</option>
                    </select>
                  </label>
                  <label className="text-xs font-medium">
                    Cusp placement
                    <select
                      value={draft.viewPreferences.cuspLabelStyle}
                      onChange={(event) => setPreference("cuspLabelStyle", event.target.value as ChartSettings["viewPreferences"]["cuspLabelStyle"])}
                      className={`${CONTROL_CLASS} mt-1.5 h-11 w-full text-sm md:h-10`}
                    >
                      <option value="line">On the line</option>
                      <option value="box">In the sign box</option>
                    </select>
                  </label>
                </fieldset>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Additional bodies</h4>
                {renderPreferenceOptions(CELESTIAL_BODY_OPTIONS)}
                <div className="mt-2 rounded-xl border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-xs font-medium">Arudha Padas</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Show Bhava Padas (AL, UL, A2–A11) calculated via Jaimini/Parashara rules.</span>
                    </span>
                    <Switch
                      aria-label="Arudha Padas"
                      checked={draft.viewPreferences.showArudhaPadas}
                      onCheckedChange={(checked) => setPreference("showArudhaPadas", checked)}
                      className="mt-0.5"
                    />
                  </div>
                  {draft.viewPreferences.showArudhaPadas && (
                    <div className="mt-3 inline-flex rounded-lg border border-border bg-muted p-1" role="radiogroup" aria-label="Arudha Pada display">
                      {([
                        ["all", "All 12 Padas"],
                        ["al_ul_only", "AL & UL only"],
                      ] as const).map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          role="radio"
                          aria-checked={draft.viewPreferences.arudhaPadaMode === mode}
                          onClick={() => setPreference("arudhaPadaMode", mode)}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${draft.viewPreferences.arudhaPadaMode === mode ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Visual style</h4>
                {renderPreferenceOptions(VISUAL_STYLE_OPTIONS)}
              </div>
            </div>
          </section>
        </div>
        <footer className="flex flex-col gap-3 border-t border-border px-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-2">
          <p className="text-xs text-muted-foreground">Your changes stay pending until applied.</p>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={onClose} className="min-h-11 flex-1 rounded-lg border border-border px-3 text-xs font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:min-h-9 sm:flex-none">Cancel</button>
            <button type="button" onClick={() => { onApply(draft); onClose(); }} className="min-h-11 flex-1 rounded-lg bg-[#C64F30] px-3.5 text-xs font-semibold text-white transition hover:bg-[#A94025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C64F30]/40 focus-visible:ring-offset-2 sm:min-h-9 sm:flex-none">Apply Changes</button>
          </div>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

export function SaveChartDialog({
  open,
  saving,
  chartName,
  chartSummary,
  existingChart,
  mode,
  saveError,
  onClose,
  onChartNameChange,
  onModeChange,
  onSave,
}: {
  open: boolean;
  saving: boolean;
  chartName: string;
  chartSummary: string;
  existingChart: boolean;
  mode: "update" | "copy";
  saveError: string | null;
  onClose: () => void;
  onChartNameChange: (name: string) => void;
  onModeChange: (mode: "update" | "copy") => void;
  onSave: (mode: "update" | "copy", name: string) => void;
}) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nameInputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open, saving]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[#46332B]/45 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-chart-dialog-title"
        className="w-full max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card text-card-foreground shadow-2xl sm:max-w-lg"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 id="save-chart-dialog-title" className="text-base font-semibold">
              {existingChart && mode === "update" ? "Update saved chart" : existingChart ? "Save a new copy" : "Name your chart"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {existingChart ? "Choose whether to update this chart or save a separate copy." : "Add a name so you can find this chart again."}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close save chart dialog"
            onClick={onClose}
            disabled={saving}
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(mode, chartName.trim());
          }}
        >
          <div className="space-y-4 px-5 py-5 sm:px-6">
            {saveError && (
              <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                {saveError}
              </p>
            )}
            {existingChart && (
              <fieldset className="grid gap-2 sm:grid-cols-2">
                <legend className="sr-only">Save action</legend>
                <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${mode === "update" ? "border-[#C05A3A]/40 bg-[#C05A3A]/5" : "border-border"}`}>
                  <input type="radio" name="save-action" value="update" checked={mode === "update"} onChange={() => onModeChange("update")} className="accent-[#C05A3A]" />
                  Update existing
                </label>
                <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${mode === "copy" ? "border-[#C05A3A]/40 bg-[#C05A3A]/5" : "border-border"}`}>
                  <input type="radio" name="save-action" value="copy" checked={mode === "copy"} onChange={() => onModeChange("copy")} className="accent-[#C05A3A]" />
                  Save as new copy
                </label>
              </fieldset>
            )}
            <label htmlFor="save-chart-name" className="block text-sm font-medium">
              Chart name
              <input
                ref={nameInputRef}
                id="save-chart-name"
                type="text"
                maxLength={100}
                required
                autoFocus
                value={chartName}
                onChange={(event) => onChartNameChange(event.target.value)}
                placeholder="e.g. My birth chart"
                className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus:border-[#C05A3A] focus:ring-2 focus:ring-[#C05A3A]/30 sm:text-sm"
                disabled={saving}
              />
            </label>
            <p className="truncate rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground" title={chartSummary}>
              {chartSummary}
            </p>
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving || !chartName.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#C05A3A] px-4 text-sm font-semibold text-white transition hover:bg-[#A94025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/40 disabled:cursor-wait disabled:opacity-60">
              {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              {saving ? "Saving…" : existingChart && mode === "update" ? "Update existing" : existingChart ? "Save as new copy" : "Save chart"}
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}

export function SavedChartsDialog({
  open,
  loading,
  profiles,
  query,
  deletingId,
  actionError,
  actionMessage,
  onQueryChange,
  onClose,
  onCreateFirstChart,
  onSelect,
  onDelete,
}: {
  open: boolean;
  loading: boolean;
  profiles: SavedProfile[];
  query: string;
  deletingId: string | null;
  actionError: string | null;
  actionMessage: string | null;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onCreateFirstChart: () => void;
  onSelect: (profile: SavedProfile) => void;
  onDelete: (profile: SavedProfile) => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    searchRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  const visibleProfiles = profiles.filter((profile) => matchesSavedProfileQuery(profile, query));

  return createPortal(
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center bg-[#46332B]/45 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-charts-dialog-title"
        className="flex max-h-[min(720px,calc(100vh-1.5rem))] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl sm:max-h-[min(760px,calc(100vh-3rem))]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#E8D3C5] bg-[#FCE9DC] px-5 py-4 text-[#563528] dark:border-[#59443B] dark:bg-[#382D29] dark:text-[#F7E5D9] sm:px-6">
          <div>
            <h2 id="saved-charts-dialog-title" className="text-lg font-semibold">All saved charts</h2>
            <p className="mt-1 text-sm text-[#714F3D] dark:text-[#E5C8B7]">Choose a profile to open in your chart workspace.</p>
          </div>
          <button type="button" aria-label="Close saved charts" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#D9BAA6] transition hover:bg-[#F6DAC8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6522B]/40 dark:border-[#70574B] dark:hover:bg-[#493A34] dark:focus-visible:ring-[#F2B993]/50">
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="border-b border-border bg-card p-4 sm:p-5">
          <label className="relative block">
            <span className="sr-only">Search saved charts</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search names, notes, birth date, time, or any detail"
              className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {actionError && <p role="alert" className="border-b border-border px-5 py-3 text-sm text-rose-800 dark:text-rose-200">{actionError}</p>}
          {actionMessage && <p role="status" className="border-b border-border px-5 py-3 text-sm text-emerald-700 dark:text-emerald-300">{actionMessage}</p>}
          {loading ? (
            <div role="status" aria-label="Loading saved charts" className="divide-y divide-border">
              <p className="flex items-center gap-2 px-5 py-3 text-xs text-muted-foreground">
                <LoaderCircle className="size-3.5 animate-spin text-primary" aria-hidden="true" />
                Loading your saved charts
              </p>
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} aria-hidden="true" className="flex items-center gap-3 px-5 py-4 sm:px-6">
                  <div className="size-10 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-44 max-w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
                    <div className="h-3 w-56 max-w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleProfiles.length ? (
            <ul className="divide-y divide-border">
              {visibleProfiles.map((saved) => (
                <li key={saved.id}>
                  <div className="flex items-center gap-2 px-5 py-4 sm:px-6">
                    <button type="button" onClick={() => onSelect(saved)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left transition hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <Orbit className="size-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{saved.chartName || saved.fullName}</span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">{saved.city || "Coordinates"} · {saved.dateOfBirth} · {saved.timeOfBirth}</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                    {confirmingDeleteId === saved.id ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onDelete(saved)}
                          disabled={deletingId !== null}
                          className="h-9 rounded-lg bg-rose-700 px-3 text-xs font-semibold text-white transition hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 disabled:cursor-wait disabled:opacity-60"
                        >
                          {deletingId === saved.id ? "Removing…" : "Remove"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(null)}
                          disabled={deletingId !== null}
                          className="h-9 rounded-lg border border-border px-3 text-xs font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(saved.id)}
                        disabled={deletingId !== null}
                        aria-label={`Remove ${saved.chartName || saved.fullName}`}
                        className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 disabled:opacity-60 dark:hover:border-rose-800 dark:hover:bg-rose-950/30 dark:hover:text-rose-200"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-12 text-center sm:px-6">
              <span className="mx-auto grid size-11 place-items-center rounded-full bg-[#F9E8DD] text-[#A6522B] dark:bg-[#45342D] dark:text-[#F2B993]">
                <Orbit className="size-6" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-medium">{profiles.length ? "No matching charts" : "You don’t have any saved charts yet"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{profiles.length ? "Try a different search." : "Save your first chart and continue your journey with Jyotishi."}</p>
              {!profiles.length && (
                <button
                  type="button"
                  onClick={onCreateFirstChart}
                  className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-[#C64F30] px-4 text-sm font-semibold text-white transition hover:bg-[#A94025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C64F30]/40 focus-visible:ring-offset-2"
                >
                  Save your first chart
                </button>
              )}
            </div>
          )}
        </div>

        <footer className="border-t border-border bg-muted/40 px-5 py-3 text-center text-xs text-muted-foreground sm:px-6">
          {profiles.length} {profiles.length === 1 ? "saved chart" : "saved charts"}
        </footer>
      </section>
    </div>,
    document.body,
  );
}


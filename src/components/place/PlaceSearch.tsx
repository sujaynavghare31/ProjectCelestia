"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Crosshair, LoaderCircle, MapPin, Search, X } from "lucide-react";
import { formatPlaceLabel, type Place } from "@/src/lib/geocode/place";

const RECENTS_KEY = "celestia:recent-places:v1";
const POPULAR_PLACES = ["Mumbai", "Delhi", "Bengaluru", "Kolkata", "Chennai", "Prayagraj", "London", "New York"];

type GeocodePlace = Omit<Place, "source"> & { label?: string };
type Suggestion = Place & { label: string };

function isPlace(value: unknown): value is Place {
  if (typeof value !== "object" || value === null) return false;
  const place = value as Partial<Place>;
  return typeof place.name === "string"
    && typeof place.country === "string"
    && Number.isFinite(place.latitude)
    && Number.isFinite(place.longitude)
    && typeof place.timezone === "string";
}

function toPlace(result: GeocodePlace, source: Place["source"]): Suggestion {
  const place: Place = { ...result, source };
  return { ...place, label: formatPlaceLabel(place) };
}

function inputClassName(compact: boolean) {
  return `h-11 w-full min-w-0 rounded-lg border border-input bg-card pl-9 pr-[5.5rem] text-sm text-card-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60 ${compact ? "xl:h-9" : ""}`;
}

export default function PlaceSearch({
  value,
  onChange,
  label = "Place of birth",
  compact = false,
  disabled = false,
  onInvalidDraftChange,
}: {
  value: Place;
  onChange: (place: Place) => void;
  label?: string;
  compact?: boolean;
  disabled?: boolean;
  onInvalidDraftChange?: (invalid: boolean) => void;
}) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const editingRef = useRef(false);
  const detectController = useRef<AbortController | null>(null);
  const selectedLabel = formatPlaceLabel(value);
  const [query, setQuery] = useState(selectedLabel);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [recents, setRecents] = useState<Suggestion[]>([]);
  const [popular, setPopular] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [coordinatesOpen, setCoordinatesOpen] = useState(false);
  const [latitude, setLatitude] = useState(String(value.latitude));
  const [longitude, setLongitude] = useState(String(value.longitude));
  const [timezone, setTimezone] = useState(value.timezone);
  const [coordinatesError, setCoordinatesError] = useState("");
  const [detectingTimezone, setDetectingTimezone] = useState(false);

  const suggestions = useMemo(() => {
    if (query.trim().length >= 2) return results;
    if (query.trim()) return [];
    if (recents.length) return [...recents, ...popular.filter((item) => !recents.some((recent) => recent.name === item.name))].slice(0, 8);
    return popular.slice(0, 8);
  }, [popular, query, recents, results]);

  useEffect(() => {
    if (!editingRef.current) setQuery(selectedLabel);
  }, [selectedLabel]);

  const loadLocalSuggestions = useCallback(async () => {
    try {
      const recentValues: unknown = JSON.parse(window.localStorage.getItem(RECENTS_KEY) ?? "[]");
      const validRecents = Array.isArray(recentValues)
        ? recentValues.filter(isPlace).slice(0, 5).map((place) => toPlace(place, "recent"))
        : [];
      setRecents(validRecents);
    } catch (caught) {
      console.error("[place-search] Unable to read recent places.", caught);
      setNotice("Saved places are unavailable in this browser; popular places are still available.");
    }

    try {
      const { findStaticCities } = await import("@/lib/geocode/city-index");
      const popularResults = POPULAR_PLACES.flatMap((name) => {
        const [place] = findStaticCities(name);
        return place ? [toPlace(place, "popular")] : [];
      });
      setPopular(popularResults);
    } catch (caught) {
      console.error("[place-search] Unable to load popular places.", caught);
      setError("Popular places could not be loaded. Search by name or enter coordinates.");
    }
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      setNotice("");
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const payload = await response.json() as { results?: GeocodePlace[]; source?: string; error?: string };
        if (!response.ok || !Array.isArray(payload.results)) {
          throw new Error(payload.error ?? `Place search failed (${response.status}).`);
        }
        const source = payload.source === "offline" ? "offline" : "search";
        setResults(payload.results.map((place) => toPlace(place, source)));
        if (source === "offline" && payload.results.length > 0) setNotice("Showing offline city matches.");
        if (payload.results.length === 0) setNotice("No places found. Try a nearby town or enter coordinates.");
      } catch (caught) {
        if (controller.signal.aborted) return;
        try {
          const { findStaticCities } = await import("@/lib/geocode/city-index");
          const fallback = findStaticCities(query.trim()).map((place) => toPlace(place, "offline"));
          setResults(fallback);
          setNotice(fallback.length ? "Showing offline city matches." : "");
          setError(fallback.length ? "" : "Place search is unavailable. Try again or enter coordinates.");
        } catch (fallbackError) {
          console.error("[place-search] Place search and offline fallback failed.", { caught, fallbackError });
          setResults([]);
          setError("Place search is unavailable. Try again or enter coordinates.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, query]);

  useEffect(() => {
    if (open && !query.trim()) void loadLocalSuggestions();
  }, [loadLocalSuggestions, open, query]);

  useEffect(() => () => detectController.current?.abort(), []);

  const selectPlace = (place: Suggestion) => {
    const selected = { ...place, source: place.source === "popular" ? "popular" as const : "search" as const };
    onChange(selected);
    setQuery(formatPlaceLabel(selected));
    editingRef.current = false;
    setOpen(false);
    setCoordinatesOpen(false);
    setResults([]);
    setError("");
    setNotice("");
    setActiveIndex(-1);
    onInvalidDraftChange?.(false);

    try {
      const recent = [{ ...selected, source: "recent" as const }, ...recents.filter((item) => item.name !== selected.name || item.country !== selected.country)].slice(0, 5);
      window.localStorage.setItem(RECENTS_KEY, JSON.stringify(recent));
      setRecents(recent.map((item) => toPlace(item, "recent")));
    } catch (caught) {
      console.error("[place-search] Unable to save a recent place.", caught);
      setNotice("Place selected, but this browser could not save it to recents.");
    }
  };

  const setActive = (index: number) => {
    setActiveIndex(index);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && open) {
      event.preventDefault();
      setActive(Math.min(activeIndex + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp" && open) {
      event.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      const index = activeIndex < 0 ? 0 : activeIndex;
      if (suggestions[index]) selectPlace(suggestions[index]);
      else setError("Choose a place from the suggestions or enter coordinates.");
    } else if (event.key === "Escape") {
      setOpen(false);
      setQuery(selectedLabel);
      editingRef.current = false;
      onInvalidDraftChange?.(false);
    }
  };

  const handleBlur = () => {
    window.setTimeout(() => {
      if (containerRef.current?.contains(document.activeElement)) return;
      setOpen(false);
      editingRef.current = false;
      if (query.trim() !== selectedLabel) {
        setQuery(selectedLabel);
        setError("Choose a place from the suggestions before continuing.");
        onInvalidDraftChange?.(true);
      } else {
        onInvalidDraftChange?.(false);
      }
    }, 0);
  };

  const detectTimezone = async () => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setCoordinatesError("Enter a latitude from −90 to 90 and longitude from −180 to 180.");
      return;
    }
    detectController.current?.abort();
    const controller = new AbortController();
    detectController.current = controller;
    setDetectingTimezone(true);
    setCoordinatesError("");
    try {
      const response = await fetch(`/api/geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`, { signal: controller.signal });
      const payload = await response.json() as { timezone?: string; error?: string };
      if (!response.ok || !payload.timezone) throw new Error(payload.error ?? "Time zone could not be detected.");
      setTimezone(payload.timezone);
    } catch (caught) {
      if (!controller.signal.aborted) setCoordinatesError(caught instanceof Error ? caught.message : "Time zone could not be detected; enter an IANA time zone.");
    } finally {
      if (!controller.signal.aborted) setDetectingTimezone(false);
    }
  };

  const applyCoordinates = () => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setCoordinatesError("Enter a latitude from −90 to 90 and longitude from −180 to 180.");
      return;
    }
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date());
    } catch {
      setCoordinatesError("Enter a valid IANA time zone, or use Detect time zone.");
      return;
    }
    const place: Place = {
      name: "Custom coordinates",
      country: "",
      latitude: lat,
      longitude: lng,
      timezone,
      source: "custom",
    };
    onChange(place);
    setQuery(formatPlaceLabel(place));
    editingRef.current = false;
    setCoordinatesOpen(false);
    setOpen(false);
    setCoordinatesError("");
    setError("");
    onInvalidDraftChange?.(false);
  };

  const openCoordinates = () => {
    setLatitude(String(value.latitude));
    setLongitude(String(value.longitude));
    setTimezone(value.timezone);
    setCoordinatesError("");
    setOpen(false);
    setCoordinatesOpen(true);
  };

  const inputId = `${id}-input`;
  const listboxId = `${id}-listbox`;
  const statusId = `${id}-status`;

  return (
    <div ref={containerRef} className="relative min-w-0">
      <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-foreground">{label}</label>
      <div className="relative">
        <MapPin aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={open && suggestions.length > 0 ? listboxId : undefined}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          aria-describedby={statusId}
          autoComplete="off"
          maxLength={160}
          value={query}
          disabled={disabled}
          placeholder="Search any city or town…"
          className={inputClassName(compact)}
          onFocus={() => {
            editingRef.current = true;
            setOpen(true);
            setError("");
          }}
          onBlur={handleBlur}
          onChange={(event) => {
            const nextQuery = event.target.value;
            editingRef.current = true;
            setQuery(nextQuery);
            setOpen(true);
            setError("");
            setNotice("");
            setActive(-1);
            onInvalidDraftChange?.(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {loading
          ? <LoaderCircle aria-hidden="true" className="absolute right-[5.25rem] top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />
          : <Search aria-hidden="true" className="absolute right-[5.25rem] top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />}
        {query && (
          <button
            type="button"
            aria-label="Clear place search"
            title="Clear place search"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              editingRef.current = true;
              setQuery("");
              setOpen(true);
              setError("");
              setNotice("");
              onInvalidDraftChange?.(true);
            }}
            className="absolute right-10 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          aria-label="Enter coordinates"
          title="Enter coordinates"
          onMouseDown={(event) => event.preventDefault()}
          onClick={openCoordinates}
          className={`absolute right-0 top-1/2 grid h-11 w-10 -translate-y-1/2 place-items-center rounded-r-lg text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${compact ? "xl:h-9" : ""}`}
        >
          Coords
        </button>
      </div>

      {(open || coordinatesOpen) && (
        <div className="absolute left-0 right-0 top-full z-[60] mt-1">
          {open && !coordinatesOpen && (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
              {suggestions.length > 0 ? (
                <ul id={listboxId} role="listbox" aria-label={`${label} suggestions`} className="max-h-64 overflow-y-auto p-1">
                  {suggestions.map((place, index) => (
                    <li
                      id={`${listboxId}-option-${index}`}
                      key={`${place.name}-${place.country}-${place.latitude}-${place.longitude}`}
                      role="option"
                      aria-selected={activeIndex === index}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => selectPlace(place)}
                      className={`cursor-pointer rounded-lg px-3 py-2.5 text-left ${activeIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium">{place.label}</span>
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {place.source}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)} · {place.timezone}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-3 text-xs text-muted-foreground">
                  {query.trim().length < 2 ? "Type at least 2 characters to search, or choose a recent place." : loading ? "Searching places…" : "No places found. Try a nearby town or enter coordinates."}
                </p>
              )}
            </div>
          )}

          {coordinatesOpen && (
            <section aria-label="Enter birth-place coordinates" className="rounded-xl border border-border bg-card p-3 shadow-xl">
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-[11px] font-medium">
                  Latitude
                  <input aria-label="Place latitude" type="number" step="any" min="-90" max="90" value={latitude} onChange={(event) => setLatitude(event.target.value)} className="h-10 min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
                </label>
                <label className="grid gap-1 text-[11px] font-medium">
                  Longitude
                  <input aria-label="Place longitude" type="number" step="any" min="-180" max="180" value={longitude} onChange={(event) => setLongitude(event.target.value)} className="h-10 min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
                </label>
              </div>
              <label className="mt-2 grid gap-1 text-[11px] font-medium">
                IANA time zone
                <span className="flex min-w-0 gap-2">
                  <input aria-label="IANA time zone" value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Asia/Kolkata" className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
                  <button type="button" onClick={detectTimezone} disabled={detectingTimezone} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium transition hover:bg-muted disabled:opacity-60">
                    {detectingTimezone ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : <Crosshair aria-hidden="true" className="size-3.5" />}
                    Detect
                  </button>
                </span>
              </label>
              {coordinatesError && <p role="alert" className="mt-2 text-xs text-rose-700 dark:text-rose-300">{coordinatesError}</p>}
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setCoordinatesOpen(false)} className="h-9 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted">Cancel</button>
                <button type="button" onClick={applyCoordinates} className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover">Apply coordinates</button>
              </div>
            </section>
          )}
        </div>
      )}

      <p id={statusId} role={error ? "alert" : "status"} aria-live="polite" className={`mt-1 min-h-4 text-[10px] leading-4 ${error ? "text-rose-700 dark:text-rose-300" : "text-muted-foreground"}`}>
        {error || notice || (open && loading ? "Searching…" : "")}
      </p>
    </div>
  );
}

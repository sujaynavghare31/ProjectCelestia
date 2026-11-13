"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  CalendarDays,
  Clock3,
  LoaderCircle,
  MapPin,
  Moon,
  Search,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PanchangDay, PanchangTiming } from "@/lib/astrology/panchang/PanchangEngine";
import { PanchangTimeline } from "./PanchangTimeline";
import { PanchangInsights } from "./PanchangInsights";

interface PanchangLocation {
  label: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

const DEFAULT_LOCATION: PanchangLocation = {
  label: "Mumbai, Maharashtra, India",
  city: "Mumbai, India",
  latitude: 19.076,
  longitude: 72.8777,
  timezone: "Asia/Kolkata",
};

function localDateKey(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

function formatTime(value: string | null, timezone: string) {
  if (!value) return "Unavailable";
  return formatInTimeZone(new Date(value), timezone, "h:mm a");
}

function formatDate(value: string) {
  return format(parseISO(value), "EEEE, d MMMM yyyy");
}

function formatWindow(start: string, end: string, timezone: string, selectedDate: string) {
  const formatEvent = (value: string) => {
    const eventDate = new Date(value);
    const dateSuffix = localDateKey(eventDate, timezone) === selectedDate
      ? ""
      : ` · ${formatInTimeZone(eventDate, timezone, "d MMM")}`;
    return `${formatTime(value, timezone)}${dateSuffix}`;
  };
  return `${formatEvent(start)} – ${formatEvent(end)}`;
}

function TimingTable({
  title,
  timings,
  tone,
  timezone,
  date,
}: {
  title: string;
  timings: PanchangTiming[];
  tone: "rose" | "emerald";
  timezone: string;
  date: string;
}) {
  const rowTone = tone === "rose"
    ? "bg-rose-50 dark:bg-rose-900/20"
    : "bg-emerald-50 dark:bg-emerald-900/20";
  const titleTone = tone === "rose"
    ? "text-rose-950 dark:text-rose-100"
    : "text-emerald-950 dark:text-emerald-100";

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className={`text-sm font-semibold ${titleTone}`}>{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">Timing</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Local time</th>
            </tr>
          </thead>
          <tbody>
            {timings.map((timing) => (
              <tr key={timing.name} className={`${rowTone} border-t border-border/70`}>
                <th scope="row" className="px-4 py-3 align-top font-medium text-card-foreground">
                  {timing.name}
                  {timing.note && <span className="mt-1 block max-w-[34ch] text-[10px] font-normal leading-4 text-muted-foreground">{timing.note}</span>}
                </th>
                <td className="px-4 py-3 text-right align-top tabular-nums text-card-foreground">
                  {timing.windows.length
                    ? <span className="inline-flex flex-col items-end gap-1">{timing.windows.map((window) => <span key={`${window.start}-${window.end}`}>{formatWindow(window.start, window.end, timezone, date)}</span>)}</span>
                    : <span className="text-muted-foreground">Unavailable today</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ActivePanchangSummary({ data }: { data: PanchangDay }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const start = Date.parse(data.timeline.start);
  const end = Date.parse(data.timeline.end);
  const nowTime = now?.getTime() ?? 0;
  const isLive = now !== null &&
    localDateKey(now, data.timezone) === data.date &&
    nowTime >= start && nowTime < end;
  const activeTime = isLive ? nowTime : start;
  const activeAt = isLive && now
    ? `Now · ${formatInTimeZone(now, data.timezone, "h:mm a")}`
    : "At selected sunrise";
  const activeValues = ["tithi", "nakshatra", "yoga", "karana"].map((key) => {
    const track = data.timeline.tracks.find((candidate) => candidate.key === key);
    const segment = track?.segments.find((candidate) => {
      const segmentStart = Date.parse(candidate.start);
      const segmentEnd = Date.parse(candidate.end);
      return activeTime >= segmentStart && activeTime < segmentEnd;
    }) ?? track?.segments[0];
    return {
      label: track?.label ?? key,
      value: segment?.name ?? "Unavailable",
      detail: segment ? `Until ${formatTime(segment.end, data.timezone)}` : "",
    };
  });
  const summaryItems = [
    { label: "Weekday", value: data.panchangAtSunrise.weekday, detail: "At selected sunrise" },
    ...activeValues,
    {
      label: "Moon sign",
      value: data.astronomy.moonSign,
      detail: `${data.astronomy.moonDegree.toFixed(2)}° · Pada ${data.astronomy.moonNakshatraPada} at sunrise`,
    },
  ];

  return (
    <section aria-label="Active Panchang summary" className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-[0_12px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 dark:shadow-[0_12px_42px_rgba(2,6,23,0.28)]">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/70 px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold">Active Panchang</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">Tithi, Nakshatra, Yoga, and Karana follow the selected Vedic day.</p>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-950 dark:bg-amber-300/15 dark:text-amber-100">{activeAt}</span>
      </div>
      <dl className="grid grid-cols-2 divide-x divide-y divide-border/70 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
        {summaryItems.map(({ label, value, detail }) => (
          <div key={label} className="min-w-0 px-4 py-4">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-1 truncate text-base font-semibold text-card-foreground" title={value}>{value}</dd>
            <p className="mt-1 truncate text-[10px] tabular-nums text-muted-foreground" title={detail}>{detail}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function PanchangDashboard() {
  const [date, setDate] = useState(() => localDateKey(new Date(), DEFAULT_LOCATION.timezone));
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [locationQuery, setLocationQuery] = useState(DEFAULT_LOCATION.label);
  const [locationResults, setLocationResults] = useState<PanchangLocation[]>([]);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [data, setData] = useState<PanchangDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setLocationSearchError(null);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(locationQuery.trim())}`, {
          signal: controller.signal,
        });
        const result = await response.json() as { results?: PanchangLocation[]; error?: string };
        if (!response.ok || result.error) {
          throw new Error(result.error ?? `Place search failed (${response.status}).`);
        }
        if (!Array.isArray(result.results)) throw new Error("Place search returned an invalid result.");
        setLocationResults(result.results);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setLocationResults([]);
        setLocationSearchError(requestError instanceof Error ? requestError.message : "Place search failed.");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);

    if (locationQuery.trim().length < 2 || locationQuery === location.label) {
      window.clearTimeout(timeout);
      setLocationResults([]);
      setLocationSearchError(null);
      setSearching(false);
    }

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [location.label, locationQuery]);

  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const params = new URLSearchParams({
          date,
          lat: String(location.latitude),
          lng: String(location.longitude),
        });
        const response = await fetch(`/api/panchang?${params}`, { signal: controller.signal });
        const result = await response.json() as PanchangDay | { error?: string };
        if (!response.ok || !("timeline" in result)) {
          throw new Error("error" in result ? result.error ?? `Panchang calculation failed (${response.status}).` : `Panchang calculation failed (${response.status}).`);
        }
        setData(result);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : "Panchang calculation failed.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [date, location.latitude, location.longitude]);

  const chooseLocation = (result: PanchangLocation) => {
    setLocation(result);
    setLocationQuery(result.label);
    setLocationResults([]);
    setLocationSearchError(null);
  };

  const solarEvents: Array<{
    label: string;
    value: string;
    Icon: LucideIcon;
    tone: string;
  }> = data ? [
    { label: "Sunrise", value: formatTime(data.solarEvents.sunrise, data.timezone), Icon: Sunrise, tone: "text-orange-700 dark:text-orange-300" },
    { label: "Solar noon", value: formatTime(data.solarEvents.solarNoon, data.timezone), Icon: Sun, tone: "text-amber-700 dark:text-amber-300" },
    { label: "Sunset", value: formatTime(data.solarEvents.sunset, data.timezone), Icon: Sunset, tone: "text-rose-700 dark:text-rose-300" },
    { label: "Civil twilight", value: data.solarEvents.civilDawn && data.solarEvents.civilDusk
      ? `${formatTime(data.solarEvents.civilDawn, data.timezone)} – ${formatTime(data.solarEvents.civilDusk, data.timezone)}`
      : "Unavailable", Icon: Clock3, tone: "text-indigo-700 dark:text-indigo-300" },
    { label: "Moonrise", value: formatTime(data.solarEvents.moonrise, data.timezone), Icon: Moon, tone: "text-sky-700 dark:text-sky-300" },
    { label: "Moonset", value: formatTime(data.solarEvents.moonset, data.timezone), Icon: Moon, tone: "text-indigo-700 dark:text-indigo-300" },
  ] : [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Daily Panchang</h1>
          <p className="mt-1 text-xs text-muted-foreground">Sunrise-based Vedic day calculations from Swiss Ephemeris.</p>
        </div>
        {data && <p className="text-xs tabular-nums text-muted-foreground">{formatDate(date)}</p>}
      </header>

      <section aria-label="Panchang controls" className="sticky top-0 z-20 grid gap-3 rounded-2xl border border-white/60 bg-background/85 p-4 shadow-[0_8px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85 dark:shadow-[0_8px_28px_rgba(2,6,23,0.32)] md:grid-cols-[minmax(190px,0.65fr)_minmax(300px,1.35fr)]">
        <div>
          <label htmlFor="panchang-date" className="mb-1.5 block text-xs font-medium text-foreground">Date</label>
          <span className="relative block">
            <CalendarDays aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="panchang-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </span>
        </div>

        <div className="relative">
          <label htmlFor="panchang-location" className="mb-1.5 block text-xs font-medium text-foreground">Location</label>
          <span className="relative block">
            <MapPin aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="panchang-location"
              type="search"
              value={locationQuery}
              onChange={(event) => setLocationQuery(event.target.value)}
              placeholder="Search a city or place"
              autoComplete="off"
              aria-autocomplete="list"
              aria-controls="panchang-location-results"
              aria-expanded={locationResults.length > 0}
              className="h-10 w-full rounded-lg border border-input bg-background py-2 pl-9 pr-10 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            {searching
              ? <LoaderCircle aria-label="Searching places" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />
              : <Search aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />}
          </span>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Selected: {location.city} · {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)} · {location.timezone}
          </p>
          {locationSearchError && <p role="status" className="mt-1 text-xs text-destructive">{locationSearchError}</p>}
          {locationResults.length > 0 && (
            <ul id="panchang-location-results" role="listbox" aria-label="Location search results" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg">
              {locationResults.map((result) => (
                <li key={`${result.label}-${result.latitude}-${result.longitude}`} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseLocation(result)}
                    className="w-full rounded-md px-2.5 py-2 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <span className="block truncate text-xs font-medium text-foreground">{result.city}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{result.label} · {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)} · {result.timezone}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      )}

      {loading && (
        <div role="status" aria-label="Loading Panchang" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl border border-border bg-card" />)}
          </div>
          <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      )}

      {data && !loading && (
        <>
          <ActivePanchangSummary data={data} />

          <section aria-label="Solar and lunar events" className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
            {solarEvents.map(({ label, value, Icon, tone }) => (
              <article key={label} className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_12px_42px_rgba(15,23,42,0.04)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 dark:shadow-[0_12px_42px_rgba(2,6,23,0.2)]">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-medium text-muted-foreground">{label}</h2>
                  <Icon aria-hidden="true" className={`size-4 ${tone}`} />
                </div>
                <p className="mt-3 truncate text-xl font-semibold tabular-nums tracking-tight text-card-foreground" title={value}>{value}</p>
              </article>
            ))}
          </section>

          <PanchangTimeline data={data} />

          <div className="grid gap-4 xl:grid-cols-2">
            <TimingTable
              title="Inauspicious timings"
              timings={data.timings.inauspicious}
              tone="rose"
              timezone={data.timezone}
              date={date}
            />
            <TimingTable
              title="Auspicious timings"
              timings={data.timings.auspicious}
              tone="emerald"
              timezone={data.timezone}
              date={date}
            />
          </div>

          <PanchangInsights data={data} />

          {data.notes.length > 0 && (
            <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
              {data.notes.map((note) => <p key={note}>{note}</p>)}
            </div>
          )}
          <p className="flex items-start gap-2 text-[10px] leading-5 text-muted-foreground">
            <Clock3 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            {data.timings.note}
          </p>
        </>
      )}
    </div>
  );
}

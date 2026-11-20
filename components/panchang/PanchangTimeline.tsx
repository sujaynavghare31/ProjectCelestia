"use client";

import { useEffect, useRef, useState } from "react";
import { differenceInMilliseconds } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { motion, useReducedMotion } from "framer-motion";
import type { PanchangDay, PanchangSegment } from "@/lib/astrology/panchang/PanchangEngine";
import { isWithinPanchangTimeline } from "@/lib/astrology/panchang/timeline-utils";

const TRACK_COLORS = [
  "border-border bg-muted text-foreground",
  "border-primary/30 bg-accent text-accent-foreground",
  "border-rose-200 bg-rose-100 text-rose-950 dark:border-rose-800/60 dark:bg-rose-900/35 dark:text-rose-100",
  "border-primary/30 bg-accent text-accent-foreground",
];
const MUHURTA_COLORS = {
  auspicious: "border-emerald-200 bg-emerald-100 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-900/35 dark:text-emerald-100",
  inauspicious: "border-rose-200 bg-rose-100 text-rose-950 dark:border-rose-800/60 dark:bg-rose-900/35 dark:text-rose-100",
  neutral: "border-border bg-muted text-foreground",
};

function localDateKey(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

function formatTime(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "h:mm a");
}

function formatEventTime(value: string, timezone: string, selectedDate: string) {
  const date = new Date(value);
  const time = formatTime(date, timezone);
  if (localDateKey(date, timezone) === selectedDate) return time;
  const day = formatInTimeZone(date, timezone, "EEE, d MMM");
  return `${time} · ${day}`;
}

function blockLabel(segment: PanchangSegment, timezone: string, selectedDate: string) {
  return `${segment.name}, ${formatEventTime(segment.start, timezone, selectedDate)} to ${formatEventTime(segment.end, timezone, selectedDate)}`;
}

function MobilePanchangTimeline({
  data,
  now,
  isNowInSelectedDay,
  nowTime,
  nowPercent,
  sunsetPercent,
  duration,
}: {
  data: PanchangDay;
  now: Date | null;
  isNowInSelectedDay: boolean;
  nowTime: number;
  nowPercent: number;
  sunsetPercent: number;
  duration: number;
}) {
  const start = Date.parse(data.timeline.start);
  const end = Date.parse(data.timeline.end);
  const sunset = Date.parse(data.solarEvents.sunset);
  const activeTime = isNowInSelectedDay ? nowTime : start;
  const slowTracks = data.timeline.tracks.filter(({ key }) =>
    key === "tithi" || key === "nakshatra" || key === "yoga" || key === "karana",
  );
  const denseTracks = data.timeline.tracks.filter(({ key }) => key === "muhurta" || key === "hora");
  const activeSegments = denseTracks.map((track) => ({
    key: track.key,
    segment: track.segments.find(({ start: segmentStart, end: segmentEnd }) =>
      activeTime >= Date.parse(segmentStart) && activeTime < Date.parse(segmentEnd),
    ),
  }));
  const activeCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const activeCardKeys = isNowInSelectedDay
    ? activeSegments.map(({ key, segment }) => segment ? `${key}-${segment.index}-${segment.start}` : "").join("|")
    : "";

  useEffect(() => {
    if (!isNowInSelectedDay) return;
    for (const key of activeCardKeys.split("|")) {
      if (!key) continue;
      const card = activeCardRefs.current[key];
      const strip = card?.parentElement;
      if (!card || !strip) continue;
      strip.style.paddingInline = `${Math.max(0, (strip.clientWidth - card.offsetWidth) / 2)}px`;
      card.scrollIntoView({ inline: "center", block: "nearest" });
    }
  }, [activeCardKeys, isNowInSelectedDay]);

  const transformAt = (percent: number) => percent < 15 ? "translateX(0%)"
    : percent > 85 ? "translateX(-100%)" : "translateX(-50%)";

  return (
    <section aria-label="Panchang timeline" className="space-y-4 rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-sm">
      <header>
        <h2 className="text-sm font-semibold">Sunrise-to-sunrise timeline</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatTime(new Date(start), data.timezone)} sunrise
          <span className="mx-1 text-border">→</span>
          {formatTime(new Date(end), data.timezone)} tomorrow
        </p>
      </header>

      <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2.5 py-2 text-[10px] font-semibold tabular-nums">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-primary">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-primary" />
          <span className="truncate">{isNowInSelectedDay && now ? `NOW · ${formatTime(now, data.timezone)}` : "Selected sunrise"}</span>
        </span>
        <span className="shrink-0 text-muted-foreground">Sunset · {formatTime(new Date(sunset), data.timezone)}</span>
      </div>

      <div className="relative space-y-3">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 top-7 z-20 border-l border-dashed border-muted-foreground/60"
          style={{ left: `${sunsetPercent}%` }}
        />
        {isNowInSelectedDay && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 top-7 z-20 border-l-2 border-dashed border-primary/70"
            style={{ left: `${nowPercent}%` }}
          />
        )}

        {slowTracks.map((track) => {
          const current = track.segments.find(({ start: segmentStart, end: segmentEnd }) =>
            activeTime >= Date.parse(segmentStart) && activeTime < Date.parse(segmentEnd),
          );
          const trackIndex = data.timeline.tracks.findIndex(({ key }) => key === track.key);
          const colorClass = TRACK_COLORS[trackIndex] ?? MUHURTA_COLORS.neutral;
          return (
            <div key={track.key} className="relative space-y-1.5">
              <div className="flex min-w-0 items-baseline justify-between gap-2">
                <h3 className="shrink-0 text-xs font-semibold">{track.label}</h3>
                <span className="min-w-0 truncate text-right text-xs font-medium text-muted-foreground">{current?.name ?? "Unavailable"}</span>
              </div>
              <div
                role="group"
                aria-label={`${track.label} periods`}
                className="flex h-8 min-w-0 overflow-hidden rounded-md bg-muted/40 ring-1 ring-inset ring-border/70"
              >
                {track.segments.map((segment) => {
                  const segmentDuration = Date.parse(segment.end) - Date.parse(segment.start);
                  const width = duration > 0 ? Math.max(0, (segmentDuration / duration) * 100) : 0;
                  return width > 0 ? (
                    <span
                      key={`${track.key}-${segment.index}-${segment.start}`}
                      title={blockLabel(segment, data.timezone, data.date)}
                      className={`h-full shrink-0 border-r ${colorClass}`}
                      style={{ width: `${width}%` }}
                    />
                  ) : null;
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative h-4 text-[9px] tabular-nums text-muted-foreground">
        <span className="absolute left-0 top-0">{formatTime(new Date(start), data.timezone)}</span>
        <span
          className="absolute top-0 whitespace-nowrap"
          style={{ left: `${sunsetPercent}%`, transform: transformAt(sunsetPercent) }}
        >
          {formatTime(new Date(sunset), data.timezone)}
        </span>
        <span className="absolute right-0 top-0">{formatTime(new Date(end), data.timezone)}</span>
      </div>

      <div className="space-y-4">
        {denseTracks.map((track) => {
          const current = activeSegments.find(({ key }) => key === track.key)?.segment;
          return (
            <section key={track.key} aria-label={`${track.label} periods`} className="min-w-0 space-y-2">
              <header className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-semibold">{track.label}</h3>
                <span className="shrink-0 text-[9px] text-muted-foreground">← Scroll 24h →</span>
              </header>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {track.segments.map((segment) => {
                  const key = `${track.key}-${segment.index}-${segment.start}`;
                  const isCurrent = isNowInSelectedDay && current?.start === segment.start;
                  const colorClass = track.key === "muhurta"
                    ? MUHURTA_COLORS[segment.quality ?? "neutral"]
                    : "border-border bg-muted text-foreground";
                  const activeClass = isCurrent
                    ? track.key === "hora"
                      ? "border-amber-500 bg-amber-300 font-semibold text-amber-950 ring-2 ring-inset ring-amber-600 dark:border-amber-300 dark:bg-amber-400/80 dark:text-amber-950 dark:ring-amber-200"
                      : "border-primary bg-primary/15 font-semibold text-foreground ring-2 ring-inset ring-primary/60"
                    : "";
                  return (
                    <div
                      key={key}
                      ref={(element) => { activeCardRefs.current[key] = element; }}
                      aria-label={blockLabel(segment, data.timezone, data.date)}
                      aria-current={isCurrent ? "time" : undefined}
                      title={blockLabel(segment, data.timezone, data.date)}
                      className={`flex min-w-[104px] shrink-0 flex-col justify-between rounded-lg border px-2.5 py-2 text-left ${colorClass} ${activeClass}`}
                    >
                      <span className="min-h-8 break-words text-xs leading-4">{segment.name}</span>
                      <span className="mt-1 whitespace-nowrap text-[10px] font-medium tabular-nums">
                        {formatEventTime(segment.start, data.timezone, data.date)} – {formatEventTime(segment.end, data.timezone, data.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <p className="text-[10px] leading-4 text-muted-foreground">
        Each segment ends at its calculated Swiss Ephemeris transition; widths are proportional to the full Vedic-day duration.
      </p>
    </section>
  );
}

export function PanchangTimeline({ data }: { data: PanchangDay }) {
  const [now, setNow] = useState<Date | null>(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const updateNow = () => setNow(new Date());
    updateNow();
    const interval = window.setInterval(updateNow, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const start = Date.parse(data.timeline.start);
  const end = Date.parse(data.timeline.end);
  const sunset = Date.parse(data.solarEvents.sunset);
  const duration = differenceInMilliseconds(new Date(end), new Date(start));
  const daylightDuration = differenceInMilliseconds(new Date(sunset), new Date(start));
  const daylightPercent = duration > 0 ? Math.max(0, Math.min(100, (daylightDuration / duration) * 100)) : 0;
  const nowTime = now?.getTime() ?? 0;
  const isNowInSelectedDay = now !== null && isWithinPanchangTimeline(nowTime, data.timeline.start, data.timeline.end);
  const nowPercent = duration > 0 ? Math.max(0, Math.min(100, ((nowTime - start) / duration) * 100)) : 0;
  const markerTransform = nowPercent < 12 ? "translateX(0%)"
    : nowPercent > 88 ? "translateX(-100%)" : "translateX(-50%)";
  const sunsetTransform = daylightPercent < 12 ? "translateX(0%)"
    : daylightPercent > 88 ? "translateX(-100%)" : "translateX(-50%)";

  return (
    <>
      <div className="md:hidden">
        <MobilePanchangTimeline
          data={data}
          now={now}
          isNowInSelectedDay={isNowInSelectedDay}
          nowTime={nowTime}
          nowPercent={nowPercent}
          sunsetPercent={daylightPercent}
          duration={duration}
        />
      </div>
      <div className="hidden md:block">
        <section aria-label="Panchang timeline" className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Sunrise-to-sunrise timeline</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatTime(new Date(data.timeline.start), data.timezone)} sunrise
                <span className="mx-1.5 text-border">→</span>
                {formatTime(new Date(data.timeline.end), data.timezone)} tomorrow
              </p>
            </div>
            {isNowInSelectedDay
              ? <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">Now in this Vedic day</span>
              : <span className="text-xs text-muted-foreground">Times shown in {data.timezone}</span>}
          </div>

          <div className="mt-6 flex gap-3">
            <div className="w-[82px] shrink-0 space-y-3 pt-1">
              {data.timeline.tracks.map((track) => (
                <div key={track.key} className="flex h-10 items-center text-xs font-medium text-muted-foreground">
                  {track.label}
                </div>
              ))}
            </div>
            <div className="relative min-w-0 flex-1">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 flex overflow-hidden rounded-lg">
                <div
                  className="bg-gradient-to-r from-accent/70 to-muted dark:from-accent/20 dark:to-muted/70"
                  style={{ width: `${daylightPercent}%` }}
                />
                <div className="min-w-0 flex-1 bg-gradient-to-r from-muted to-background dark:from-muted/70 dark:to-background" />
              </div>

              <div className="relative z-[1] space-y-3">
                {data.timeline.tracks.map((track, trackIndex) => (
                  <div
                    key={track.key}
                    role="group"
                    aria-label={`${track.label} periods`}
                    className="flex h-10 min-w-0 overflow-hidden rounded-md bg-muted/40 ring-1 ring-inset ring-border/70"
                  >
                    {track.segments.map((segment) => {
                      const segmentDuration = differenceInMilliseconds(new Date(segment.end), new Date(segment.start));
                      const width = duration > 0 ? (segmentDuration / duration) * 100 : 0;
                      const isCurrentSegment = isNowInSelectedDay &&
                        nowTime >= Date.parse(segment.start) &&
                        nowTime < Date.parse(segment.end);
                      const colorClass = track.key === "muhurta"
                        ? MUHURTA_COLORS[segment.quality ?? "neutral"]
                        : TRACK_COLORS[trackIndex] ?? MUHURTA_COLORS.neutral;
                      const currentClass = isCurrentSegment
                        ? track.key === "hora"
                          ? "relative z-[1] border-amber-500 bg-amber-300 font-bold text-amber-950 ring-2 ring-inset ring-amber-600 dark:border-amber-300 dark:bg-amber-400/80 dark:text-amber-950 dark:ring-amber-200"
                          : "relative z-[1] border-primary bg-primary/20 font-bold text-foreground ring-2 ring-inset ring-primary/60"
                        : "";
                      const label = blockLabel(segment, data.timezone, data.date);
                      return (
                        <motion.div
                          key={`${track.key}-${segment.index}-${segment.start}`}
                          aria-label={label}
                          aria-current={isCurrentSegment ? "time" : undefined}
                          title={label}
                          initial={reduceMotion ? undefined : { opacity: 0, scaleX: 0 }}
                          animate={{ opacity: 1, scaleX: 1 }}
                          transition={{ duration: 0.45, ease: "easeOut" }}
                          className={`flex h-full min-w-0 shrink-0 items-center justify-center overflow-hidden border-r px-1 text-center text-[10px] font-medium leading-tight transition-colors duration-200 last:border-r-0 ${colorClass} ${currentClass}`}
                          style={{ width: `${width}%`, transformOrigin: "left" }}
                        >
                          <span className="truncate">{segment.name}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div
                aria-label={`Sunset at ${formatTime(new Date(sunset), data.timezone)}`}
                className="pointer-events-none absolute bottom-0 top-0 z-[2] border-l border-dashed border-muted-foreground/60"
                style={{ left: `${daylightPercent}%` }}
              >
                <span
                  className="absolute -top-5 whitespace-nowrap text-[9px] font-medium text-muted-foreground"
                  style={{ transform: sunsetTransform }}
                >
                  Sunset · {formatTime(new Date(sunset), data.timezone)}
                </span>
              </div>

              {isNowInSelectedDay && (
                <motion.div
                  aria-label={`Current local time ${now ? formatTime(now, data.timezone) : ""}`}
                  initial={false}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: [0.8, 1, 0.8] }}
                  transition={reduceMotion ? undefined : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className="pointer-events-none absolute bottom-0 top-0 z-[3] border-l-2 border-dashed border-primary shadow-[0_0_10px_hsl(var(--primary)/0.55)]"
                  style={{ left: `${nowPercent}%` }}
                >
                  <span
                    className="absolute -top-5 whitespace-nowrap rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm"
                    style={{ transform: markerTransform }}
                  >
                    Now · {now ? formatTime(now, data.timezone) : ""}
                  </span>
                </motion.div>
              )}
            </div>
          </div>

          <div className="ml-[95px] mt-2 flex justify-between text-[10px] tabular-nums text-muted-foreground">
            <span>{formatTime(new Date(data.timeline.start), data.timezone)}</span>
            <span>{formatTime(new Date(data.timeline.end), data.timezone)}</span>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
            Each segment ends at its calculated Swiss Ephemeris transition; widths are proportional to the full Vedic-day duration.
          </p>
        </section>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { differenceInMilliseconds } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { motion, useReducedMotion } from "framer-motion";
import type { PanchangDay, PanchangSegment } from "@/lib/astrology/panchang/PanchangEngine";

const TRACK_COLORS = [
  "border-orange-200 bg-orange-100 text-orange-950 dark:border-orange-800/60 dark:bg-orange-900/35 dark:text-orange-100",
  "border-sky-200 bg-sky-100 text-sky-950 dark:border-sky-800/60 dark:bg-sky-900/35 dark:text-sky-100",
  "border-rose-200 bg-rose-100 text-rose-950 dark:border-rose-800/60 dark:bg-rose-900/35 dark:text-rose-100",
  "border-amber-200 bg-amber-100 text-amber-950 dark:border-amber-800/60 dark:bg-amber-900/35 dark:text-amber-100",
];
const MUHURTA_COLORS = {
  auspicious: "border-emerald-200 bg-emerald-100 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-900/35 dark:text-emerald-100",
  inauspicious: "border-rose-200 bg-rose-100 text-rose-950 dark:border-rose-800/60 dark:bg-rose-900/35 dark:text-rose-100",
  neutral: "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200",
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

export function PanchangTimeline({ data }: { data: PanchangDay }) {
  const [now, setNow] = useState<Date | null>(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const updateNow = () => setNow(new Date());
    updateNow();
    const interval = window.setInterval(updateNow, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const start = Date.parse(data.timeline.start);
  const end = Date.parse(data.timeline.end);
  const sunset = Date.parse(data.solarEvents.sunset);
  const duration = differenceInMilliseconds(new Date(end), new Date(start));
  const daylightDuration = differenceInMilliseconds(new Date(sunset), new Date(start));
  const daylightPercent = duration > 0 ? Math.max(0, Math.min(100, (daylightDuration / duration) * 100)) : 0;
  const nowTime = now?.getTime() ?? 0;
  const isNowInSelectedDay = now !== null &&
    localDateKey(now, data.timezone) === data.date &&
    nowTime >= start && nowTime < end;
  const nowPercent = duration > 0 ? Math.max(0, Math.min(100, ((nowTime - start) / duration) * 100)) : 0;
  const markerTransform = nowPercent < 12 ? "translateX(0%)"
    : nowPercent > 88 ? "translateX(-100%)" : "translateX(-50%)";
  const sunsetTransform = daylightPercent < 12 ? "translateX(0%)"
    : daylightPercent > 88 ? "translateX(-100%)" : "translateX(-50%)";

  return (
    <section aria-label="Panchang timeline" className="rounded-2xl border border-white/60 bg-white/70 p-4 text-card-foreground shadow-[0_12px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 dark:shadow-[0_12px_42px_rgba(2,6,23,0.28)] sm:p-5">
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
          ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-300/15 dark:text-amber-200">Now in this Vedic day</span>
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
              className="bg-gradient-to-r from-amber-50 to-sky-50 dark:from-amber-900/20 dark:to-sky-900/20"
              style={{ width: `${daylightPercent}%` }}
            />
            <div className="min-w-0 flex-1 bg-gradient-to-r from-slate-100 to-indigo-50 dark:from-slate-900/50 dark:to-indigo-900/30" />
          </div>

          <div className="relative z-[1] space-y-3">
            {data.timeline.tracks.map((track, trackIndex) => (
              <div
                key={track.key}
                role="group"
                aria-label={`${track.label} periods`}
                className="flex h-10 min-w-0 overflow-hidden rounded-md bg-slate-950/[0.025] ring-1 ring-inset ring-border/70 dark:bg-white/[0.025]"
              >
                {track.segments.map((segment) => {
                  const segmentDuration = differenceInMilliseconds(new Date(segment.end), new Date(segment.start));
                  const width = duration > 0 ? (segmentDuration / duration) * 100 : 0;
                  const colorClass = track.key === "muhurta"
                    ? MUHURTA_COLORS[segment.quality ?? "neutral"]
                    : TRACK_COLORS[trackIndex] ?? MUHURTA_COLORS.neutral;
                  const label = blockLabel(segment, data.timezone, data.date);
                  return (
                    <motion.div
                      key={`${track.key}-${segment.index}-${segment.start}`}
                      aria-label={label}
                      title={label}
                      initial={reduceMotion ? undefined : { opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      className={`flex h-full min-w-0 shrink-0 items-center justify-center overflow-hidden border-r px-1 text-center text-[10px] font-medium leading-tight transition-colors duration-200 last:border-r-0 ${colorClass}`}
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
            className="pointer-events-none absolute bottom-0 top-0 z-[2] border-l border-dashed border-slate-500/60 dark:border-slate-300/50"
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
              className="pointer-events-none absolute bottom-0 top-0 z-[3] border-l-2 border-dashed border-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.8)]"
              style={{ left: `${nowPercent}%` }}
            >
              <span
                className="absolute -top-5 whitespace-nowrap rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-950 shadow-sm"
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
  );
}

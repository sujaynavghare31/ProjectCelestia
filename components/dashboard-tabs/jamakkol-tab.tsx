"use client";

import { useMemo, useState } from "react";
import type { BirthProfile } from "@/lib/kundali-store";
import type { EphemerisResponse } from "@/lib/kundali-types";
import {
  COLORS,
  jamakkol,
  SOUTH_INDIAN_GRID,
  type JamakkolResult,
  type Point,
} from "@/lib/astro/jamakkol-engine";

type Props = {
  profile: BirthProfile;
  data: EphemerisResponse | null;
  chartMode: "transit" | "birth";
};

const categoryLabels = {
  jama: "Jama",
  gochara: "Gochara",
  points: "Udayam · Aarudam · Kavippu",
} as const;

function timezoneOffset(date: string, time: string, timezone: string) {
  const instant = new Date(`${date}T${time.length === 5 ? `${time}:00` : time}Z`);
  if (Number.isNaN(instant.getTime())) return 0;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const localAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return (localAsUtc - instant.getTime()) / 3_600_000;
}

function localNow(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}:${values.second}`,
  };
}

function pointStyle(point: Point) {
  return COLORS[point.category];
}

function PointLines({ points, category }: { points: string[]; category: keyof typeof categoryLabels }) {
  if (!points.length) return null;
  return (
    <div className="mt-1 space-y-0.5 text-[10px] leading-tight sm:text-[11px]" style={{ color: COLORS[category].text }}>
      <p className="font-semibold">{categoryLabels[category]}</p>
      {points.map((point) => <p key={point} className="truncate">{point}</p>)}
    </div>
  );
}

function JamakkolChart({ result }: { result: JamakkolResult }) {
  return (
    <div className="mx-auto w-full max-w-[620px]">
      <div className="grid aspect-square grid-cols-4 grid-rows-4 overflow-hidden rounded-xl border-2 border-[#4A1D6B] bg-card">
        {SOUTH_INDIAN_GRID.flatMap((row, rowIndex) => row.map((signIndex, columnIndex) => {
          const isCenter = signIndex === null;
          if (isCenter && !(rowIndex === 1 && columnIndex === 1)) return null;
          if (isCenter) {
            return (
              <div key="center" className="col-span-2 row-span-2 flex min-w-0 flex-col items-center justify-center bg-muted/20 p-2 text-center sm:p-4">
                <p className="text-xs font-semibold text-foreground sm:text-sm">Jamakkol Prasannam</p>
                <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">{result.input.date} · {result.input.time}</p>
                <p className="mt-2 text-[10px] font-semibold text-foreground sm:text-xs">{result.jamam.weekday} · {result.jamam.half} Jamam #{result.jamam.number}</p>
                <p className="text-[10px] text-muted-foreground sm:text-xs">{result.jamam.start}–{result.jamam.end} · Lord {result.jamam.lord}</p>
                <div className="mt-3 space-y-1 text-[10px] sm:text-xs">
                  <p style={{ color: COLORS.points.text }}>Udayam · {result.udayam.degree}</p>
                  <p style={{ color: COLORS.points.text }}>Aarudam · {result.aarudam.degree}</p>
                  <p style={{ color: COLORS.points.text }}>Kavippu · {result.kavippu.degree}</p>
                </div>
              </div>
            );
          }
          const box = result.boxes[signIndex];
          return (
            <div
              key={signIndex}
              className="min-w-0 border border-[#4A1D6B]/40 bg-card p-1.5 sm:p-2"
              style={{ gridColumn: columnIndex + 1, gridRow: rowIndex + 1 }}
              aria-label={`${box.sign}. Jama: ${box.jama.join(", ") || "none"}. Gochara: ${box.gochara.join(", ") || "none"}. Points: ${box.points.join(", ") || "none"}.`}
            >
              <p className="truncate text-[10px] font-bold text-foreground sm:text-xs">{box.sign}</p>
              <PointLines points={box.jama} category="jama" />
              <PointLines points={box.gochara} category="gochara" />
              <PointLines points={box.points} category="points" />
            </div>
          );
        }))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground" aria-label="Jamakkol chart legend">
        {(["jama", "gochara", "points"] as const).map((category) => (
          <span key={category} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: COLORS[category].text }} />
            {categoryLabels[category]}
          </span>
        ))}
        <span>↑ exalted · (R) retrograde</span>
      </div>
    </div>
  );
}

function PositionsTable({ result }: { result: JamakkolResult }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[620px] text-left text-xs">
        <thead className="bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr><th scope="col" className="px-3 py-2">Point</th><th scope="col" className="px-3 py-2">Type</th><th scope="col" className="px-3 py-2">Sign</th><th scope="col" className="px-3 py-2">Degree</th><th scope="col" className="px-3 py-2">Nakshatra · Pada</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {result.points.map((point) => (
            <tr key={`${point.category}-${point.name}`}>
              <th scope="row" className="whitespace-nowrap px-3 py-2 font-semibold">{point.name}</th>
              <td className="px-3 py-2 font-medium" style={{ color: pointStyle(point).text }}>{categoryLabels[point.category]}</td>
              <td className="whitespace-nowrap px-3 py-2">{point.sign}</td>
              <td className="whitespace-nowrap px-3 py-2 font-mono">{point.degree}{point.retrograde ? " (R)" : point.exalted ? " ↑" : ""}</td>
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{point.nakshatraPada}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PanchangCard({ result }: { result: JamakkolResult }) {
  const items = [
    ["Vara", result.panchang.vara], ["Tamil month", result.panchang.tamilMonth],
    ["Sunrise / sunset", `${result.panchang.sunrise} · ${result.panchang.sunset}`],
    ["Tithi", result.panchang.tithi], ["Nakshatra", result.panchang.nakshatra],
    ["Yoga", result.panchang.yoga], ["Karana", result.panchang.karana],
    ["Moon sign", result.panchang.moonSign], ["Sun sign", result.panchang.sunSign],
    ["Hora lord", result.panchang.horaLord], ["Jamakkol day", result.panchang.jamakkolDay],
    ["Ayanamsa", result.panchang.ayanamsa],
  ];
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm" aria-labelledby="jamakkol-panchang-title">
      <div className="flex items-center justify-between gap-3">
        <h3 id="jamakkol-panchang-title" className="text-sm font-semibold">Panchang</h3>
        <span className="text-[11px] text-muted-foreground">Rahu · Yamagandam · Gulika</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([label, value]) => <div key={label} className="rounded-lg border border-border bg-background px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5 text-xs font-medium">{value}</p></div>)}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {[["Rahu kalam", result.panchang.rahuKalam], ["Yamagandam", result.panchang.yamagandam], ["Gulika kalam", result.panchang.gulikaKalam]].map(([label, value]) => <div key={label} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/25 dark:text-rose-200"><p className="text-[10px] uppercase tracking-wide">{label}</p><p className="mt-0.5 text-xs font-semibold">{value}</p></div>)}
      </div>
    </section>
  );
}

export default function JamakkolTab({ profile, data, chartMode }: Props) {
  const [live, setLive] = useState(false);
  const active = useMemo(() => {
    if (!data) return null;
    const dateTime = chartMode === "transit" ? localNow(profile.timezone) : { date: profile.date, time: profile.time };
    const planets = Object.fromEntries(data.planets.map((planet) => [planet.name, planet.longitude]));
    const required = ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
    if (required.some((name) => typeof planets[name] !== "number")) return null;
    return jamakkol({
      date: dateTime.date,
      time: dateTime.time,
      tz: timezoneOffset(dateTime.date, dateTime.time, profile.timezone),
      lat: profile.lat,
      lon: profile.lng,
      ayanamsa: data.ayanamsa.degrees,
      planets: planets as { Mars: number; Mercury: number; Jupiter: number; Venus: number; Saturn: number; Sun?: number; Moon?: number; Rahu?: number },
      retrograde: Object.fromEntries(data.planets.filter((planet) => ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"].includes(planet.name)).map((planet) => [planet.name, planet.motion === "R"])),
    });
  }, [chartMode, data, profile]);

  if (!active) return <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Jamakkol needs a completed planetary calculation. Submit the chart details and try again.</div>;

  return (
    <div className="space-y-4 pt-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div><h2 className="text-base font-semibold">Jamakkol Prasannam</h2><p className="mt-1 text-xs text-muted-foreground">{profile.city} · {active.input.date} {active.input.time} · {active.input.tz >= 0 ? "+" : ""}{active.input.tz} UTC</p></div>
        <label className="inline-flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={live} onChange={(event) => setLive(event.target.checked)} className="size-4 accent-primary" /> Live updates</label>
      </section>
      {live && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">Live mode follows the portal&apos;s current transit calculation. Refresh the transit chart to recalculate planetary positions.</p>}
      <section className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-5"><JamakkolChart result={active} /></section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm" aria-labelledby="jamakkol-positions-title"><h3 id="jamakkol-positions-title" className="mb-3 text-sm font-semibold">Positions</h3><PositionsTable result={active} /></section>
        <div className="space-y-4"><PanchangCard result={active} /><section className="rounded-xl border border-border bg-card p-4 text-xs shadow-sm"><p><span className="font-semibold">Exalted Jama grahas:</span> {active.exaltedJama.join(", ") || "None"}</p><p className="mt-2"><span className="font-semibold">Kavippu:</span> {active.veediSign} · count {active.kavippuCount}</p></section></div>
      </div>
    </div>
  );
}

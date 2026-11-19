"use client";

import { useEffect, useMemo, useState } from "react";
import type { BirthProfile } from "@/lib/kundali-store";
import type { EphemerisResponse } from "@/lib/kundali-types";
import {
  COLORS,
  colorForPoint,
  jamakkol,
  PLANET_COLORS,
  renderJamakkolChart,
  type JamakkolResult,
  type Point,
} from "@/lib/astro/jamakkol-engine";
import { formatJama, jamaGrahas, localNow as jamaLocalNow } from "@/src/lib/jamakkol/jamaGrahas";

type Props = {
  profile: BirthProfile;
  data: EphemerisResponse | null;
  chartMode: "transit" | "birth";
};

const categoryLabels = {
  jama: "Jama",
  gochara: "Gochara",
  upagraha: "Upagraha",
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

function JamakkolChart({ result }: { result: JamakkolResult }) {
  const svg = renderJamakkolChart(result, { size: 620 });
  return (
    <div className="mx-auto w-full max-w-[620px]">
      <div className="aspect-square w-full overflow-hidden" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground" aria-label="Jamakkol chart legend">
        {Object.entries(PLANET_COLORS).map(([planet, color]) => (
          <span key={planet} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
            {planet}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: COLORS.points.text }} />Udayam · Aarudam · Kavippu</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: COLORS.upagraha.text }} />Mandi</span>
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
              <td className="px-3 py-2 font-medium" style={{ color: colorForPoint(point) }}>{categoryLabels[point.category]}</td>
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

function JamaGrahaTable({ date, time }: { date: string; time: string }) {
  const result = jamaGrahas(date, time);
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm" aria-labelledby="jama-grahas-title">
      <h3 id="jama-grahas-title" className="mb-3 text-sm font-semibold">Jama Grahas</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Graha</th><th className="px-3 py-2">Sign (Tamil)</th><th className="px-3 py-2">Degree</th><th className="px-3 py-2">Exalted</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.grahas.map((graha) => (
              <tr key={graha.short}>
                <th scope="row" className="px-3 py-2 font-semibold">{graha.name}</th>
                <td className="px-3 py-2">{graha.sign}</td>
                <td className="px-3 py-2 font-mono">{formatJama(graha.longitude)}</td>
                <td className="px-3 py-2">{graha.exalted ? "✓" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function JamakkolTab({ profile, data, chartMode }: Props) {
  const [liveTick, setLiveTick] = useState(0);
  const [jamaMode, setJamaMode] = useState<"now" | "custom">("now");
  const [jamaLocation, setJamaLocation] = useState({
    place: profile.city || "Mumbai",
    latitude: profile.lat,
    longitude: profile.lng,
    timeZone: profile.timezone || "Asia/Kolkata",
  });
  const [jamaCustomDate, setJamaCustomDate] = useState(profile.date);
  const [jamaCustomTime, setJamaCustomTime] = useState(profile.time);

  useEffect(() => {
    if (jamaMode !== "now") return;
    const interval = window.setInterval(() => setLiveTick((tick) => tick + 1), 60_000);
    return () => window.clearInterval(interval);
  }, [jamaMode]);

  const active = useMemo(() => {
    if (!data) return null;
    void liveTick;
    const dateTime = jamaMode === "now"
      ? jamaLocalNow(jamaLocation.timeZone)
      : { date: jamaCustomDate, time: jamaCustomTime };
    const planets = Object.fromEntries(data.planets.map((planet) => [planet.name, planet.longitude]));
    const required = ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
    if (required.some((name) => typeof planets[name] !== "number")) return null;
    return jamakkol({
      date: dateTime.date,
      time: dateTime.time,
      tz: timezoneOffset(dateTime.date, dateTime.time, jamaLocation.timeZone),
      lat: jamaLocation.latitude,
      lon: jamaLocation.longitude,
      place: jamaLocation.place,
      ascendant: data.ascendant.longitude,
      ayanamsa: data.ayanamsa.degrees,
      planets: planets as { Mars: number; Mercury: number; Jupiter: number; Venus: number; Saturn: number; Sun?: number; Moon?: number; Rahu?: number },
      retrograde: Object.fromEntries(data.planets.filter((planet) => ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"].includes(planet.name)).map((planet) => [planet.name, planet.motion === "R"])),
      mandiLongitude: data.points.find((point) => point.name === "Mandi")?.longitude,
    });
  }, [chartMode, data, liveTick, profile, jamaMode, jamaCustomDate, jamaCustomTime, jamaLocation]);

  if (!active) return <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Jamakkol needs a completed planetary calculation. Submit the chart details and try again.</div>;
  const jamaDateTime = jamaMode === "now"
    ? jamaLocalNow(jamaLocation.timeZone)
    : { date: jamaCustomDate, time: jamaCustomTime };
  const jamaCalculation = jamaGrahas(jamaDateTime.date, jamaDateTime.time);
  const [year, month, day] = jamaDateTime.date.split("-").map(Number);
  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1];
  const [hours, minutes, seconds = "00"] = jamaDateTime.time.split(":");
  const hour = Number(hours);
  const displayTime = `${String(((hour + 11) % 12) + 1).padStart(2, "0")}:${minutes}:${seconds} ${hour < 12 ? "AM" : "PM"}`;
  const calculatedFor = `Calculated for: ${jamaCalculation.weekday}, ${String(day).padStart(2, "0")}-${monthName}-${year} ${displayTime} (${jamaLocation.place}, ${jamaLocation.timeZone}) — ${jamaCalculation.half} Jamam #${jamaCalculation.jamam}`;

  return (
    <div className="space-y-4 pt-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div><h2 className="text-base font-semibold">Jamakkol Prasannam</h2><p className="mt-1 text-xs text-muted-foreground">{profile.city} · {active.input.date} {active.input.time} · {active.input.tz >= 0 ? "+" : ""}{active.input.tz} UTC</p></div>
        <div className="flex items-center gap-2">
          <select aria-label="Jamakkol time mode" value={jamaMode} onChange={(event) => setJamaMode(event.target.value as "now" | "custom")} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
            <option value="now">Now</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </section>
      <section className="grid gap-2 rounded-xl border border-border bg-card p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <label className="grid gap-1 text-xs">Place<input value={jamaLocation.place} onChange={(event) => setJamaLocation((current) => ({ ...current, place: event.target.value }))} className="h-9 rounded-md border border-input bg-background px-2" /></label>
        <label className="grid gap-1 text-xs">Latitude<input type="number" value={jamaLocation.latitude} onChange={(event) => setJamaLocation((current) => ({ ...current, latitude: Number(event.target.value) }))} className="h-9 rounded-md border border-input bg-background px-2" /></label>
        <label className="grid gap-1 text-xs">Longitude<input type="number" value={jamaLocation.longitude} onChange={(event) => setJamaLocation((current) => ({ ...current, longitude: Number(event.target.value) }))} className="h-9 rounded-md border border-input bg-background px-2" /></label>
        <label className="grid gap-1 text-xs">IANA time zone<input value={jamaLocation.timeZone} onChange={(event) => setJamaLocation((current) => ({ ...current, timeZone: event.target.value }))} className="h-9 rounded-md border border-input bg-background px-2" /></label>
        {jamaMode === "custom" && <><label className="grid gap-1 text-xs">Date<input type="date" value={jamaCustomDate} onChange={(event) => setJamaCustomDate(event.target.value)} className="h-9 rounded-md border border-input bg-background px-2" /></label><label className="grid gap-1 text-xs">Time<input type="time" step="1" value={jamaCustomTime} onChange={(event) => setJamaCustomTime(event.target.value)} className="h-9 rounded-md border border-input bg-background px-2" /></label></>}
      </section>
      <p className="text-xs font-medium text-muted-foreground">{calculatedFor}</p>
      <section className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-5"><JamakkolChart result={active} /></section>
      <JamaGrahaTable date={jamaDateTime.date} time={jamaDateTime.time} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm" aria-labelledby="jamakkol-positions-title"><h3 id="jamakkol-positions-title" className="mb-3 text-sm font-semibold">Positions</h3><PositionsTable result={active} /></section>
        <div className="space-y-4"><PanchangCard result={active} /><section className="rounded-xl border border-border bg-card p-4 text-xs shadow-sm"><p><span className="font-semibold">Exalted Jama grahas:</span> {active.exaltedJama.join(", ") || "None"}</p><p className="mt-2"><span className="font-semibold">Kavippu:</span> {active.veediSign} · count {active.kavippuCount}</p></section></div>
      </div>
    </div>
  );
}

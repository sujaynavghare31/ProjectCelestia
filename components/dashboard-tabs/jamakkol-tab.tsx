"use client";

import { useEffect, useMemo, useState } from "react";
import { useKundaliStore, type BirthProfile } from "@/lib/kundali-store";
import type { EphemerisResponse } from "@/lib/kundali-types";
import {
  COLORS,
  colorForPoint,
  jamakkol,
  PLANET_COLORS,
  renderJamakkolChart,
  type JamakkolResult,
} from "@/lib/astro/jamakkol-engine";
import { formatJama, jamaGrahas } from "@/src/lib/jamakkol/jamaGrahas";

type Props = {
  profile: BirthProfile;
  data: EphemerisResponse | null;
  chartMode: "transit" | "birth";
  transitDate: string;
  transitTime: string;
  transitMode: "current" | "specific";
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

export default function JamakkolTab({ profile, data, chartMode, transitDate, transitTime, transitMode }: Props) {
  const [jamaData, setJamaData] = useState<EphemerisResponse | null>(null);
  const [jamaError, setJamaError] = useState<string | null>(null);
  const ayanamsa = useKundaliStore((state) => state.ayanamsa);
  const zodiacMode = useKundaliStore((state) => state.zodiacMode);
  const customAyanamsaDegrees = useKundaliStore((state) => state.customAyanamsaDegrees);
  const nodeType = useKundaliStore((state) => state.nodeType);
  const jamaDateTime = chartMode === "birth"
    ? { date: profile.date, time: profile.time }
    : transitMode === "specific"
      ? { date: transitDate, time: transitTime }
      : data
        ? { date: data.input.date, time: data.input.time }
        : { date: profile.date, time: profile.time };

  useEffect(() => {
    let isMounted = true;
    const timeout = window.setTimeout(async () => {
      setJamaError(null);
      try {
        const response = await fetch("/api/ephemeris", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: jamaDateTime.date,
            time: jamaDateTime.time,
            lat: profile.lat,
            lng: profile.lng,
            timezone: profile.timezone,
            ayanamsa,
            zodiacMode,
            customAyanamsaDegrees,
            nodeType,
          }),
        });
        const result = await response.json() as EphemerisResponse | { error: string };
        if (!isMounted) return;
        if (!response.ok || "error" in result) throw new Error("error" in result ? result.error : "Unable to calculate Jamakkol positions.");
        setJamaData(result);
      } catch (error) {
        if (isMounted) setJamaError(error instanceof Error ? error.message : "Unable to calculate Jamakkol positions.");
      }
    }, 100);
    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, [jamaDateTime.date, jamaDateTime.time, profile.lat, profile.lng, profile.timezone, ayanamsa, zodiacMode, customAyanamsaDegrees, nodeType]);

  const active = useMemo(() => {
    const matchesInput = (ephemeris: EphemerisResponse | null) => ephemeris !== null &&
      ephemeris.input.date === jamaDateTime.date &&
      (ephemeris.input.time.length === 5 ? `${ephemeris.input.time}:00` : ephemeris.input.time) ===
        (jamaDateTime.time.length === 5 ? `${jamaDateTime.time}:00` : jamaDateTime.time) &&
      ephemeris.input.lat === profile.lat &&
      ephemeris.input.lng === profile.lng &&
      ephemeris.input.timezone === profile.timezone;
    const jamaEphemeris = [jamaData, data].find(matchesInput);
    if (!jamaEphemeris) return null;
    const planets = Object.fromEntries(jamaEphemeris.planets.map((planet) => [planet.name, planet.longitude]));
    const required = ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
    if (required.some((name) => typeof planets[name] !== "number")) return null;
    return jamakkol({
      date: jamaDateTime.date,
      time: jamaDateTime.time,
      tz: timezoneOffset(jamaDateTime.date, jamaDateTime.time, profile.timezone),
      lat: profile.lat,
      lon: profile.lng,
      place: profile.city,
      ascendant: jamaEphemeris.ascendant.longitude,
      ayanamsa: jamaEphemeris.ayanamsa.degrees,
      planets: planets as { Mars: number; Mercury: number; Jupiter: number; Venus: number; Saturn: number; Sun?: number; Moon?: number; Rahu?: number },
      retrograde: Object.fromEntries(jamaEphemeris.planets.filter((planet) => ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"].includes(planet.name)).map((planet) => [planet.name, planet.motion === "R"])),
      mandiLongitude: jamaEphemeris.points.find((point) => point.name === "Mandi")?.longitude,
    });
  }, [data, jamaData, jamaDateTime.date, jamaDateTime.time, profile]);

  if (!active) return <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">{jamaError ?? "Jamakkol needs a completed planetary calculation. Submit the chart details and try again."}</div>;
  const jamaCalculation = jamaGrahas(jamaDateTime.date, jamaDateTime.time);
  const [year, month, day] = jamaDateTime.date.split("-").map(Number);
  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1];
  const [hours, minutes, seconds = "00"] = jamaDateTime.time.split(":");
  const hour = Number(hours);
  const displayTime = `${String(((hour + 11) % 12) + 1).padStart(2, "0")}:${minutes}:${seconds} ${hour < 12 ? "AM" : "PM"}`;
  const calculatedFor = `Calculated for: ${jamaCalculation.weekday}, ${String(day).padStart(2, "0")}-${monthName}-${year} ${displayTime} (${profile.city}, ${profile.timezone}) — ${jamaCalculation.half} Jamam #${jamaCalculation.jamam}`;

  return (
    <div className="space-y-4 pt-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-base font-semibold">Jamakkol Prasannam</h2>
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

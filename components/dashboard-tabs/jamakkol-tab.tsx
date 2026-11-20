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
import {
  JAMAKKOL_COPY,
  translateCategory,
  translateJamakkolHalf,
  translateNakshatraPada,
  translatePanchangValue,
  translatePlanet,
  translatePoint,
  translateSign,
  translateWeekday,
  type JamakkolLanguage,
} from "@/src/lib/jamakkol/jamakkol-locale";

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

function JamakkolChart({ result, language }: { result: JamakkolResult; language: JamakkolLanguage }) {
  const copy = JAMAKKOL_COPY[language];
  const svg = renderJamakkolChart(result, { size: 620, language });
  return (
    <div className="mx-auto w-full max-w-[620px]">
      <div
        className="aspect-square w-full overflow-hidden [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground" aria-label={copy.legend}>
        {Object.entries(PLANET_COLORS).map(([planet, color]) => (
          <span key={planet} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
            {translatePlanet(planet, language)}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: COLORS.points.text }} />{copy.udayam} · {copy.aarudam} · {copy.kavippu}</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: COLORS.upagraha.text }} />{translatePlanet("Mandi", language)}</span>
        <span>{language === "ta" ? "↑ உச்சம் · (வ) வக்கிரம்" : "↑ exalted · (R) retrograde"}</span>
      </div>
    </div>
  );
}

function PositionsTable({ result, language }: { result: JamakkolResult; language: JamakkolLanguage }) {
  const copy = JAMAKKOL_COPY[language];
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[620px] text-left text-xs">
        <thead className="bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr><th scope="col" className="sticky left-0 z-20 bg-muted/60 px-3 py-2">{copy.point}</th><th scope="col" className="px-3 py-2">{copy.type}</th><th scope="col" className="px-3 py-2">{copy.sign}</th><th scope="col" className="px-3 py-2">{copy.degree}</th><th scope="col" className="px-3 py-2">{copy.nakshatraPada}</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {result.points.map((point) => (
            <tr key={`${point.category}-${point.name}`}>
              <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-card px-3 py-2 font-semibold">{translatePoint(point.name, language)}</th>
              <td className="px-3 py-2 font-medium" style={{ color: colorForPoint(point) }}>{translateCategory(categoryLabels[point.category], language)}</td>
              <td className="whitespace-nowrap px-3 py-2">{translateSign(point.sign, language)}</td>
              <td className="whitespace-nowrap px-3 py-2 font-mono">{point.degree}{point.retrograde ? (language === "ta" ? " (வ)" : " (R)") : point.exalted ? " ↑" : ""}</td>
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{translateNakshatraPada(point.nakshatraPada, language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PanchangCard({ result, language }: { result: JamakkolResult; language: JamakkolLanguage }) {
  const copy = JAMAKKOL_COPY[language];
  const items: Array<[keyof typeof copy, string, string]> = [
    ["vara", "vara", result.panchang.vara], ["tamilMonth", "tamilMonth", result.panchang.tamilMonth],
    ["sunriseSunset", "sunriseSunset", `${result.panchang.sunrise} · ${result.panchang.sunset}`],
    ["tithi", "tithi", result.panchang.tithi], ["nakshatra", "nakshatra", result.panchang.nakshatra],
    ["yoga", "yoga", result.panchang.yoga], ["karana", "karana", result.panchang.karana],
    ["moonSign", "moonSign", result.panchang.moonSign], ["sunSign", "sunSign", result.panchang.sunSign],
    ["horaLord", "horaLord", result.panchang.horaLord], ["jamakkolDay", "jamakkolDay", result.panchang.jamakkolDay],
    ["ayanamsa", "ayanamsa", result.panchang.ayanamsa],
  ];
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm" aria-labelledby="jamakkol-panchang-title">
      <div className="flex items-center justify-between gap-3">
        <h3 id="jamakkol-panchang-title" className="text-sm font-semibold">{copy.panchang}</h3>
        <span className="text-[11px] text-muted-foreground">{language === "ta" ? `${copy.rahuKalam} · ${copy.yamagandam} · ${copy.gulikaKalam}` : "Rahu · Yamagandam · Gulika"}</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([labelKey, valueKey, value]) => <div key={labelKey} className="rounded-lg border border-border bg-background px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{copy[labelKey]}</p><p className="mt-0.5 text-xs font-medium">{translatePanchangValue(valueKey, value, language)}</p></div>)}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {[[copy.rahuKalam, result.panchang.rahuKalam], [copy.yamagandam, result.panchang.yamagandam], [copy.gulikaKalam, result.panchang.gulikaKalam]].map(([label, value]) => <div key={label} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/25 dark:text-rose-200"><p className="text-[10px] uppercase tracking-wide">{label}</p><p className="mt-0.5 text-xs font-semibold">{value}</p></div>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs">
        <p><span className="font-semibold">{language === "ta" ? "உச்சம் பெற்ற ஜாம கிரகங்கள்" : "Exalted Jama grahas"}:</span> {result.exaltedJama.map((planet) => translatePlanet(planet, language)).join(", ") || copy.none}</p>
        <p><span className="font-semibold">{copy.kavippu}:</span> {translatePoint(result.veediSign, language)} · {copy.count} {result.kavippuCount}</p>
      </div>
    </section>
  );
}

function JamaGrahaTable({ date, time, language }: { date: string; time: string; language: JamakkolLanguage }) {
  const copy = JAMAKKOL_COPY[language];
  const result = jamaGrahas(date, time);
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm" aria-labelledby="jama-grahas-title">
      <h3 id="jama-grahas-title" className="mb-3 text-sm font-semibold">{copy.jamaGrahas}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead className="bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr><th scope="col" className="sticky left-0 z-20 bg-muted/60 px-3 py-2">{copy.graha}</th><th scope="col" className="px-3 py-2">{language === "ta" ? copy.sign : "Sign (Tamil)"}</th><th scope="col" className="px-3 py-2">{copy.degree}</th><th scope="col" className="px-3 py-2">{copy.exalted}</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.grahas.map((graha) => {
              const formattedPosition = formatJama(graha.longitude);
              return (
                <tr key={graha.short}>
                  <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 font-semibold">{translatePlanet(graha.name, language)}</th>
                  <td className="px-3 py-2">{translateSign(graha.sign, language)}</td>
                  <td className="px-3 py-2 font-mono">{language === "ta" ? formattedPosition.slice(formattedPosition.indexOf(" ") + 1) : formattedPosition}</td>
                  <td className="px-3 py-2">{graha.exalted ? "✓" : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function JamakkolLanguageSelector({
  language,
  onChange,
}: {
  language: JamakkolLanguage;
  onChange: (language: JamakkolLanguage) => void;
}) {
  const copy = JAMAKKOL_COPY[language];
  return (
    <fieldset aria-label={copy.displayLanguage} className="flex items-center gap-3 text-sm">
      <legend className="sr-only">{copy.displayLanguage}</legend>
      <label className="inline-flex cursor-pointer items-center gap-1.5">
        <input type="radio" name="jamakkol-language" value="en" checked={language === "en"} onChange={() => onChange("en")} className="size-4 accent-[#C64F30]" />
        English
      </label>
      <label className="inline-flex cursor-pointer items-center gap-1.5">
        <input type="radio" name="jamakkol-language" value="ta" checked={language === "ta"} onChange={() => onChange("ta")} className="size-4 accent-[#C64F30]" />
        தமிழ்
      </label>
    </fieldset>
  );
}

export default function JamakkolTab({ profile, data, chartMode, transitDate, transitTime, transitMode }: Props) {
  const [language, setLanguage] = useState<JamakkolLanguage>("en");
  const copy = JAMAKKOL_COPY[language];
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

  if (!active) {
    return (
      <div className="space-y-4 pt-4">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">{copy.heading}</h2>
          <JamakkolLanguageSelector language={language} onChange={setLanguage} />
        </section>
        <div role={jamaError ? "alert" : undefined} className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {jamaError ?? copy.unavailable}
        </div>
      </div>
    );
  }
  const jamaCalculation = jamaGrahas(jamaDateTime.date, jamaDateTime.time);
  const [year, month, day] = jamaDateTime.date.split("-").map(Number);
  const monthName = language === "ta"
    ? new Intl.DateTimeFormat("ta-IN", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)))
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1];
  const [hours, minutes, seconds = "00"] = jamaDateTime.time.split(":");
  const hour = Number(hours);
  const displayTime = `${String(((hour + 11) % 12) + 1).padStart(2, "0")}:${minutes}:${seconds} ${language === "ta" ? (hour < 12 ? "காலை" : "மாலை") : hour < 12 ? "AM" : "PM"}`;
  const calculatedFor = language === "ta"
    ? `${copy.calculatedFor}: ${translateWeekday(jamaCalculation.weekday, language)}, ${String(day).padStart(2, "0")}-${monthName}-${year} ${displayTime} (${profile.city}, ${profile.timezone}) — ${translateJamakkolHalf(jamaCalculation.half, language)} ஜாமம் #${jamaCalculation.jamam}`
    : `${copy.calculatedFor}: ${jamaCalculation.weekday}, ${String(day).padStart(2, "0")}-${monthName}-${year} ${displayTime} (${profile.city}, ${profile.timezone}) — ${jamaCalculation.half} Jamam #${jamaCalculation.jamam}`;

  return (
    <div className="space-y-4 pt-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-base font-semibold">{copy.heading}</h2>
        <JamakkolLanguageSelector language={language} onChange={setLanguage} />
      </section>
      <p className="text-xs font-medium text-muted-foreground">{calculatedFor}</p>
      <section className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-5"><JamakkolChart result={active} language={language} /></section>
      <JamaGrahaTable date={jamaDateTime.date} time={jamaDateTime.time} language={language} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:gap-6">
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm" aria-labelledby="jamakkol-positions-title"><h3 id="jamakkol-positions-title" className="mb-3 text-sm font-semibold">{copy.positions}</h3><PositionsTable result={active} language={language} /></section>
        <PanchangCard result={active} language={language} />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { CelestialLanguage, ChartStyle, EphemerisResponse, PlanetPosition, ViewPreferences } from "@/lib/kundali-types";
import type { BirthProfile } from "@/lib/kundali-store";
import { SIGN_NAMES, SIGN_SHORT, PLANET_NAMES, PLANET_SHORT } from "@/src/lib/jaimini/constants";
import { computeJaiminiDashboard, findCurrentAD } from "@/src/lib/jaimini";
import type { DashaResult } from "@/src/lib/jaimini/dashas";
import type { AspectReport } from "@/src/lib/jaimini/aspects";
import { asOfTimestamp, dateInTimezone, parseLocalMs } from "@/src/lib/jaimini/time";
import { timeMinutes } from "@/src/lib/jaimini/specialLagnas";
import { timeUpagrahaMoments } from "@/src/lib/jaimini/upagrahas";
import EphemerisLoader from "@/components/dashboard-tabs/ephemeris-loader";

type JaiminiRendererProps = {
  style: ChartStyle;
  ascendant: PlanetPosition;
  planets: PlanetPosition[];
  points?: PlanetPosition[];
  varga: number;
  language: CelestialLanguage;
  preferences: ViewPreferences;
};

type Props = {
  profile: BirthProfile;
  data: EphemerisResponse | null;
  chartMode: "transit" | "birth";
  loading: boolean;
  error: string | null;
  onCalculateBirthChart: () => void;
  chartStyle: ChartStyle;
  onChartStyleChange: (style: ChartStyle) => void;
  viewPreferences: ViewPreferences;
  language: CelestialLanguage;
  ChartRenderer: React.ComponentType<JaiminiRendererProps>;
  asOfDate?: string;
};

const SECTION_TABS = [
  ["dashas", "Dashas"], ["arudha", "Arudha"], ["karakamsha", "Karakamsha"],
  ["lagnas", "Special Lagnas"], ["upagrahas", "Upagrahas"], ["yogas", "Yogas"],
  ["argala", "Argala"], ["strength", "Strength"], ["aspects", "Aspects"],
  ["karakas", "Karakas"], ["dispositors", "Dispositors"], ["sutras", "Sutras"],
] as const;

type SolarEvents = { sunrise: string; sunset: string; nextSunrise: string };
type SolarContext = {
  sunriseMs: number;
  sunsetMs: number;
  nextSunriseMs: number;
  weekday: number;
  sunriseSunLongitude: number;
  ascendants: Record<string, number>;
};

const DASHA_LABELS: Record<string, string> = {
  charaKnRao: "Chara · K.N. Rao",
  charaParashara: "Chara · Parashara",
  sthira: "Sthira",
  shoola: "Shoola",
  navamsa: "Navamsa",
  brahma: "Brahma",
  mandooka: "Mandooka",
  trikona: "Trikona",
  drig: "Drig",
};

function localMinutesFromIso(iso: string, timezone: string): number {
  if (!iso) return 0;
  const date = new Date(iso);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23",
  }).formatToParts(date).map(({type,value}) => [type,value]));
  return +parts.hour * 60 + +parts.minute + (+parts.second || 0) / 60;
}

function formatDate(ms: number, timezone: string) {
  if (!Number.isFinite(ms)) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, day:"2-digit", month:"short", year:"numeric",
  }).format(new Date(ms));
}

function signDms(longitude: number) {
  const normalized = ((longitude % 360) + 360) % 360;
  const s = Math.floor(normalized / 30);
  const totalSeconds = Math.round((normalized - s * 30) * 3600);
  const degrees = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${SIGN_NAMES[s]} ${degrees}°${String(minutes).padStart(2, "0")}′${String(seconds).padStart(2, "0")}″`;
}

function dateOffset(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function localDateTime(ms: number, timezone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms)).map(({ type, value }) => [type, value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

async function fetchSolarEvents(date: string, profile: BirthProfile): Promise<SolarEvents> {
  const response = await fetch(`/api/panchang?date=${encodeURIComponent(date)}&lat=${profile.lat}&lng=${profile.lng}`);
  const payload = await response.json() as { solarEvents?: Partial<SolarEvents>; error?: string };
  if (!response.ok || !payload.solarEvents?.sunrise || !payload.solarEvents.sunset || !payload.solarEvents.nextSunrise) {
    throw new Error(payload.error ?? `Sunrise and sunset could not be calculated for ${date}.`);
  }
  return {
    sunrise: payload.solarEvents.sunrise,
    sunset: payload.solarEvents.sunset,
    nextSunrise: payload.solarEvents.nextSunrise,
  };
}

async function fetchEphemerisAt(
  profile: BirthProfile,
  template: EphemerisResponse["input"],
  momentMs: number,
): Promise<EphemerisResponse> {
  const local = localDateTime(momentMs, profile.timezone);
  const response = await fetch("/api/ephemeris", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...template,
      date: local.date,
      time: local.time,
      lat: profile.lat,
      lng: profile.lng,
      timezone: profile.timezone,
    }),
  });
  const payload = await response.json() as EphemerisResponse | { error?: string };
  if (!response.ok || !("ascendant" in payload)) {
    throw new Error("error" in payload ? payload.error ?? "Could not calculate the sunrise-based Jaimini positions." : "Could not calculate the sunrise-based Jaimini positions.");
  }
  return payload;
}

const SIGN_ELEMENT_COLORS = [
  "bg-rose-50 dark:bg-rose-950/30",
  "bg-lime-50 dark:bg-lime-950/30",
  "bg-sky-50 dark:bg-sky-950/30",
  "bg-cyan-50 dark:bg-cyan-950/30",
] as const;

function SouthChart({ lagna, planets, result }: { lagna: number; planets: PlanetPosition[]; result: ReturnType<typeof computeJaiminiDashboard> }) {
  const positions = [11,0,1,2,10,-1,3,9,-1,4,8,7,6,5];
  const signBoxes = [11,12,1,2,10,-1,3,9,-1,4,7,6,5,8];
  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-sm" aria-label="South Indian rasi chart">
      <div className="mx-auto grid aspect-square w-full max-w-[620px] grid-cols-4 grid-rows-4 overflow-hidden border border-border bg-background">
        {[
          11,0,1,2,
          10,-1,-1,3,
          9,-1,-1,4,
          8,7,6,5,
        ].map((s, i) => s < 0 ? (
          i === 5 ? (
            <div key={i} className="col-span-2 row-span-2 flex flex-col items-center justify-center bg-amber-100/90 px-4 text-center text-amber-950 dark:bg-amber-900/35 dark:text-amber-100">
              <span className="rounded-full border border-amber-700/40 bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold tracking-wide dark:border-amber-300/40 dark:bg-amber-800/60">ASCENDANT</span>
              <strong className="mt-1 text-base">{SIGN_NAMES[lagna]}</strong>
              <span className="mt-1 text-xs font-medium">AK {PLANET_NAMES[result.karakas[0]?.planet ?? 0]} · KK {SIGN_NAMES[result.kk]}</span>
            </div>
          ) : null
        ) : (
          <div
            key={i}
            role="group"
            aria-label={`${SIGN_NAMES[s]} sign${lagna === s ? ", Ascendant" : ""}`}
            className={`min-h-0 border-r border-b border-border p-2 text-[10px] leading-tight ${SIGN_ELEMENT_COLORS[s % 4]} ${lagna === s ? "ring-2 ring-inset ring-amber-600 dark:ring-amber-400" : ""}`}
          >
            <div className="flex items-start justify-between gap-1">
              <p className="font-semibold text-foreground/80">{SIGN_SHORT[s]} <span className="ml-1">{SIGN_NAMES[s]}</span></p>
              {lagna === s && <span role="img" aria-label="Ascendant" className="shrink-0 rounded bg-amber-700 px-1 py-0.5 text-[9px] font-bold leading-none text-white dark:bg-amber-300 dark:text-amber-950">ASC</span>}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-1 gap-y-0.5">
              {planets.filter((p) => p.sign === s).map((p) => (
                <span key={p.name} className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">{PLANET_SHORT[PLANET_NAMES.indexOf(p.name as typeof PLANET_NAMES[number])]}</span>
              ))}
              {result.arudhas[0] === s && <span className="text-[#C2410C]">AL</span>}
              {result.arudhas[11] === s && <span className="text-[#C2410C]">UL</span>}
              {result.kk === s && <span className="text-[#C2410C]">KK</span>}
              {result.brahmaSign === s && <span className="text-[#C2410C]">Br</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AspectMatrix({
  title,
  headers,
  matrix,
  legend,
}: {
  title: string;
  headers: readonly string[];
  matrix: Array<Array<boolean | "C" | "A" | "">>;
  legend: string;
}) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  return (
    <div>
      <h3 className="text-xs font-semibold">{title}</h3>
      <div className="mt-2 max-w-[560px] overflow-x-auto overscroll-x-contain">
        <table className="table-fixed border-separate border-spacing-0 text-center text-[10px]" aria-label={title}>
          <thead className="sticky top-0 z-10 bg-card">
            <tr>
              <th className="sticky left-0 z-20 h-8 w-8 min-w-8 border border-border bg-card sm:h-10 sm:w-10 sm:min-w-10" />
              {headers.map((header, index) => (
                <th key={header} scope="col" onMouseEnter={() => setHoveredColumn(index)} onMouseLeave={() => setHoveredColumn(null)} className={`h-8 w-8 min-w-8 border border-border font-semibold sm:h-10 sm:w-10 sm:min-w-10 ${hoveredColumn === index ? "bg-accent" : "bg-card"}`}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rowIndex) => (
              <tr key={rowIndex} onMouseEnter={() => setHoveredRow(rowIndex)} onMouseLeave={() => setHoveredRow(null)}>
                <th scope="row" className={`sticky left-0 z-[1] h-8 w-8 min-w-8 border border-border font-semibold sm:h-10 sm:w-10 sm:min-w-10 ${hoveredRow === rowIndex ? "bg-accent" : "bg-card"}`}>
                  {headers[rowIndex]}
                </th>
                {row.map((cell, columnIndex) => {
                  const active = Boolean(cell);
                  const highlighted = hoveredRow === rowIndex || hoveredColumn === columnIndex;
                  return (
                    <td
                      key={columnIndex}
                      className={`h-8 w-8 min-w-8 border border-border font-semibold sm:h-10 sm:w-10 sm:min-w-10 ${active ? "bg-accent/70 text-primary" : ""} ${highlighted && !active ? "bg-muted/70" : ""}`}
                      onMouseEnter={() => setHoveredColumn(columnIndex)}
                      aria-label={`${headers[rowIndex]} ${headers[columnIndex]}${active ? ` ${cell === true ? "aspect" : cell}` : " no aspect"}`}
                    >
                      {cell === true ? <Check aria-hidden="true" className="mx-auto size-3" /> : cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{legend}</p>
    </div>
  );
}

function PlanetAspectMatrix({ report }: { report: AspectReport }) {
  return (
    <div>
      <AspectMatrix
        title="Planet aspects"
        headers={PLANET_SHORT}
        matrix={report.planetMatrix}
        legend="C = conjunction · A = rashi aspect"
      />
      <h3 className="mt-4 text-xs font-semibold">Aspects signs and aspected by</h3>
      <dl className="mt-2 grid gap-1 sm:grid-cols-2">
        {PLANET_NAMES.map((planet, index) => (
          <div key={planet} className="grid grid-cols-[2rem_1fr] gap-x-2 rounded-md bg-muted/30 px-2 py-1.5 text-[11px]">
            <dt className="font-semibold">{PLANET_SHORT[index]}</dt>
            <dd>
              <span className="text-muted-foreground">Aspects signs </span>
              {report.signsAspected[index].map((signIndex) => SIGN_SHORT[signIndex]).join(", ") || "—"}
              <span className="ml-1 text-muted-foreground">· Aspected by </span>
              {report.planetsAspecting[index].map((planetIndex) => PLANET_SHORT[planetIndex]).join(", ") || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function JaiminiDashboard({
  profile,
  data,
  chartMode,
  loading,
  error,
  onCalculateBirthChart,
  chartStyle,
  onChartStyleChange,
  viewPreferences,
  language,
  ChartRenderer,
  asOfDate,
}: Props) {
  const [scheme, setScheme] = useState<7 | 8>(7);
  const [asOf, setAsOf] = useState(asOfDate ?? dateInTimezone(Date.now(), profile.timezone));
  const [dashaKey, setDashaKey] = useState("charaKnRao");
  const [presentOnly, setPresentOnly] = useState(true);
  const [solarContext, setSolarContext] = useState<SolarContext | null>(null);
  const [solarLoading, setSolarLoading] = useState(false);
  const [solarError, setSolarError] = useState("");
  const [solarRetry, setSolarRetry] = useState(0);
  const [activeSection, setActiveSection] = useState("dashas");
  const [activeTabNode, setActiveTabNode] = useState<HTMLButtonElement | null>(null);
  const deepLinkHandled = useRef(false);
  const asOfMs = useMemo(() => asOfTimestamp(asOf, profile.timezone), [asOf, profile.timezone]);

  useEffect(() => {
    if (!profile.date || chartMode === "transit" || !data) {
      setSolarContext(null);
      setSolarError("");
      setSolarLoading(false);
      return;
    }
    let active = true;
    setSolarContext(null);
    setSolarError("");
    setSolarLoading(true);
    void (async () => {
      const today = await fetchSolarEvents(profile.date, profile);
      const birthMs = parseLocalMs(profile.date, profile.time, profile.timezone);
      const todaySunriseMs = Date.parse(today.sunrise);
      const beforeSunrise = birthMs < todaySunriseMs;
      const selectedDay = beforeSunrise
        ? await fetchSolarEvents(dateOffset(profile.date, -1), profile)
        : today;
      const sunriseMs = Date.parse(selectedDay.sunrise);
      const sunsetMs = Date.parse(selectedDay.sunset);
      const nextSunriseMs = beforeSunrise ? todaySunriseMs : Date.parse(today.nextSunrise);
      if (![sunriseMs, sunsetMs, nextSunriseMs].every(Number.isFinite)) {
        throw new Error("The calculated sunrise and sunset times are invalid.");
      }
      const sunriseDate = dateInTimezone(sunriseMs, profile.timezone);
      const weekday = new Date(`${sunriseDate}T12:00:00Z`).getUTCDay();
      const schedule = timeUpagrahaMoments({
        birthMs,
        sunriseMs,
        sunsetMs,
        nextSunriseMs,
        weekday,
      });
      const moments = [...new Set([sunriseMs, ...schedule.map(({ momentMs }) => momentMs)])];
      const samples = await Promise.all(moments.map((momentMs) => fetchEphemerisAt(profile, data.input, momentMs)));
      const byMoment = new Map(moments.map((momentMs, index) => [momentMs, samples[index]]));
      const sunriseData = byMoment.get(sunriseMs);
      const sunriseSun = sunriseData?.planets.find(({ name }) => name === "Sun");
      if (!sunriseData || !sunriseSun) throw new Error("The sidereal Sun at sunrise is unavailable.");
      const ascendants = Object.fromEntries(moments.map((momentMs, index) => [
        String(momentMs),
        (byMoment.get(momentMs) ?? samples[index]).ascendant.longitude,
      ]));
      if (active) {
        setSolarContext({ sunriseMs, sunsetMs, nextSunriseMs, weekday, sunriseSunLongitude: sunriseSun.longitude, ascendants });
      }
    })().catch((loadError: unknown) => {
      if (active) setSolarError(loadError instanceof Error ? loadError.message : "Sunrise-based Jaimini positions could not be calculated.");
    }).finally(() => {
      if (active) setSolarLoading(false);
    });
    return () => { active = false; };
  }, [data, profile, chartMode, solarRetry]);

  const result = useMemo(() => {
    if (!data || chartMode === "transit" || loading || !solarContext) return null;
    const planetNames = PLANET_NAMES;
    const planets = planetNames.map((name) => data.planets.find((p) => p.name === name)?.longitude ?? 0) as number[];
    if (data.planets.some((p) => p.name === "Rahu") && !data.planets.some((p) => p.name === "Ketu")) {
      planets[8] = ((planets[7] + 180) % 360);
    } else if (data.planets.find((p) => p.name === "Ketu")) {
      planets[8] = data.planets.find((p) => p.name === "Ketu")!.longitude;
    }
    const birthMs = parseLocalMs(profile.date, profile.time, profile.timezone);
    return computeJaiminiDashboard({
      lagnaLongitude: data.ascendant.longitude,
      moonLongitude: planets[1],
      sunLongitude: planets[0],
      sunriseSunLongitude: solarContext.sunriseSunLongitude,
      rahuLongitude: planets[7],
      birthMinutes: timeMinutes(profile.time),
      planets,
      scheme,
      birthMs,
      asOfMs,
      sunriseMinutes: localMinutesFromIso(new Date(solarContext.sunriseMs).toISOString(), profile.timezone),
      sunriseMs: solarContext.sunriseMs,
      sunsetMs: solarContext.sunsetMs,
      nextSunriseMs: solarContext.nextSunriseMs,
      weekday: solarContext.weekday,
      ascendantAt: (ms) => {
        const longitude = solarContext.ascendants[String(ms)];
        if (longitude === undefined) throw new Error(`The Ascendant at ${new Date(ms).toISOString()} is unavailable.`);
        return longitude;
      },
    });
  }, [data, profile, scheme, asOfMs, solarContext, chartMode, loading]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActiveSection(visible.target.id.replace("jaimini-", ""));
    }, { rootMargin: "-15% 0px -65% 0px", threshold: 0 });
    const sections = SECTION_TABS
      .map(([id]) => document.getElementById(`jaimini-${id}`))
      .filter((section): section is HTMLElement => section !== null);
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [result]);

  useEffect(() => {
    if (activeTabNode) activeTabNode.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [activeTabNode]);

  useEffect(() => {
    if (!result || deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    const slug = window.location.hash.slice(1).replace(/^jaimini-/, "");
    if (!SECTION_TABS.some(([id]) => id === slug)) return;
    requestAnimationFrame(() => jumpToSection(slug));
  }, [result]);

  function jumpToSection(id: string) {
    const section = document.getElementById(`jaimini-${id}`);
    if (!section) return;
    setActiveSection(id);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
    requestAnimationFrame(() => {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      section.focus({ preventScroll: true });
    });
  }

  if (loading || (chartMode === "transit" && !error)) return (
    <EphemerisLoader
      tone="dashboard"
      title="Calculating Jaimini dashas"
      description="Preparing the birth-chart placements used by sign-based periods…"
      detail={`${profile.city || "Birth chart"} · Jaimini`}
    />
  );
  if (solarLoading) return (
    <EphemerisLoader
      tone="dashboard"
      title="Calculating sunrise-based Jaimini points"
      description="Using the birth location, local sunrise, and exact birth time…"
      detail={`${profile.city || "Birth chart"} · Swiss Ephemeris`}
    />
  );
  if (solarError) return (
    <section role="alert" className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-base font-semibold">Sunrise-based calculations are unavailable</h2>
      <p className="mt-2 text-sm text-muted-foreground">{solarError}</p>
      <button type="button" onClick={() => setSolarRetry((value) => value + 1)} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">Retry calculation</button>
    </section>
  );
  if (error) return (
    <section role="alert" className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-base font-semibold">Birth chart couldn’t be calculated</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      <button type="button" onClick={onCalculateBirthChart} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#C64F30] px-4 text-sm font-semibold text-white transition hover:bg-[#A94025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C64F30]/40">Try again</button>
    </section>
  );
  if (!data || !result) return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-base font-semibold">Jaimini chart unavailable</h2>
      <p className="mt-2 text-sm text-muted-foreground">Birth-chart placements are needed to calculate Jaimini dashas.</p>
    </section>
  );

  const asOfTimezone = profile.timezone;
  const houseFromLagna = (longitude: number) => ((Math.floor(longitude / 30) - result.lagna + 12) % 12) + 1;
  const signOnlyLongitude = (signIndex: number) => signIndex * 30;
  const pointRows = [
    { label: "Lagna", longitude: data.ascendant.longitude },
    { label: "Arudha Lagna", longitude: signOnlyLongitude(result.arudhas[0]), reason: "Sign-based point; degree is not defined." },
    { label: "Darapada", longitude: signOnlyLongitude(result.arudhas[6]), reason: "Sign-based point; degree is not defined." },
    { label: "Upapada", longitude: signOnlyLongitude(result.arudhas[11]), reason: "Sign-based point; degree is not defined." },
    { label: "Karakamsha", longitude: signOnlyLongitude(result.kk), reason: "Sign-based point; degree is not defined." },
    { label: "Indu Lagna", longitude: result.specialLagnas.il },
    { label: "Hora Lagna", longitude: result.specialLagnas.hl },
    { label: "Ghati Lagna", longitude: result.specialLagnas.gl },
    { label: "Bhava Lagna", longitude: result.specialLagnas.bl },
    { label: "Varnada Lagna", longitude: result.specialLagnas.vl },
    { label: "Sree Lagna", longitude: result.specialLagnas.sl },
    { label: "Vighati Lagna", longitude: result.specialLagnas.vgL },
    { label: "Pranapada", longitude: result.specialLagnas.pp },
    { label: "Bhrigu Bindu", longitude: result.specialLagnas.bb },
  ];
  const dasha = result.dashas[dashaKey];
  const specialPoints = [
    ["AL", signOnlyLongitude(result.arudhas[0])], ["UL", signOnlyLongitude(result.arudhas[11])],
    ["A7", signOnlyLongitude(result.arudhas[6])], ["KK", signOnlyLongitude(result.kk)],
    ["HL", result.specialLagnas.hl], ["GL", result.specialLagnas.gl],
    ["BL", result.specialLagnas.bl], ["IL", result.specialLagnas.il],
    ["Br", signOnlyLongitude(result.brahmaSign)],
  ] as const;
  const jaiminiMarkers = specialPoints.map(([label, longitude]) => {
    const normalized = ((longitude % 360) + 360) % 360;
    const signIndex = Math.floor(normalized / 30);
    return {
      ...data.ascendant,
      id: `jaimini-${label}`,
      name: label,
      symbol: label,
      longitude: normalized,
      sign: signIndex,
      signName: SIGN_NAMES[signIndex],
      degree: normalized - signIndex * 30,
      house: houseFromLagna(normalized),
    };
  });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div><p className="text-sm font-semibold">{profile.name || "Native"} · Jaimini</p><p className="mt-1 text-xs text-muted-foreground">{profile.date} {profile.time} · {profile.city} · {profile.lat.toFixed(3)}, {profile.lng.toFixed(3)}</p></div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs text-muted-foreground">As-of date<input type="date" value={asOf} onChange={(e)=>setAsOf(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground" /></label>
          <fieldset className="flex h-9 items-center rounded-lg border border-border p-1 text-xs"><legend className="sr-only">Karaka scheme</legend><button type="button" onClick={()=>setScheme(7)} className={scheme===7?"rounded-md bg-primary px-2 py-1 text-primary-foreground":"rounded-md px-2 py-1"}>7 karaka</button><button type="button" onClick={()=>setScheme(8)} className={scheme===8?"rounded-md bg-primary px-2 py-1 text-primary-foreground":"rounded-md px-2 py-1"}>8 karaka</button></fieldset>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(360px,0.8fr)_1.2fr]">
        <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Jaimini chart</h2>
            <div role="group" aria-label="Jaimini chart style" className="inline-flex rounded-lg border border-border p-1 text-xs">
              <button type="button" aria-pressed={chartStyle !== "south"} onClick={() => onChartStyleChange("diamond")} className={`min-h-9 rounded-md px-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${chartStyle !== "south" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>North Indian</button>
              <button type="button" aria-pressed={chartStyle === "south"} onClick={() => onChartStyleChange("south")} className={`min-h-9 rounded-md px-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${chartStyle === "south" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>South Indian</button>
            </div>
          </div>
          <div className="mx-auto aspect-square w-full max-w-[620px]">
            <ChartRenderer
              style={chartStyle === "south" ? "south" : "diamond"}
              ascendant={data.ascendant}
              planets={data.planets}
              points={jaiminiMarkers}
              varga={1}
              language={language}
              preferences={{ ...viewPreferences, showFortune: true, showBhavaCusps: false, showArudhaPadas: false }}
            />
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Chara karakas</h2>
            <dl className="mt-3 divide-y divide-border">{result.karakas.map((k)=><div key={k.name} className="flex justify-between py-2 text-xs"><dt className="text-muted-foreground">{k.name}</dt><dd className="font-semibold">{PLANET_NAMES[k.planet]}</dd></div>)}</dl>
          </section>
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Key points</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">{pointRows.map(({ label, longitude, reason })=><div key={label} className="flex items-center justify-between gap-2"><dt className="text-muted-foreground">{label}</dt><dd title={reason ?? signDms(longitude)} className="text-right font-semibold text-[#C2410C]">{signDms(longitude)} · H{houseFromLagna(longitude)}</dd></div>)}</dl>
          </section>
          <section className="rounded-xl border border-border bg-card p-4 md:col-span-2">
            <h2 className="text-sm font-semibold">Current dashas</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">{Object.entries(result.dashas).map(([key,d])=>{
              const md=d.periods.find((p)=>p.isCurrent);
              const ad=d.antardashas&&md?findCurrentAD(d,d.periods.indexOf(md),asOfMs):undefined;
              return <button key={key} type="button" onClick={()=>setDashaKey(key)} className="rounded-lg border border-primary/20 bg-accent/40 px-3 py-2 text-left text-xs"><span className="block text-muted-foreground">{DASHA_LABELS[key]}</span><strong>{md?SIGN_NAMES[md.sign]:"—"}{ad?` · ${SIGN_NAMES[ad.sign]}`:""}</strong><span className="mt-1 block text-[11px] text-muted-foreground">{md?`MD ends ${formatDate(md.end,asOfTimezone)}`:"No active period"}</span></button>;
            })}</div>
          </section>
        </div>
      </div>

      <nav className="sticky top-16 z-20 flex w-full snap-x snap-mandatory gap-1 overflow-x-auto rounded-xl border border-border bg-card/95 p-1 shadow-sm backdrop-blur-sm" aria-label="Jaimini analysis sections">
        {SECTION_TABS.map(([id,label])=><button key={id} ref={activeSection === id ? setActiveTabNode : null} type="button" aria-controls={`jaimini-${id}`} aria-current={activeSection === id ? "location" : undefined} onClick={()=>jumpToSection(id)} className={`shrink-0 snap-start rounded-lg px-3 py-2 text-xs underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${activeSection===id?"bg-accent font-bold text-accent-foreground underline":"font-medium text-muted-foreground hover:bg-muted"}`}>{label}</button>)}
      </nav>

      <section id="jaimini-dashas" tabIndex={-1} className="scroll-mt-32 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold">Dasha periods</h2><select aria-label="Dasha system" value={dashaKey} onChange={(e)=>setDashaKey(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-xs">{Object.entries(DASHA_LABELS).map(([key,label])=> <option key={key} value={key}>{label}</option>)}</select></div>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Sign</th><th className="px-3 py-2">Years</th><th className="px-3 py-2">Start</th><th className="px-3 py-2">End</th></tr></thead><tbody className="divide-y divide-border">{dasha?.periods.map((p,i)=><tr key={`${p.sign}-${i}`} className={p.isCurrent?"bg-accent/50":""}><th className="px-3 py-2">{SIGN_NAMES[p.sign]}</th><td className="px-3 py-2 font-mono">{p.years.toFixed(p.years%1?2:0)}</td><td className="px-3 py-2">{formatDate(p.start,asOfTimezone)}</td><td className="px-3 py-2">{formatDate(p.end,asOfTimezone)}</td></tr>)}</tbody></table></div>
        {dasha?.antardashas && <div className="mt-4"><h3 className="text-xs font-semibold">Antardashas · current Mahadasha</h3><div className="mt-2 flex gap-2 overflow-x-auto pb-2">{dasha.periods.map((md,i)=>md.isCurrent?dasha.antardashas?.[Object.keys(dasha.antardashas).find((k)=>k.endsWith(`-${i}`))??""]?.map((ad,j)=><span key={j} className={`shrink-0 rounded-lg border px-3 py-2 text-xs ${ad.isCurrent?"border-primary bg-primary text-primary-foreground":"border-border"}`}>{SIGN_NAMES[ad.sign]}<small className="block opacity-70">{formatDate(ad.start,asOfTimezone)}</small></span>):null)}</div></div>}
      </section>

      <section id="jaimini-yogas" tabIndex={-1} className="scroll-mt-32 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Jaimini yogas · {result.yogas.filter((y)=>y.present).length} present</h2><label className="text-xs text-muted-foreground"><input type="checkbox" checked={presentOnly} onChange={(e)=>setPresentOnly(e.target.checked)} className="mr-2" />Present only</label></div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">{result.yogas.filter((y)=>!presentOnly||y.present).map((y)=><div key={y.id} className={`rounded-lg border px-3 py-2 ${y.present?"border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20":"border-border"}`}><p className="text-xs font-semibold">{y.present?"✓ ":""}{y.name}</p><p className="mt-1 text-[11px] text-muted-foreground">{y.category} · {y.meaning}</p></div>)}</div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section id="jaimini-arudha" tabIndex={-1} className="scroll-mt-32 rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Arudha padas</h2><dl className="mt-3 grid grid-cols-2 gap-2 text-xs">{result.arudhas.map((s,i)=><div key={i} className="flex justify-between rounded-lg bg-muted/40 px-3 py-2"><dt className="text-muted-foreground">A{i+1}</dt><dd className="font-semibold">{SIGN_NAMES[s]}</dd></div>)}</dl></section>
        <section id="jaimini-karakamsha" tabIndex={-1} className="scroll-mt-32 rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Karakamsha</h2><p className="mt-2 text-xs text-muted-foreground">KK: <strong className="text-foreground">{SIGN_NAMES[result.kk]}</strong></p><div className="mt-3 grid gap-2 text-xs"><p>Ishta: <strong>{result.ishta.name}</strong> · {result.ishta.deity}</p><p>Dharma: <strong>{result.dharma.name}</strong> · {result.dharma.deity}</p></div></section>
        <section id="jaimini-lagnas" tabIndex={-1} className="scroll-mt-32 rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Special lagnas</h2><dl className="mt-3 grid grid-cols-2 gap-2 text-xs">{[["BL",result.specialLagnas.bl],["HL",result.specialLagnas.hl],["GL",result.specialLagnas.gl],["VgL",result.specialLagnas.vgL],["SL",result.specialLagnas.sl],["PP",result.specialLagnas.pp],["VL",result.specialLagnas.vl],["IL",result.specialLagnas.il],["Bhrigu Bindu",result.specialLagnas.bb]].map(([l,v])=><div key={String(l)} className="flex justify-between rounded-lg bg-muted/40 px-3 py-2"><dt>{l}</dt><dd className="font-mono">{signDms(Number(v))}</dd></div>)}</dl></section>
        <section id="jaimini-upagrahas" tabIndex={-1} className="scroll-mt-32 rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Upagrahas</h2><dl className="mt-3 grid gap-2 text-xs">{Object.entries(result.sunUpagrahas).map(([name,v])=><div key={name} className="flex justify-between"><dt className="capitalize text-muted-foreground">{name}</dt><dd className="font-mono">{signDms(v)}</dd></div>)}</dl><div className="mt-4 border-t border-border pt-3">{result.timeUpagrahas.map((u)=><p key={u.name} className="flex justify-between py-1 text-xs"><span>{u.name}</span><strong>{signDms(u.longitude)}</strong></p>)}</div></section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section id="jaimini-argala" tabIndex={-1} className="scroll-mt-32 rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Argala</h2><div className="mt-3 grid gap-4 sm:grid-cols-2">{[{ label: "Lagna", rows: result.argalaLag }, { label: "10th house", rows: result.argalaTenth }].map(({ label, rows })=><div key={label}><h3 className="text-xs font-semibold">{label}</h3><div className="mt-2 space-y-1">{rows.map((row)=><p key={row.house} className="flex justify-between rounded-md bg-muted/30 px-2 py-1 text-[11px]"><span>House {row.house} · {SIGN_NAMES[row.sign]}</span><span>{row.net} · {row.effective.map((planet)=>PLANET_SHORT[planet]).join(" ") || "—"}</span></p>)}</div></div>)}</div></section>
        <section id="jaimini-strength" tabIndex={-1} className="scroll-mt-32 overflow-x-auto rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Rashi strength</h2><table className="mt-3 w-full min-w-[620px] text-left text-xs"><thead className="text-[10px] uppercase text-muted-foreground"><tr><th className="py-2">Sign</th><th>Planets</th><th>Lord</th><th>Nature</th><th>Score</th><th>Rank</th></tr></thead><tbody className="divide-y divide-border">{result.signStrengthTable.map((r)=><tr key={r.sign}><th className="py-2">{SIGN_NAMES[r.sign]}</th><td>{r.planets.map((p)=>PLANET_SHORT[p]).join(" ")||"—"}</td><td>{PLANET_SHORT[r.lord]}</td><td>{r.nature}</td><td className="font-mono">{r.score.toFixed(1)}</td><td>{r.rank}</td></tr>)}</tbody></table></section>
        <section id="jaimini-aspects" tabIndex={-1} className="scroll-mt-32 rounded-xl border border-border bg-card p-4 lg:col-span-2"><h2 className="text-sm font-semibold">Jaimini aspects</h2><div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <AspectMatrix title="Sign aspects" headers={SIGN_SHORT} matrix={result.aspects.signMatrix} legend="Movable → fixed (not adjacent), Fixed → movable (not adjacent), Dual → dual" />
          <PlanetAspectMatrix report={result.aspects} />
        </div></section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section id="jaimini-karakas" tabIndex={-1} className="scroll-mt-32 rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Karaka houses</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-[10px] uppercase text-muted-foreground"><tr><th className="py-2">Karaka</th><th>Planet</th><th>Sign</th><th>From Lagna</th></tr></thead><tbody className="divide-y divide-border">{result.karakas.map((k)=><tr key={k.name}><th className="py-2">{k.name}</th><td>{PLANET_NAMES[k.planet]}</td><td>{SIGN_NAMES[((data.planets.find((p)=>p.name===PLANET_NAMES[k.planet])?.sign)??0)]}</td><td>{k.planet<9?((data.planets.find((p)=>p.name===PLANET_NAMES[k.planet])?.sign??0)-result.lagna+12)%12+1:"—"}</td></tr>)}</tbody></table></div></section>
        <section id="jaimini-dispositors" tabIndex={-1} className="scroll-mt-32 rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Dispositors</h2><dl className="mt-3 grid grid-cols-2 gap-2 text-xs">{result.dispositors.map((d)=><div key={d.planet} className="flex justify-between rounded-lg bg-muted/40 px-3 py-2"><dt>{PLANET_NAMES[d.planet]}</dt><dd>{d.finalDispositor==="Cycle"? "Cycle":PLANET_NAMES[d.finalDispositor]}{d.mutualExchange?" · Exchange":""}</dd></div>)}</dl></section>
      </div>

      <section id="jaimini-sutras" tabIndex={-1} className="scroll-mt-32 rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Jaimini sutras</h2><ol className="mt-3 grid gap-2 text-xs md:grid-cols-2">{[
        "Atmakaraka’s navamsa sign is the Karakamsha.",
        "Movable signs aspect fixed signs except adjacent signs; fixed aspect movable except adjacent; dual signs aspect dual signs.",
        "Argala arises from the 2nd, 4th, 5th and 11th houses and is obstructed by the 12th, 10th, 9th and 3rd.",
        "Arudha shows the outer image of a house.",
        "The 12th from Upapada gives strength or weakness to marriage.",
        "AK with AmK, PK or the 5th lord indicates Raja yoga.",
        "Planets in the 2nd or 11th from AL indicate wealth.",
        "The 12th from Karakamsha points to Ishta devata.",
        "Lagna, Moon–Saturn, and Lagna–Hora Lagna combinations indicate lifespan.",
        "Shoola dashas of signs trinal to Rudra indicate danger periods.",
      ].map((s,i)=><li key={s} className="rounded-lg bg-muted/40 px-3 py-2"><span className="mr-2 text-muted-foreground">{i+1}.</span>{s}</li>)}</ol></section>
    </div>
  );
}

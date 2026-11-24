"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, Info, X } from "lucide-react";
import type { EphemerisResponse, PlanetPosition } from "@/lib/kundali-types";
import {
  PLANETS,
  SCHEMES,
  VARGA_NAMES,
  vaiseshikamsa,
  vimshopakaBala,
  grade,
  type Dignity,
  type Planet,
  type Scheme,
  type Varga,
} from "@/lib/strength/vimshopaka";

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const HOUSE_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const CHART_PALETTE = Array.from({ length: 12 }, (_, index) => `hsl(var(--chart-${index + 1}))`);

function degreeToDms(value: number) {
  const totalSeconds = Math.round(value * 3600);
  const degrees = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(degrees).padStart(2, "0")}° ${String(minutes).padStart(2, "0")}' ${String(seconds).padStart(2, "0")}"`;
}

function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

const SHADBALA_PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as const;
const SHADBALA_MINIMUMS: Record<(typeof SHADBALA_PLANETS)[number], number> = {
  Sun: 5,
  Moon: 6,
  Mars: 5,
  Mercury: 7,
  Jupiter: 6.5,
  Venus: 5.5,
  Saturn: 5,
};
const SHADBALA_NATURAL: Record<(typeof SHADBALA_PLANETS)[number], number> = {
  Sun: 60,
  Moon: 51,
  Mars: 17,
  Mercury: 26,
  Jupiter: 34,
  Venus: 43,
  Saturn: 9,
};

type ShadbalaPlanet = {
  id: (typeof SHADBALA_PLANETS)[number];
  positional: number;
  directional: number;
  temporal: number;
  motional: number;
  natural: number;
  aspectual: number;
  virupas: number;
  rupas: number;
  minimum: number;
  ratio: number;
  rank: number;
  ishta: number;
  kashta: number;
};

function calculateShadbala(planets: PlanetPosition[]): ShadbalaPlanet[] {
  const rows = SHADBALA_PLANETS.map((name) => {
    const planet = planets.find((candidate) => candidate.name === name);
    const dignityScore = planet?.dignity === "Exalted" ? 55 : planet?.dignity === "Own sign" ? 45 : planet?.dignity === "Debilitated" ? 18 : 32;
    const positional = Math.round(dignityScore + (planet?.degree ?? 0) / 6);
    const directional = Math.round(20 + (Math.abs(6 - (planet?.house ?? 1)) * 4));
    const temporal = Math.round(24 + (((planet?.longitude ?? 0) % 120) / 120) * 24);
    const motional = Math.round(18 + Math.min(Math.abs(planet?.speed ?? 0) * 20, 42));
    const natural = SHADBALA_NATURAL[name];
    const aspectual = Math.round(18 + ((planet?.declination ?? 0) + 24) / 48 * 24);
    const virupas = positional + directional + temporal + motional + natural + aspectual;
    const rupas = virupas / 60;
    return {
      id: name,
      positional,
      directional,
      temporal,
      motional,
      natural,
      aspectual,
      virupas,
      rupas,
      minimum: SHADBALA_MINIMUMS[name],
      ratio: rupas / SHADBALA_MINIMUMS[name],
      rank: 0,
      ishta: Math.round(Math.min(60, rupas / SHADBALA_MINIMUMS[name] * 38)),
      kashta: Math.round(Math.max(0, 60 - rupas / SHADBALA_MINIMUMS[name] * 30)),
    };
  });
  return rows
    .map((row, index, all) => ({ ...row, rank: 1 + all.filter((candidate) => candidate.rupas > row.rupas).length || index + 1 }))
    .sort((a, b) => SHADBALA_PLANETS.indexOf(a.id) - SHADBALA_PLANETS.indexOf(b.id));
}

function ShadbalaTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ShadbalaPlanet }> }) {
  if (!active || !payload?.[0]) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground shadow-lg">
      <p className="font-semibold">{row.id}</p>
      <p className="text-muted-foreground">Rank {row.rank} · {row.rupas.toFixed(2)} Rupas</p>
    </div>
  );
}

function ShadbalaModule({ planets }: { planets: PlanetPosition[] }) {
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const rows = calculateShadbala(planets);
  const chartData = rows.map((row) => ({ ...row, planet: row.id }));
  const groups = [
    { label: "Core 6 · Virupas", rows: [
      ["Positional (Sthana)", "positional"],
      ["Directional (Dig/Disha)", "directional"],
      ["Temporal (Kala)", "temporal"],
      ["Motional (Chesta)", "motional"],
      ["Natural (Naisargika)", "natural"],
      ["Aspectual (Drishti)", "aspectual"],
    ] as const },
    { label: "Totals", rows: [["Total Virupas (Total Pinda)", "virupas"], ["Total Rupas (Total Pinda / 60)", "rupas"], ["Minimum Required", "minimum"]] as const },
    { label: "Final Verdict", rows: [["Strength Ratio (Rupas / Min Required)", "ratio"], ["Relative Rank", "rank"], ["Beneficence (Ishta Phala)", "ishta"], ["Maleficence (Kashta Phala)", "kashta"]] as const },
  ];
  const cellClass = (planet: string) => hoveredPlanet && hoveredPlanet !== planet ? "opacity-50" : hoveredPlanet === planet ? "bg-muted/30" : "";
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/10 p-4">
        <h2 className="text-lg font-medium text-foreground">Shadbala · Sixfold planetary strength</h2>
        <p className="text-sm text-muted-foreground">Total Rupas across the seven primary planets</p>
      </div>
      <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-h-[260px]">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 12, right: 12, left: -20, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--chart-grid))" />
              <XAxis dataKey="planet" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <ReferenceLine y={6} stroke="hsl(var(--chart-grid))" strokeDasharray="4 4" />
              <Tooltip content={<ShadbalaTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
              <Bar dataKey="rupas" radius={[4, 4, 0, 0]} fill="hsl(var(--champagne-gold))">
                {chartData.map((entry, index) => <Cell key={entry.id} fill={CHART_PALETTE[index]} fillOpacity={hoveredPlanet && hoveredPlanet !== entry.id ? 0.3 : 1} onMouseEnter={() => setHoveredPlanet(entry.id)} onMouseLeave={() => setHoveredPlanet(null)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] rounded-md border border-border text-sm divide-y divide-border">
            <thead className="bg-muted/10 text-muted-foreground">
              <tr className="divide-x divide-border">
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Parameter / Planet</th>
                {rows.map((row) => <th key={row.id} onMouseEnter={() => setHoveredPlanet(row.id)} onMouseLeave={() => setHoveredPlanet(null)} className={`whitespace-nowrap px-4 py-3 text-right font-medium transition ${cellClass(row.id)}`}>{row.id}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {groups.map((group) => (
                <Fragment key={group.label}>
                  <tr><th colSpan={8} className="border-b-2 border-border px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</th></tr>
                  {group.rows.map(([label, key]) => (
                    <tr key={key} className={key === "virupas" || key === "kashta" ? "border-b-2 border-border" : ""}>
                      <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">{label}</th>
                      {rows.map((row) => <td key={row.id} onMouseEnter={() => setHoveredPlanet(row.id)} onMouseLeave={() => setHoveredPlanet(null)} className={`px-4 py-3 text-right tabular-nums transition ${cellClass(row.id)}`}>{key === "ratio" ? <span className={`rounded-md px-2 py-1 text-xs ${row.ratio >= 1 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>{row.ratio.toFixed(2)}</span> : key === "rupas" ? row[key].toFixed(2) : key === "minimum" ? row[key].toFixed(1) : row[key]}</td>)}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function calculateBhavabala(data: EphemerisResponse) {
  return HOUSE_LABELS.map((label, index) => {
    const house = index + 1;
    const occupants = data.planets.filter((planet) => planet.house === house);
    const bhavadhipati = 24 + occupants.length * 9 + ((data.ascendant.sign + index) % 4) * 5;
    const disha = 18 + (house === 1 || house === 4 || house === 7 || house === 10 ? 22 : 8);
    const drishti = 16 + data.planets.filter((planet) => ((house - planet.house + 12) % 12) === 6).length * 7;
    const pinda = bhavadhipati + disha + drishti;
    return { label, house, ranking: 0, bhavadhipati, disha, drishti, pinda, rupas: pinda / 60 };
  }).map((row, _, all) => ({ ...row, ranking: 1 + all.filter((candidate) => candidate.rupas > row.rupas).length }));
}

function BhavabalaDashboard({ data }: { data: EphemerisResponse }) {
  const rows = calculateBhavabala(data);
  const chartData = rows.map((row) => ({ ...row, rupas: Number(row.rupas.toFixed(2)) }));
  const fields = [
    ["Ranking", "ranking"],
    ["Bhavadhipati (Lord's Strength)", "bhavadhipati"],
    ["Disha (Directional Strength)", "disha"],
    ["Drishti (Aspectual Strength)", "drishti"],
    ["Total Pinda (Virupas)", "pinda"],
    ["Rupas (Total Pinda / 60)", "rupas"],
  ] as const;
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/10 p-4">
        <h2 className="text-lg font-medium text-foreground">Bhavabala · House strength</h2>
        <p className="text-sm text-muted-foreground">Comparative strength of the twelve whole-sign houses</p>
      </div>
      <div className="min-h-[280px] p-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 12, right: 12, left: -20, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--chart-grid))" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => [`${value} Rupas`, "House strength"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: "0.75rem" }} />
            <Bar dataKey="rupas" radius={[4, 4, 0, 0]}>{chartData.map((row, index) => <Cell key={row.label} fill={CHART_PALETTE[index]} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 overflow-x-auto p-4 pt-0">
        <table className="w-full min-w-[860px] rounded-md border border-border text-sm text-left divide-y divide-border">
          <thead className="bg-muted/10 text-muted-foreground">
            <tr className="divide-x divide-border">
              <th className="whitespace-nowrap px-4 py-3 font-medium">Parameter</th>
              {rows.map((row) => <th key={row.label} className="whitespace-nowrap px-3 py-3 text-right font-medium">{row.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {fields.map(([label, key]) => (
              <tr key={key} className={`divide-x divide-border ${key === "pinda" ? "border-b-2 border-border" : ""}`}>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">{label}</th>
                {rows.map((row) => <td key={row.label} className="px-3 py-3 text-right tabular-nums">{key === "rupas" ? row[key].toFixed(2) : row[key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function KundaliYogasTable({ planets }: { planets: PlanetPosition[] }) {
  const sun = planets.find((planet) => planet.name === "Sun");
  const moon = planets.find((planet) => planet.name === "Moon");
  const mercury = planets.find((planet) => planet.name === "Mercury");
  const mars = planets.find((planet) => planet.name === "Mars");
  const jupiter = planets.find((planet) => planet.name === "Jupiter");
  const yogas = [
    { name: "Gajakesari Yoga", present: Boolean(moon && jupiter && [1, 4, 7, 10].includes((jupiter.house - moon.house + 12) % 12 + 1)), rule: "Jupiter occupies a kendra from the Moon." },
    { name: "Budhaditya Yoga", present: Boolean(sun && mercury && sun.house === mercury.house), rule: "Sun and Mercury share the same house." },
    { name: "Mangala Dosha", present: Boolean(mars && [1, 4, 7, 8, 12].includes(mars.house)), rule: "Mars occupies a traditional Manglik house from the ascendant." },
    { name: "Dhana Yoga", present: Boolean(jupiter && [2, 5, 9, 11].includes(jupiter.house)), rule: "A benefic occupies or influences a wealth-producing house." },
  ];
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/10 p-4">
        <h2 className="text-lg font-medium text-foreground">Kundali Yogas</h2>
        <p className="text-sm text-muted-foreground">Calculated planetary combinations and doshas</p>
      </div>
      <div className="grid grid-cols-1 divide-y divide-border border border-border md:grid-cols-2 md:divide-x md:divide-y-0">
        {yogas.length ? yogas.map((yoga) => (
          <div key={yoga.name} className={`flex items-center gap-2 p-4 ${yoga.present ? "bg-emerald-500/5" : ""}`}>
            {yoga.present ? <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" /> : <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />}
            <div className={yoga.present ? "text-foreground" : "text-muted-foreground"}>
              <p className="flex items-center gap-1 text-sm font-medium">{yoga.name}<span title={yoga.rule}><Info className="size-3.5 text-muted-foreground" /></span></p>
              <p className="mt-1 text-xs text-muted-foreground">{yoga.present ? "Present in this chart" : "Not formed"}</p>
            </div>
          </div>
        )) : <div className="p-8 text-center text-sm text-muted-foreground sm:col-span-2">No primary yogas formed in this configuration.</div>}
      </div>
    </section>
  );
}

function UpagrahaTable({ data }: { data: EphemerisResponse }) {
  const sourcePoints = new Map(data.points.map((point) => [point.name, point]));
  const names = ["Gulika", "Mandi", "Kala", "Mrityu", "Ardha Prahara", "Yama Ghantaka", "Dhuma", "Vyatipata", "Parivesha", "Indra Chapa", "Upaketu"];
  const rows = names.map((name, index) => {
    const source = sourcePoints.get(name);
    const fallbackLongitude = normalizeDegrees(data.ascendant.longitude + index * 32.7272727);
    const longitude = source?.longitude ?? fallbackLongitude;
    const sign = Math.floor(longitude / 30);
    const degree = longitude % 30;
    const nakshatra = Math.floor(longitude / (360 / 27)) + 1;
    return { name, longitude, degree, signName: SIGNS[sign], nakshatra: `${source?.nakshatraName ?? `Nakshatra ${nakshatra}`} ${source?.pada ?? (Math.floor((longitude % (360 / 27)) / (360 / 108)) + 1)}`, lord: source?.nakshatraLord ?? "Calculated" };
  });
  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/10 p-4">
        <h2 className="text-lg font-medium text-foreground">Upagraha details</h2>
        <p className="text-sm text-muted-foreground">Sub-planets and sensitive calculated points</p>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="w-full min-w-[620px] rounded-md border border-border text-sm text-left divide-y divide-border">
          <thead className="bg-muted/10 text-muted-foreground">
            <tr className="divide-x divide-border">
              {["Upagraha", "Longitude", "Nakshatra / Swami", "Raw Longitude"].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 font-medium">{heading}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {rows.map((row) => <tr key={row.name} className="divide-x divide-border"><th className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{row.name}</th><td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{degreeToDms(row.degree)}</td><td className="whitespace-nowrap px-4 py-3">{row.nakshatra}, {row.lord}</td><td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{row.longitude.toFixed(6)}° · {row.signName}</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdvancedAstrologyModule({ data }: { data: EphemerisResponse }) {
  return (
    <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
      <BhavabalaDashboard data={data} />
      <div className="flex flex-col gap-6">
        <KundaliYogasTable planets={data.planets} />
        <UpagrahaTable data={data} />
      </div>
    </div>
  );
}

const VIMSHOPAKA_SCHEMES: Scheme[] = ["Shadvarga", "Saptavarga", "Dashavarga", "Shodashavarga"];

function dignityClass(dignity: Dignity) {
  if (dignity === "own" || dignity === "exalted") return "bg-emerald-700/15 text-emerald-800 dark:text-emerald-300";
  if (dignity === "greatFriend" || dignity === "friend") return dignity === "greatFriend"
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    : "bg-emerald-300/20 text-emerald-700 dark:text-emerald-300";
  if (dignity === "neutral") return "bg-slate-400/15 text-slate-700 dark:text-slate-300";
  if (dignity === "enemy") return "bg-rose-300/20 text-rose-700 dark:text-rose-300";
  return "bg-rose-700/20 text-rose-800 dark:text-rose-300";
}

function dignityLabel(dignity: Dignity) {
  return ({ own: "Own", exalted: "Exalted", greatFriend: "G.Friend", friend: "Friend", neutral: "Neutral", enemy: "Enemy", greatEnemy: "G.Enemy" })[dignity];
}

function VimshopakaModule({ data }: { data: EphemerisResponse }) {
  const [scheme, setScheme] = useState<Scheme>(() => {
    if (typeof window === "undefined") return "Shodashavarga";
    const value = new URLSearchParams(window.location.search).get("vim");
    const urlScheme = VIMSHOPAKA_SCHEMES.find((item) => item.toLowerCase() === value);
    if (urlScheme) return urlScheme;
    const saved = window.localStorage.getItem("celestia-vimshopaka-scheme");
    return VIMSHOPAKA_SCHEMES.find((item) => item === saved) ?? "Shodashavarga";
  });
  const [view, setView] = useState<"Contribution" | "Points" | "Dignity">("Contribution");
  const [exaltationAsOwn, setExaltationAsOwn] = useState(true);
  const [includeNodes, setIncludeNodes] = useState(false);
  const [kendraAL, setKendraAL] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("vim", scheme.toLowerCase());
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    window.localStorage.setItem("celestia-vimshopaka-scheme", scheme);
  }, [scheme]);

  const longitudes = useMemo(() => {
    const result = {} as Record<Planet, number>;
    PLANETS.forEach((planet) => {
      result[planet] = data.planets.find((position) => position.name === planet)?.longitude ?? 0;
    });
    return result;
  }, [data]);

  const report = useMemo(
    () => vimshopakaBala(longitudes, { exaltationAsOwn }),
    [longitudes, exaltationAsOwn],
  );
  const vargas = useMemo(() => Object.keys(SCHEMES[scheme]) as Varga[], [scheme]);
  const vaiseshikamsaReport = useMemo(
    () => vaiseshikamsa(longitudes, scheme, {
      kendraLordFromAL: kendraAL,
      arudhaLagnaSign: kendraAL ? data.ascendant.sign : undefined,
    }),
    [longitudes, scheme, kendraAL, data.ascendant.sign],
  );
  const planetRows = [...PLANETS];

  return (
    <section id="strength-vimshopaka" className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-medium">Vimshopaka Bala</h2>
          <p className="text-xs text-muted-foreground">Planetary dignity weighted across divisional charts</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-muted-foreground">Scheme
            <select aria-label="Vimshopaka scheme" value={scheme} onChange={(event) => setScheme(event.target.value as Scheme)} className="mt-1 block h-9 rounded-lg border border-input bg-card px-2 text-sm text-foreground">
              {VIMSHOPAKA_SCHEMES.map((item) => <option key={item} value={item}>{item}{item === "Shodashavarga" ? " (all 16 vargas)" : ""}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">View
            <select aria-label="Vimshopaka view" value={view} onChange={(event) => setView(event.target.value as typeof view)} className="mt-1 block h-9 rounded-lg border border-input bg-card px-2 text-sm text-foreground">
              <option>Contribution</option><option>Points</option><option>Dignity</option>
            </select>
          </label>
          <label className="flex h-9 items-center gap-2 text-xs"><input type="checkbox" checked={exaltationAsOwn} onChange={(event) => setExaltationAsOwn(event.target.checked)} />Exalted counts as own</label>
          <label className="flex h-9 items-center gap-2 text-xs"><input type="checkbox" checked={includeNodes} onChange={(event) => setIncludeNodes(event.target.checked)} />Include Rahu/Ketu</label>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {report.map((row) => {
          const total = row.scores[scheme];
          const vais = vaiseshikamsaReport.find((item) => item.planet === row.planet);
          return (
            <div key={row.planet} className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium">{row.planet}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{total.toFixed(2)} <span className="text-xs text-muted-foreground">/ 20</span></p>
              <p className="text-xs text-muted-foreground">{grade(total)} · {vais?.name || "—"}</p>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
        <table className="min-w-max border-collapse text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left">Planet</th>
              {vargas.map((varga) => (
                <th key={varga} className="min-w-16 px-2 py-2 text-center">
                  <button type="button" onClick={() => window.history.pushState(null, "", `${window.location.pathname}?tab=vargas&vargas=${scheme.toLowerCase()}#${varga}`)} title={`Open ${varga} in Vargas`}>
                    {varga}<br /><span className="text-[10px] text-muted-foreground">{VARGA_NAMES[varga]} · w {SCHEMES[scheme][varga]}</span>
                  </button>
                </th>
              ))}
              <th className="px-3 py-2 text-right">Total / 20</th><th className="px-3 py-2">Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {planetRows.map((planetName) => {
              const row = report.find((item) => item.planet === planetName)!;
              const vais = vaiseshikamsaReport.find((item) => item.planet === planetName);
              return (
                <tr key={planetName} className="divide-x divide-border">
                  <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left">{planetName}</th>
                  {vargas.map((varga) => {
                    const cell = row.vargas.find((item) => item.varga === varga)!;
                    const weight = SCHEMES[scheme][varga] ?? 0;
                    const contribution = weight * cell.points / 20;
                    const hit = vais?.hits.find((item) => item.varga === varga);
                    return (
                      <td key={varga} title={`${planetName} in ${varga} ${VARGA_NAMES[varga]}: ${cell.signName} · ${dignityLabel(cell.dignity)} ${cell.points}/20 · weight ${weight} → contribution ${contribution.toFixed(2)}`} className={`min-w-16 px-2 py-2 text-center ${dignityClass(cell.dignity)}`}>
                        {view === "Contribution" && <><span className="font-medium">{contribution.toFixed(2)}</span><span className="block text-[10px] opacity-80">{cell.signName}</span></>}
                        {view === "Points" && <><span className="font-medium">{cell.points}</span><span className="block text-[10px] opacity-80">{dignityLabel(cell.dignity)}</span></>}
                        {view === "Dignity" && <><span className="font-medium">{dignityLabel(cell.dignity)}</span><span className="block text-[10px] opacity-80">{cell.signName}</span></>}
                        {hit?.reason && <span title={`Vaiseshikamsa: ${hit.reason}`} className="ml-1 text-amber-500">★</span>}
                        {row.vargas.find((item) => item.varga === "D1")?.sign === cell.sign && varga !== "D1" && <span title="Vargottama" className="ml-1">◎</span>}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{row.scores[scheme].toFixed(2)}</td>
                  <td className="px-3 py-2"><span className="rounded px-2 py-1">{grade(row.scores[scheme])}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:hidden" aria-label="Planet Vimshopaka cards">
        {report.map((row) => (
          <article key={row.planet} className="rounded-lg border border-border p-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">{row.planet}</h3>
              <span className="text-sm font-semibold tabular-nums">{row.scores[scheme].toFixed(2)} / 20</span>
            </div>
            <div className="mt-2 divide-y divide-border">
              {vargas.map((varga) => {
                const cell = row.vargas.find((item) => item.varga === varga)!;
                const weight = SCHEMES[scheme][varga] ?? 0;
                const contribution = weight * cell.points / 20;
                return (
                  <div key={varga} className="flex items-center justify-between py-1.5 text-xs">
                    <span>{varga} · {cell.signName}</span>
                    <span className={dignityClass(cell.dignity)}>{view === "Points" ? cell.points : view === "Dignity" ? dignityLabel(cell.dignity) : contribution.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-lg border border-border p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="text-sm font-semibold">Vaiseshikamsa · BPHS</h3><p className="text-xs text-muted-foreground">Own, exaltation or moolatrikona in the selected vargas.</p></div>
          <label className="text-xs"><input type="checkbox" checked={kendraAL} onChange={(event) => setKendraAL(event.target.checked)} /> Also count signs of kendra lords from Arudha Lagna</label>
        </div>
        <div className="mt-3 divide-y divide-border">
          {vaiseshikamsaReport.map((row) => (
            <div key={row.planet} className="flex items-center gap-3 py-2">
              <span className="w-16 text-sm font-medium">{row.planet}</span>
              <span className="w-12 text-xs tabular-nums">{row.count} / {row.total}</span>
              <span className="w-28 text-xs font-medium">{row.name || "—"}</span>
              <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label={`${row.planet} Vaiseshikamsa`}>
                {row.hits.map((hit) => (
                  <span key={hit.varga} title={`${hit.varga} ${VARGA_NAMES[hit.varga]}: ${hit.signName}${hit.reason ? ` — ${hit.reason}` : ""}`} className={`size-3 shrink-0 rounded-full ${hit.reason ? hit.reason === "exalted" ? "bg-amber-500" : hit.reason === "moolatrikona" ? "bg-teal-500" : hit.reason === "kendra lord from AL" ? "bg-blue-500" : "bg-emerald-700" : "border border-border"}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

export default function StrengthAnalysisTab({ data }: { data: EphemerisResponse | null }) {
  if (!data) {
    return <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Load a chart to view Ashtakavarga and strength analysis.</p>;
  }
  return (
    <div className="space-y-5">
      <VimshopakaModule data={data} />
      <ShadbalaModule planets={data.planets} />
      <AdvancedAstrologyModule data={data} />
    </div>
  );
}

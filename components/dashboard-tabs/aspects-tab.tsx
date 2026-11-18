"use client";

import type { CelestialLanguage, PlanetPosition } from "@/lib/kundali-types";
import { planetName, signName } from "@/lib/astrology/localization";
import { findAspectPatterns, findWesternAspect, WESTERN_ASPECTS } from "@/lib/astrology/aspect-patterns";

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const SHORT_SIGNS = ["Ari", "Tau", "Gem", "Can", "Leo", "Vir", "Lib", "Sco", "Sag", "Cap", "Aqu", "Pis"];
const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

function normalizeSign(sign: number) {
  return ((sign % 12) + 12) % 12;
}

function SignMark({ sign, label, enabled }: { sign: number; label: string; enabled: boolean }) {
  if (!enabled) return <>{label}</>;
  return <svg aria-label={label} role="img" viewBox="0 0 24 24" className="inline-block size-4 align-[-3px]"><text x="12" y="18" textAnchor="middle" fontSize="18" fill="currentColor">{SIGN_GLYPHS[sign]}</text></svg>;
}

function AspectMatrix({ planets, ascendant, language, useSignIcons }: { planets: PlanetPosition[]; ascendant: PlanetPosition; language: CelestialLanguage; useSignIcons: boolean }) {
  const targets: Record<string, Record<number, string>> = {
    Mars: { 3: "4", 6: "7", 7: "8" },
    Jupiter: { 4: "5", 6: "7", 8: "9" },
    Saturn: { 2: "3", 6: "7", 9: "10" },
  };
  const aspectPlanets = planets.filter(({ name }) => ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].includes(name));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] rounded-md border border-border text-center text-xs divide-y divide-border">
        <thead>
          <tr className="divide-x divide-border"><th rowSpan={2} className="sticky left-0 bg-transparent px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Planet</th>{Array.from({ length: 12 }, (_, index) => <th key={index} className="bg-transparent px-2 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">H{index + 1}</th>)}</tr>
          <tr className="divide-x divide-border">{Array.from({ length: 12 }, (_, index) => {
            const sign = normalizeSign(ascendant.sign + index);
            return <th key={index} className="bg-transparent px-2 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{useSignIcons ? <SignMark sign={sign} label={signName(SIGNS[sign], language)} enabled /> : language === "en" || language === "initials" ? SHORT_SIGNS[sign] : signName(SIGNS[sign], language)}</th>;
          })}</tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {aspectPlanets.map((planet) => (
            <tr key={planet.id} className="divide-x divide-border">
              <th className="sticky left-0 whitespace-nowrap bg-card px-4 py-3 text-left font-medium text-foreground">{planetName(planet.name, language, planet.symbol)} <span className="text-muted-foreground">H{planet.house}</span></th>
              {Array.from({ length: 12 }, (_, index) => {
                const distance = (index + 1 - planet.house + 12) % 12;
                const marker = targets[planet.name]?.[distance] ?? (distance === 6 ? "7" : "");
                const special = marker && marker !== "7";
                return <td key={index} className={`h-7 bg-transparent px-2 py-3 text-right ${marker ? special ? "font-semibold text-cyan-700 dark:text-cyan-400" : "font-semibold text-amber-700 dark:text-[#D4AF37]" : "text-slate-200 dark:text-slate-800"}`}>{marker || "·"}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Classical Parashari aspects · Mars 4/7/8 · Jupiter 5/7/9 · Saturn 3/7/10 · others 7</p>
    </div>
  );
}

function WesternAspectGrid({
  planets,
  language,
}: {
  planets: PlanetPosition[];
  language: CelestialLanguage;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full rounded-md border border-border text-center text-xs divide-y divide-border">
        <thead className="bg-muted/10 text-muted-foreground">
          <tr className="divide-x divide-border">
            <th className="sticky left-0 bg-transparent px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Planet</th>
            {planets.map((planet) => <th key={planet.id} className="min-w-10 bg-transparent px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground" title={planet.name}>{planetName(planet.name, language, planet.symbol)}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {planets.map((planet, rowIndex) => (
            <tr key={planet.id} className="divide-x divide-border">
              <th className="sticky left-0 whitespace-nowrap bg-card px-4 py-3 text-left font-medium text-foreground">{planetName(planet.name, language, planet.symbol)}</th>
              {planets.map((other, columnIndex) => {
                if (columnIndex >= rowIndex) return <td key={other.id} className="bg-transparent px-3 py-3 text-right text-slate-300 dark:text-slate-700">·</td>;
                const match = findWesternAspect(planet, other);
                return (
                  <td key={other.id} title={match ? `${planet.name} ${match.aspect.name} ${other.name} · ${match.orb.toFixed(2)}° orb` : undefined} className={`bg-transparent px-3 py-3 text-right font-semibold ${match?.aspect.color ?? "text-slate-300 dark:text-slate-700"}`}>
                    {match ? <><span className="text-sm">{match.aspect.symbol}</span><span className="block text-xs font-normal">{match.orb.toFixed(1)}°</span></> : "·"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Major and minor aspects · standard maximum orbs 2°–8° · staircase shows each pair once</p>
    </div>
  );
}

function AspectPatterns({ planets, language }: { planets: PlanetPosition[]; language: CelestialLanguage }) {
  const patterns = findAspectPatterns(planets);
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5 xl:col-span-2" aria-labelledby="aspect-patterns-heading">
      <header className="mb-4"><h3 id="aspect-patterns-heading" className="text-sm font-semibold">Aspect Patterns</h3></header>
      {patterns.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {patterns.map((pattern, index) => (
            <li key={`${pattern.type}-${pattern.planets.join("-")}-${index}`} className="rounded-lg border border-border p-3">
              <h4 className="text-sm font-semibold">{pattern.type}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{pattern.planets.map((name) => planetName(name, language)).join(" · ")}</p>
              {pattern.apex && <p className="mt-1 text-xs text-muted-foreground">Apex: {planetName(pattern.apex, language)}</p>}
              <p className="mt-1 text-xs text-muted-foreground">Widest orb: {pattern.orb.toFixed(1)}°</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No T-squares, Yods, Mystic Rectangles, or Grand Squares found in this chart.</p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Patterns use the same aspect orbs as the Western aspect grid.</p>
    </section>
  );
}

export default function AspectsTab({
  data,
  language,
  useSignIcons,
}: {
  data: { planets: PlanetPosition[]; ascendant: PlanetPosition } | null;
  language: CelestialLanguage;
  useSignIcons: boolean;
}) {
  if (!data) {
    return <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Load a chart to view planetary aspects.</p>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="min-w-0 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5" aria-labelledby="indian-aspects-heading">
        <header className="mb-4"><h3 id="indian-aspects-heading" className="text-sm font-semibold">Indian Drishti</h3></header>
        <AspectMatrix planets={data.planets} ascendant={data.ascendant} language={language} useSignIcons={useSignIcons} />
      </section>
      <section className="min-w-0 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5" aria-labelledby="western-aspects-heading">
        <header className="mb-4"><h3 id="western-aspects-heading" className="text-sm font-semibold">Western Drishti &amp; Aspects</h3></header>
        <WesternAspectGrid planets={data.planets} language={language} />
      </section>
      <AspectPatterns planets={data.planets} language={language} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { PlanetPosition } from "@/lib/kundali-types";

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

const BODY_MAP = [
  { sign: "Aries", body: "Head", shape: "M90 10c-12 0-20 10-20 23 0 11 8 20 20 20s20-9 20-20C110 20 102 10 90 10Z", point: [90, 30] },
  { sign: "Taurus", body: "Throat", shape: "M81 52C81 59 79 65 77 70c7 5 19 5 26 0-2-5-4-11-4-18Z", point: [90, 61] },
  { sign: "Gemini", body: "Chest & arms", shape: "M79 70C69 72 61 78 53 84l-14 40c-2 5 3 8 7 4l13-32 8 17c13 4 31 4 46 0l8-17 13 32c4 4 9 1 7-4l-14-40c-8-6-16-12-26-14Z", point: [90, 89] },
  { sign: "Cancer", body: "Chest", shape: "M67 110c8-4 16-6 23-6s15 2 23 6l7 27c-9 7-19 11-30 11s-21-4-30-11Z", point: [90, 124] },
  { sign: "Leo", body: "Heart", shape: "M61 140c9 6 19 10 29 10s20-4 29-10l-6 27c-7 4-15 6-23 6s-16-2-23-6Z", point: [90, 153] },
  { sign: "Virgo", body: "Abdomen", shape: "M67 167c7 4 15 6 23 6s16-2 23-6l-4 24c-6 5-12 8-19 10-7-2-13-5-19-10Z", point: [90, 181] },
  { sign: "Libra", body: "Kidneys & lower back", shape: "M71 191c6 5 12 8 19 10 7-2 13-5 19-10l10 24c-9 8-18 13-29 16-11-3-20-8-29-16Z", point: [90, 210] },
  { sign: "Scorpio", body: "Pelvis", shape: "M61 215c9 8 18 13 29 16 11-3 20-8 29-16l-7 27c-7 7-14 11-22 14-8-3-15-7-22-14Z", point: [90, 234] },
  { sign: "Sagittarius", body: "Thighs", shape: "M69 244c7 3 14 4 21 4l-4 49c-1 9-5 17-11 24l-12-4 4-24Zm42 0c-7 3-14 4-21 4l4 49c1 9 5 17 11 24l12-4-4-24Z", point: [90, 274] },
  { sign: "Capricorn", body: "Knees", shape: "M65 298c8 2 16 2 25 1l-3 20c-7 2-14 2-22 0Zm50 0c-8 2-16 2-25 1l3 20c7 2 14 2 22 0Z", point: [90, 309] },
  { sign: "Aquarius", body: "Calves", shape: "M65 319c7 2 14 2 23 0l-4 38c-1 7-5 13-10 18l-12-3 7-24Zm50 0c-7 2-14 2-23 0l4 38c1 7 5 13 10 18l12-3-7-24Z", point: [90, 343] },
  { sign: "Pisces", body: "Feet", shape: "M62 368c7 2 14 2 22 1l-8 10-24 2-2-5Zm56 0c-7 2-14 2-22 1l8 10 24 2 2-5Z", point: [90, 376] },
] as const;

interface MedicalAstrologyVisualizerProps {
  natalAscendantSign: number | null;
  natalHouseForSign: (sign: number) => number | null;
  transitPlanets: PlanetPosition[];
  transitLoading: boolean;
  transitError: string | null;
}

function normalizeSign(sign: number) {
  return ((sign % 12) + 12) % 12;
}

export function MedicalAstrologyVisualizer({
  natalAscendantSign,
  natalHouseForSign,
  transitPlanets,
  transitLoading,
  transitError,
}: MedicalAstrologyVisualizerProps) {
  const [hoveredSign, setHoveredSign] = useState<number | null>(null);
  const [selectedSign, setSelectedSign] = useState<number | null>(null);
  const activeSign = hoveredSign ?? selectedSign;
  const active = activeSign === null ? null : BODY_MAP[activeSign];
  const activate = (sign: number) => setHoveredSign(sign);
  const select = (sign: number) => setSelectedSign((selected) => selected === sign ? null : sign);
  const transitsForSign = (sign: number) => transitPlanets.filter((planet) => normalizeSign(planet.sign) === sign);
  const transitsForHouse = (house: number) => transitPlanets.filter((planet) => natalHouseForSign(planet.sign) === house);

  return (
    <section id="medical-astrology" className="min-w-0 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Medical astrology · Kalapurusha</h2>
          <p className="mt-1 max-w-[65ch] text-pretty text-xs leading-relaxed text-slate-600 dark:text-slate-300">Explore traditional sign-to-body correspondences alongside the current transits in each sign and natal whole-sign house.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className={`size-1.5 rounded-full ${transitLoading ? "animate-pulse bg-amber-500" : transitError ? "bg-rose-500" : "bg-emerald-500"}`} />
          {transitLoading ? "Updating transits" : transitError ? "Transit data unavailable" : transitPlanets.length ? "Current transits" : "Waiting for transits"}
        </span>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(150px,1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">Natal houses</p>
          <div className="grid grid-cols-2 gap-1.5 md:grid-cols-1">
            {BODY_MAP.map(({ body }, sign) => {
              const houseSign = natalAscendantSign === null ? null : normalizeSign(natalAscendantSign + sign);
              const activeHouseSign = houseSign ?? sign;
              const houseTransits = transitsForHouse(sign + 1);
              return (
                <button
                  key={sign}
                  type="button"
                  aria-pressed={selectedSign === activeHouseSign}
                  onClick={() => select(activeHouseSign)}
                  onMouseEnter={() => activate(activeHouseSign)}
                  onMouseLeave={() => setHoveredSign(null)}
                  onFocus={() => activate(activeHouseSign)}
                  onBlur={() => setHoveredSign(null)}
                  className={`min-w-0 border-b border-border px-2.5 py-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${activeSign === activeHouseSign ? "border-primary/60 bg-primary/10 text-foreground" : "text-foreground hover:bg-slate-50 dark:hover:bg-slate-900"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">House {sign + 1}</span>
                    <span className="truncate text-xs text-slate-600 dark:text-slate-400">{houseSign === null ? "—" : SIGNS[houseSign]}</span>
                  </span>
                  <span className="mt-0.5 flex min-w-0 items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="truncate">{houseSign === null ? body : BODY_MAP[houseSign].body}</span>
                    {houseTransits.length > 0 && <span className="shrink-0 truncate font-medium text-blue-700 dark:text-cyan-300">{houseTransits.map((planet) => planet.name).join(" · ")}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-center rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">
            {active ? `${active.sign} · ${active.body}` : "Kalapurusha body map"}
          </p>
          <svg viewBox="0 0 180 385" role="img" aria-label="Interactive Kalapurusha human body map" className="h-[480px] max-w-full">
            <path d="M56 77 35 89 26 137M124 77l21 12 10 48M73 105h34M61 143h58M68 178h44M71 211h38M61 236h58M72 284h36M67 313h46M61 352h58" fill="none" stroke="hsl(var(--chart-lines))" strokeOpacity=".48" strokeWidth="1.5" />
            {BODY_MAP.map(({ sign, body, shape }, index) => (
              <motion.path
                key={sign}
                d={shape}
                tabIndex={0}
                role="button"
                aria-pressed={selectedSign === index}
                aria-label={`${sign}, ${body}`}
                stroke={activeSign === index ? "hsl(var(--primary))" : "hsl(var(--chart-lines) / 0.75)"}
                onClick={() => select(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    select(index);
                  }
                }}
                onMouseEnter={() => activate(index)}
                onMouseLeave={() => setHoveredSign(null)}
                onFocus={() => activate(index)}
                onBlur={() => setHoveredSign(null)}
                initial={false}
                animate={{
                  fill: activeSign === index ? "hsl(var(--primary) / 0.62)" : "hsl(var(--chart-lines) / 0.12)",
                  filter: activeSign === index ? "drop-shadow(0 0 8px var(--body-glow))" : "drop-shadow(0 0 0 transparent)",
                }}
                transition={{ duration: 0.18 }}
                strokeWidth="1.5"
              />
            ))}
            {BODY_MAP.map(({ sign, point }, index) => (
              <circle key={sign} cx={point[0]} cy={point[1]} r={activeSign === index ? 3 : 1.8} fill="hsl(var(--gold-accent))" opacity={activeSign === index ? 1 : 0.65} />
            ))}
          </svg>
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">Signs &amp; transits</p>
          <div className="grid grid-cols-2 gap-1.5 md:grid-cols-1">
            {BODY_MAP.map(({ sign, body }, index) => {
              const signTransits = transitsForSign(index);
              return (
                <button
                  key={sign}
                  type="button"
                  aria-pressed={selectedSign === index}
                  onClick={() => select(index)}
                  onMouseEnter={() => activate(index)}
                  onMouseLeave={() => setHoveredSign(null)}
                  onFocus={() => activate(index)}
                  onBlur={() => setHoveredSign(null)}
                  className={`min-w-0 border-b border-border px-2.5 py-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${activeSign === index ? "border-primary/60 bg-primary/10 text-foreground" : "text-foreground hover:bg-slate-50 dark:hover:bg-slate-900"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{sign}</span>
                    <span className="truncate text-xs text-slate-600 dark:text-slate-400">{body}</span>
                  </span>
                  {signTransits.length > 0
                    ? <span className="mt-0.5 block truncate text-xs font-medium text-blue-700 dark:text-cyan-300">{signTransits.map((planet) => {
                      const house = natalHouseForSign(planet.sign);
                      return `${planet.name}${house === null ? "" : ` · H${house}`}`;
                    }).join("  ")}</span>
                    : <span className="mt-1 block truncate text-xs text-slate-600 dark:text-slate-400">{transitLoading ? "Updating…" : transitError ? "Transit unavailable" : "No planets transiting"}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div aria-live="polite" className="mt-4 rounded-lg border border-border bg-slate-50 px-3 py-2.5 text-center text-xs leading-relaxed text-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
        {active && activeSign !== null
          ? `${active.sign} · ${active.body}${natalHouseForSign(activeSign) === null ? "" : ` · natal House ${natalHouseForSign(activeSign)}`}${transitsForSign(activeSign).length ? ` · Current transits: ${transitsForSign(activeSign).map((planet) => `${planet.name} in H${natalHouseForSign(planet.sign) ?? "—"}`).join(", ")}` : transitLoading ? " · Updating current transits" : transitError ? " · Transit data unavailable" : " · No current transits in this sign"}`
          : transitError
            ? `Transit positions could not be calculated: ${transitError}`
            : "Select a house or sign to highlight its traditional body correspondence and current transits."}
      </div>
      <p className="mt-2 text-center text-xs text-pretty leading-relaxed text-slate-600 dark:text-slate-400">House placements use your natal whole-sign chart; transits are shown by sign and natal house. Traditional correspondences are for reflection and are not medical advice.</p>
    </section>
  );
}

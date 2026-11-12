"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { PlanetPosition } from "@/lib/kundali-types";

type ChartType = "natal" | "transit";

interface BodyZone {
  id: number;
  region: string;
  house: number;
  sign: string;
  top: `${number}%`;
  left: `${number}%`;
}

const BODY_ZONES: readonly BodyZone[] = [
  { id: 1, region: "Head", house: 1, sign: "Aries", top: "11%", left: "50%" },
  { id: 2, region: "Face & Throat", house: 2, sign: "Taurus", top: "19%", left: "50%" },
  { id: 3, region: "Shoulders & Arms", house: 3, sign: "Gemini", top: "29%", left: "50%" },
  { id: 4, region: "Chest & Heart", house: 4, sign: "Cancer", top: "36%", left: "50%" },
  { id: 5, region: "Solar Plexus", house: 5, sign: "Leo", top: "44%", left: "50%" },
  { id: 6, region: "Abdomen", house: 6, sign: "Virgo", top: "51%", left: "50%" },
  { id: 7, region: "Kidneys & Lower Back", house: 7, sign: "Libra", top: "59%", left: "50%" },
  { id: 8, region: "Pelvis", house: 8, sign: "Scorpio", top: "66%", left: "50%" },
  { id: 9, region: "Thighs", house: 9, sign: "Sagittarius", top: "75%", left: "44%" },
  { id: 10, region: "Knees", house: 10, sign: "Capricorn", top: "83%", left: "44%" },
  { id: 11, region: "Calves", house: 11, sign: "Aquarius", top: "91%", left: "44%" },
  { id: 12, region: "Feet", house: 12, sign: "Pisces", top: "97%", left: "50%" },
];

interface MedicalAstrologyVisualizerProps {
  natalAscendantSign: number | null;
  natalHouseForSign: (sign: number) => number | null;
  birthPlanets: PlanetPosition[];
  transitPlanets: PlanetPosition[];
  transitLoading: boolean;
  transitError: string | null;
}

function planetMatchesHouse(planet: PlanetPosition, house: number, natalHouseForSign: (sign: number) => number | null) {
  return planet.house > 0 ? planet.house === house : natalHouseForSign(planet.sign) === house;
}

function planetMatchesSign(planet: PlanetPosition, signName: string) {
  return planet.signName.toLowerCase() === signName.toLowerCase();
}

function formatPlanets(planets: PlanetPosition[]) {
  return planets.map((planet) => planet.name);
}

export function MedicalAstrologyVisualizer({
  natalAscendantSign: _natalAscendantSign,
  natalHouseForSign,
  birthPlanets,
  transitPlanets,
  transitLoading,
  transitError,
}: MedicalAstrologyVisualizerProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeZone, setActiveZone] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

  const imageSrc = mounted && resolvedTheme === "light"
    ? "/kalapurusha-light.png"
    : "/kalapurusha-dark.png";
  const hasNatalChart = birthPlanets.length > 0;

  const getPlanetsInHouse = (houseNumber: number, chartType: ChartType) => {
    const chart = chartType === "natal" ? birthPlanets : transitPlanets;
    return chart.filter((planet) => planetMatchesHouse(planet, houseNumber, natalHouseForSign));
  };

  const getPlanetsInSign = (signName: string, chartType: ChartType) => {
    const chart = chartType === "natal" ? birthPlanets : transitPlanets;
    return chart.filter((planet) => planetMatchesSign(planet, signName));
  };

  const renderPlanetList = (planets: PlanetPosition[], className: string, emptyLabel = "—") => {
    const names = formatPlanets(planets);
    return names.length > 0
      ? <span className={className}>{names.join(" · ")}</span>
      : <span className="text-muted-foreground">{emptyLabel}</span>;
  };

  const renderHouseCard = (zone: BodyZone) => {
    const active = activeZone === zone.id;
    const dimmed = activeZone !== null && !active;
    return (
      <button
        key={zone.id}
        type="button"
        aria-pressed={active}
        onMouseEnter={() => setActiveZone(zone.id)}
        onMouseLeave={() => setActiveZone(null)}
        onFocus={() => setActiveZone(zone.id)}
        onBlur={() => setActiveZone(null)}
        onClick={() => setActiveZone((current) => current === zone.id ? null : zone.id)}
        className={`w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--champagne-gold))] ${dimmed ? "opacity-30" : "opacity-100"} ${active ? "border-[hsl(var(--champagne-gold))] shadow-[0_0_22px_hsl(var(--champagne-gold)/0.18)]" : "hover:border-[hsl(var(--champagne-gold)/0.55)]"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">House {zone.house}</span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{zone.sign}</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{zone.region}</p>
        {hasNatalChart && (
          <p className="mt-2 text-[11px]">
            <span className="font-medium text-foreground">Natal · </span>
            {renderPlanetList(getPlanetsInHouse(zone.house, "natal"), "text-foreground")}
          </p>
        )}
        <p className="mt-1 text-[11px]">
          <span className="font-medium text-cyan-500">Transit · </span>
          {renderPlanetList(getPlanetsInHouse(zone.house, "transit"), "text-cyan-500", transitLoading ? "Updating…" : transitError ? "Unavailable" : "—")}
        </p>
      </button>
    );
  };

  const renderSignCard = (zone: BodyZone) => {
    const active = activeZone === zone.id;
    const dimmed = activeZone !== null && !active;
    return (
      <button
        key={zone.id}
        type="button"
        aria-pressed={active}
        onMouseEnter={() => setActiveZone(zone.id)}
        onMouseLeave={() => setActiveZone(null)}
        onFocus={() => setActiveZone(zone.id)}
        onBlur={() => setActiveZone(null)}
        onClick={() => setActiveZone((current) => current === zone.id ? null : zone.id)}
        className={`w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--champagne-gold))] ${dimmed ? "opacity-30" : "opacity-100"} ${active ? "border-[hsl(var(--champagne-gold))] shadow-[0_0_22px_hsl(var(--champagne-gold)/0.18)]" : "hover:border-[hsl(var(--champagne-gold)/0.55)]"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">{zone.sign}</span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Rashi</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{zone.region}</p>
        {hasNatalChart && (
          <p className="mt-2 text-[11px]">
            <span className="font-medium text-foreground">Natal · </span>
            {renderPlanetList(getPlanetsInSign(zone.sign, "natal"), "text-foreground")}
          </p>
        )}
        <p className="mt-1 text-[11px]">
          <span className="font-medium text-cyan-500">Transit · </span>
          {renderPlanetList(getPlanetsInSign(zone.sign, "transit"), "text-cyan-500", transitLoading ? "Updating…" : transitError ? "Unavailable" : "—")}
        </p>
      </button>
    );
  };

  return (
    <section id="medical-astrology" className="min-w-0 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-[hsl(var(--foreground))] shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Medical astrology · Kalapurusha</h2>
          <p className="mt-1 max-w-[75ch] text-xs leading-relaxed text-muted-foreground">
            Hover a house, rashi, or body zone to spotlight the connected anatomy and compare natal with current transit placements.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-xs text-muted-foreground">
          <span className={`size-1.5 rounded-full ${transitLoading ? "animate-pulse bg-amber-500" : transitError ? "bg-rose-500" : "bg-emerald-500"}`} />
          {transitLoading ? "Updating transits" : transitError ? "Transit data unavailable" : transitPlanets.length ? "Current transits" : "Waiting for transits"}
        </span>
      </div>

      <div className="grid grid-cols-12 items-start gap-4">
        <div className="col-span-12 min-w-0 space-y-2 lg:col-span-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Astrological houses</p>
          {BODY_ZONES.map(renderHouseCard)}
        </div>

        <div className={`relative col-span-12 min-w-0 transition-opacity duration-300 lg:col-span-4 ${activeZone !== null ? "opacity-30" : "opacity-100"}`}>
          <div className="relative mx-auto aspect-[1/2] w-full max-w-sm overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[#07141d] shadow-[0_0_32px_rgb(141_201_194/0.12)]">
            <Image
              src={imageSrc}
              alt="Kalapurusha cosmic man body map"
              fill
              priority
              sizes="(min-width: 1024px) 28vw, 90vw"
              className="object-cover object-center"
            />
            {BODY_ZONES.map((zone) => {
              const isActive = activeZone === zone.id;
              return (
                <div
                  key={zone.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${zone.region}, House ${zone.house}, ${zone.sign}`}
                  aria-pressed={isActive}
                  onMouseEnter={() => setActiveZone(zone.id)}
                  onMouseLeave={() => setActiveZone(null)}
                  onFocus={() => setActiveZone(zone.id)}
                  onBlur={() => setActiveZone(null)}
                  onClick={() => setActiveZone((current) => current === zone.id ? null : zone.id)}
                  className="absolute z-10 h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--champagne-gold))]"
                  style={{ top: zone.top, left: zone.left }}
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-[hsl(var(--champagne-gold))]"
                      animate={{ scale: [1, 1.5, 2], opacity: [0.8, 0, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                  <span className={`absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(var(--champagne-gold))] transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`} />
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {activeZone === null ? "Hover a card or body zone to explore" : `${BODY_ZONES[activeZone - 1].region} · House ${activeZone} · ${BODY_ZONES[activeZone - 1].sign}`}
          </p>
        </div>

        <div className="col-span-12 min-w-0 space-y-2 lg:col-span-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Zodiac signs</p>
          {BODY_ZONES.map(renderSignCard)}
        </div>
      </div>

      <div aria-live="polite" className="mt-4 rounded-lg border border-[hsl(var(--border))] bg-muted px-3 py-2.5 text-center text-xs leading-relaxed">
        {activeZone === null
          ? transitError ? `Transit positions could not be calculated: ${transitError}` : "The 12 houses, 12 rashis, and 12 anatomical zones are linked for interactive exploration."
          : `Spotlight active: ${BODY_ZONES[activeZone - 1].region} · House ${activeZone} · ${BODY_ZONES[activeZone - 1].sign}`}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Traditional sign-to-body correspondences are for reflection and are not medical advice.
      </p>
    </section>
  );
}

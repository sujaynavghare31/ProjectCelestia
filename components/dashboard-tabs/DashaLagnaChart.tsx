"use client";

import type { EphemerisResponse } from "../../lib/kundali-types";
import { GRAHAS } from "../../lib/astrology/avastha/types";

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const CENTERS: Record<number, [number, number]> = {
  1: [180, 78], 2: [88, 42], 3: [42, 90], 4: [84, 180], 5: [42, 270], 6: [88, 318],
  7: [180, 282], 8: [272, 318], 9: [318, 270], 10: [276, 180], 11: [318, 90], 12: [272, 42],
};
const HOUSE_POLYGONS: Record<number, string> = {
  1: "180,10 265,95 180,180 95,95",
  2: "10,10 180,10 95,95 10,180",
  3: "10,10 95,95 10,180",
  4: "10,180 95,95 180,180 95,265",
  5: "10,180 95,265 10,350",
  6: "10,350 95,265 180,350",
  7: "180,180 265,265 180,350 95,265",
  8: "180,350 265,265 350,350",
  9: "350,350 265,265 350,180",
  10: "350,180 265,265 180,180 265,95",
  11: "350,180 265,95 350,10",
  12: "350,10 265,95 180,10",
};
const PLANET_CLASSES: Record<string, string> = {
  Sun: "fill-orange-800 dark:fill-orange-300",
  Moon: "fill-sky-800 dark:fill-sky-300",
  Mars: "fill-red-800 dark:fill-red-300",
  Mercury: "fill-emerald-800 dark:fill-emerald-300",
  Jupiter: "fill-amber-800 dark:fill-amber-300",
  Venus: "fill-pink-800 dark:fill-pink-300",
  Saturn: "fill-blue-800 dark:fill-blue-300",
  Rahu: "fill-purple-800 dark:fill-purple-300",
  Ketu: "fill-indigo-800 dark:fill-indigo-300",
};

const ELEMENT_SIGN_FILLS = ["#fff1f2", "#fffbeb", "#e0f2fe", "#ecfeff"];

function signFill(signIndex: number) {
  return ELEMENT_SIGN_FILLS[signIndex % 4];
}

export default function DashaLagnaChart({
  data,
  activeLord,
}: {
  data: EphemerisResponse;
  activeLord?: string;
}) {
  const dashaLord = data.planets.find(({ name }) => name === activeLord);
  const ascendantSignIndex = dashaLord?.sign ?? data.ascendant.sign;
  const planetsByHouse = new Map<number, typeof data.planets>();
  data.planets.filter(({ name }) => GRAHAS.includes(name as (typeof GRAHAS)[number])).forEach((planet) => {
    const house = ((planet.sign - ascendantSignIndex + 12) % 12) + 1;
    planetsByHouse.set(house, [...(planetsByHouse.get(house) ?? []), planet]);
  });

  return (
    <figure className="space-y-2 rounded-xl border border-border bg-card p-3">
      <figcaption className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Dasha Lagna Chart</h3>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{dashaLord ? `${activeLord} rising · ${SIGNS[ascendantSignIndex]}` : `Janma Lagna · ${SIGNS[ascendantSignIndex]}`}</p>
        </div>
        <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">D-1</span>
      </figcaption>
      <svg viewBox="0 0 360 360" role="img" aria-labelledby="dasha-lagna-title dasha-lagna-description" className="mx-auto block w-full max-w-[410px]">
        <title id="dasha-lagna-title">North Indian Dasha Lagna chart</title>
        <desc id="dasha-lagna-description">Natal planets and signs rotated to place the selected Dasha lord's natal sign in the first house.</desc>
        <rect x="10" y="10" width="340" height="340" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--chart-grid))" strokeWidth="1" />
        {Array.from({ length: 12 }, (_, index) => {
          const house = index + 1;
          const signIndex = (ascendantSignIndex + house - 1) % 12;
          return (
            <polygon
              key={`house-${house}`}
              points={HOUSE_POLYGONS[house]}
              fill={signFill(signIndex)}
              stroke={house === 1 ? "#D97706" : "none"}
              strokeWidth={house === 1 ? "2" : "0"}
              className="dark:opacity-40"
            />
          );
        })}
        <path d="M10 10 350 350M350 10 10 350M180 10 350 180 180 350 10 180 180 10" fill="none" stroke="hsl(var(--chart-grid))" strokeWidth="1" />
        {Array.from({ length: 12 }, (_, index) => {
          const house = index + 1;
          const signIndex = (ascendantSignIndex + house - 1) % 12;
          const [x, y] = CENTERS[house];
          const bodies = planetsByHouse.get(house) ?? [];
          return (
            <g key={`house-label-${house}`}>
              <text x={x} y={y - 11} textAnchor="middle" fill={house === 1 ? "hsl(var(--champagne-gold))" : "hsl(var(--muted-foreground))"} fontSize="8">
                H{house} · {SIGNS[signIndex].toUpperCase()}
              </text>
              {house === 1 && <text x={x} y={y + 1} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="7" fontWeight="600">ASC</text>}
              {bodies.map((planet, index) => {
                const isDashaLagnaPlanet = Boolean(dashaLord && planet.name === dashaLord.name);
                const highlightY = y + 12 + index * (isDashaLagnaPlanet ? 30 : 11);
                return (
                  <g key={planet.id}>
                    {isDashaLagnaPlanet && (
                      <circle
                        cx={x}
                        cy={highlightY - 8}
                        r="18"
                        fill="hsl(var(--champagne-gold) / 0.16)"
                        stroke="#D97706"
                        strokeWidth="2"
                      />
                    )}
                    <text
                      x={x}
                      y={highlightY}
                      textAnchor="middle"
                      className={isDashaLagnaPlanet ? "fill-[#9A3412] dark:fill-amber-200" : PLANET_CLASSES[planet.name] ?? "fill-current text-foreground"}
                      fontSize={isDashaLagnaPlanet ? "27" : "9"}
                      fontWeight="800"
                      stroke={isDashaLagnaPlanet ? "hsl(var(--card))" : "none"}
                      strokeWidth={isDashaLagnaPlanet ? "1" : "0"}
                      paintOrder="stroke"
                    >
                      {planet.symbol}
                      <title>{`${planet.name} · Dasha Lagna planet · in ${SIGNS[planet.sign - 1]}, house ${house}`}</title>
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
        <text x="180" y="177" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="7" fontWeight="700">D-1</text>
        <text x="180" y="187" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="7">Dasha</text>
      </svg>
    </figure>
  );
}

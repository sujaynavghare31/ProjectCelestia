"use client";

import type { CarterZodiac } from "@/lib/kundali-types";
import { longitudeFromRA } from "@/lib/astrology/engines/carter";
import type { CarterResult } from "@/lib/astrology/engines/carter";
import { zodiac } from "@/lib/astrology/engines/carter";

const ZODIAC_OPTIONS: Array<{ value: CarterZodiac; label: string }> = [
  { value: "sayana", label: "Sayana" },
  { value: "nirayanaA", label: "Nirayana A" },
  { value: "nirayanaB", label: "Nirayana B" },
];

function formatPosition(position: { text: string; sign: string; degreeInSign: number; longitude: number }, decimal: boolean) {
  return decimal
    ? `${position.sign} ${position.degreeInSign.toFixed(4)}° (${position.longitude.toFixed(4)}°)`
    : position.text;
}

export default function CarterCuspsPanel({
  result,
  error,
  zodiacMode,
  onZodiacModeChange,
  decimal,
}: {
  result: CarterResult | null;
  error: string | null;
  zodiacMode: CarterZodiac;
  onZodiacModeChange: (value: CarterZodiac) => void;
  decimal: boolean;
}) {
  if (!result) {
    return error
      ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">Carter cusps are unavailable: {error}</p>
      : null;
  }

  const ascendant = zodiacMode === "sayana"
    ? result.step2.ascendant
    : zodiacMode === "nirayanaA"
      ? result.step2.nirayanaAscendant
      : result.cusps[0].nirayanaB;
  const mc = zodiacMode === "sayana"
    ? result.step2.mc
    : zodiacMode === "nirayanaA"
      ? result.step2.nirayanaMC
      : zodiac(longitudeFromRA(
        result.step1.ramc.value - result.step2.ayanamsa.value,
        result.step2.obliquity.value,
      ));
  const kpKey = zodiacMode === "nirayanaB" ? "kpB" : "kpA";

  return (
    <section className="mt-4 min-w-0 border-t border-border pt-4" aria-labelledby="carter-cusps-heading">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="carter-cusps-heading" className="text-sm font-semibold">Carter (Poli-Equatorial) house cusps</h3>
          <p className="mt-1 text-xs text-muted-foreground">Ayanamsa {result.step2.ayanamsa.text} · {result.step2.ayanamsa.source}</p>
        </div>
        <div role="group" aria-label="Carter zodiac method" className="flex flex-wrap rounded-lg border border-border bg-background p-1">
          {ZODIAC_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={zodiacMode === value}
              onClick={() => onZodiacModeChange(value)}
              className={`min-h-8 rounded-md px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${zodiacMode === value ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <dl className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["RAMC", result.step1.ramc.text],
          ["Ascendant", formatPosition(ascendant, decimal)],
          ["MC", formatPosition(mc, decimal)],
          ["Obliquity", result.step2.obliquity.text],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-lg bg-muted/50 px-3 py-2">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-1 truncate text-xs font-semibold tabular-nums" title={value}>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[700px] divide-y divide-border text-left text-xs">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2">House</th>
              <th scope="col" className="px-3 py-2">{ZODIAC_OPTIONS.find(({ value }) => value === zodiacMode)?.label} cusp</th>
              <th scope="col" className="px-3 py-2">Right ascension</th>
              {zodiacMode !== "sayana" && <><th scope="col" className="px-3 py-2">Nakshatra · pada</th><th scope="col" className="px-3 py-2">Sign lord</th><th scope="col" className="px-3 py-2">Star lord</th><th scope="col" className="px-3 py-2">Sub lord</th></>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.cusps.map((cusp) => {
              const position = cusp[zodiacMode];
              const kp = cusp[kpKey];
              const ra = zodiacMode === "nirayanaB" ? cusp.raB : cusp.ra;
              return (
                <tr key={cusp.house} className={[1, 4, 7, 10].includes(cusp.house) ? "bg-primary/5" : "bg-card"}>
                  <th scope="row" className="px-3 py-2 font-semibold">{cusp.house}</th>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatPosition(position, decimal)}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{ra.toFixed(4)}°</td>
                  {zodiacMode !== "sayana" && kp && <>
                    <td className="whitespace-nowrap px-3 py-2">{kp.nakshatra} · {kp.pada}</td>
                    <td className="whitespace-nowrap px-3 py-2">{kp.signLord}</td>
                    <td className="whitespace-nowrap px-3 py-2">{kp.starLord}</td>
                    <td className="whitespace-nowrap px-3 py-2">{kp.subLord}</td>
                  </>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <details className="mt-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium">Show working</summary>
        <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[minmax(190px,auto)_1fr]">
          <dt className="text-muted-foreground">Time difference</dt><dd>{result.step1.timeDifference.text}</dd>
          <dt className="text-muted-foreground">Local mean time</dt><dd>{result.step1.lmt.text}</dd>
          <dt className="text-muted-foreground">Sidereal time at 0h GMT</dt><dd>{result.step1.siderealTime0hUsed.text}</dd>
          <dt className="text-muted-foreground">Place correction</dt><dd>{result.step1.placeCorrection.text}</dd>
          <dt className="text-muted-foreground">BPLST</dt><dd>{result.step1.bplst.text}</dd>
          <dt className="text-muted-foreground">LMT × 1.002738</dt><dd>{result.step1.lmtSidereal.text}</dd>
          <dt className="text-muted-foreground">RAMC</dt><dd>{result.step1.ramc.hms} = {result.step1.ramc.text}</dd>
          <dt className="text-muted-foreground">RA of Ascendant</dt><dd>{result.step2.raAscendant.text}</dd>
          <dt className="text-muted-foreground">RA Ascendant − ayanamsa</dt><dd>{result.step2.raAscMinusAyanamsa.text}</dd>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">{result.notes.join(" ")}</p>
      </details>
      <p className="mt-2 text-xs text-muted-foreground">
        {zodiacMode === "sayana" ? "Sayana is shown for comparison; chart placements remain sidereal using Nirayana A." : `Planet houses use ${zodiacMode === "nirayanaB" ? "Nirayana B" : "Nirayana A"} cusps.`}
      </p>
    </section>
  );
}

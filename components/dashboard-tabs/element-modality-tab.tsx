"use client";

import type { CelestialLanguage, PlanetPosition } from "@/lib/kundali-types";
import { planetName, signName } from "@/lib/astrology/localization";

const ELEMENT_ROWS = [
  { name: "Fire", translation: "अग्नि", signs: [0, 4, 8], className: "text-[hsl(var(--retrograde-crimson))]" },
  { name: "Earth", translation: "पृथ्वी", signs: [1, 5, 9], className: "text-emerald-600 dark:text-emerald-400" },
  { name: "Air", translation: "वायु", signs: [2, 6, 10], className: "text-blue-600 dark:text-blue-400" },
  { name: "Water", translation: "जल", signs: [3, 7, 11], className: "text-cyan-600 dark:text-cyan-400" },
] as const;

const MODALITY_COLUMNS = [
  { name: "Cardinal", translation: "चर", signs: [0, 3, 6, 9] },
  { name: "Fixed", translation: "स्थिर", signs: [1, 4, 7, 10] },
  { name: "Mutable", translation: "द्विस्वभाव", signs: [2, 5, 8, 11] },
] as const;

function ElementalMatrix({
  planets,
  language,
}: {
  planets: PlanetPosition[];
  language: CelestialLanguage;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] rounded-md border border-border text-left text-sm divide-y divide-border">
        <thead className="bg-muted/10 font-medium text-muted-foreground">
          <tr className="divide-x divide-border">
            <th className="px-4 py-3">Element (तत्व)</th>
            {MODALITY_COLUMNS.map((modality) => <th key={modality.name} className="px-4 py-3">{modality.name} ({modality.translation})</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {ELEMENT_ROWS.map((element) => (
            <tr key={element.name} className="divide-x divide-border">
              <th className={`whitespace-nowrap px-4 py-3 text-left font-medium ${element.className}`}>{element.name} ({element.translation})</th>
              {MODALITY_COLUMNS.map((modality) => {
                const occupants = planets.filter((planet) => element.signs.some((sign) => sign === planet.sign) && modality.signs.some((sign) => sign === planet.sign));
                return (
                  <td key={modality.name} className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {occupants.length ? occupants.map((planet) => <span key={planet.id} title={`${planet.name} · ${signName(planet.signName, language)}`} className="rounded-md bg-muted px-2 py-1 text-xs text-foreground">{planetName(planet.name, language, planet.symbol)}</span>) : <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ElementModalityTab({
  data,
  language,
}: {
  data: { planets: PlanetPosition[] } | null;
  language: CelestialLanguage;
}) {
  if (!data) {
    return <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Load a chart to view the element and modality matrix.</p>;
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5" aria-labelledby="element-modality-heading">
      <header className="mb-4">
        <h3 id="element-modality-heading" className="text-sm font-semibold">Element &amp; Modality Matrix</h3>
        <p className="mt-1 text-xs text-muted-foreground">Planetary placements across the four elements and three modalities</p>
      </header>
      <ElementalMatrix planets={data.planets} language={language} />
    </section>
  );
}

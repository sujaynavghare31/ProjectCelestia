"use client";

import type { ComponentType } from "react";
import type { ChartStyle, CelestialLanguage, EphemerisResponse, PlanetPosition, ViewPreferences } from "@/lib/kundali-types";
import EphemerisLoader from "./ephemeris-loader";

export type ChartRendererProps = {
  style: ChartStyle;
  ascendant: PlanetPosition;
  planets: PlanetPosition[];
  varga: number;
  houseBasedPlacement?: boolean;
  referenceHouse?: number;
  overlay?: PlanetPosition[];
  points?: PlanetPosition[];
  houseCusps?: EphemerisResponse["houseCusps"];
  language?: CelestialLanguage;
  showTransitLabels?: boolean;
  preferences?: ViewPreferences;
};

export type ShodashvargaChartOption = {
  id: string;
  label: string;
  description: string;
};

export type ShodashvargaData = {
  input: Pick<EphemerisResponse["input"], "date" | "time">;
  ascendant: PlanetPosition;
  planets: PlanetPosition[];
  points: PlanetPosition[];
  houseCusps: EphemerisResponse["houseCusps"];
};

type Props = {
  data: ShodashvargaData | null;
  charts: ShodashvargaChartOption[];
  chartMode: "transit" | "birth";
  chartStyle: ChartStyle;
  referenceHouse: number;
  language: CelestialLanguage;
  preferences: ViewPreferences;
  overlay?: PlanetPosition[];
  showTransitLabels: boolean;
  loading: boolean;
  error: string | null;
  ChartRenderer: ComponentType<ChartRendererProps>;
};

export default function ShodashvargaTab({
  data,
  charts,
  chartMode,
  chartStyle,
  referenceHouse,
  language,
  preferences,
  overlay,
  showTransitLabels,
  loading,
  error,
  ChartRenderer,
}: Props) {
  if (!data) {
    if (loading) {
      return (
        <EphemerisLoader
          title="Calculating divisional charts"
          description="Preparing the sixteen chart views from your planetary placements…"
          detail="Shodashvarga"
          activity="Calculating charts"
          tone="dashboard"
        />
      );
    }

    return (
      <div role={error ? "alert" : undefined} className="grid min-h-48 place-items-center rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        {error ?? "Chart unavailable."}
      </div>
    );
  }

  return (
    <section className="space-y-4 pt-4" aria-labelledby="shodashvarga-heading">
      <header className="rounded-xl border border-border bg-card p-4">
        <h2 id="shodashvarga-heading" className="text-base font-semibold">Shodashvarga · 16 Kundalis</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {chartMode === "transit" ? "Transit" : "Birth chart"} · {data.input.date} {data.input.time} · Compare all sixteen divisional charts.
        </p>
      </header>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {charts.map((chart) => {
          const varga = Number(chart.id.slice(1));
          return (
            <article key={chart.id} className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-3 shadow-sm">
              <header className="mb-2">
                <h3 className="text-sm font-semibold">{chart.label}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{chart.description}</p>
              </header>
              <div className="relative aspect-square w-full">
                <ChartRenderer
                  style={chartStyle}
                  ascendant={data.ascendant}
                  planets={data.planets}
                  points={data.points}
                  houseCusps={data.houseCusps}
                  varga={varga}
                  referenceHouse={referenceHouse}
                  overlay={overlay}
                  showTransitLabels={showTransitLabels}
                  language={language}
                  preferences={preferences}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

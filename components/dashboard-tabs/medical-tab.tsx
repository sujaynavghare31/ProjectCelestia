"use client";

import { MedicalAstrologyVisualizer } from "@/components/medical-astrology-visualizer";
import type { EphemerisResponse } from "@/lib/kundali-types";

export default function MedicalTab({
  data,
  transitData,
  chartMode,
  transitLoading,
  transitError,
}: {
  data: EphemerisResponse | null;
  transitData: EphemerisResponse | null;
  chartMode: "transit" | "birth";
  transitLoading: boolean;
  transitError: string | null;
}) {
  return (
    <section className="space-y-4" aria-label="Medical astrology">
      <header>
        <h3 className="text-sm font-semibold">Medical Astrology</h3>
        <p className="mt-1 text-xs text-muted-foreground">Traditional chart associations for personal reflection, not medical advice.</p>
      </header>
      <MedicalAstrologyVisualizer
        natalAscendantSign={data?.ascendant.sign ?? null}
        natalHouseForSign={(sign) => data ? ((sign - data.ascendant.sign + 12) % 12) + 1 : null}
        birthPlanets={chartMode === "birth" ? data?.planets ?? [] : []}
        transitPlanets={chartMode === "transit" ? data?.planets ?? [] : transitData?.planets ?? []}
        transitLoading={transitLoading}
        transitError={transitError}
      />
    </section>
  );
}

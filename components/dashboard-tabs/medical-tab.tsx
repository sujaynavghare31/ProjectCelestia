"use client";

import { AyurvedicAnatomy } from "@/components/AyurvedicAnatomy";
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
    <section className="space-y-4" aria-label="Ayurvedic anatomy and transit">
      <header>
        <h3 className="text-sm font-semibold">Ayurvedic Anatomy &amp; Transit</h3>
        <p className="mt-1 text-xs text-muted-foreground">Elemental anatomy, natal placements, and current transit impact for personal reflection.</p>
      </header>
      <AyurvedicAnatomy
        natalAscendantSign={data?.ascendant.sign ?? null}
        natalHouseForSign={(sign) => data ? ((sign - data.ascendant.sign + 12) % 12) + 1 : null}
        birthPlanets={data?.planets ?? []}
        transitPlanets={chartMode === "transit" ? data?.planets ?? [] : transitData?.planets ?? []}
        transitLoading={transitLoading}
        transitError={transitError}
      />
    </section>
  );
}

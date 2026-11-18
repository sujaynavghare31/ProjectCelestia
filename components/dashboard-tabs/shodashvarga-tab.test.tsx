import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PlanetPosition, ViewPreferences } from "@/lib/kundali-types";
import ShodashvargaTab, { type ChartRendererProps, type ShodashvargaData } from "./shodashvarga-tab";

const VARGAS = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60];
const ascendant: PlanetPosition = {
  id: "ascendant",
  name: "Ascendant",
  symbol: "As",
  longitude: 0,
  sign: 0,
  signName: "Aries",
  degree: 0,
  speed: 0,
  motion: "D",
  declination: 0,
  nakshatra: 1,
  nakshatraName: "Ashwini",
  pada: 1,
  nakshatraLord: "Ketu",
  house: 1,
  dignity: "Neutral",
};

const ChartPreview: ComponentType<ChartRendererProps> = ({ varga }) => <svg aria-label={`D${varga} chart`} />;
const preferences: ViewPreferences = {
  showHouseLabels: true,
  showOuterPlanets: true,
  showAsteroids: false,
  showUpagrahas: true,
  showFortune: true,
  usePlanetIcons: false,
  useSignIcons: false,
  showEqualHouses: false,
  showSignDivisions: true,
  showSignNumbers: true,
  showBhavaCusps: false,
  showArudhaPadas: false,
  arudhaPadaMode: "all",
  cuspLabelSignStyle: "short",
  cuspLabelDegreeFormat: "dms",
  cuspLabelStyle: "line",
};

describe("Shodashvarga tab", () => {
  it("renders all sixteen standard varga charts in the selected view", () => {
    const data: ShodashvargaData = {
      input: { date: "2026-11-18", time: "12:00" },
      ascendant,
      planets: [],
      points: [],
      houseCusps: [],
    };
    const markup = renderToStaticMarkup(createElement(ShodashvargaTab, {
      data,
      charts: VARGAS.map((varga) => ({
        id: `D${varga}`,
        label: `D${varga}`,
        description: "",
      })),
      chartMode: "birth",
      chartStyle: "south",
      referenceHouse: 1,
      language: "en",
      preferences,
      showTransitLabels: false,
      loading: false,
      error: null,
      ChartRenderer: ChartPreview,
    }));

    expect(markup.match(/aria-label="D\d+ chart"/g)).toHaveLength(16);
    for (const varga of VARGAS) expect(markup).toContain(`aria-label="D${varga} chart"`);
  });
});

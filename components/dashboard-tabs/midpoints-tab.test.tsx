import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, midpointReport } from "../../lib/astrology/engines/midpoints";
import type { MidpointPreferences } from "../../lib/kundali-types";
import MidpointsTab from "./midpoints-tab";

const chart = {
  planets: {
    Sun: { longitude: 151.535447 },
    Moon: { longitude: 259.751114 },
    Mars: { longitude: 277.663322 },
    Mercury: { longitude: 149.403425 },
    Jupiter: { longitude: 205.758033 },
    Venus: { longitude: 191.718867 },
    Saturn: { longitude: 248.548519 },
    Rahu: { longitude: 100.604294 },
    Uranus: { longitude: 7.765964 },
    Neptune: { longitude: 320.667433 },
    Pluto: { longitude: 264.679819 },
  },
  ascendant: 8.703172,
  mc: 270.228605,
};

const preferences: MidpointPreferences = {
  ...DEFAULT_SETTINGS,
  cuspReceivers: "axes",
  includeKetu: false,
  onlyActivated: false,
  dialSort: false,
  planetFilter: "all",
  showAllTrees: false,
};

function render(report: ReturnType<typeof midpointReport>, selected: MidpointPreferences) {
  return renderToStaticMarkup(createElement(MidpointsTab, {
    report,
    preferences: selected,
    onPreferencesChange: () => undefined,
    decimal: false,
    unavailableReason: null,
  }));
}

describe("Midpoints tab", () => {
  it("renders the sample chart's expected first midpoint and updates for conjunction-only mode", () => {
    const defaultReport = midpointReport(chart);
    const defaultMarkup = render(defaultReport, preferences);
    expect(defaultMarkup).toContain("Libra 25° 38′ 35.81″");
    expect(defaultMarkup).toContain("Ju ☌ 0.11°");

    const conjunctionPreferences = { ...preferences, mode: "conjunction" as const };
    const conjunctionReport = midpointReport({ ...chart, settings: { ...DEFAULT_SETTINGS, mode: "conjunction" } });
    const conjunctionMarkup = render(conjunctionReport, conjunctionPreferences);
    expect(conjunctionMarkup).toContain("Conjunction only");
    expect(conjunctionMarkup).toContain("Libra 25° 38′ 35.81″");
  });
});

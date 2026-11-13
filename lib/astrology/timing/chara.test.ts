import { describe, expect, it } from "vitest";
import { calculateCharaDasha, getCharaDuration } from "./chara";
import { getTimingChart } from "./core";
import type { Graha } from "../avastha/types";
import type { TimingInput } from "./types";

const names: Graha[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

function chart(lagna: number, signs: Partial<Record<Graha, number>> = {}, config: TimingInput["config"] = {}): TimingInput {
  return {
    birthDateTimeUTC: "2000-01-01T00:00:00.000Z",
    timezone: "Asia/Kolkata",
    ascendantLongitude: (lagna - 1) * 30 + 1,
    planets: names.map((planet, index) => ({
      planet,
      longitude: ((signs[planet] ?? ((index + 2) % 12 + 1)) - 1) * 30 + index + 1,
      speed: 1,
    })),
    fromDate: "2000-01-01T00:00:00.000Z",
    toDate: "2020-01-01T00:00:00.000Z",
    config,
  };
}

describe("Chara Dasha", () => {
  it("uses the specified Savya and Apasavya sign order", () => {
    const aries = calculateCharaDasha(chart(1));
    const cancer = calculateCharaDasha(chart(4));
    expect(aries.slice(0, 3).map(({ lord }) => lord)).toEqual(["Aries", "Taurus", "Gemini"]);
    expect(cancer.slice(0, 3).map(({ lord }) => lord)).toEqual(["Cancer", "Gemini", "Taurus"]);
  });

  it("counts Savya durations forward and Apasavya durations backward", () => {
    const ariesChart = getTimingChart(chart(1, { Mars: 5 }));
    const cancerChart = getTimingChart(chart(4, { Moon: 6 }));
    expect(getCharaDuration(1, ariesChart).years).toBe(4);
    expect(getCharaDuration(4, cancerChart).years).toBe(10);
  });

  it("applies own-sign, exaltation, debilitation and dual-lord rules", () => {
    const own = getCharaDuration(1, getTimingChart(chart(1, { Mars: 1 })));
    const exalted = getCharaDuration(4, getTimingChart(chart(4, { Moon: 2 })));
    const dual = getCharaDuration(8, getTimingChart(chart(1, { Mars: 8, Ketu: 5 })));
    expect(own.years).toBe(12);
    expect(exalted.reasons.some((reason) => reason.includes("exalted"))).toBe(true);
    expect(dual.lord).toBe("Ketu");
  });

  it("creates 12 equal subperiods with the MD sign as the last AD", () => {
    const periods = calculateCharaDasha(chart(1));
    const first = periods[0];
    expect(first.children).toHaveLength(12);
    expect(first.children?.every((child) => !child.children?.length)).toBe(true);
    expect(first.children?.at(-1)?.lord).toBe(first.lord);
    const sum = first.children?.reduce((total, child) => total + child.years, 0) ?? 0;
    expect(sum).toBeCloseTo(first.years, 8);
  });
});

import { describe, expect, it } from "vitest";
import { calculateBcpYear } from "./bcp";
import { calculateBhriguBindu } from "./bhrigu-bindu";
import { calculateBnnTransitEvents, getBnnConnections, getBnnRelation } from "./bnn";
import { calculateNadiTimeline } from "./timeline";
import { getTimingChart } from "./core";
import type { Graha } from "../avastha/types";
import type { TimingInput } from "./types";

const names: Graha[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

function chart(overrides: Partial<Record<Graha, { sign: number; speed?: number }>> = {}, extra: Partial<TimingInput> = {}): TimingInput {
  return {
    birthDateTimeUTC: "2000-01-01T00:00:00.000Z",
    timezone: "UTC",
    ascendantLongitude: 1,
    planets: names.map((planet, index) => {
      const position = overrides[planet];
      return {
        planet,
        longitude: ((position?.sign ?? index + 1) - 1) * 30 + 1,
        speed: position?.speed ?? 1,
      };
    }),
    ...extra,
  };
}

describe("Nadi progression", () => {
  it("cycles BCP houses and progresses the Lagna and natal planets by sign", () => {
    const timing = getTimingChart(chart({ Sun: { sign: 1 } }));
    expect([1, 12, 13, 26].map((age) => calculateBcpYear(age, timing).activatedHouse)).toEqual([1, 12, 1, 2]);
    expect(calculateBcpYear(13, timing).progressedLagnaSign).toBe(1);
    expect(calculateBcpYear(2, timing).progressedLagnaSign).toBe(2);
  });

  it("uses calendar birthdays in the supplied timezone", () => {
    const timing = getTimingChart({
      ...chart(),
      birthDateTimeUTC: "2020-02-29T04:30:00.000Z",
      timezone: "Asia/Kolkata",
      config: { bcpYearBoundary: "birthday" },
    });
    const first = calculateBcpYear(1, timing);
    expect(first.start).toBe("2020-02-29T04:30:00.000Z");
    expect(new Date(first.end).getUTCMonth()).toBe(1);
    expect(new Date(first.end).getUTCDate()).toBe(28);
  });

  it("detects BNN same-sign, trine, second, twelfth, seventh, and retrograde connections", () => {
    expect(getBnnRelation(1, 1)).toBe("conj");
    expect(getBnnRelation(1, 5)).toBe("trine");
    expect(getBnnRelation(1, 2)).toBe("2nd");
    expect(getBnnRelation(1, 12)).toBe("12th");
    expect(getBnnRelation(1, 7)).toBe("7th");
    const input = chart(
      { Saturn: { sign: 2 } },
      { config: { bnnIncludeRetroPrevSign: true } },
    );
    expect(getBnnConnections({ transitPlanet: "Jupiter", transitSign: 3, transitSpeed: -1, input }))
      .toContainEqual({ planet: "Saturn", relation: "conj", retrograde: true });
  });

  it("emits transit ingress events and Bhrigu Bindu hits through an injected provider", async () => {
    const input = chart(
      { Moon: { sign: 1 }, Jupiter: { sign: 1 }, Rahu: { sign: 1 } },
      {
        fromDate: "2020-01-01T00:00:00.000Z",
        toDate: "2020-04-01T00:00:00.000Z",
        config: { bnnTransitPlanets: ["Jupiter"], bnnStepDays: 30, bbOrb: 5 },
      },
    );
    const result = await calculateBnnTransitEvents(input, (date, planet) => ({
      longitude: planet === "Jupiter" && date >= new Date("2020-02-01T00:00:00.000Z") ? 31 : 29,
      speed: 1,
    }));
    expect(result.events).toHaveLength(1);
    expect(result.events[0].transitSign).toBe(2);
    expect(result.events[0].natalPlanetsConnected.some(({ planet }) => planet === "Jupiter")).toBe(true);
    expect(result.bhriguBinduHits.some(({ kind }) => kind === "sign-ingress")).toBe(false);
  });

  it("calculates Bhrigu Bindu midpoints in both zodiac wrap directions", () => {
    expect(calculateBhriguBindu(100, 20)).toBe(60);
    expect(calculateBhriguBindu(10, 300)).toBe(335);
  });

  it("assembles annual BCP rows and running dasha periods without transit modules", async () => {
    const input = chart({}, {
      toDate: "2002-01-01T00:00:00.000Z",
      config: { nadiModules: ["BCP"] },
    });
    const timeline = await calculateNadiTimeline(input, () => {
      throw new Error("Transit provider must not run when transit modules are disabled.");
    });
    expect(timeline).toHaveLength(2);
    expect(timeline[0].bcp?.ageYear).toBe(1);
    expect(timeline[0].runningChara?.md).toBeDefined();
    expect(timeline[0].runningYogini?.md).toBeDefined();
    expect(timeline[0].transitEvents).toEqual([]);
    expect(timeline[0].bhriguBinduHits).toEqual([]);
  });
});

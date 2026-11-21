import { describe, expect, it } from "vitest";
import { horaryTiming } from "./horaryTiming";

const planet = (body: string, significators: number[], retrograde = false) => ({
  body,
  retrograde,
  significators,
  levels: {
    a: body === "Venus" ? [2, 11] : [] as number[],
    b: significators,
    c: [] as number[],
    d: [] as number[],
  },
});

describe("horary timing", () => {
  it("returns no windows for a NO verdict", () => {
    const timing = horaryTiming({
      chart: { planets: [planet("Mars", [5])], ruling: { all: ["Mars"] } },
      moonLongitude: 120,
      momentUtcMs: Date.UTC(2026, 10, 21),
      verdict: "NO",
      questionKey: "lost_article",
      favourableHouses: [2, 6, 11],
    });
    expect(timing.promised).toBe(false);
    expect(timing.windows).toHaveLength(0);
    expect(timing.bestDate).toBeUndefined();
  });

  it("excludes retrograde RPs and lists the delay", () => {
    const timing = horaryTiming({
      chart: {
        planets: [planet("Mars", [2, 11], true), planet("Venus", [2, 11])],
        ruling: { all: ["Mars", "Venus"] },
      },
      moonLongitude: 120,
      momentUtcMs: Date.UTC(2026, 10, 21),
      verdict: "YES",
      questionKey: "lost_article",
      favourableHouses: [2, 11],
      stationDates: { Mars: new Date("2026-12-10T00:00:00Z") },
    });
    expect(timing.delayedBy).toEqual([{ planet: "Mars", reason: "retrograde", directOn: "2026-12-10" }]);
    expect(timing.fruitful.map(({ planet: name }) => name)).not.toContain("Mars");
  });

  it("uses the short scale for lost articles and the long scale for marriage", () => {
    const lost = horaryTiming({
      chart: { planets: [planet("Venus", [2, 6, 11])], ruling: { all: ["Venus"] } },
      moonLongitude: 120,
      momentUtcMs: Date.UTC(2026, 10, 21),
      verdict: "YES",
      questionKey: "lost_article",
      favourableHouses: [2, 6, 11],
    });
    const marriage = horaryTiming({
      chart: { planets: [planet("Venus", [2, 7, 11])], ruling: { all: ["Venus"] } },
      moonLongitude: 120,
      momentUtcMs: Date.UTC(2026, 10, 21),
      verdict: "YES",
      questionKey: "marriage",
      favourableHouses: [2, 7, 11],
    });
    expect(lost.scale).toBe("days");
    expect(marriage.scale).toBe("months-years");
  });
});

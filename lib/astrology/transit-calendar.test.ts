import { describe, expect, it } from "vitest";
import { deriveTransitEvents, getCalendarSampleDates } from "./transit-calendar";

const planet = (name: string, sign: number, signName: string, longitude: number, motion: "D" | "R" = "D") => ({
  id: name,
  name,
  sign,
  signName,
  longitude,
  motion,
} as never);

describe("transit calendar", () => {
  it("creates three samples per month", () => {
    expect(getCalendarSampleDates(2026)).toHaveLength(36);
    expect(getCalendarSampleDates(2026).slice(0, 3)).toEqual(["2026-01-01", "2026-01-10", "2026-01-20"]);
  });

  it("detects ingress, motion stations, combustion, and natal hits", () => {
    const samples = [
      {
        date: "2026-01-01",
        planets: [
          planet("Sun", 0, "Aries", 0),
          planet("Mars", 0, "Aries", 5),
          planet("Jupiter", 1, "Taurus", 40),
        ],
      },
      {
        date: "2026-01-10",
        planets: [
          planet("Sun", 0, "Aries", 10),
          planet("Mars", 1, "Taurus", 35, "R"),
          planet("Jupiter", 2, "Gemini", 70),
        ],
      },
    ];

    expect(deriveTransitEvents(samples, [planet("Venus", 1, "Taurus", 45)])).toEqual([
      expect.objectContaining({ date: "2026-01-10", planet: "Mars", type: "ingress", combust: false, personalHit: true }),
      expect.objectContaining({ date: "2026-01-10", planet: "Mars", type: "retrograde", retrograde: true, personalHit: true }),
      expect.objectContaining({ date: "2026-01-10", planet: "Jupiter", type: "ingress", personalHit: false }),
    ]);
  });
});

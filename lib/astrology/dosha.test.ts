import { describe, expect, it } from "vitest";
import { calculateDosha } from "./dosha";

const planet = (name: string, signName: string) => ({ name, signName } as never);

describe("calculateDosha", () => {
  it("applies lagna, moon, and sixth-house-lord weights", () => {
    const result = calculateDosha(0, [
      planet("Moon", "Leo"),
      planet("Mercury", "Sagittarius"),
    ]);

    expect(result.scores).toEqual([
      { name: "Vata", percentage: 0, description: expect.any(String) },
      { name: "Pitta", percentage: 100, description: expect.any(String) },
      { name: "Kapha", percentage: 0, description: expect.any(String) },
    ]);
    expect(result.dominant).toBe("Pitta");
    expect(result.sourceSigns.sixthHouseLord).toBe("Sagittarius");
  });

  it("returns an uncommitted constitution when the chart is unavailable", () => {
    expect(calculateDosha(null, []).dominant).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { avasthaConfigSchema, avasthaInputSchema } from "./validation";
import { GRAHAS } from "./types";

describe("Avastha request validation", () => {
  it("accepts a complete nine-graha request", () => {
    const input = {
      planets: GRAHAS.map((planet, index) => ({ planet, longitude: index * 30, speed: 1 })),
      ascendantLongitude: 1,
      birthDateTimeUTC: "2000-01-01T00:00:00.000Z",
      sunriseUTC: "1999-12-31T23:00:00.000Z",
    };
    expect(avasthaInputSchema.safeParse(input).success).toBe(true);
    expect(avasthaConfigSchema.safeParse({ ghatiRounding: "nearest", ketuNumber: 9 }).success).toBe(true);
  });

  it("rejects out-of-range values and unsupported brightness-based war", () => {
    expect(avasthaConfigSchema.safeParse({ yuddhaWinnerRule: "brightness" }).success).toBe(false);
    expect(avasthaInputSchema.safeParse({
      planets: GRAHAS.map((planet) => ({ planet, longitude: 360, speed: 1 })),
      ascendantLongitude: 1,
      birthDateTimeUTC: "2000-01-01T00:00:00.000Z",
      sunriseUTC: "1999-12-31T23:00:00.000Z",
    }).success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { calculateShayanadiAvastha } from "./graha-avastha-service";

describe("GrahaAvasthaService Shayanadi formula", () => {
  it("maps remainder zero to Nidra", () => {
    const result = calculateShayanadiAvastha({
      nakshatra: 1,
      planetValue: 1,
      navamshaNumber: 1,
      moonNakshatra: 1,
      birthGhati: 5,
      lagnaSign: 5,
    });

    expect(result.total).toBe(12);
    expect(result.remainder).toBe(0);
    expect(result.state).toBe("Nidra");
  });

  it("reproduces the documented JHora formula and exposes its inputs", () => {
    const result = calculateShayanadiAvastha({
      nakshatra: 10,
      planetValue: 1,
      navamshaNumber: 2,
      moonNakshatra: 8,
      birthGhati: 4,
      lagnaSign: 6,
    });

    expect(result.total).toBe(38);
    expect(result.remainder).toBe(2);
    expect(result.state).toBe("Upaveshana");
    expect(result.formula).toBe("(10 × 1 × 2) + 8 + 4 + 6 = 38; 38 mod 12 = 2");
    expect(result.inputs).toEqual({
      nakshatra: 10,
      planetValue: 1,
      navamshaNumber: 2,
      moonNakshatra: 8,
      birthGhati: 4,
      lagnaSign: 6,
    });
  });
});

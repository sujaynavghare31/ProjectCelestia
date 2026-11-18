import { describe, expect, it } from "vitest";
import { applyArudhaException, calculateArudhaPadas, getStrongerLord, normalizeSign } from "./arudha-padas";

describe("calculateArudhaPadas", () => {
  it("moves a Pada in house 1 to house 10", () => {
    expect(applyArudhaException(0, 0)).toBe(9);
  });

  it("moves a Pada in house 7 to house 4", () => {
    expect(applyArudhaException(0, 6)).toBe(3);
  });

  it("defaults dual lords to the classical lord", () => {
    const stronger = getStrongerLord("Mars", "Ketu", {
      lagnaSign: 7,
      planets: [{ name: "Mars", sign: 7 }, { name: "Ketu", sign: 7 }],
    });
    expect(stronger).toBe("Mars");
  });

  it("normalizes sign indexes", () => {
    expect(normalizeSign(-1)).toBe(11);
    expect(normalizeSign(12)).toBe(0);
  });
});

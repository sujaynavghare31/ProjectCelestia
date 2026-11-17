import { describe, expect, it } from "vitest";
import { bhavaChalit, cuspLabels, formatCuspDegree } from "./cusp-labels";

const dms = (sign: number, degrees: number, minutes: number, seconds = 0) => sign * 30 + degrees + minutes / 60 + seconds / 3600;
const cusps = [
  dms(2, 27, 35, 41), dms(3, 22, 44, 2), dms(4, 20, 57, 16), dms(5, 22, 47, 10),
  dms(6, 20, 1, 17), dms(7, 27, 50, 20), dms(8, 27, 35, 41), dms(9, 22, 44, 2),
  dms(10, 20, 57, 16), dms(11, 22, 47, 10), dms(0, 20, 1, 17), dms(1, 27, 50, 20),
];

describe("cusp labels", () => {
  it("labels cusps with the sign where each house starts", () => {
    const result = cuspLabels(cusps);
    expect(result.cusps.map((cusp) => cusp.label)).toEqual([
      "C1 Ge 27°35′41″", "C2 Cn 22°44′02″", "C3 Le 20°57′16″", "C4 Vi 22°47′10″",
      "C5 Li 20°01′17″", "C6 Sc 27°50′20″", "C7 Sg 27°35′41″", "C8 Cp 22°44′02″",
      "C9 Aq 20°57′16″", "C10 Pi 22°47′10″", "C11 Ar 20°01′17″", "C12 Ta 27°50′20″",
    ]);
    expect(result.interceptedSigns).toEqual([]);
    expect(result.signsWithTwoCusps).toEqual([]);
  });

  it("supports sign styles, formats, and shifted houses", () => {
    expect(cuspLabels(cusps, { signStyle: "full" }).cusps[3].label).toBe("C4 Virgo 22°47′10″");
    expect(cuspLabels(cusps, { signStyle: "hindi" }).cusps[3].label).toBe("C4 कन्या 22°47′10″");
    expect(cuspLabels(cusps, { degreeFormat: "decimal" }).cusps[3].label).toBe("C4 Vi 22.79°");
    expect(formatCuspDegree(29.99999)).toBe("30°00′00″");

    const shifted = [...cusps];
    shifted[3] = dms(4, 28, 0);
    const result = cuspLabels(shifted);
    expect(result.cusps[3].box).toBe(3);
    expect(result.cusps[3].shifted).toBe(true);
  });

  it("compares whole-sign and bhava houses", () => {
    const result = bhavaChalit([{ name: "Mercury", longitude: dms(6, 11, 36) }], cusps);
    expect(result[0]).toMatchObject({ wholeSignHouse: 5, bhavaHouse: 4, moved: true });
  });
});

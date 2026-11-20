import { describe, expect, it } from "vitest";
import { calculateKharaPoints } from "./khara-points";

describe("calculateKharaPoints", () => {
  it("counts the 64th Navamsha and 22nd Drekkana as the eighth divisions from each reference", () => {
    expect(calculateKharaPoints({ sign: 0, degree: 0 })).toEqual({
      navamsaSign: 0,
      sixtyFourthNavamsaSign: 7,
      drekkanaSign: 0,
      twentySecondDrekkanaSign: 7,
    });
  });

  it("uses the correct fixed-sign Navamsha and second Drekkana", () => {
    expect(calculateKharaPoints({ sign: 1, degree: 12 })).toEqual({
      navamsaSign: 0,
      sixtyFourthNavamsaSign: 7,
      drekkanaSign: 5,
      twentySecondDrekkanaSign: 0,
    });
  });

  it("wraps target signs across the end of the zodiac", () => {
    expect(calculateKharaPoints({ sign: 11, degree: 29.99 })).toEqual({
      navamsaSign: 11,
      sixtyFourthNavamsaSign: 6,
      drekkanaSign: 7,
      twentySecondDrekkanaSign: 2,
    });
  });
});

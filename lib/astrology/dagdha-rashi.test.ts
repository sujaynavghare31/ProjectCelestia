import { describe, expect, it } from "vitest";
import { dagdhaRashis } from "./dagdha-rashi";

describe("dagdhaRashis", () => {
  it("uses the same sign pairs for both pakshas", () => {
    expect(dagdhaRashis(1)).toEqual([6, 9]);
    expect(dagdhaRashis(16)).toEqual([6, 9]);
  });

  it("returns no dagdha signs for Purnima and Amavasya", () => {
    expect(dagdhaRashis(15)).toEqual([]);
    expect(dagdhaRashis(30)).toEqual([]);
  });

  it("rejects tithis outside the lunar month", () => {
    expect(() => dagdhaRashis(0)).toThrow(RangeError);
    expect(() => dagdhaRashis(31)).toThrow(RangeError);
  });
});

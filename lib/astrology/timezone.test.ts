import { describe, expect, it } from "vitest";
import { getTimezoneOffsetHours } from "./timezone";

describe("IANA birth-time offsets", () => {
  it("uses the historical offset at the birth date, including local mean time", () => {
    expect(getTimezoneOffsetHours("1943-06-01", "12:00:00", "Asia/Kolkata")).toBe(6.5);
  });

  it("uses daylight-saving time for the birth instant", () => {
    expect(getTimezoneOffsetHours("1990-07-15", "12:00:00", "America/New_York")).toBe(-4);
    expect(getTimezoneOffsetHours("1990-01-15", "12:00:00", "America/New_York")).toBe(-5);
  });
});

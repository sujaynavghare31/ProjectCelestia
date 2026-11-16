import { describe, expect, it } from "vitest";
import { getBirthDateTimeError } from "./ephemeris-input";

describe("birth date and time validation", () => {
  it("accepts valid leap-day dates and boundary times", () => {
    expect(getBirthDateTimeError("2000-02-29", "23:59:59")).toBeNull();
    expect(getBirthDateTimeError("2001-01-01", "00:00:00")).toBeNull();
  });

  it.each([
    ["1900-02-29", "12:00:00", "Enter a valid calendar date."],
    ["2024-01-01", "24:00:00", "Birth time must be between 00:00:00 and 23:59:59."],
    ["2024-01-01", "12:60:00", "Birth time must be between 00:00:00 and 23:59:59."],
    ["not-a-date", "12:00:00", "Birth date must use YYYY-MM-DD."],
    ["2024-01-01", "12:00", "Birth time must use HH:MM:SS."],
  ])("rejects date %s and time %s", (date, time, error) => {
    expect(getBirthDateTimeError(date, time)).toBe(error);
  });
});

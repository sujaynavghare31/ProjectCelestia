import { describe, expect, it } from "vitest";
import { asOfTimestamp, dateInTimezone, parseLocalMs } from "../time";

describe("Jaimini as-of time", () => {
  it("uses the current instant for today in the chart timezone", () => {
    const now = Date.UTC(2026, 10, 20, 13, 30);

    expect(dateInTimezone(now, "Asia/Kolkata")).toBe("2026-11-20");
    expect(asOfTimestamp("2026-11-20", "Asia/Kolkata", now)).toBe(now);
  });

  it("keeps noon semantics for a specifically selected date", () => {
    expect(asOfTimestamp("2026-11-19", "Asia/Kolkata", Date.UTC(2026, 10, 20, 13, 30)))
      .toBe(parseLocalMs("2026-11-19", "12:00:00", "Asia/Kolkata"));
  });
});

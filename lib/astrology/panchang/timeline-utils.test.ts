import { describe, expect, it } from "vitest";
import { isWithinPanchangTimeline } from "./timeline-utils";

describe("isWithinPanchangTimeline", () => {
  const start = "2026-11-13T00:30:00.000Z";
  const end = "2026-11-14T00:30:00.000Z";

  it("keeps the active Vedic day through local midnight", () => {
    expect(isWithinPanchangTimeline(Date.parse("2026-11-13T20:00:00.000Z"), start, end)).toBe(true);
  });

  it("uses a half-open interval at sunrise boundaries", () => {
    expect(isWithinPanchangTimeline(Date.parse(start), start, end)).toBe(true);
    expect(isWithinPanchangTimeline(Date.parse(end), start, end)).toBe(false);
  });
});

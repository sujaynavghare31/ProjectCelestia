import { describe, expect, it } from "vitest";
import { limitCoordinatePrecision, parseCoordinateDraft } from "./coordinate-input";

describe("coordinate input", () => {
  it("limits coordinates to two decimal places", () => {
    expect(limitCoordinatePrecision("28.667")).toBe("28.66");
    expect(limitCoordinatePrecision("-123.456")).toBe("-123.45");
    expect(limitCoordinatePrecision("72.")).toBe("72.");
  });

  it("keeps incomplete drafts editable without treating them as numbers", () => {
    expect(parseCoordinateDraft("-")).toBeNaN();
    expect(parseCoordinateDraft("28.")).toBeNaN();
    expect(parseCoordinateDraft("28.66")).toBe(28.66);
  });
});

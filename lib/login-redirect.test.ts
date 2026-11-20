import { describe, expect, it } from "vitest";
import { getSafeCallbackUrl } from "./login-redirect";

describe("safe login callback URL", () => {
  it("preserves a valid local callback URL", () => {
    expect(getSafeCallbackUrl("/saved-charts?tab=recent")).toBe("/saved-charts?tab=recent");
  });

  it("uses the saved charts page when the callback URL is missing", () => {
    expect(getSafeCallbackUrl(undefined)).toBe("/saved-charts");
  });

  it.each(["https://example.com", "//example.com", "/\\example.com"])(
    "rejects external callback URL %s",
    (callbackUrl) => {
      expect(getSafeCallbackUrl(callbackUrl)).toBe("/saved-charts");
    },
  );

  it("rejects repeated callback URL parameters", () => {
    expect(getSafeCallbackUrl(["/saved-charts", "/"])).toBe("/saved-charts");
  });
});
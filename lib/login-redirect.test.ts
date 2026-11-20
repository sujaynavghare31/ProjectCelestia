import { describe, expect, it } from "vitest";
import { getLoginModeHref, getSafeCancelUrl, getSafeRedirectUrl } from "./login-redirect";

describe("safe login redirect URL", () => {
  it("preserves a valid local callback URL", () => {
    expect(getSafeRedirectUrl("/saved-charts?tab=recent")).toBe("/saved-charts?tab=recent");
  });

  it("defaults to the public home page", () => {
    expect(getSafeRedirectUrl()).toBe("/");
    expect(getSafeRedirectUrl(null)).toBe("/");
  });

  it.each([
    "https://example.com",
    "http://example.com",
    "//example.com",
    "/\\example.com",
    "javascript:alert(1)",
    "/login",
    "/login?mode=signup",
    "/login/",
    "/%6cogin",
  ])("rejects unsafe callback URL %s", (raw) => {
    expect(getSafeRedirectUrl(raw)).toBe("/");
  });

  it("rejects malformed or repeated callback values", () => {
    expect(getSafeRedirectUrl("/%")).toBe("/");
  });

  it("uses only public destinations for cancel navigation", () => {
    expect(getSafeCancelUrl("/")).toBe("/");
    expect(getSafeCancelUrl("/?tab=jamakkol")).toBe("/?tab=jamakkol");
    expect(getSafeCancelUrl("/?tab=panchang")).toBe("/?tab=panchang");
    expect(getSafeCancelUrl("/about")).toBe("/about");
    expect(getSafeCancelUrl("/saved-charts")).toBe("/");
    expect(getSafeCancelUrl("/account")).toBe("/");
    expect(getSafeCancelUrl()).toBe("/");
  });

  it("preserves the sanitized callback when switching authentication modes", () => {
    expect(getLoginModeHref("signup", "/saved-charts")).toBe(
      "/login?mode=signup&callbackUrl=%2Fsaved-charts",
    );
    expect(getLoginModeHref("signin", "/?tab=jamakkol")).toBe(
      "/login?mode=signin&callbackUrl=%2F%3Ftab%3Djamakkol",
    );
    expect(getLoginModeHref("signup", "https://example.com")).toBe(
      "/login?mode=signup&callbackUrl=%2F",
    );
  });
});
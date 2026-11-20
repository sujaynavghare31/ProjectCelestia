import { describe, expect, it } from "vitest";
import { config } from "./proxy";

function matchesProxy(pathname: string) {
  return config.matcher.some((matcher) => new RegExp(`^${matcher}$`).test(pathname));
}

describe("proxy matcher", () => {
  it.each(["/", "/login", "/sign-in", "/sign-up", "/saved-charts"])(
    "matches application route %s",
    (pathname) => {
      expect(matchesProxy(pathname)).toBe(true);
    },
  );

  it("matches API routes", () => {
    expect(matchesProxy("/api/profiles")).toBe(true);
    expect(matchesProxy("/api/profiles/current")).toBe(true);
  });

  it.each(["/_next/static/chunk.js", "/_next/image", "/images/logo.png"])(
    "does not match static asset %s",
    (pathname) => {
      expect(matchesProxy(pathname)).toBe(false);
    },
  );
});
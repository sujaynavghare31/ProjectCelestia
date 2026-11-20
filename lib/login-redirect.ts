const DEFAULT_REDIRECT_URL = "/";
const REDIRECT_BASE_URL = "https://project-celestia.invalid";
const PUBLIC_CANCEL_PATHS = new Set(["/", "/about"]);

export type LoginMode = "signin" | "signup";

export function getSafeRedirectUrl(raw?: string | null): string {
  if (
    typeof raw !== "string" ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("\\") ||
    /[\u0000-\u001f]/.test(raw)
  ) {
    return DEFAULT_REDIRECT_URL;
  }

  try {
    const url = new URL(raw, REDIRECT_BASE_URL);
    const decodedPath = decodeURIComponent(url.pathname);
    const normalizedPath = decodedPath.replace(/\/+/g, "/").replace(/\/+$/, "").toLowerCase() || "/";
    if (url.origin !== REDIRECT_BASE_URL || normalizedPath === "/login") {
      return DEFAULT_REDIRECT_URL;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_REDIRECT_URL;
  }
}

export function getSafeCancelUrl(raw?: string | null): string {
  const safeRedirectUrl = getSafeRedirectUrl(raw);
  const path = new URL(safeRedirectUrl, REDIRECT_BASE_URL).pathname.replace(/\/+$/, "") || "/";
  return PUBLIC_CANCEL_PATHS.has(path.toLowerCase()) ? safeRedirectUrl : DEFAULT_REDIRECT_URL;
}

export function getLoginModeHref(mode: LoginMode, callbackUrl: string): string {
  const params = new URLSearchParams({
    mode,
    callbackUrl: getSafeRedirectUrl(callbackUrl),
  });
  return `/login?${params.toString()}`;
}

const DEFAULT_CALLBACK_URL = "/saved-charts";
const CALLBACK_BASE_URL = "https://project-celestia.invalid";

export function getSafeCallbackUrl(callbackUrl: string | string[] | undefined): string {
  if (
    typeof callbackUrl !== "string" ||
    !callbackUrl.startsWith("/") ||
    callbackUrl.startsWith("//")
  ) {
    return DEFAULT_CALLBACK_URL;
  }

  try {
    const resolvedUrl = new URL(callbackUrl, CALLBACK_BASE_URL);
    return resolvedUrl.origin === CALLBACK_BASE_URL ? callbackUrl : DEFAULT_CALLBACK_URL;
  } catch {
    return DEFAULT_CALLBACK_URL;
  }
}
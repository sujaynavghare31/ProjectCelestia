import { isLocalClerkFallback } from "@/lib/clerk-config";
import LoginExperience from "@/components/auth/login-experience";
import { getSafeCancelUrl, getSafeRedirectUrl } from "@/lib/login-redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { callbackUrl, mode } = await searchParams;
  const safeRedirectUrl = getSafeRedirectUrl(
    typeof callbackUrl === "string" ? callbackUrl : null,
  );
  const safeCancelUrl = getSafeCancelUrl(safeRedirectUrl);
  const safeMode = mode === "signup" ? "signup" : "signin";

  return (
    <LoginExperience
      mode={safeMode}
      callbackUrl={safeRedirectUrl}
      safeCancelUrl={safeCancelUrl}
      localClerkFallback={isLocalClerkFallback}
    />
  );
}

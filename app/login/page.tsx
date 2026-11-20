import { SignIn, SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { isLocalClerkFallback } from "@/lib/clerk-config";
import { getSafeCallbackUrl } from "@/lib/login-redirect";

const clerkAppearance = {
  variables: {
    colorPrimary: "#C05A3A",
    colorText: "#292524",
    colorTextSecondary: "#78716c",
    colorBackground: "#FDFBF7",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#292524",
    colorBorder: "transparent",
    colorDanger: "#ef4444",
    fontFamily: "var(--font-sans)",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full min-w-0 max-w-full",
    cardBox: "!w-full min-w-0 !max-w-full border-0 bg-transparent p-0 shadow-none",
    card: "!w-full min-w-0 !max-w-full border-0 bg-transparent p-0 shadow-none",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    footer: "hidden",
    footerAction: "hidden",
    main: "gap-5",
    form: "gap-4",
    formFieldRow: "gap-4",
    formFieldLabel: "mb-1 text-xs font-medium text-stone-700",
    formFieldInput:
      "h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none transition-colors focus:border-[#C05A3A] focus:ring-1 focus:ring-[#C05A3A]",
    formFieldInputShowPasswordButton:
      "text-stone-500 hover:text-[#C05A3A]",
    formFieldErrorText: "mt-1 text-xs text-red-500",
    formButtonPrimary:
      "mt-2 h-10 w-full rounded-lg border-0 bg-[#C05A3A] px-4 py-2 text-sm font-medium text-white shadow-none transition-colors hover:bg-[#A84C30] active:bg-[#903F25]",
    socialButtonsPlacement: "top",
    socialButtonsBlockButton:
      "h-10 w-full rounded-lg border border-stone-200 bg-stone-100 px-3 text-sm font-medium text-stone-800 shadow-none transition-colors hover:bg-stone-200",
    socialButtonsBlockButtonText: "text-sm font-medium text-stone-800",
    dividerRow: "my-2",
    dividerLine: "border-stone-200",
    dividerText: "px-3 text-xs uppercase tracking-wider text-stone-400",
    identityPreview: "rounded-lg border border-stone-200 bg-stone-50",
    identityPreviewText: "text-sm text-stone-700",
    identityPreviewEditButton: "text-[#C05A3A]",
    identityPreviewEditButtonIcon: "text-[#C05A3A]",
    formResendCodeLink: "text-[#C05A3A] hover:text-[#903F25]",
    footerActionLink: "text-[#C05A3A] hover:text-[#903F25]",
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { callbackUrl, mode } = await searchParams;
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);
  const isSignUp = mode === "signup";

  if (isLocalClerkFallback) {
    return (
      <main className="cosmic-grid flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full min-w-0 max-w-md rounded-3xl border border-border/80 bg-card/90 p-7 shadow-[0_24px_70px_-30px_rgba(91,61,43,0.25)] backdrop-blur-xl sm:p-9">
          <Link href="/" className="text-sm font-semibold tracking-wide text-foreground">Project Celestia</Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Local preview mode</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Clerk is configured with a production key for <strong>jyotishi.tech</strong>. Replace it with Clerk development keys to test sign-in on localhost.
          </p>
          <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-lg bg-[#C64F30] px-4 text-sm font-semibold text-white hover:bg-[#A94025]">Return to portal</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="cosmic-grid flex min-h-screen w-full min-w-0 items-center justify-center overflow-x-clip px-4 py-12">
      <div className="w-full min-w-0 max-w-md rounded-3xl border border-border/80 bg-card/90 p-7 shadow-[0_24px_70px_-30px_rgba(91,61,43,0.25)] backdrop-blur-xl sm:p-9">
        <div className="mb-8">
          <Link href="/" className="text-sm font-semibold tracking-wide text-foreground">Project Celestia</Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{isSignUp ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isSignUp ? "Create an account to save your charts and personal notes." : "Sign in to view and manage your saved charts."}
          </p>
        </div>
        {isSignUp ? (
          <SignUp routing="hash" fallbackRedirectUrl={safeCallbackUrl} appearance={clerkAppearance} />
        ) : (
          <SignIn routing="hash" fallbackRedirectUrl={safeCallbackUrl} appearance={clerkAppearance} />
        )}
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "New to Project Celestia?"}{" "}
          <Link
            href={isSignUp ? `/login?callbackUrl=${encodeURIComponent(safeCallbackUrl)}` : `/login?mode=signup&callbackUrl=${encodeURIComponent(safeCallbackUrl)}`}
            className="font-semibold text-primary underline-offset-4 hover:text-primary-hover hover:underline"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </main>
  );
}

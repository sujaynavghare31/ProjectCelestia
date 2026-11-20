"use client";

import { useEffect } from "react";
import { SignIn, SignUp } from "@clerk/nextjs";
import { Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getLoginModeHref } from "@/lib/login-redirect";

const clerkAppearance = {
  variables: {
    colorPrimary: "#C05A3A",
    colorBackground: "transparent",
    colorInputBackground: "#FFFFFF",
    colorText: "#0F172A",
    colorTextSecondary: "#64748B",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "!w-full !min-w-0 !max-w-full",
    cardBox: "!w-full !min-w-0 !max-w-none !shadow-none !border-0 !bg-transparent !rounded-none",
    card: "!w-full !min-w-0 !shadow-none !border-0 !bg-transparent !rounded-none !p-0 gap-4",
    header: "!hidden",
    footer: "!bg-none !bg-transparent !shadow-none !border-0 pt-3",
    footerAction: "!hidden",
    main: "!w-full min-w-0",
    form: "!w-full min-w-0",
    socialButtonsBlockButton:
      "w-full h-11 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-slate-800 text-sm font-medium shadow-none transition-colors",
    socialButtonsBlockButtonText: "font-medium text-slate-800",
    dividerLine: "bg-stone-200",
    dividerText: "text-[11px] font-medium text-stone-400 uppercase tracking-wider",
    formFieldLabelRow: "flex items-center justify-between w-full mb-1.5",
    formFieldLabel: "text-left text-[13px] font-medium text-slate-700",
    formFieldInput:
      "w-full h-11 rounded-xl border border-stone-300/90 bg-white px-3.5 text-base sm:text-sm text-slate-900 placeholder:text-stone-400 shadow-none ring-0 focus:border-[#C05A3A] focus:ring-2 focus:ring-[#C05A3A]/15 transition-colors",
    otpCodeFieldInputs: "gap-2",
    otpCodeFieldInput:
      "h-12 rounded-xl border border-stone-300/90 bg-white text-base font-semibold text-slate-900 shadow-none focus:border-[#C05A3A] focus:ring-2 focus:ring-[#C05A3A]/15",
    formButtonPrimary:
      "w-full h-11 rounded-xl bg-[#C05A3A] hover:bg-[#AA4C30] text-white text-sm font-semibold shadow-none transition-colors",
    formResendCodeLink: "text-xs font-medium text-[#C05A3A] hover:text-[#AA4C30]",
    identityPreview: "rounded-xl border border-stone-200 bg-stone-50/70",
  },
};

const ACTIVE_OVERLAY_SELECTOR = [
  '[role="dialog"]:not([aria-hidden="true"])',
  '[role="menu"]:not([aria-hidden="true"])',
  '[role="listbox"]:not([aria-hidden="true"])',
  '[role="combobox"]:not([aria-hidden="true"])',
  "[data-radix-popper-content-wrapper]",
].join(", ");

function hasActiveOverlay() {
  return Array.from(document.querySelectorAll<HTMLElement>(ACTIVE_OVERLAY_SELECTOR)).some(
    (element) => element.getAttribute("aria-hidden") !== "true" && element.getClientRects().length > 0,
  );
}

export default function LoginExperience({
  mode,
  callbackUrl,
  safeCancelUrl,
  localClerkFallback,
}: {
  mode: "signin" | "signup";
  callbackUrl: string;
  safeCancelUrl: string;
  localClerkFallback: boolean;
}) {
  const router = useRouter();
  const isSignUp = mode === "signup";
  const savedChartsCallback = callbackUrl.split(/[?#]/, 1)[0] === "/saved-charts";

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented || hasActiveOverlay()) return;
      router.replace(safeCancelUrl);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [router, safeCancelUrl]);

  return (
    <main className="login-dot-grid flex min-h-[100dvh] w-full flex-col items-center justify-center px-4 py-8 text-slate-900">
      <section
        aria-labelledby="login-title"
        className="mx-auto w-full max-w-[430px] rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.06)] sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={safeCancelUrl}
            replace
            className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/50"
            aria-label="Project Celestia home"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#C05A3A] text-white">
              <Sun aria-hidden="true" className="size-5" strokeWidth={2} />
            </span>
            <span className="truncate text-sm font-semibold tracking-[0.01em] text-slate-900">
              Project Celestia
            </span>
          </Link>
          <button
            type="button"
            onClick={() => router.replace(safeCancelUrl)}
            aria-label="Cancel and return to charts"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-stone-200/80 text-slate-500 transition-colors hover:bg-stone-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/50"
          >
            <span aria-hidden="true" className="text-2xl font-light leading-none">×</span>
          </button>
        </div>

        <h1 id="login-title" className="text-2xl font-bold tracking-tight text-slate-900">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm leading-5 text-slate-600">
          {savedChartsCallback
            ? "Sign in to view and sync your saved charts and notes."
            : "Save your birth charts, transits, and personal notes across devices."}
        </p>

        <nav
          aria-label="Authentication mode"
          className="mt-6 mb-6 grid grid-cols-2 gap-1 rounded-xl bg-stone-100/90 p-1"
        >
          <Link
            href={getLoginModeHref("signin", callbackUrl)}
            replace
            aria-current={!isSignUp ? "page" : undefined}
            className={`flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/50 ${
              !isSignUp
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Sign in
          </Link>
          <Link
            href={getLoginModeHref("signup", callbackUrl)}
            replace
            aria-current={isSignUp ? "page" : undefined}
            className={`flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/50 ${
              isSignUp
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Create account
          </Link>
        </nav>

        {localClerkFallback ? (
          <p role="status" className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-slate-600">
            Sign-in is unavailable in this local preview. Configure Clerk development keys to test authentication here.
          </p>
        ) : isSignUp ? (
          <SignUp
            routing="hash"
            forceRedirectUrl={callbackUrl}
            fallbackRedirectUrl={callbackUrl}
            appearance={clerkAppearance}
          />
        ) : (
          <SignIn
            routing="hash"
            forceRedirectUrl={callbackUrl}
            fallbackRedirectUrl={callbackUrl}
            appearance={clerkAppearance}
          />
        )}

        <div className="mt-6 border-t border-stone-200 pt-4 text-center">
          <Link
            href={safeCancelUrl}
            replace
            className="inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-sm font-medium text-slate-500 underline-offset-4 transition-colors hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C05A3A]/50"
          >
            ← Continue without signing in
          </Link>
        </div>
      </section>
    </main>
  );
}

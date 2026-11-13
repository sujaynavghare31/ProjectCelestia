"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";

const focusableElements = [
  "a[href]",
  "button:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function AboutModal() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableElements)];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        event.preventDefault();
        dialogRef.current.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-controls="about-project-celestia"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="flex h-9 min-w-max items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Info className="size-4 shrink-0" aria-hidden="true" />
        About
      </button>

      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            ref={dialogRef}
            id="about-project-celestia"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-project-celestia-title"
            tabIndex={-1}
            className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95 sm:px-7">
              <h2 id="about-project-celestia-title" className="text-base font-semibold tracking-tight sm:text-lg">
                About Project Celestia
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close About Project Celestia"
                onClick={() => setIsOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </header>

            <div className="max-w-[68ch] overflow-y-auto px-5 py-5 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:px-7 sm:py-6 md:text-base">
              <h2 className="mb-3 text-lg font-semibold leading-7 text-slate-900 dark:text-slate-50">
                About Us
              </h2>
              <p className="mb-4">
                Welcome to Project Celestia. We are Sujay Navghare and Ashutosh Vaisht—two IT professionals who share a deep, enduring passion for the cosmos.
              </p>
              <p className="mb-4">
                Coming from rigorous technical backgrounds—with Sujay bringing over 8 years of experience in quality engineering and software architecture, and Ashutosh contributing 15+ years of seasoned IT industry expertise—our approach to astrology is rooted in logic, data, and continuous learning. Over the last five years, we have dedicated ourselves to the profound study of both astronomy and astrology.
              </p>
              <p className="mb-7">
                Through our journey of exploring specialized techniques—from declinations and Western aspects to Solar Returns, Tajika, and secondary progressions—we realized something crucial: synthesizing Vedic and Western astrological systems yields a far more accurate and holistic understanding of a life event than relying on one system alone.
              </p>

              <h3 className="mb-3 text-base font-semibold leading-6 text-slate-900 dark:text-slate-50 md:text-lg">
                Why We Built Project Celestia
              </h3>
              <p className="mb-3">
                We created this platform to solve a problem we faced ourselves as students of astrology. The current landscape of astrological tools is heavily fragmented:
              </p>
              <ul className="mb-5 list-disc space-y-2 pl-5 marker:text-amber-600 dark:marker:text-amber-400">
                <li><strong className="font-semibold text-slate-800 dark:text-slate-100">The Divide:</strong> Existing portals force you to choose between being strictly Vedic or strictly Western.</li>
                <li><strong className="font-semibold text-slate-800 dark:text-slate-100">The Missing Data:</strong> Free tools frequently lack critical data like the outer planets (Uranus and Neptune).</li>
                <li><strong className="font-semibold text-slate-800 dark:text-slate-100">The Inconvenience:</strong> You often have to jump between multiple different websites just to view different chart types or matrices.</li>
                <li><strong className="font-semibold text-slate-800 dark:text-slate-100">The Cost:</strong> Comprehensive software that actually includes all these features is prohibitively expensive.</li>
              </ul>

              <p className="mb-4">
                Project Celestia bridges that gap. We built this portal to keep everything in one unified, accessible space. By combining the depth of traditional Indian astrology with the modern precision of Western systems, we aim to provide a complete cosmic compass without the paywalls or missing data.
              </p>
              <p className="mb-4">
                We invite you to use the platform, explore your charts, and discover the insights the stars hold. We are constantly building and improving, so please reach out with your feedback and suggestions.
              </p>
              <p className="mb-6 font-medium text-slate-800 dark:text-slate-100">
                Navigate your cosmic compass with clarity and purpose.
              </p>

              <p className="border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
                —{" "}
                <strong>
                  <a
                    href="https://www.linkedin.com/in/sujaynavghare/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-700 decoration-amber-600 underline-offset-4 transition-colors hover:text-amber-700 hover:underline dark:text-slate-200 dark:hover:text-amber-300"
                  >
                    Sujay Navghare
                  </a>
                </strong>
                {" & "}
                <strong>
                  <a
                    href="https://www.linkedin.com/in/aashutosh-v-09781452/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-700 decoration-amber-600 underline-offset-4 transition-colors hover:text-amber-700 hover:underline dark:text-slate-200 dark:hover:text-amber-300"
                  >
                    Ashutosh Vaisht
                  </a>
                </strong>
              </p>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}

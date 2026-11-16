"use client";

import { useRef, useState } from "react";
import { CircleHelp, X } from "lucide-react";

const concepts = [
  {
    title: "Mulank · Core Number",
    description: "The day you were born. It governs your day-to-day personality, instincts, and immediate reactions.",
  },
  {
    title: "Bhagyank · Destiny Number",
    description: "The sum of your full birth date. It reveals your ultimate life path, purpose, and long-term trajectory.",
  },
  {
    title: "Lo Shu Grid",
    description: "An ancient 3x3 matrix that maps the elemental energies present at your birth. Missing numbers show areas for growth; grouped numbers reveal intense natural talents.",
  },
  {
    title: "Name Vibration",
    description: "The energetic frequency of the letters in your name, which can harmonize or clash with your destiny.",
  },
];

export default function NumerologyPrimer() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openPrimer = () => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    setIsOpen(true);
  };

  const closePrimer = () => {
    dialogRef.current?.close();
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="numerology-primer"
        onClick={openPrimer}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-stone-300 bg-white/80 px-4 text-sm font-medium text-stone-700 shadow-sm shadow-stone-200/50 transition hover:border-amber-500 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 dark:border-amber-900/40 dark:bg-zinc-900/80 dark:text-stone-200 dark:hover:border-amber-700 dark:hover:text-amber-200 dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-zinc-950"
      >
        <CircleHelp className="size-4 text-amber-700 dark:text-amber-300" aria-hidden="true" />
        The Primer
      </button>

      <dialog
        ref={dialogRef}
        id="numerology-primer"
        aria-labelledby="numerology-primer-title"
        aria-describedby="numerology-primer-intro"
        onCancel={() => setIsOpen(false)}
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closePrimer();
        }}
        className="fixed inset-y-0 right-0 m-0 ml-auto h-dvh max-h-dvh w-full max-w-[min(100%,30rem)] border-0 bg-transparent p-0 text-stone-800 shadow-2xl [&::backdrop]:bg-stone-950/40 [&::backdrop]:backdrop-blur-sm dark:text-stone-100 dark:[&::backdrop]:bg-black/55"
      >
        <aside className="flex h-full flex-col border-l border-stone-200 bg-[#FDFBF7]/95 shadow-xl backdrop-blur-xl dark:border-amber-900/30 dark:bg-zinc-950/95">
          <header className="flex items-start justify-between gap-5 border-b border-stone-200 px-6 py-6 dark:border-amber-900/30">
            <div>
              <h2 id="numerology-primer-title" className="font-serif text-2xl tracking-wide text-stone-900 dark:text-stone-100">The Primer</h2>
              <p id="numerology-primer-intro" className="mt-2 max-w-sm text-sm leading-6 text-stone-600 dark:text-stone-300">A brief guide to the patterns in your Vibrational Analysis Suite.</p>
            </div>
            <button
              type="button"
              onClick={closePrimer}
              aria-label="Close the Primer"
              className="grid size-9 shrink-0 place-items-center rounded-full text-stone-600 transition hover:bg-stone-200/70 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:text-stone-300 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus-visible:ring-amber-400"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
            <dl className="divide-y divide-stone-200 dark:divide-amber-900/30">
              {concepts.map(({ title, description }) => (
                <div key={title} className="py-5">
                  <dt className="font-serif text-lg tracking-wide text-amber-900 dark:text-amber-200">{title}</dt>
                  <dd className="mt-2 text-sm leading-7 text-stone-700 dark:text-stone-300">{description}</dd>
                </div>
              ))}
            </dl>
            <p className="border-t border-stone-200 py-5 text-xs leading-6 text-stone-500 dark:border-amber-900/30 dark:text-stone-400">
              Numerology traditions vary. Use these interpretations as prompts for reflection.
            </p>
          </div>
        </aside>
      </dialog>
    </>
  );
}

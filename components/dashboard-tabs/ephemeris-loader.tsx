"use client";

import { useEffect, useState } from "react";
import { Sun } from "lucide-react";

type Props = {
  title: string;
  description: string;
  detail: string;
  tone?: "calendar" | "dashboard";
};

export default function EphemerisLoader({ title, description, detail, tone = "calendar" }: Props) {
  const [progress, setProgress] = useState(8);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const dashboardTone = tone === "dashboard";

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setElapsedSeconds(Math.floor(elapsed));
      setProgress(Math.min(94, 8 + (elapsed / 5) * 86));
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className={`flex min-h-[22rem] flex-col items-center justify-center rounded-2xl border px-6 text-center shadow-sm ${dashboardTone ? "border-border bg-card text-card-foreground" : "border-stone-200 bg-white/80 text-stone-900"}`}
      role="status"
      aria-live="polite"
    >
      <div className={`relative grid size-24 place-items-center rounded-full border shadow-inner ${dashboardTone ? "border-border bg-muted" : "border-stone-200 bg-[#FDFBF7]"}`}>
        <div className="absolute inset-2 animate-[spin_5s_linear_infinite] rounded-full border border-dashed border-[#C05A3A]/40" />
        <div className={`absolute inset-5 animate-[spin_3s_linear_infinite_reverse] rounded-full border ${dashboardTone ? "border-border" : "border-stone-300"}`} />
        <span className="size-3 animate-pulse rounded-full bg-[#C05A3A] shadow-[0_0_16px_rgba(192,90,58,0.65)]" />
      </div>
      <p className="mt-6 font-serif text-xl tracking-wide">{title}</p>
      <p className={`mt-2 text-sm leading-6 ${dashboardTone ? "text-muted-foreground" : "text-stone-500"}`}>{description}</p>
      <div className="mt-5 w-full max-w-sm">
        <div
          className={`relative h-2 rounded-full ${dashboardTone ? "bg-muted" : "bg-stone-100"}`}
          role="progressbar"
          aria-label="Estimated calculation progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-valuetext={`Estimated ${Math.round(progress)}%`}
        >
          <div className="h-full rounded-full bg-[#C05A3A] transition-[width] duration-100" style={{ width: `${progress}%` }} />
          <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#C05A3A] shadow-[0_0_12px_rgba(192,90,58,0.6)] transition-[left] duration-100" style={{ left: `${progress}%` }} />
        </div>
        <div className={`mt-2 flex justify-between text-[10px] uppercase tracking-[0.14em] ${dashboardTone ? "text-muted-foreground" : "text-stone-400"}`}>
          <span>{Math.round(progress)}% estimated</span>
          <span>{elapsedSeconds}s elapsed</span>
        </div>
      </div>
      <div className={`mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-[0.14em] ${dashboardTone ? "text-muted-foreground" : "text-stone-400"}`}>
        <Sun className="size-3 animate-pulse text-[#C05A3A]" />
        <span>{progress >= 90 ? "Almost there · wrapping up" : "Calculating positions"} · {detail}</span>
      </div>
    </div>
  );
}

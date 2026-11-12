"use client";

import { useRef, useState } from "react";
import type { EphemerisResponse } from "@/lib/kundali-types";

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const HOUSE_CENTERS = [
  [180, 51], [245, 70], [290, 115], [309, 180], [290, 245], [245, 290],
  [180, 309], [115, 290], [70, 245], [51, 180], [70, 115], [115, 70],
] as const;

function safeFilename(value: string) {
  return value.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "celestia-chart";
}

export default function ChartExportTab({ data, chartName }: { data: EphemerisResponse | null; chartName: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const download = async (format: "svg" | "png") => {
    if (!svgRef.current) return;
    setExportError(null);
    const serialized = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    let blob = svgBlob;
    let extension = "svg";

    if (format === "png") {
      try {
        const imageUrl = URL.createObjectURL(svgBlob);
        try {
          const image = new Image();
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("The chart image could not be prepared."));
            image.src = imageUrl;
          });
          const canvas = document.createElement("canvas");
          canvas.width = 1080;
          canvas.height = 1080;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Your browser could not create an image canvas.");
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((result) => result ? resolve(result) : reject(new Error("The chart image could not be exported.")), "image/png");
          });
          extension = "png";
        } finally {
          URL.revokeObjectURL(imageUrl);
        }
      } catch (error) {
        setExportError(error instanceof Error ? error.message : "Unable to export the chart image.");
        return;
      }
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFilename(chartName)}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!data) {
    return <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Load a chart before exporting it.</p>;
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5" aria-labelledby="chart-export-heading">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="chart-export-heading" className="text-sm font-semibold">Chart Image &amp; Export</h3>
          <p className="mt-1 text-xs text-muted-foreground">Download a shareable vector or high-resolution image.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void download("svg")} className="h-9 rounded-lg border border-border px-3 text-xs font-medium transition hover:bg-muted">Download SVG</button>
          <button type="button" onClick={() => void download("png")} className="h-9 rounded-lg bg-amber-700 px-3 text-xs font-semibold text-white transition hover:bg-amber-800">Download PNG</button>
        </div>
      </header>
      {exportError && <p role="alert" className="mb-3 text-xs text-destructive">{exportError}</p>}
      <div className="mx-auto max-w-[560px] overflow-hidden rounded-xl border border-border bg-amber-50 p-3 dark:bg-slate-950">
        <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" width={1080} height={1080} className="h-auto w-full" role="img" aria-label={`${chartName} birth chart`}>
          <rect width="360" height="360" rx="14" fill="#fffbf3" />
          <circle cx="180" cy="180" r="152" fill="#fffdf8" stroke="#a16207" strokeWidth="2" />
          <circle cx="180" cy="180" r="100" fill="none" stroke="#d6b987" strokeWidth="1.5" />
          {Array.from({ length: 12 }, (_, index) => {
            const angle = (index * 30 - 90) * Math.PI / 180;
            const x = 180 + 152 * Math.cos(angle);
            const y = 180 + 152 * Math.sin(angle);
            return <line key={index} x1="180" y1="180" x2={x} y2={y} stroke="#d6b987" strokeWidth="1.2" />;
          })}
          {HOUSE_CENTERS.map(([x, y], houseIndex) => {
            const sign = ((data.ascendant.sign + houseIndex) % 12 + 12) % 12;
            const occupants = [
              ...(houseIndex === 0 ? [{ name: "Ascendant" }] : []),
              ...data.planets.filter((planet) => planet.house === houseIndex + 1),
            ];
            return (
              <g key={houseIndex} textAnchor="middle">
                <text x={x} y={y - 10} fill="#92400e" fontFamily="sans-serif" fontSize="9">{`H${houseIndex + 1} · ${SIGNS[sign]}`}</text>
                <text x={x} y={y + 6} fill="#292524" fontFamily="sans-serif" fontSize="8">
                  {occupants.map((planet) => planet.name).join(" · ") || "—"}
                </text>
              </g>
            );
          })}
          <text x="180" y="338" textAnchor="middle" fill="#57534e" fontFamily="sans-serif" fontSize="8">
            {`${chartName} · ${data.input.date} · ${data.input.time} · ${data.ascendant.signName} rising`}
          </text>
        </svg>
      </div>
    </section>
  );
}

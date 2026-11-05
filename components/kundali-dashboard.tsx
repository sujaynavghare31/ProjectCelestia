"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownUp,
  Bookmark,
  ChevronDown,
  Clock3,
  Compass,
  Crosshair,
  Eye,
  Globe2,
  LoaderCircle,
  MoonStar,
  Orbit,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";
import type { EphemerisResponse, PlanetPosition } from "@/lib/kundali-types";
import { useKundaliStore } from "@/lib/kundali-store";

const VARGAS = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60];
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const BODY_COLORS: Record<string, string> = {
  Ascendant: "text-[#D4AF37]",
  Uranus: "text-cyan-700 dark:text-cyan-400",
  Neptune: "text-cyan-700 dark:text-cyan-400",
  Pluto: "text-cyan-700 dark:text-cyan-400",
};

function degreeToDms(value: number) {
  const totalSeconds = Math.round(value * 3600);
  const degrees = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(degrees).padStart(2, "0")}° ${String(minutes).padStart(2, "0")}' ${String(seconds).padStart(2, "0")}"`;
}

function declinationToDms(value: number) {
  const hemisphere = value < 0 ? "S" : "N";
  return `${degreeToDms(Math.abs(value))} ${hemisphere}`;
}

function normalizeSign(sign: number) {
  return ((sign % 12) + 12) % 12;
}

function formatBirthDate(date: string) {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
}

function parseBirthDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return null;
  return `${yearText}-${monthText}-${dayText}`;
}

function getVargaSign(position: PlanetPosition, division: number) {
  if (division === 1) return position.sign;
  const segment = Math.min(division - 1, Math.floor(position.degree / (30 / division)));
  const sign = position.sign;
  if (division === 2) {
    const first = sign % 2 === 0 ? 4 : 3;
    return segment === 0 ? first : (first + 1) % 12;
  }
  if (division === 3) return normalizeSign(sign + segment * 4);
  if (division === 4) return normalizeSign(sign + segment * 3);
  if (division === 7) return normalizeSign((sign % 2 === 0 ? sign : sign + 6) + segment);
  if (division === 9) {
    const start = sign % 3 === 0 ? sign : sign % 3 === 1 ? sign + 8 : sign + 4;
    return normalizeSign(start + segment);
  }
  if (division === 10) return normalizeSign((sign % 2 === 0 ? sign : sign + 8) + segment);
  if (division === 12) return normalizeSign(sign + segment);
  if (division === 16) return normalizeSign(([0, 4, 8][sign % 3]) + segment);
  if (division === 20) return normalizeSign(([0, 8, 4][sign % 3]) + segment);
  if (division === 24) return normalizeSign((sign % 2 === 0 ? 4 : 3) + segment);
  if (division === 27) {
    const element = sign % 4;
    return normalizeSign(([0, 3, 6, 9][element]) + segment);
  }
  if (division === 30) {
    const oddTrimsamsa = [
      { limit: 5, sign: 0 },
      { limit: 10, sign: 9 },
      { limit: 18, sign: 8 },
      { limit: 25, sign: 2 },
      { limit: 30, sign: 1 },
    ];
    const evenTrimsamsa = [
      { limit: 5, sign: 1 },
      { limit: 12, sign: 5 },
      { limit: 20, sign: 8 },
      { limit: 25, sign: 10 },
      { limit: 30, sign: 7 },
    ];
    return (sign % 2 === 0 ? oddTrimsamsa : evenTrimsamsa).find(({ limit }) => position.degree < limit)?.sign ?? sign;
  }
  if (division === 40) return normalizeSign((sign % 2 === 0 ? 0 : 6) + segment);
  if (division === 45) return normalizeSign(([0, 4, 8][sign % 3]) + segment);
  return normalizeSign(sign * division + segment);
}

function getSignHouse(sign: number, ascendantSign: number) {
  return normalizeSign(sign - ascendantSign) + 1;
}

function SvgChart({
  style,
  ascendant,
  planets,
  varga,
  reference,
  overlay,
}: {
  style: "diamond" | "circular" | "south";
  ascendant: PlanetPosition;
  planets: PlanetPosition[];
  varga: number;
  reference?: PlanetPosition;
  overlay?: PlanetPosition[];
}) {
  const ascSign = getVargaSign(reference ?? ascendant, varga);
  const chartBodies = [ascendant, ...planets].map((planet) => ({
    ...planet,
    chartSign: getVargaSign(planet, varga),
    chartHouse: getSignHouse(getVargaSign(planet, varga), ascSign),
    isTransit: false,
  }));
  const transitBodies = (overlay ?? []).map((planet) => ({
    ...planet,
    id: `transit-${planet.id}`,
    chartSign: getVargaSign(planet, varga),
    chartHouse: getSignHouse(getVargaSign(planet, varga), ascSign),
    isTransit: true,
  }));
  const houses = Array.from({ length: 12 }, (_, index) => {
    const sign = normalizeSign(ascSign + index);
    return {
      house: index + 1,
      sign,
      bodies: chartBodies.filter((body) => body.chartHouse === index + 1),
    };
  });

  if (style === "circular") {
    const polar = (radius: number, angle: number) => {
      const radians = (angle - 90) * Math.PI / 180;
      return { x: 180 + radius * Math.cos(radians), y: 180 + radius * Math.sin(radians) };
    };
    return (
      <svg viewBox="0 0 360 360" className="mx-auto w-full max-w-[440px]" role="img" aria-label={`${varga === 1 ? "D1" : `D${varga}`} circular Rashi chart`}>
        <circle cx="180" cy="180" r="160" fill="var(--chart-panel)" stroke="var(--chart-line)" strokeWidth="1.5" />
        <circle cx="180" cy="180" r="105" fill="none" stroke="var(--chart-line)" strokeWidth="1" />
        {Array.from({ length: 12 }, (_, index) => {
          const point = polar(160, index * 30);
          const house = houses[index];
          const label = polar(133, index * 30 + 15);
          const contents = [...house.bodies, ...transitBodies.filter((body) => body.chartHouse === house.house)].map((body) => body.isTransit ? `T${body.symbol}` : body.symbol).join(" ");
          return (
            <g key={house.house}>
              <line x1="180" y1="180" x2={point.x} y2={point.y} stroke="var(--chart-line)" strokeWidth="1" />
              <text x={label.x} y={label.y - 5} fill={house.house === 1 ? "#a16207" : "var(--chart-muted)"} fontSize="9" textAnchor="middle">{house.house} · {SIGNS[house.sign].slice(0, 3)}</text>
              <text x={label.x} y={label.y + 10} fill={house.bodies.some((body) => body.name === "Ascendant") ? "#a16207" : "var(--chart-body)"} fontSize="9" textAnchor="middle">{contents || "·"}</text>
            </g>
          );
        })}
        <circle cx="180" cy="180" r="3" fill="var(--gold)" />
        <text x="180" y="338" fill="#64748b" fontSize="9" textAnchor="middle">SIDEREAL · WHOLE SIGN</text>
      </svg>
    );
  }

  if (style === "south") {
    const signOrder = [11, 0, 1, 2, 10, -1, -1, 3, 9, -1, -1, 4, 8, 7, 6, 5];
    return (
      <div className="mx-auto grid aspect-square w-full max-w-[440px] grid-cols-4 grid-rows-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        {signOrder.map((sign, index) => {
          if (sign < 0) return <div key={`empty-${index}`} className="border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60" />;
          const signHouse = getSignHouse(sign, ascSign);
          const bodies = [...chartBodies, ...transitBodies].filter((body) => body.chartSign === sign);
          return (
            <div key={sign} className={`flex min-w-0 flex-col items-center justify-center gap-1 border border-slate-200 p-1 text-center dark:border-slate-700 ${signHouse === 1 ? "bg-amber-100/70 dark:bg-amber-400/10" : ""}`}>
              <span className="text-[9px] text-slate-500">{SIGNS[sign].slice(0, 3)} · H{signHouse}</span>
              <span className="flex flex-wrap justify-center gap-1 text-[10px]">
                {bodies.map((body) => <span key={body.id} className={body.isTransit ? "font-semibold text-cyan-700 dark:text-cyan-300" : body.name === "Ascendant" ? "font-bold text-amber-700 dark:text-[#D4AF37]" : BODY_COLORS[body.name] ?? "text-slate-700 dark:text-slate-200"}>{body.isTransit ? `T${body.symbol}` : body.symbol}{body.motion === "R" ? "(R)" : ""}</span>)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  const centers: Record<number, [number, number]> = {
    1: [180, 78], 2: [88, 42], 3: [42, 90], 4: [84, 180], 5: [42, 270], 6: [88, 318],
    7: [180, 282], 8: [272, 318], 9: [318, 270], 10: [276, 180], 11: [318, 90], 12: [272, 42],
  };
  return (
    <svg viewBox="0 0 360 360" className="mx-auto w-full max-w-[440px] rounded-xl" role="img" aria-label={`${varga === 1 ? "D1" : `D${varga}`} North Indian diamond chart`}>
      <rect x="10" y="10" width="340" height="340" rx="8" fill="var(--chart-panel)" stroke="var(--chart-line)" strokeWidth="1.5" />
      <path d="M10 10 350 350M350 10 10 350M180 10 350 180 180 350 10 180 180 10" fill="none" stroke="var(--chart-line)" strokeWidth="1.15" />
      {houses.map((house) => {
        const [x, y] = centers[house.house];
        const isAscHouse = house.house === 1;
        return (
          <g key={house.house}>
            <text x={x} y={y - 15} fill={isAscHouse ? "var(--gold)" : "var(--chart-muted)"} fontSize="9" textAnchor="middle">{isAscHouse ? "1ST HOUSE" : `H${house.house}`} · {SIGNS[house.sign].slice(0, 3).toUpperCase()}</text>
            {[...house.bodies, ...transitBodies.filter((body) => body.chartHouse === house.house)].map((body, index) => {
              const row = Math.floor(index / 3);
              const col = index % 3;
              const bodyColor = body.isTransit ? "var(--chart-transit)" : body.name === "Ascendant" ? "var(--gold)" : body.name === "Uranus" || body.name === "Neptune" || body.name === "Pluto" ? "var(--cyan)" : "var(--chart-body)";
              return <text key={body.id} x={x + (col - 1) * 27} y={y + 3 + row * 12} fill={bodyColor} fontSize="10" fontWeight={body.name === "Ascendant" ? "700" : "500"} textAnchor="middle">{body.isTransit ? `T${body.symbol}` : body.symbol}{body.motion === "R" ? "ᴿ" : ""}</text>;
            })}
          </g>
        );
      })}
    </svg>
  );
}

function DegreeValue({ position, decimal }: { position: PlanetPosition; decimal: boolean }) {
  return <span className="font-mono tabular-nums">{decimal ? `${position.degree.toFixed(4)}°` : degreeToDms(position.degree)}</span>;
}

function dignityStyle(dignity: string) {
  if (dignity === "Own" || dignity === "Friend" || dignity === "Exalted") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400";
  if (dignity === "Enemy" || dignity === "Debilitated") return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400";
  return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
}

function PlanetTable({ data, decimal }: { data: EphemerisResponse; decimal: boolean }) {
  const rows = [data.ascendant, ...data.planets];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1120px] border-collapse text-left text-[11px]">
        <thead className="sticky top-0 bg-slate-100 text-[9px] uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-900">
          <tr>{["Graha", "Sign", "Longitude", "Nakshatra", "Pada", "House", "Motion", "Declination", "Jaimini", "Dignity"].map((heading) => <th key={heading} className="whitespace-nowrap px-2 py-3 font-medium">{heading}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {rows.map((position) => {
            const isAscendant = position.name === "Ascendant";
            return (
              <tr key={position.id} className={`transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/50 ${isAscendant ? "bg-amber-50 text-amber-800 dark:bg-amber-400/[0.035] dark:text-[#D4AF37]" : "text-slate-700 dark:text-slate-300"}`}>
                <td className="whitespace-nowrap px-2 py-2.5 font-semibold">
                  <span className="mr-1.5 inline-flex size-5 items-center justify-center rounded bg-slate-100 text-[9px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">{position.symbol}</span>{position.name}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5">{position.signName}</td>
                <td className="whitespace-nowrap px-2 py-2.5"><DegreeValue position={position} decimal={decimal} /></td>
                <td className="whitespace-nowrap px-2 py-2.5">{position.nakshatraName}</td>
                <td className="px-2 py-2.5">{position.pada}</td>
                <td className="px-2 py-2.5">{position.house}</td>
                <td className="px-2 py-2.5"><span className={position.motion === "R" ? "font-semibold text-cyan-700 dark:text-cyan-400" : "text-slate-500"}>{position.motion}</span></td>
                <td className="whitespace-nowrap px-2 py-2.5 font-mono">{declinationToDms(position.declination)}</td>
                <td className="px-2 py-2.5 font-semibold text-amber-700 dark:text-[#D4AF37]">{position.jaimini ?? "—"}</td>
                <td className="px-2 py-2.5"><span className={`rounded-full px-2 py-1 text-[9px] ${dignityStyle(position.dignity)}`}>{position.dignity}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AspectMatrix({ planets }: { planets: PlanetPosition[] }) {
  const targets: Record<string, Record<number, string>> = {
    Mars: { 3: "4", 6: "7", 7: "8" },
    Jupiter: { 4: "5", 6: "7", 8: "9" },
    Saturn: { 2: "3", 6: "7", 9: "10" },
  };
  const aspectPlanets = planets.filter(({ name }) => ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].includes(name));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-center text-[9px]">
        <thead><tr><th className="sticky left-0 bg-white px-2 py-2 text-left font-medium text-slate-500 dark:bg-slate-900">Planet</th>{Array.from({ length: 12 }, (_, index) => <th key={index} className="px-1 py-2 font-medium text-slate-500">{index + 1}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
          {aspectPlanets.map((planet) => (
            <tr key={planet.id}>
              <th className="sticky left-0 whitespace-nowrap bg-white px-2 py-2 text-left font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-300">{planet.symbol} <span className="text-slate-500">H{planet.house}</span></th>
              {Array.from({ length: 12 }, (_, index) => {
                const distance = (index + 1 - planet.house + 12) % 12;
                const marker = targets[planet.name]?.[distance] ?? (distance === 6 ? "7" : "");
                const special = marker && marker !== "7";
                return <td key={index} className={`h-7 border-l border-slate-200 dark:border-slate-800/70 ${marker ? special ? "font-semibold text-cyan-700 dark:text-cyan-400" : "font-semibold text-amber-700 dark:text-[#D4AF37]" : "text-slate-200 dark:text-slate-800"}`}>{marker || "·"}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[9px] text-slate-500 dark:text-slate-400">Classical Parashari aspects · Mars 4/7/8 · Jupiter 5/7/9 · Saturn 3/7/10 · others 7</p>
    </div>
  );
}

function formatDashaDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function DashaTimeline({ data }: { data: EphemerisResponse }) {
  const currentMajor = data.dashas.find((period) => period.active);
  const currentAntar = currentMajor?.periods?.find((period) => period.active);
  const currentPratyantar = currentAntar?.periods?.find((period) => period.active);
  const now = Date.now();
  const start = currentMajor ? new Date(currentMajor.start).getTime() : now;
  const end = currentMajor ? new Date(currentMajor.end).getTime() : now + 1;
  const progress = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
  const timeline = data.dashas.filter((period) => period.start && new Date(period.end).getTime() > new Date(data.dashas[0]?.start ?? 0).getTime()).slice(0, 9);
  return (
    <div>
      <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 dark:border-cyan-900/60 dark:bg-cyan-950/25">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300"><MoonStar className="size-4" /></span><div><p className="text-[9px] uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Current period</p><p className="mt-0.5 text-xs font-semibold">{currentMajor ? `${currentMajor.lord} Maha` : "Birth dasha timeline"}</p></div></div>
          <span className="rounded-full bg-cyan-100 px-2 py-1 text-[9px] font-semibold text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-300">NOW · {currentAntar?.lord ?? "—"} / {currentPratyantar?.lord ?? "—"}</span>
        </div>
        {currentMajor && <div className="mt-3"><div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-cyan-500 dark:bg-cyan-400" style={{ width: `${Math.round(progress)}%` }} /></div><div className="mt-1 flex justify-between text-[9px] text-slate-500"><span>{formatDashaDate(currentMajor.start)}</span><span>{formatDashaDate(currentMajor.end)}</span></div></div>}
      </div>
      <div className="mt-3 max-h-[330px] space-y-1.5 overflow-y-auto pr-1">
        {timeline.map((maha, index) => (
          <details key={`${maha.lord}-${maha.start}`} open={maha.active || index === 0} className="group rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/35">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 marker:content-none">
              <span className={`size-2 rounded-full ${maha.active ? "bg-cyan-400 shadow-[0_0_10px_#06b6d4]" : "bg-slate-700"}`} />
              <span className="min-w-[66px] text-[11px] font-semibold">{maha.lord} Maha</span>
              <span className="flex-1 text-[9px] text-slate-500">{formatDashaDate(maha.start)} — {formatDashaDate(maha.end)}</span>
              {maha.active && <span className="rounded bg-cyan-400/10 px-1.5 py-0.5 text-[8px] font-semibold text-cyan-300">ACTIVE</span>}
              <ChevronDown className="size-3.5 text-slate-500 transition group-open:rotate-180" />
            </summary>
            <div className="space-y-1 border-t border-slate-200 px-3 py-2 dark:border-slate-800">
              {(maha.periods ?? []).map((antar) => (
                <details key={`${antar.lord}-${antar.start}`} open={antar.active} className="rounded-md bg-white dark:bg-slate-900/80">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-2 text-[9px] marker:content-none">
                    <span className={antar.active ? "text-cyan-300" : "text-slate-400"}>{maha.lord} / {antar.lord}</span>
                    <span className="flex-1 text-right text-slate-500">{formatDashaDate(antar.start)} — {formatDashaDate(antar.end)}</span>
                    <ChevronDown className="size-3 text-slate-600" />
                  </summary>
                  <div className="grid grid-cols-1 gap-1 border-t border-slate-200 px-2 py-2 dark:border-slate-800">
                    {(antar.periods ?? []).map((pratyantar) => <div key={`${pratyantar.lord}-${pratyantar.start}`} className={`flex justify-between gap-2 rounded px-2 py-1 text-[8px] ${pratyantar.active ? "bg-cyan-400/10 text-cyan-300" : "text-slate-500"}`}><span>{maha.lord} / {antar.lord} / {pratyantar.lord}{pratyantar.active ? " · NOW" : ""}</span><span>{formatDashaDate(pratyantar.start)} — {formatDashaDate(pratyantar.end)}</span></div>)}
                  </div>
                </details>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

type AuxiliaryType = "divisional" | "transit" | "solar" | "tajika" | "progressions";
type DashaSystem = "vimshottari" | "chara" | "ashtottari" | "yogini";

const CONTROL_CLASS = "h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200";
const PANEL_CLASS = "min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900";

function isSavedProfile(value: unknown): value is import("@/lib/kundali-store").BirthProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  return typeof profile.id === "string" && typeof profile.name === "string" &&
    typeof profile.date === "string" && typeof profile.time === "string" &&
    typeof profile.lat === "number" && typeof profile.lng === "number" &&
    typeof profile.timezone === "string" && typeof profile.city === "string";
}

export function KundaliDashboard() {
  const profile = useKundaliStore((state) => state.profile);
  const chartStyle = useKundaliStore((state) => state.chartStyle);
  const varga = useKundaliStore((state) => state.varga);
  const nodeType = useKundaliStore((state) => state.nodeType);
  const ayanamsa = useKundaliStore((state) => state.ayanamsa);
  const setProfile = useKundaliStore((state) => state.setProfile);
  const setLocation = useKundaliStore((state) => state.setLocation);
  const setChartStyle = useKundaliStore((state) => state.setChartStyle);
  const setVarga = useKundaliStore((state) => state.setVarga);
  const setNodeType = useKundaliStore((state) => state.setNodeType);
  const setAyanamsa = useKundaliStore((state) => state.setAyanamsa);
  const [data, setData] = useState<EphemerisResponse | null>(null);
  const [transitData, setTransitData] = useState<EphemerisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitLoading, setTransitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitError, setTransitError] = useState<string | null>(null);
  const [requestNumber, setRequestNumber] = useState(0);
  const [referenceName, setReferenceName] = useState("Ascendant");
  const [overlayTransits, setOverlayTransits] = useState(false);
  const [auxiliaryType, setAuxiliaryType] = useState<AuxiliaryType>("divisional");
  const [targetAge, setTargetAge] = useState(30);
  const [ageMode, setAgeMode] = useState<"completed" | "ongoing">("completed");
  const [nadiProgressions, setNadiProgressions] = useState(false);
  const [bhriguProgressions, setBhriguProgressions] = useState(false);
  const [dashaSystem, setDashaSystem] = useState<DashaSystem>("vimshottari");
  const [dashaSeed, setDashaSeed] = useState<"moon" | "ascendant" | "sun">("moon");
  const [savedProfiles, setSavedProfiles] = useState<import("@/lib/kundali-store").BirthProfile[]>([]);
  const [savedProfileId, setSavedProfileId] = useState("");
  const [birthDateText, setBirthDateText] = useState(formatBirthDate(profile.date));

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("celestia-saved-charts") ?? "[]") as unknown;
      if (Array.isArray(saved)) setSavedProfiles(saved.filter(isSavedProfile));
    } catch (storageError) {
      console.error("[kundali] Unable to read saved charts", storageError);
    }
  }, []);

  useEffect(() => {
    setBirthDateText(formatBirthDate(profile.date));
  }, [profile.date]);

  useEffect(() => {
    const abortController = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/ephemeris", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            date: profile.date,
            time: profile.time,
            lat: profile.lat,
            lng: profile.lng,
            timezone: profile.timezone,
            ayanamsa,
            nodeType,
            dashaSeed,
            ...(auxiliaryType === "solar" || auxiliaryType === "tajika" ? { targetAge, ageMode } : {}),
          }),
        });
        const result = await response.json() as EphemerisResponse | { error: string };
        if (!response.ok || "error" in result) throw new Error("error" in result ? result.error : `Ephemeris request failed (${response.status}).`);
        setData(result);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Unable to calculate this chart.");
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    }, 100);
    return () => {
      window.clearTimeout(timeout);
      abortController.abort();
    };
  }, [profile.date, profile.time, profile.lat, profile.lng, profile.timezone, ayanamsa, nodeType, dashaSeed, auxiliaryType, targetAge, ageMode, requestNumber]);

  useEffect(() => {
    const abortController = new AbortController();
    const timeout = window.setTimeout(async () => {
      setTransitLoading(true);
      setTransitError(null);
      const now = new Date();
      try {
        const response = await fetch("/api/ephemeris", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            date: now.toISOString().slice(0, 10),
            time: now.toISOString().slice(11, 19),
            lat: profile.lat,
            lng: profile.lng,
            timezone: "UTC",
            ayanamsa,
            nodeType,
            dashaSeed: "moon",
          }),
        });
        const result = await response.json() as EphemerisResponse | { error: string };
        if (!response.ok || "error" in result) throw new Error("error" in result ? result.error : `Transit request failed (${response.status}).`);
        setTransitData(result);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setTransitError(requestError instanceof Error ? requestError.message : "Unable to calculate current transits.");
      } finally {
        if (!abortController.signal.aborted) setTransitLoading(false);
      }
    }, 160);
    return () => {
      window.clearTimeout(timeout);
      abortController.abort();
    };
  }, [profile.lat, profile.lng, ayanamsa, nodeType]);

  const handleTimeChange = (value: string) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) return;
    setProfile({ time: value.length === 5 ? `${value}:00` : value });
  };
  const handleBirthDateChange = (value: string) => {
    setBirthDateText(value);
    const parsedDate = parseBirthDate(value);
    if (parsedDate) setProfile({ date: parsedDate });
  };
  const saveChart = () => {
    const savedProfile = { ...profile, id: `${profile.id || "chart"}-${Date.now()}` };
    const next = [savedProfile, ...savedProfiles.filter((item) => item.name !== profile.name || item.date !== profile.date)].slice(0, 20);
    try {
      window.localStorage.setItem("celestia-saved-charts", JSON.stringify(next));
      setSavedProfiles(next);
      setSavedProfileId(savedProfile.id);
    } catch (storageError) {
      console.error("[kundali] Unable to save chart", storageError);
      setError("This chart could not be saved to local storage.");
    }
  };
  const openSavedChart = () => {
    const selected = savedProfiles.find((item) => item.id === savedProfileId);
    if (selected) setProfile(selected);
  };

  const referencePlanet = referenceName === "Ascendant"
    ? data?.ascendant
    : data?.planets.find((planet) => planet.name === referenceName);
  const auxiliaryChart = auxiliaryType === "transit" ? transitData
    : auxiliaryType === "solar" || auxiliaryType === "tajika" ? data?.solarReturn
      : data;
  const auxiliaryAscendant = auxiliaryType === "solar" || auxiliaryType === "tajika"
    ? data?.solarReturn?.ascendant
    : auxiliaryChart?.ascendant;
  const auxiliaryPlanets = auxiliaryType === "solar" || auxiliaryType === "tajika"
    ? data?.solarReturn?.planets
    : auxiliaryChart?.planets;
  const auxiliaryVarga = auxiliaryType === "divisional" ? varga : 1;
  const currentTransitLabel = transitData ? new Date(transitData.calculatedAt).toLocaleTimeString() : "—";

  return (
    <div className="relative -mx-4 -mt-2 min-h-[calc(100vh-160px)] bg-slate-50 px-4 pb-10 pt-3 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:-mx-7 sm:px-7 lg:-mx-10 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(212,175,55,0.07),transparent_35%),radial-gradient(ellipse_at_90%_15%,rgba(6,182,212,0.06),transparent_32%)]" />
      <div className="relative mx-auto max-w-[1750px] space-y-4">
        <section aria-label="Birth chart controls" className="sticky top-[68px] z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"><Orbit className="size-4" /></span>
              <div><p className="text-xs font-semibold">Birth chart profile</p><p className="text-[9px] text-slate-500 dark:text-slate-400">Changes recalculate the chart instantly</p></div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={saveChart} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[10px] font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Save className="size-3.5" /> Save Chart</button>
              <select aria-label="Saved charts" value={savedProfileId} onChange={(event) => setSavedProfileId(event.target.value)} className={`${CONTROL_CLASS} h-8 max-w-36 text-[10px]`}>
                <option value="">Saved charts ({savedProfiles.length})</option>
                {savedProfiles.map((saved) => <option key={saved.id} value={saved.id}>{saved.name} · {saved.date}</option>)}
              </select>
              <button type="button" onClick={openSavedChart} disabled={!savedProfileId} aria-label="Open Saved Chart" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[10px] font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"><Bookmark className="size-3.5" /> Open</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-[1.1fr_0.85fr_1.5fr_0.8fr_0.8fr_1fr_auto]">
            <label className="text-[9px] font-medium text-slate-500 dark:text-slate-400">Date · DD/MM/YYYY
              <input aria-label="Birth date" type="text" inputMode="numeric" placeholder="DD/MM/YYYY" value={birthDateText} onChange={(event) => handleBirthDateChange(event.target.value)} className={`${CONTROL_CLASS} mt-1 w-full`} />
            </label>
            <label className="text-[9px] font-medium text-slate-500 dark:text-slate-400">Time · HH:MM:SS
              <input aria-label="Time of birth" type="time" step="1" value={profile.time} onChange={(event) => handleTimeChange(event.target.value)} className={`${CONTROL_CLASS} mt-1 w-full font-mono`} />
            </label>
            <label className="col-span-2 text-[9px] font-medium text-slate-500 dark:text-slate-400 sm:col-span-2 xl:col-span-1">City search
              <input aria-label="City search" list="celestia-cities" type="search" value={profile.city} onChange={(event) => setProfile({ city: event.target.value })} placeholder="Mumbai, Delhi…" className={`${CONTROL_CLASS} mt-1 w-full`} />
              <datalist id="celestia-cities"><option value="Mumbai, India" /><option value="Delhi, India" /><option value="Bengaluru, India" /><option value="New York, USA" /><option value="London, UK" /></datalist>
            </label>
            <label className="text-[9px] font-medium text-slate-500 dark:text-slate-400">Latitude
              <input aria-label="Latitude" type="number" step="0.0001" min="-90" max="90" value={Number.isFinite(profile.lat) ? profile.lat : ""} onChange={(event) => setLocation(event.target.value === "" ? Number.NaN : Number(event.target.value), profile.lng)} className={`${CONTROL_CLASS} mt-1 w-full`} />
            </label>
            <label className="text-[9px] font-medium text-slate-500 dark:text-slate-400">Longitude
              <input aria-label="Longitude" type="number" step="0.0001" min="-180" max="180" value={Number.isFinite(profile.lng) ? profile.lng : ""} onChange={(event) => setLocation(profile.lat, event.target.value === "" ? Number.NaN : Number(event.target.value))} className={`${CONTROL_CLASS} mt-1 w-full`} />
            </label>
            <label className="text-[9px] font-medium text-slate-500 dark:text-slate-400">Timezone
              <input aria-label="Timezone" value={profile.timezone} onChange={(event) => setProfile({ timezone: event.target.value })} className={`${CONTROL_CLASS} mt-1 w-full`} />
            </label>
            <div className="col-span-2 flex items-end gap-1.5 sm:col-span-4 xl:col-span-1">
              {([-60, -1, 1, 60] as const).map((seconds) => <button key={seconds} type="button" onClick={() => useKundaliStore.getState().adjustTime(seconds)} className="h-9 flex-1 rounded-lg border border-slate-200 px-1.5 text-[9px] font-medium transition hover:border-amber-400 hover:text-amber-700 dark:border-slate-700 dark:hover:border-amber-500 dark:hover:text-amber-300" aria-label={`${seconds < 0 ? "Subtract" : "Add"} ${Math.abs(seconds) === 60 ? "one minute" : "one second"}`}>{seconds < 0 ? "−" : "+"}{Math.abs(seconds) === 60 ? "1 Min" : "1 Sec"}</button>)}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300"><Orbit className="size-3.5" /> Sidereal birth chart</div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Kundali &amp; Charts</h2>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{profile.name || "New profile"} · {profile.date || "Date not set"} · {profile.time} · {profile.city}</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <span className={`size-1.5 rounded-full ${loading ? "animate-pulse bg-amber-400" : error ? "bg-rose-400" : "bg-emerald-400"}`} />
            {loading ? "Calculating ephemeris…" : error ? "Calculation error" : data?.engine ?? "Ready"}
            <button type="button" onClick={() => setRequestNumber((number) => number + 1)} className="ml-1 rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Refresh chart"><RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} /></button>
          </div>
        </div>

        {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{error}</span></div>}

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(380px,0.82fr)_minmax(0,1.18fr)]">
          <div className="min-w-0 space-y-4">
            <section className={PANEL_CLASS} aria-label="Primary D1 natal chart">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div><p className="text-xs font-semibold">Primary chart · D1 Natal</p><p className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Always visible · sidereal whole sign</p></div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[9px] text-amber-800 dark:bg-amber-400/10 dark:text-amber-300"><Crosshair className="size-3" /> {data?.ascendant.signName ?? "—"} rising</span>
              </div>
              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-[9px] font-medium text-slate-500 dark:text-slate-400">Reference Lagna
                  <select value={referenceName} onChange={(event) => setReferenceName(event.target.value)} className={`${CONTROL_CLASS} mt-1 w-full`}>
                    <option>Ascendant</option><option>Moon</option><option>Sun</option><option>Jupiter</option>
                  </select>
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-[10px] dark:border-slate-700">
                  <span className="flex items-center gap-2"><Eye className="size-3.5 text-cyan-700 dark:text-cyan-300" /> Overlay current transits</span>
                  <input type="checkbox" checked={overlayTransits} onChange={(event) => setOverlayTransits(event.target.checked)} className="size-4 accent-cyan-600" />
                </label>
              </div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-y border-slate-100 py-2.5 dark:border-slate-800">
                <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-950">
                  {([["diamond", "Diamond"], ["circular", "Circular"], ["south", "South"]] as const).map(([style, label]) => <button key={style} type="button" onClick={() => setChartStyle(style)} className={`rounded-md px-2.5 py-1.5 text-[9px] transition ${chartStyle === style ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"}`}>{label}</button>)}
                </div>
                <select aria-label="Ayanamsa" value={ayanamsa} onChange={(event) => setAyanamsa(event.target.value)} className={`${CONTROL_CLASS} h-8 text-[9px]`}>
                  <option value="lahiri">Lahiri</option><option value="raman">B.V. Raman</option><option value="krishnamurti">Krishnamurti</option><option value="fagan-bradley">Fagan–Bradley</option><option value="yukteshwar">Yukteshwar</option>
                </select>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/50">
                {data ? <SvgChart style={chartStyle} ascendant={data.ascendant} planets={data.planets} varga={1} reference={referencePlanet} overlay={overlayTransits ? transitData?.planets : undefined} /> : <div className="grid aspect-square place-items-center text-xs text-slate-500">{loading ? <LoaderCircle className="size-5 animate-spin text-cyan-500" /> : "Chart unavailable"}</div>}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-600 dark:bg-amber-400" /> Natal</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-cyan-600 dark:bg-cyan-400" /> Transit overlay</span>
                <span>ᴿ = retrograde</span>
                <span>{referenceName} reference</span>
              </div>
              {overlayTransits && <p className="mt-2 text-[9px] text-slate-500 dark:text-slate-400">{transitLoading ? "Refreshing current sky…" : transitError ?? `Transit positions · ${currentTransitLabel}`}</p>}
            </section>

            <section className={PANEL_CLASS} aria-label="Auxiliary chart viewer">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div><p className="text-xs font-semibold">Auxiliary chart viewer</p><p className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Compare divisional, transit, return &amp; progression views</p></div>
                <select aria-label="Auxiliary chart type" value={auxiliaryType} onChange={(event) => setAuxiliaryType(event.target.value as AuxiliaryType)} className={`${CONTROL_CLASS} max-w-56`}>
                  <option value="divisional">Divisional Charts (D2–D60)</option><option value="transit">Transit Chart</option><option value="solar">Solar Return (Varshaphala)</option><option value="tajika">Tajika</option><option value="progressions">Progressions</option>
                </select>
              </div>
              {auxiliaryType === "divisional" && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {VARGAS.filter((division) => division !== 1).map((division) => <button key={division} type="button" onClick={() => setVarga(division)} className={`rounded-md border px-2.5 py-1 text-[9px] font-semibold transition ${varga === division ? "border-amber-600 bg-amber-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"}`} aria-pressed={varga === division}>{`D${division}`}</button>)}
                </div>
              )}
              {(auxiliaryType === "solar" || auxiliaryType === "tajika") && (
                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <label className="text-[9px] font-medium text-slate-500 dark:text-slate-400">Required age
                    <input type="number" min={0} max={120} value={targetAge} onChange={(event) => setTargetAge(Math.max(0, Math.min(120, Number(event.target.value))))} className={`${CONTROL_CLASS} mt-1 w-full`} />
                  </label>
                  <fieldset className="flex items-end gap-2 text-[10px]">
                    <legend className="sr-only">Age counting rule</legend>
                    {(["completed", "ongoing"] as const).map((mode) => <label key={mode} className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 dark:border-slate-700"><input type="radio" name="age-mode" checked={ageMode === mode} onChange={() => setAgeMode(mode)} className="accent-amber-600" /> {mode === "completed" ? "Completed age" : "Ongoing age"}</label>)}
                  </fieldset>
                </div>
              )}
              {auxiliaryType === "progressions" && (
                <div className="mb-3 flex flex-wrap gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[10px] dark:border-slate-700"><input type="checkbox" checked={nadiProgressions} onChange={(event) => setNadiProgressions(event.target.checked)} className="accent-cyan-600" /> Nadi progression</label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[10px] dark:border-slate-700"><input type="checkbox" checked={bhriguProgressions} onChange={(event) => setBhriguProgressions(event.target.checked)} className="accent-cyan-600" /> Bhrigu progression</label>
                </div>
              )}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/50">
                {auxiliaryAscendant && auxiliaryPlanets
                  ? <SvgChart style={chartStyle} ascendant={auxiliaryAscendant} planets={auxiliaryPlanets} varga={auxiliaryVarga} />
                  : <div className="grid aspect-square place-items-center px-6 text-center text-xs text-slate-500">{auxiliaryType === "solar" || auxiliaryType === "tajika" ? loading ? "Calculating exact solar return…" : "Solar return data is not available." : auxiliaryType === "transit" && transitLoading ? "Calculating current transits…" : auxiliaryType === "progressions" ? "Choose a progression method to configure this view." : "Calculating chart…"}</div>}
              </div>
              {auxiliaryType === "solar" || auxiliaryType === "tajika"
                ? <p className="mt-2 text-[9px] text-slate-500 dark:text-slate-400">Exact sidereal solar return · {data?.solarReturn?.utc ? new Date(data.solarReturn.utc).toLocaleString() + " UTC" : "Awaiting calculation"}</p>
                : auxiliaryType === "transit" ? <p className="mt-2 text-[9px] text-slate-500 dark:text-slate-400">Current sky at chart coordinates · {currentTransitLabel}</p>
                  : auxiliaryType === "progressions" ? <p className="mt-2 text-[9px] text-amber-700 dark:text-amber-300">Progression controls are saved in this view; progression calculations are not yet provided by the ephemeris engine.</p>
                    : <p className="mt-2 text-[9px] text-slate-500 dark:text-slate-400">D{varga} divisional placements · whole-sign houses</p>}
            </section>
          </div>

          <section className={`${PANEL_CLASS} xl:sticky xl:top-[220px]`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-semibold">Planetary positions</p><p className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Swiss Ephemeris · sidereal · Jaimini karakas</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-[9px] text-slate-500 dark:text-slate-400">Node
                  <select aria-label="Rahu Ketu node mode" value={nodeType} onChange={(event) => setNodeType(event.target.value as "true" | "mean")} className={`${CONTROL_CLASS} h-8 text-[9px]`}><option value="true">True Node</option><option value="mean">Mean Node</option></select>
                </label>
                <span className="rounded-lg bg-slate-100 px-2.5 py-2 text-[9px] text-slate-600 dark:bg-slate-950 dark:text-slate-400">Longitude DMS</span>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              {data ? <PlanetTable data={data} decimal={false} /> : <div className="grid h-60 place-items-center text-xs text-slate-500">{loading ? <span className="inline-flex items-center gap-2"><LoaderCircle className="size-4 animate-spin text-cyan-500" /> Calculating positions</span> : "No planetary data"}</div>}
            </div>
            {data && (
              <details className="group mt-3 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[10px] marker:content-none">
                  <Crosshair className="size-3.5 text-amber-700 dark:text-amber-300" />
                  <span className="font-medium">Bhava Chalit cusps</span><span className="text-slate-500">· {data.houseCuspSystem}</span>
                  <ChevronDown className="ml-auto size-3.5 text-slate-500 transition group-open:rotate-180" />
                </summary>
                <div className="grid grid-cols-3 gap-1.5 border-t border-slate-200 p-2 sm:grid-cols-4 lg:grid-cols-6 dark:border-slate-800">
                  {data.houseCusps.map((cusp) => <div key={cusp.house} className="rounded-md bg-white px-2 py-1.5 dark:bg-slate-900"><p className="text-[8px] uppercase text-slate-500">House {cusp.house}</p><p className="mt-0.5 truncate font-mono text-[9px]">{cusp.signName} {degreeToDms(cusp.longitude % 30)}</p></div>)}
                </div>
              </details>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Ascendant", value: data?.ascendant.signName ?? "—", icon: Compass, color: "text-amber-700 dark:text-amber-300" },
                { label: "Ayanamsa", value: data ? `${data.ayanamsa.degrees.toFixed(4)}°` : "—", icon: Orbit, color: "text-cyan-700 dark:text-cyan-300" },
                { label: "Node mode", value: `${nodeType === "true" ? "True" : "Mean"} Node`, icon: ArrowDownUp, color: "text-cyan-700 dark:text-cyan-300" },
                { label: "House system", value: `Whole Sign + ${data?.houseCuspSystem ?? "Bhava"}`, icon: Globe2, color: "text-slate-500" },
              ].map(({ label, value, icon: Icon, color }) => <div key={label} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-950/50"><Icon className={`size-3.5 shrink-0 ${color}`} /><div className="min-w-0"><p className="text-[8px] uppercase tracking-wider text-slate-500">{label}</p><p className="truncate text-[10px]">{value}</p></div></div>)}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className={PANEL_CLASS}>
            <div className="mb-3 flex items-center justify-between gap-2"><div><p className="text-xs font-semibold">Drishti · aspect matrix</p><p className="mt-0.5 text-[9px] text-slate-500 dark:text-slate-400">Graha aspects mapped against whole-sign houses</p></div><Activity className="size-4 text-amber-600 dark:text-amber-300" /></div>
            {data ? <AspectMatrix planets={data.planets} /> : <div className="grid h-40 place-items-center text-xs text-slate-500">Waiting for planetary positions</div>}
          </section>

          <section className={PANEL_CLASS}>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div><p className="text-xs font-semibold">Dasha timeline</p><p className="mt-0.5 text-[9px] text-slate-500 dark:text-slate-400">Maha · Antar · Pratyantar · active period marked NOW</p></div>
              <div className="flex gap-2">
                <label className="text-[8px] text-slate-500">System<select value={dashaSystem} onChange={(event) => setDashaSystem(event.target.value as DashaSystem)} className={`${CONTROL_CLASS} mt-1 h-8 text-[9px]`}><option value="vimshottari">Vimshottari</option><option value="chara">Chara Dasha</option><option value="ashtottari">Ashtottari</option><option value="yogini">Yogini</option></select></label>
                <label className="text-[8px] text-slate-500">Calculation seed<select value={dashaSeed} onChange={(event) => setDashaSeed(event.target.value as "moon" | "ascendant" | "sun")} className={`${CONTROL_CLASS} mt-1 h-8 text-[9px]`}><option value="moon">Moon</option><option value="ascendant">Ascendant</option><option value="sun">Sun</option></select></label>
              </div>
            </div>
            {dashaSystem !== "vimshottari" && <p role="status" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">The current ephemeris engine provides Vimshottari periods. {dashaSystem[0].toUpperCase() + dashaSystem.slice(1)} is selected as a view preference, but its period calculations are not represented as Vimshottari.</p>}
            {data && dashaSystem === "vimshottari" ? <DashaTimeline data={data} /> : <div className="grid h-32 place-items-center text-xs text-slate-500">{data ? "Select Vimshottari to display calculated periods." : "Dasha timeline appears after calculation."}</div>}
          </section>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5"><Sparkles className="size-3 text-amber-600 dark:text-amber-300" /> Swiss Ephemeris · Lahiri default · sidereal positions</span>
          <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3" /> Bhava cusps: Placidus · planetary houses: Whole Sign</span>
          {data && <span>Calculated {new Date(data.calculatedAt).toLocaleTimeString()}</span>}
        </div>
      </div>
    </div>
  );
}

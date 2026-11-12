"use client";

import { useEffect, useState } from "react";
import type { CelestialLanguage, EphemerisResponse } from "@/lib/kundali-types";
import { planetName, signName } from "@/lib/astrology/localization";

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const SHORT_SIGNS = ["Ari", "Tau", "Gem", "Can", "Leo", "Vir", "Lib", "Sco", "Sag", "Cap", "Aqu", "Pis"];

interface AshtakavargaResult {
  rows: Array<{ planet: string; bindus: number[]; total: number }>;
  sarvashtakavarga: number[];
}

const inFlightRequests = new Map<string, Promise<AshtakavargaResult>>();

function isAshtakavargaResult(value: unknown): value is AshtakavargaResult {
  if (!value || typeof value !== "object") return false;
  const result = value as { rows?: unknown; sarvashtakavarga?: unknown };
  return Array.isArray(result.rows)
    && result.rows.every((row: unknown) => {
      if (!row || typeof row !== "object") return false;
      const candidate = row as { planet?: unknown; bindus?: unknown; total?: unknown };
      return typeof candidate.planet === "string"
        && typeof candidate.total === "number"
        && Array.isArray(candidate.bindus)
        && candidate.bindus.length === 12
        && candidate.bindus.every((bindu: unknown) => typeof bindu === "number");
    })
    && Array.isArray(result.sarvashtakavarga)
    && result.sarvashtakavarga.length === 12
    && result.sarvashtakavarga.every((bindu: unknown) => typeof bindu === "number");
}

function fetchAshtakavarga(data: EphemerisResponse, cacheKey: string) {
  const existingRequest = inFlightRequests.get(cacheKey);
  if (existingRequest) return existingRequest;

  const request = fetch("/api/analysis/ashtakavarga", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      planets: data.planets.map(({ name, sign }) => ({ name, sign })),
      ascendant: { name: data.ascendant.name, sign: data.ascendant.sign },
    }),
  }).then(async (response) => {
    const payload: unknown = await response.json();
    if (!response.ok) {
      const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `Ashtakavarga request failed (${response.status}).`;
      throw new Error(message);
    }
    if (!isAshtakavargaResult(payload)) throw new Error("Ashtakavarga response was invalid.");
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch (cacheError) {
      console.warn("[kundali] Unable to cache Ashtakavarga results", cacheError);
    }
    return payload;
  });

  inFlightRequests.set(cacheKey, request);
  void request.then(
    () => {
      if (inFlightRequests.get(cacheKey) === request) inFlightRequests.delete(cacheKey);
    },
    () => {
      if (inFlightRequests.get(cacheKey) === request) inFlightRequests.delete(cacheKey);
    },
  );
  return request;
}

function getHouse(sign: number, ascendantSign: number) {
  return ((sign - ascendantSign + 12) % 12) + 1;
}

function getSignHouse(sign: number, ascendantSign: number) {
  return ((sign - ascendantSign + 12) % 12) + 1;
}

const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

function SignMark({ sign, label, enabled }: { sign: number; label: string; enabled: boolean }) {
  if (!enabled) return <>{label}</>;
  return <svg aria-label={label} role="img" viewBox="0 0 24 24" className="inline-block size-4 align-[-3px]"><text x="12" y="18" textAnchor="middle" fontSize="18" fill="currentColor">{SIGN_GLYPHS[sign]}</text></svg>;
}

function AshtakavargaTable({ data, language, useSignIcons, ascendantSign }: { data: AshtakavargaResult; language: CelestialLanguage; useSignIcons: boolean; ascendantSign: number }) {
  const [selectedSign, setSelectedSign] = useState(ascendantSign);
  const [selectedPlanet, setSelectedPlanet] = useState("Sarvashtakavarga");
  const selectedHouse = getSignHouse(selectedSign, ascendantSign);
  const selectedContributor = data.rows.find((row) => row.planet === selectedPlanet);
  const selectedBindus = selectedContributor?.bindus[selectedSign] ?? data.sarvashtakavarga[selectedSign];

  useEffect(() => setSelectedSign(ascendantSign), [ascendantSign]);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] rounded-md border border-border text-center text-xs divide-y divide-border">
          <thead className="bg-muted/10 text-muted-foreground">
            <tr className="divide-x divide-border">
              <th className="sticky left-0 bg-transparent px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Bindus</th>
              {Array.from({ length: 12 }, (_, sign) => {
                const house = getSignHouse(sign, ascendantSign);
                const label = useSignIcons ? signName(SIGNS[sign], language) : language === "en" || language === "initials" ? SHORT_SIGNS[sign] : signName(SIGNS[sign], language);
                return (
                  <th key={sign} className={`bg-transparent px-2 py-3 text-xs font-medium uppercase tracking-wider ${selectedSign === sign ? "bg-cyan-50 dark:bg-cyan-950/40" : ""}`}>
                    <button type="button" aria-pressed={selectedSign === sign} aria-label={`${label}, House ${house}`} onClick={() => { setSelectedSign(sign); setSelectedPlanet("Sarvashtakavarga"); }} className="flex min-w-9 flex-col items-center rounded-md px-1 py-1 transition hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:hover:bg-cyan-900/50">
                      <span>{useSignIcons ? <SignMark sign={sign} label={label} enabled /> : label}</span>
                      <span className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">House {house}</span>
                    </button>
                  </th>
                );
              })}
              <th className="bg-transparent px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {data.rows.map((row) => (
              <tr key={row.planet} className="divide-x divide-border text-foreground">
                <th className="sticky left-0 bg-card px-4 py-3 text-left font-medium">{planetName(row.planet, language)}</th>
                {row.bindus.map((bindu, sign) => (
                  <td key={sign} className={`bg-transparent px-2 py-3 text-right tabular-nums ${selectedSign === sign ? "bg-blue-100/70 text-blue-950 dark:bg-blue-900/35 dark:text-blue-100" : "text-foreground"}`}>
                    <button type="button" aria-label={`${planetName(row.planet, language)} bindus in ${signName(SIGNS[sign], language)}, House ${getSignHouse(sign, ascendantSign)}: ${bindu}`} onClick={() => { setSelectedSign(sign); setSelectedPlanet(row.planet); }} className="min-w-7 rounded px-1 py-1 transition hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:hover:bg-cyan-900/60">{bindu}</button>
                  </td>
                ))}
                <td className="bg-transparent px-4 py-3 text-right font-semibold text-amber-700 dark:text-amber-300">{row.total}</td>
              </tr>
            ))}
            <tr className="divide-x divide-border font-semibold text-foreground">
              <th className="sticky left-0 bg-card px-4 py-3 text-left">Sarvashtakavarga</th>
              {data.sarvashtakavarga.map((bindu, sign) => (
                <td key={sign} className={`bg-transparent px-2 py-3 text-right tabular-nums ${selectedSign === sign ? "bg-cyan-100/70 dark:bg-cyan-900/50" : ""}`}>
                  <button type="button" aria-label={`Sarvashtakavarga bindus in ${signName(SIGNS[sign], language)}, House ${getSignHouse(sign, ascendantSign)}: ${bindu}`} onClick={() => { setSelectedSign(sign); setSelectedPlanet("Sarvashtakavarga"); }} className="min-w-7 rounded px-1 py-1 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:hover:bg-amber-900/40">{bindu}</button>
                </td>
              ))}
              <td className="bg-transparent px-4 py-3 text-right">{data.sarvashtakavarga.reduce((sum, value) => sum + value, 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p aria-live="polite" className="mt-2 text-xs text-slate-600 dark:text-slate-400">
        {selectedPlanet === "Sarvashtakavarga" ? "Sarvashtakavarga" : planetName(selectedPlanet, language)} · {signName(SIGNS[selectedSign], language)} · House {selectedHouse} · {selectedBindus} bindus
      </p>
    </div>
  );
}

export default function AshtakavargaTab({
  data,
  language,
  useSignIcons,
}: {
  data: EphemerisResponse | null;
  language: CelestialLanguage;
  useSignIcons: boolean;
}) {
  const [result, setResult] = useState<AshtakavargaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!data) return;
    const cacheKey = `celestia:ashtakavarga:${data.calculatedAt}`;
    let active = true;
    let cached: string | null = null;
    try {
      cached = sessionStorage.getItem(cacheKey);
    } catch (cacheError) {
      console.warn("[kundali] Unable to read Ashtakavarga session cache", cacheError);
    }
    if (cached) {
      try {
        const parsed: unknown = JSON.parse(cached);
        if (isAshtakavargaResult(parsed)) {
          setResult(parsed);
          setError(null);
          setLoading(false);
          return () => { active = false; };
        }
      } catch {
        try {
          sessionStorage.removeItem(cacheKey);
        } catch (cacheError) {
          console.warn("[kundali] Unable to clear invalid Ashtakavarga cache", cacheError);
        }
      }
    }

    setResult(null);
    setError(null);
    setLoading(true);
    void fetchAshtakavarga(data, cacheKey)
      .then((payload) => {
        if (!active) return;
        setResult(payload);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : "Unable to calculate Ashtakavarga.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [data]);

  if (!data) {
    return <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Load a chart to calculate Ashtakavarga.</p>;
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5" aria-labelledby="ashtakavarga-heading">
      <header className="mb-4">
        <h3 id="ashtakavarga-heading" className="text-sm font-semibold">Ashtakavarga · Bhinna Bindus</h3>
        <p className="mt-1 text-xs text-muted-foreground">Eight contributors across the twelve signs · Sarvashtakavarga total</p>
      </header>
      {loading && <div role="status" className="grid min-h-40 place-items-center text-sm text-muted-foreground">Calculating Ashtakavarga…</div>}
      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}
      {result && (
        <div className="space-y-5">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] border-collapse text-center text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th scope="col" className="sticky left-0 bg-muted/50 px-3 py-3 text-left font-semibold">Bindus</th>
                {SIGNS.map((sign, index) => (
                  <th scope="col" key={sign} className="px-2 py-3 font-medium">
                    <span className="block">{language === "en" || language === "initials" ? SHORT_SIGNS[index] : signName(sign, language)}</span>
                    <span className="mt-1 block text-[10px]">House {getHouse(index, data.ascendant.sign)}</span>
                  </th>
                ))}
                <th scope="col" className="px-3 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.rows.map((row) => (
                <tr key={row.planet}>
                  <th scope="row" className="sticky left-0 bg-card px-3 py-3 text-left font-medium">{planetName(row.planet, language)}</th>
                  {row.bindus.map((bindu, sign) => <td key={sign} className="px-2 py-3 tabular-nums">{bindu}</td>)}
                  <td className="px-3 py-3 text-right font-semibold text-amber-700 dark:text-amber-300">{row.total}</td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-semibold">
                <th scope="row" className="sticky left-0 bg-muted/30 px-3 py-3 text-left">Sarvashtakavarga</th>
                {result.sarvashtakavarga.map((bindu, sign) => <td key={sign} className="px-2 py-3 tabular-nums">{bindu}</td>)}
                <td className="px-3 py-3 text-right">{result.sarvashtakavarga.reduce((sum, value) => sum + value, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <section aria-labelledby="interactive-ashtakavarga-heading">
          <header className="mb-3"><h4 id="interactive-ashtakavarga-heading" className="text-sm font-semibold">Interactive Bhinna &amp; Sarvashtakavarga</h4><p className="mt-1 text-xs text-muted-foreground">Select a sign or bindu to inspect its house total.</p></header>
          <AshtakavargaTable data={result} language={language} useSignIcons={useSignIcons} ascendantSign={data.ascendant.sign} />
        </section>
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { MidpointMode } from "../../lib/astrology/engines/midpoints";
import { PLANET_ORDER } from "../../lib/astrology/engines/midpoints";
import { MIDPOINT_MODE_LABELS, type MidpointChartReport, visibleMidpointRows, visibleMidpointTrees } from "../../lib/astrology/midpoint-chart";
import type { MidpointPreferences } from "../../lib/kundali-types";

const CONTROL_CLASS = "h-9 min-w-0 rounded-lg border border-input bg-card px-2.5 text-xs text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
const TOGGLE_CLASS = "min-h-9 rounded-lg border border-border px-3 text-xs font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

function ToggleButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={`${TOGGLE_CLASS} ${pressed ? "bg-primary/15 text-foreground" : "bg-card text-muted-foreground"}`}>
      {children}
    </button>
  );
}

export default function MidpointsTab({
  report,
  preferences,
  onPreferencesChange,
  decimal,
  unavailableReason,
}: {
  report: MidpointChartReport | null;
  preferences: MidpointPreferences;
  onPreferencesChange: (preferences: MidpointPreferences) => void;
  decimal: boolean;
  unavailableReason: string | null;
}) {
  const [orbDrafts, setOrbDrafts] = useState({
    orbConjOpp: String(preferences.orbConjOpp),
    orbSquare: String(preferences.orbSquare),
    orbSemi: String(preferences.orbSemi),
  });
  useEffect(() => {
    setOrbDrafts({
      orbConjOpp: String(preferences.orbConjOpp),
      orbSquare: String(preferences.orbSquare),
      orbSemi: String(preferences.orbSemi),
    });
  }, [preferences.orbConjOpp, preferences.orbSquare, preferences.orbSemi]);
  const update = <K extends keyof MidpointPreferences>(key: K, value: MidpointPreferences[K]) => {
    onPreferencesChange({ ...preferences, [key]: value });
  };
  const commitOrb = (key: "orbConjOpp" | "orbSquare" | "orbSemi") => {
    const raw = orbDrafts[key];
    const value = Number(raw);
    if (raw && Number.isFinite(value) && value >= 0 && value <= 30) {
      update(key, value);
    } else {
      setOrbDrafts((current) => ({ ...current, [key]: String(preferences[key]) }));
    }
  };
  const rows = report ? visibleMidpointRows(report, preferences) : [];
  const trees = report ? visibleMidpointTrees(report, preferences.showAllTrees) : [];

  return (
    <div className="min-w-0 space-y-4">
      <section className="min-w-0 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5" aria-labelledby="midpoints-heading">
        <header className="mb-4">
          <h2 id="midpoints-heading" className="text-sm font-semibold">Midpoints</h2>
          <p className="mt-1 text-xs text-muted-foreground">Sidereal midpoints, hard-aspect activations, and midpoint trees.</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium">
            Aspect mode
            <select aria-label="Midpoint aspect mode" value={preferences.mode} onChange={(event) => update("mode", event.target.value as MidpointMode)} className={CONTROL_CLASS}>
              {Object.entries(MIDPOINT_MODE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium">
            Cusp receivers
            <select aria-label="Midpoint cusp receivers" value={preferences.cuspReceivers} onChange={(event) => update("cuspReceivers", event.target.value as MidpointPreferences["cuspReceivers"])} className={CONTROL_CLASS}>
              <option value="axes">Axes 2–6</option>
              <option value="all">All cusps</option>
              <option value="none">None</option>
            </select>
          </label>
          {([
            ["orbConjOpp", "Conjunction / opposition orb"],
            ["orbSquare", "Square orb"],
            ["orbSemi", "45° / 135° orb"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex min-w-0 flex-col gap-1 text-xs font-medium">
              {label}
              <div className="flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-2.5 focus-within:ring-2 focus-within:ring-primary/10">
                <input
                  aria-label={label}
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                  value={orbDrafts[key]}
                  onChange={(event) => setOrbDrafts((current) => ({ ...current, [key]: event.target.value }))}
                  onBlur={() => commitOrb(key)}
                  className="min-w-0 flex-1 bg-transparent text-xs tabular-nums outline-none"
                />
                <span className="text-muted-foreground">°</span>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ToggleButton pressed={preferences.includeKetu} onClick={() => update("includeKetu", !preferences.includeKetu)}>Include Ketu</ToggleButton>
          <ToggleButton pressed={preferences.onlyActivated} onClick={() => update("onlyActivated", !preferences.onlyActivated)}>Only midpoints with points on them</ToggleButton>
          <ToggleButton pressed={preferences.dialSort} onClick={() => update("dialSort", !preferences.dialSort)}>Sort by 90° dial</ToggleButton>
          <label className="flex min-w-[180px] flex-1 items-center gap-2 text-xs font-medium sm:max-w-xs">
            Planet filter
            <select aria-label="Midpoint planet filter" value={preferences.planetFilter} onChange={(event) => update("planetFilter", event.target.value)} className={`${CONTROL_CLASS} flex-1`}>
              <option value="all">All points</option>
              {PLANET_ORDER.map((planet) => <option key={planet} value={planet}>{planet}</option>)}
              <option value="Ascendant">Ascendant</option>
              <option value="MC">MC</option>
            </select>
          </label>
        </div>

        {unavailableReason && <p role="status" className="mt-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">{unavailableReason}</p>}
        {!unavailableReason && report && (
          <>
            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[760px] divide-y divide-border text-left text-xs">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2">Pair</th>
                    <th scope="col" className="px-3 py-2">Midpoint</th>
                    <th scope="col" className="px-3 py-2">Far midpoint</th>
                    <th scope="col" className="px-3 py-2">90° dial</th>
                    <th scope="col" className="px-3 py-2">Points on it</th>
                    <th scope="col" className="px-3 py-2 text-right">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.index} className="bg-card">
                      <th scope="row" className="whitespace-nowrap px-3 py-2 font-semibold">{row.label}</th>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">{decimal ? `${row.longitude.toFixed(4)}°` : row.text}</td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">{decimal ? `${((row.longitude + 180) % 360).toFixed(4)}°` : row.farText}</td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">{row.dial90.toFixed(4)}°</td>
                      <td className="min-w-[220px] px-3 py-2">
                        {row.activations.length
                          ? <div className="flex flex-wrap gap-1">{row.activations.map((activation, index) => <span key={`${activation.receiver}-${activation.symbol}-${index}`} className="inline-flex whitespace-nowrap rounded-md bg-muted px-1.5 py-0.5 text-[11px] tabular-nums">{activation.text}</span>)}</div>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.activations.length}</td>
                    </tr>
                  ))}
                  {!rows.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No midpoint rows match these filters.</td></tr>}
                </tbody>
              </table>
            </div>

            <section className="mt-5" aria-labelledby="midpoint-trees-heading">
              <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 id="midpoint-trees-heading" className="text-sm font-semibold">Midpoint trees</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Each line reads “point = midpoint aspect orb.”</p>
                </div>
                <ToggleButton pressed={preferences.showAllTrees} onClick={() => update("showAllTrees", !preferences.showAllTrees)}>Show all points</ToggleButton>
              </header>
              {trees.length
                ? <ul className="divide-y divide-border rounded-lg border border-border">
                  {trees.map((tree) => (
                    <li key={tree.short} className="grid gap-1 px-3 py-2 text-xs sm:grid-cols-[minmax(110px,160px)_1fr]">
                      <span className="font-semibold">{tree.point}</span>
                      <span className="min-w-0 text-muted-foreground">{tree.list || "No midpoint activations"}</span>
                    </li>
                  ))}
                </ul>
                : <p className="rounded-lg border border-border bg-muted/20 px-3 py-4 text-xs text-muted-foreground">No midpoint trees have activations yet. Turn on “Show all points” to include empty trees.</p>}
            </section>
          </>
        )}

        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">☌ conjunction · ☍ opposition (= conjunct far midpoint) · □ square · ∠ semi-square 45° · ⚼ sesquiquadrate 135°</p>
          <p className="mt-2 text-xs text-muted-foreground">Insights are for reflection, not prediction.</p>
        </div>
      </section>
    </div>
  );
}

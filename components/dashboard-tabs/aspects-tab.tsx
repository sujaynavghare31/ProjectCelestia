"use client";

import { useEffect, useMemo, useState } from "react";
import type { CelestialLanguage, PlanetPosition } from "@/lib/kundali-types";
import { planetName, signName } from "@/lib/astrology/localization";
import { ASPECT_SET, DEFAULT_ORBS, type AspectKey } from "@/src/lib/aspects/aspectSet";
import { calculateAspects, type AspectBody, type AspectHit } from "@/src/lib/aspects/calc";
import { POINT_CATALOG, type PointCatalogItem } from "@/src/lib/points/catalog";

const DEFAULT_PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

function normalizeSign(sign: number) {
  return ((sign % 12) + 12) % 12;
}

function classForBody(name: string): AspectBody["kind"] {
  if (name === "Sun" || name === "Moon") return "luminary";
  if (name === "ASC" || name === "MC") return "angle";
  if (POINT_CATALOG.some((point) => point.name === name)) return "small";
  return "planet";
}

function orbText(value: number) {
  const magnitude = Math.abs(value);
  const degrees = Math.floor(magnitude);
  const minutes = Math.round((magnitude - degrees) * 60);
  return `${value >= 0 ? "+" : "-"}${degrees}°${String(minutes).padStart(2, "0")}′`;
}

function VedicDrishti({ planets, ascendant, mc, language }: { planets: PlanetPosition[]; ascendant: PlanetPosition; mc?: PlanetPosition; language: CelestialLanguage }) {
  const targets = [
    { name: "ASC", sign: ascendant.sign, longitude: ascendant.longitude },
    { name: "MC", sign: mc?.sign ?? ((ascendant.sign + 9) % 12), longitude: mc?.longitude ?? ascendant.longitude },
  ];
  const drishtis = planets.filter(({ name }) => ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].includes(name));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-center text-xs">
        <thead><tr><th className="sticky left-0 bg-card px-3 py-2 text-left">Graha</th>{targets.map((target) => <th key={target.name} className="px-3 py-2">{target.name}</th>)}</tr></thead>
        <tbody>
          {drishtis.map((planet) => (
            <tr key={planet.id}>
              <th className="sticky left-0 bg-card px-3 py-2 text-left">{planetName(planet.name, language, planet.symbol)}</th>
              {targets.map((target) => {
                const distance = ((target.sign - planet.sign + 12) % 12) + 1;
                const seventh = distance === 7;
                const special = planet.name === "Mars" && [4, 8].includes(distance)
                  || planet.name === "Jupiter" && [5, 9].includes(distance)
                  || planet.name === "Saturn" && [3, 10].includes(distance);
                return <td key={target.name} className={seventh || special ? "font-semibold text-amber-700 dark:text-amber-300" : "text-muted-foreground"}>{seventh ? "7" : special ? distance : "·"}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">Parashari drishti · Mars 4/8 · Jupiter 5/9 · Saturn 3/10 · all planets 7th.</p>
    </div>
  );
}

function familyColor(family: string) {
  if (family === "hard") return "text-red-600 dark:text-red-300";
  if (family === "soft") return "text-blue-600 dark:text-blue-300";
  if (family === "quintile") return "text-purple-600 dark:text-purple-300";
  return "text-emerald-600 dark:text-emerald-300";
}

export default function AspectsTab({
  data,
  language,
  useSignIcons,
}: {
  data: { planets: PlanetPosition[]; ascendant: PlanetPosition; mc?: PlanetPosition; input?: { date: string; time: string; lat: number; lng: number; timezone: string } } | null;
  language: CelestialLanguage;
  useSignIcons: boolean;
}) {
  const [enabled, setEnabled] = useState<Set<AspectKey>>(new Set(ASPECT_SET.filter((aspect) => aspect.defaultEnabled).map((aspect) => aspect.key)));
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [extraPositions, setExtraPositions] = useState<Record<string, { longitude: number; speed: number; error?: string }>>({});
  const [view, setView] = useState<"grid" | "list">("grid");
  const [excludeFormulaPairs, setExcludeFormulaPairs] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const saved = window.localStorage.getItem("celestia-aspect-points");
    const fromUrl = params.get("pts");
    const keys = (fromUrl ? fromUrl.split(",") : saved ? saved.split(",") : []).filter((key) => POINT_CATALOG.some((point) => point.key === key)).slice(0, 20);
    setSelectedKeys(keys);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("celestia-aspect-points", selectedKeys.join(","));
    const params = new URLSearchParams(window.location.search);
    if (selectedKeys.length) params.set("pts", selectedKeys.join(","));
    else params.delete("pts");
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [selectedKeys]);

  useEffect(() => {
    if (!data || selectedKeys.length === 0) return;
    let active = true;
    fetch("/api/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        birthUtc: data.input ? `${data.input.date}T${data.input.time.length === 5 ? `${data.input.time}:00` : data.input.time}Z` : "",
        lat: data.input?.lat ?? 0,
        lon: data.input?.lng ?? 0,
        keys: selectedKeys,
        zodiac: "sidereal",
        ayanamsaMode: "lahiri",
      }),
    }).then(async (response) => {
      const payload = await response.json() as { positions?: Array<{ key: string; longitude?: number; speed?: number; error?: string }> };
      if (!active) return;
      setExtraPositions(Object.fromEntries((payload.positions ?? []).map((position) => [position.key, {
        longitude: position.longitude ?? 0,
        speed: position.speed ?? 0,
        error: position.error,
      }])));
    }).catch(() => {
      if (active) setExtraPositions(Object.fromEntries(selectedKeys.map((key) => [key, { longitude: 0, speed: 0, error: "Unavailable" }])));
    });
    return () => { active = false; };
  }, [data, selectedKeys.join(","), selectedKeys]);

  const bodies = useMemo<AspectBody[]>(() => {
    if (!data) return [];
    const planets = DEFAULT_PLANETS.map((name) => data.planets.find((planet) => planet.name === name)).filter((planet): planet is PlanetPosition => Boolean(planet));
    if (!planets.some((planet) => planet.name === "True Node")) {
      const node = data.planets.find((planet) => planet.name === "Rahu");
      if (node) planets.push({ ...node, id: "true-node", name: "True Node", symbol: "N" });
    }
    const defaultBodies: AspectBody[] = planets.map((planet) => ({
      id: planet.id,
      name: planet.name,
      longitude: planet.longitude,
      speed: planet.speed,
      kind: classForBody(planet.name),
    }));
    if (data.ascendant) defaultBodies.push({ id: "asc", name: "ASC", longitude: data.ascendant.longitude, speed: 0, kind: "angle" });
    if (data.mc) defaultBodies.push({ id: "mc", name: "MC", longitude: data.mc.longitude, speed: 0, kind: "angle" });
    selectedKeys.forEach((key) => {
      const catalog = POINT_CATALOG.find((point) => point.key === key);
      const position = extraPositions[key];
      if (catalog && position && !position.error) {
        defaultBodies.push({ id: key, name: catalog.name, longitude: position.longitude, speed: position.speed, kind: "small" });
      }
    });
    return defaultBodies;
  }, [data, extraPositions, selectedKeys]);

  const hits = useMemo(() => calculateAspects(bodies, enabled, DEFAULT_ORBS, excludeFormulaPairs), [bodies, enabled, excludeFormulaPairs]);
  const hitMap = useMemo(() => new Map(hits.map((hit) => [`${hit.a}:${hit.b}`, hit])), [hits]);

  if (!data) return <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Load a chart to view planetary aspects.</p>;

  const toggle = (key: AspectKey) => setEnabled((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  const togglePoint = (item: PointCatalogItem) => setSelectedKeys((current) => current.includes(item.key)
    ? current.filter((key) => key !== item.key)
    : current.length < 20 ? [...current, item.key] : current);

  const renderGlyph = (hit: AspectHit | undefined) => {
    if (!hit) return <span className="text-slate-300">·</span>;
    const aspect = ASPECT_SET.find((item) => item.key === hit.aspect);
    if (!aspect) return null;
    return <span title={`${aspect.name} · ${orbText(hit.orb)}${hit.applying === null ? "" : hit.applying ? " · applying" : " · separating"}`} className={familyColor(aspect.family)}>
      <span className="text-sm">{aspect.symbol}</span>
      <span className="block text-[10px] font-normal">{orbText(hit.orb)}</span>
      {hit.applying !== null && <span className="text-[9px]">{hit.applying ? "a" : "s"}</span>}
    </span>;
  };

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <section className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm" aria-labelledby="vedic-drishti-heading">
        <h3 id="vedic-drishti-heading" className="mb-3 text-sm font-semibold">Vedic Drishti</h3>
        <VedicDrishti planets={data.planets} ascendant={data.ascendant} mc={data.mc} language={language} />
      </section>
      <section className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-1" aria-labelledby="western-aspects-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 id="western-aspects-heading" className="text-sm font-semibold">Western Drishti &amp; Aspects</h3>
          <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
            <button type="button" onClick={() => setView("grid")} className={`rounded px-2 py-1 ${view === "grid" ? "bg-muted" : ""}`}>Grid</button>
            <button type="button" onClick={() => setView("list")} className={`rounded px-2 py-1 ${view === "list" ? "bg-muted" : ""}`}>List</button>
          </div>
        </div>
        <fieldset className="mb-3 flex flex-wrap gap-x-3 gap-y-2 text-xs" aria-label="Aspect legend">
          {ASPECT_SET.map((aspect) => (
            <label key={aspect.key} className={`inline-flex cursor-pointer items-center gap-1 ${enabled.has(aspect.key) ? familyColor(aspect.family) : "text-muted-foreground"}`} title={`${aspect.name} ${aspect.angle}°`}>
              <input type="checkbox" checked={enabled.has(aspect.key)} onChange={() => toggle(aspect.key)} className="size-3" />
              {aspect.symbol}
            </label>
          ))}
        </fieldset>
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs"><span className="font-medium">Add asteroids / points</span><span className="text-muted-foreground">{selectedKeys.length}/20</span></div>
          <div className="mb-2 flex gap-2 text-[11px]">
            <button type="button" onClick={() => setSelectedKeys(["chiron", "ceres", "pallas", "juno", "vesta", "lilith-mean"])} className="rounded border border-border px-2 py-1">Core 5 + Chiron</button>
            <button type="button" onClick={() => setSelectedKeys(POINT_CATALOG.filter((point) => point.group === "core").map((point) => point.key))} className="rounded border border-border px-2 py-1">All core</button>
            <button type="button" onClick={() => setSelectedKeys([])} className="rounded border border-border px-2 py-1">Clear</button>
          </div>
          <div className="max-h-36 overflow-y-auto rounded-md border border-border p-2">
            {POINT_CATALOG.map((item) => (
              <label key={item.key} className="flex cursor-pointer items-center gap-2 px-1 py-1 text-xs">
                <input type="checkbox" checked={selectedKeys.includes(item.key)} disabled={!selectedKeys.includes(item.key) && selectedKeys.length >= 20} onChange={() => togglePoint(item)} />
                <span title={item.group} className="text-muted-foreground">{item.glyph}</span>{item.name}
              </label>
            ))}
          </div>
        </div>
        <label className="mb-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={excludeFormulaPairs} onChange={(event) => setExcludeFormulaPairs(event.target.checked)} />Exclude formula-related pairs</label>

        {view === "grid" ? (
          <div className="max-w-full overflow-x-auto">
            {bodies.length > 23 && <p className="mb-2 text-xs text-muted-foreground">Tip: switch to List view</p>}
            <table className="border-separate border-spacing-0 text-center text-[10px]">
              <thead><tr><th className="sticky left-0 z-20 min-w-24 bg-card px-2 py-2 text-left">Body</th>{bodies.map((body) => <th key={body.id} className="size-10 min-w-10 px-1 py-2 font-medium" title={body.name}>{body.name === "ASC" || body.name === "MC" ? body.name : body.name === "True Node" ? "N" : planetName(body.name, language).slice(0, 2)}</th>)}</tr></thead>
              <tbody>{bodies.map((body, row) => (
                <tr key={body.id}>
                  <th className="sticky left-0 z-10 min-w-24 bg-card px-2 py-2 text-left">{body.name}</th>
                  {bodies.map((other, column) => {
                    if (column >= row) return <td key={other.id} className="size-10 min-w-10 border-l border-t border-border text-muted-foreground">·</td>;
                    const hit = hitMap.get(`${body.id}:${other.id}`) ?? hitMap.get(`${other.id}:${body.id}`);
                    return <td key={other.id} className="size-10 min-w-10 border-l border-t border-border px-1 py-1">{renderGlyph(hit)}</td>;
                  })}
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead><tr><th className="px-2 py-2">Body A</th><th>Aspect</th><th>Body B</th><th>Orb</th><th>Applying</th><th>Exactness</th></tr></thead>
              <tbody>{hits.map((hit) => {
                const a = bodies.find((body) => body.id === hit.a);
                const b = bodies.find((body) => body.id === hit.b);
                const aspect = ASPECT_SET.find((item) => item.key === hit.aspect);
                return <tr key={`${hit.a}-${hit.b}`} className="border-t"><td className="px-2 py-2">{a?.name}</td><td>{aspect?.symbol} {aspect?.name}</td><td>{b?.name}</td><td>{orbText(hit.orb)}</td><td>{hit.applying === null ? "exact-by-angle" : hit.applying ? "Applying" : "Separating"}</td><td>{Math.round(hit.exactness)}%</td></tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

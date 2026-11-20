"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, Download, Heart, MapPin, Share2, Sparkles, UserRound, X } from "lucide-react";

type BirthForm = {
  name: string;
  date: string;
  time: string;
  city: string;
  custom: boolean;
  latitude: string;
  longitude: string;
  timezone: string;
};

type MatchResult = {
  total: number;
  adjustedTotal: number;
  grade: string;
  verdict: string;
  recommendations: string[];
  kootas: Array<{ koota: string; boy: string; girl: string; points: number; max: number; meaning: string }>;
  doshas: {
    nadi: string; bhakoot: string; gana: string; manglik: string; rajju: string;
    vedha: string; mahendra: string; streeDeergha: string;
  };
  boy: { rashi: string; nakshatraName: string; pada: number; lagnaSign: string; manglik: { status: string } };
  girl: { rashi: string; nakshatraName: string; pada: number; lagnaSign: string; manglik: { status: string } };
  dashakoota: { items: Array<{ name: string; ok: boolean }>; matched: number };
  papaSamya: { boy: number; girl: number; balanced: boolean };
  lagnaLords: { boy: string; girl: string; points: number };
  navamsaLords: { boy: string; girl: string; points: number };
  boyChart?: { sidereal: Record<string, number> };
  girlChart?: { sidereal: Record<string, number> };
};

type EngineCity = { name: string; lat: number; lon: number; tz: number };

const fallbackCities: EngineCity[] = [
  { name: "Mumbai", lat: 19.076, lon: 72.8777, tz: 5.5 },
  { name: "Delhi", lat: 28.6139, lon: 77.209, tz: 5.5 },
  { name: "Kolkata", lat: 22.5726, lon: 88.3639, tz: 5.5 },
  { name: "Chennai", lat: 13.0827, lon: 80.2707, tz: 5.5 },
  { name: "Bengaluru", lat: 12.9716, lon: 77.5946, tz: 5.5 },
  { name: "Kathmandu", lat: 27.7172, lon: 85.324, tz: 5.75 },
];

const initialBoy: BirthForm = {
  name: "Rahul", date: "1990-05-15", time: "08:30:00", city: "Mumbai",
  custom: false, latitude: "", longitude: "", timezone: "",
};
const initialGirl: BirthForm = {
  name: "Priya", date: "1993-11-02", time: "19:45:00", city: "Delhi",
  custom: false, latitude: "", longitude: "", timezone: "",
};

function formatUtcOffset(hours: number) {
  const sign = hours >= 0 ? "+" : "-";
  const absolute = Math.abs(hours);
  const whole = Math.floor(absolute);
  const minutes = Math.round((absolute - whole) * 60);
  return `UTC${sign}${String(whole).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function LazyPanel({ children, height = 220 }: { children: React.ReactNode; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{visible ? children : <div className="animate-pulse rounded-xl border border-border bg-muted/40" style={{ height }} />}</div>;
}

function PersonCard({
  role,
  person,
  cities,
  onChange,
  onPrefetch,
}: {
  role: "boy" | "girl";
  person: BirthForm;
  cities: EngineCity[];
  onChange: (next: BirthForm) => void;
  onPrefetch: () => void;
}) {
  const boy = role === "boy";
  const selected = cities.find((city) => city.name === person.city);
  const tz = person.custom ? Number(person.timezone) : selected?.tz;
  const lat = person.custom ? Number(person.latitude) : selected?.lat;
  const lon = person.custom ? Number(person.longitude) : selected?.lon;
  const placeLabel = person.custom ? "Custom location" : person.city;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className={`rounded-2xl border p-4 sm:p-5 ${boy ? "border-sky-200 bg-[#E0ECFF]/75 dark:border-sky-900/70 dark:bg-sky-950/20" : "border-pink-200 bg-[#FFE4F1]/75 dark:border-pink-900/70 dark:bg-pink-950/20"}`}>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-card text-foreground shadow-sm ring-1 ring-border">
          {boy ? <UserRound className="size-5" /> : <Heart className="size-5" />}
        </span>
        <div>
          <p className="text-sm font-semibold">{boy ? "Boy — Var (Groom)" : "Girl — Vadhu (Bride)"}</p>
          <p className="font-serif text-base">{boy ? "वर" : "वधू"}</p>
        </div>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-1.5 text-xs font-medium text-foreground">
          Name
          <input
            value={person.name}
            onChange={(event) => onChange({ ...person, name: event.target.value })}
            className="h-11 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-medium text-foreground">
            Date of birth
            <span className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
              <input
                type="date"
                max={today}
                value={person.date}
                onFocus={onPrefetch}
                onChange={(event) => onChange({ ...person, date: event.target.value })}
                className="h-11 rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </span>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-foreground">
            Time of birth
            <input
              type="time"
              step={1}
              value={person.time}
              onChange={(event) => onChange({ ...person, time: event.target.value })}
              className="h-11 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>
        <label className="grid gap-1.5 text-xs font-medium text-foreground">
          Place of birth
          <span className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <select
              value={person.custom ? "__custom__" : person.city}
              onChange={(event) => onChange({
                ...person,
                custom: event.target.value === "__custom__",
                city: event.target.value === "__custom__" ? person.city : event.target.value,
              })}
              className="h-11 w-full appearance-none rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {cities.map((city) => <option key={city.name} value={city.name}>{city.name}</option>)}
              <option value="__custom__">Custom lat/lon/tz</option>
            </select>
          </span>
        </label>
        {person.custom && (
          <div className="grid grid-cols-3 gap-2">
            <label className="grid gap-1 text-[11px] font-medium">Latitude
              <input type="number" value={person.latitude} onChange={(event) => onChange({ ...person, latitude: event.target.value })} className="h-10 min-w-0 rounded-lg border border-border bg-card px-2 text-sm" />
            </label>
            <label className="grid gap-1 text-[11px] font-medium">Longitude
              <input type="number" value={person.longitude} onChange={(event) => onChange({ ...person, longitude: event.target.value })} className="h-10 min-w-0 rounded-lg border border-border bg-card px-2 text-sm" />
            </label>
            <label className="grid gap-1 text-[11px] font-medium">UTC offset
              <input type="number" step="0.25" value={person.timezone} onChange={(event) => onChange({ ...person, timezone: event.target.value })} className="h-10 min-w-0 rounded-lg border border-border bg-card px-2 text-sm" />
            </label>
          </div>
        )}
        <p className="text-[11px] leading-5 text-muted-foreground">
          Calculated with Lahiri ayanamsa · {placeLabel}
          {Number.isFinite(tz) && lat !== undefined && lon !== undefined ? ` · ${formatUtcOffset(tz ?? 0)}` : ""}
        </p>
      </div>
    </section>
  );
}

function verdictTone(verdict: string) {
  if (verdict.includes("NOT RECOMMENDED")) return "border-red-200 bg-red-50 text-red-950 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-100";
  if (verdict.includes("CAUTION")) return "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100";
  return "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100";
}

export default function MatchTab() {
  const [boy, setBoy] = useState(initialBoy);
  const [girl, setGirl] = useState(initialGirl);
  const [cities, setCities] = useState<EngineCity[]>(fallbackCities);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const enginePromise = useRef<Promise<typeof import("@/lib/matchmaking")> | null>(null);

  const prefetchEngine = () => {
    if (!enginePromise.current) enginePromise.current = import("@/lib/matchmaking");
  };

  useEffect(() => {
    prefetchEngine();
    enginePromise.current?.then((engine) => setCities(engine.CITIES));
  }, []);

  useEffect(() => {
    if (result) setResult(null);
    // Inputs intentionally invalidate the previous result until Match Kundli is pressed.
  }, [boy, girl]);

  const resolveBirth = (person: BirthForm) => {
    const city = cities.find((item) => item.name === person.city);
    if (person.custom) {
      const latitude = Number(person.latitude);
      const longitude = Number(person.longitude);
      const tzHours = Number(person.timezone);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(tzHours)) throw new Error(`Enter latitude, longitude and UTC offset for ${person.name || "the person"}.`);
      return { latitude, longitude, tzHours };
    }
    if (!city) throw new Error(`Choose a place of birth for ${person.name || "the person"}.`);
    return { latitude: city.lat, longitude: city.lon, tzHours: city.tz };
  };

  const calculate = async () => {
    setError("");
    if (!boy.name.trim() || !girl.name.trim()) {
      setError("Enter both names.");
      return;
    }
    if (!boy.date || !girl.date || !boy.time || !girl.time) {
      setError("Enter both complete dates and times of birth.");
      return;
    }
    const today = new Date();
    const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (boy.date > todayText || girl.date > todayText) {
      setError("Date of birth cannot be in the future.");
      return;
    }
    setLoading(true);
    try {
      prefetchEngine();
      const engine = await enginePromise.current!;
      setCities(engine.CITIES);
      const b = resolveBirth(boy);
      const g = resolveBirth(girl);
      const computed = engine.matchFromBirth(
        { name: boy.name, date: boy.date, time: boy.time, ...b },
        { name: girl.name, date: girl.date, time: girl.time, ...g },
        { vashyaByDegree: true },
      ) as MatchResult;
      setResult(computed);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to calculate kundli compatibility.");
    } finally {
      setLoading(false);
    }
  };

  const share = async () => {
    if (!result) return;
    const text = `${boy.name} × ${girl.name}: ${result.total} / 36 — ${result.verdict}`;
    if (navigator.share) await navigator.share({ title: "Kundli Milan", text });
    else await navigator.clipboard.writeText(text);
  };

  const doshaRows = result ? [
    ["Nadi", result.doshas.nadi],
    ["Bhakoot", result.doshas.bhakoot],
    ["Gana", result.doshas.gana],
  ] : [];

  return (
    <div className="mx-auto max-w-[1180px] pb-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="font-serif text-2xl font-semibold text-foreground sm:text-[32px]">Kundli Milan</p>
          <p className="mt-1 text-sm text-muted-foreground">Compare two charts across Ashtakoota, doshas and South Indian poruthams.</p>
        </div>
        {result && (
          <div className="hidden gap-2 sm:flex">
            <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium shadow-sm hover:bg-muted">
              <Download className="size-4" /> Download PDF
            </button>
            <button type="button" onClick={share} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium shadow-sm hover:bg-muted">
              <Share2 className="size-4" /> Share
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PersonCard role="boy" person={boy} cities={cities} onChange={setBoy} onPrefetch={prefetchEngine} />
        <PersonCard role="girl" person={girl} cities={cities} onChange={setGirl} onPrefetch={prefetchEngine} />
      </div>

      {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200" role="alert">{error}</p>}

      <button
        type="button"
        onClick={calculate}
        disabled={loading}
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.7)] transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? <><span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" /> Calculating…</> : <><Sparkles className="size-4" /> Match Kundli</>}
      </button>

      {result && (
        <div className="mt-6 space-y-5">
          <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Guna Milan</p>
              <div className="mt-4 flex items-end gap-2">
                <span className="font-serif text-6xl leading-none">{result.total}</span>
                <span className="pb-1 text-lg text-muted-foreground">/ 36</span>
              </div>
              <p className="mt-3 text-sm font-semibold">{result.grade}</p>
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">After dosha cancellation</p>
                <p className="mt-1 font-serif text-2xl">{result.adjustedTotal} / 36</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="grid grid-cols-[1.2fr_1fr_1fr_0.7fr_0.7fr] gap-2 border-b border-border px-4 py-3 text-xs font-semibold text-muted-foreground max-sm:text-[10px]">
                <span>Koota</span><span>Boy</span><span>Girl</span><span>Pts</span><span>Max</span>
              </div>
              {result.kootas.map((koota) => (
                <div key={koota.koota} title={koota.meaning} className="grid grid-cols-[1.2fr_1fr_1fr_0.7fr_0.7fr] gap-2 border-b border-border/70 px-4 py-3 text-xs last:border-0 sm:text-sm">
                  <span className="font-medium">{koota.koota}</span>
                  <span className="truncate text-muted-foreground">{koota.boy}</span>
                  <span className="truncate text-muted-foreground">{koota.girl}</span>
                  <span className={koota.points < koota.max / 2 ? "font-semibold text-red-600 dark:text-red-400" : "font-semibold"}>{koota.points}</span>
                  <span className="text-muted-foreground">{koota.max}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-4 text-sm font-semibold">Dosha &amp; compatibility checks</p>
              <div className="grid gap-2">
                {doshaRows.map(([label, status]) => (
                  <div key={label} className="flex items-center justify-between gap-3 border-b border-border/70 py-2 text-sm last:border-0">
                    <span>{label}</span><span className={status === "Present" || status === "Dosha" ? "rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300" : "rounded-full bg-muted px-2 py-1 text-xs font-medium"}>{status}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 py-2 text-sm"><span>Boy Manglik</span><span className="text-right text-xs">{result.boy.manglik.status}</span></div>
                <div className="flex items-center justify-between gap-3 py-2 text-sm"><span>Girl Manglik</span><span className="text-right text-xs">{result.girl.manglik.status}</span></div>
                <div className="flex items-center justify-between gap-3 py-2 text-sm"><span>Manglik match</span><span className="text-right text-xs font-medium">{result.doshas.manglik}</span></div>
                <div className="flex items-center justify-between gap-3 py-2 text-sm"><span>Rajju</span><span className="text-xs">{result.doshas.rajju}</span></div>
                <div className="flex items-center justify-between gap-3 py-2 text-sm"><span>Vedha</span><span className="text-xs">{result.doshas.vedha}</span></div>
                <div className="flex items-center justify-between gap-3 py-2 text-sm"><span>Mahendra</span><span className="text-xs">{result.doshas.mahendra}</span></div>
                <div className="flex items-center justify-between gap-3 py-2 text-sm"><span>Stree Deergha</span><span className="text-xs">{result.doshas.streeDeergha}</span></div>
              </div>
            </div>

            <LazyPanel>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold">Dashakoota · 10 Porutham</p><p className="font-serif text-xl">{result.dashakoota.matched} / 10</p></div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {result.dashakoota.items.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-2 border-b border-border/60 py-2 text-sm">
                      <span>{item.name}</span>{item.ok ? <Check className="size-4 text-emerald-600" /> : <X className="size-4 text-red-500" />}
                    </div>
                  ))}
                </div>
              </div>
            </LazyPanel>
          </section>

          <LazyPanel height={360}>
            <section className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-4 text-sm font-semibold">Advanced analysis</p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Papa Samya</p><p className="mt-2 text-sm font-semibold">Boy {result.papaSamya.boy} · Girl {result.papaSamya.girl}</p><p className="mt-1 text-xs text-muted-foreground">{result.papaSamya.balanced ? "Balanced" : "Needs review"}</p></div>
                <div className="rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Lagna lords</p><p className="mt-2 text-sm font-semibold">{result.lagnaLords.boy} × {result.lagnaLords.girl}</p><p className="mt-1 text-xs text-muted-foreground">{result.lagnaLords.points} / 5</p></div>
                <div className="rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Navamsa Moon lords</p><p className="mt-2 text-sm font-semibold">{result.navamsaLords.boy} × {result.navamsaLords.girl}</p><p className="mt-1 text-xs text-muted-foreground">{result.navamsaLords.points} / 5</p></div>
              </div>

              {result.boyChart?.sidereal && result.girlChart?.sidereal && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {(["boy", "girl"] as const).map((role) => {
                    const chart = role === "boy" ? result.boyChart!.sidereal : result.girlChart!.sidereal;
                    const person = role === "boy" ? result.boy : result.girl;
                    return (
                      <div key={role} className="rounded-xl border border-border p-4">
                        <div className="flex items-center justify-between"><p className="text-sm font-semibold">{role === "boy" ? boy.name : girl.name}</p><p className="text-xs text-muted-foreground">{person.rashi} · Lagna {person.lagnaSign}</p></div>
                        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          {Object.entries(chart).filter(([planet]) => ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu","Ascendant"].includes(planet)).map(([planet, longitude]) => (
                            <div key={planet} className="flex justify-between border-b border-border/50 py-1.5"><span className="text-muted-foreground">{planet}</span><span className="font-medium tabular-nums">{(longitude % 360).toFixed(2)}°</span></div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </LazyPanel>

          <section className={`rounded-2xl border p-5 ${verdictTone(result.verdict)}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">Final recommendation</p>
                <p className="mt-2 font-serif text-2xl font-semibold">{result.verdict}</p>
              </div>
              {result.verdict.includes("NOT RECOMMENDED") && <Heart className="size-7 opacity-50" />}
            </div>
            <ul className="mt-4 grid gap-2 text-sm md:grid-cols-2">
              {result.recommendations.map((recommendation) => <li key={recommendation} className="flex gap-2"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-current opacity-60" />{recommendation}</li>)}
            </ul>
          </section>

          <p className="text-center text-xs text-muted-foreground">Guidance only — consult a qualified astrologer before deciding.</p>
          <div className="flex gap-2 sm:hidden">
            <button type="button" onClick={() => window.print()} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium"><Download className="size-4" /> PDF</button>
            <button type="button" onClick={share} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium"><Share2 className="size-4" /> Share</button>
          </div>
        </div>
      )}
    </div>
  );
}

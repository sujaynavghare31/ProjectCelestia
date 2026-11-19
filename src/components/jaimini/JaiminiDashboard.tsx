"use client";

import { useEffect, useMemo, useState } from "react";
import type { EphemerisResponse, PlanetPosition } from "@/lib/kundali-types";
import type { BirthProfile } from "@/lib/kundali-store";
import { SIGN_NAMES, SIGN_SHORT, PLANET_NAMES, PLANET_SHORT } from "@/src/lib/jaimini/constants";
import { computeJaiminiDashboard, findCurrentAD } from "@/src/lib/jaimini";
import type { DashaResult } from "@/src/lib/jaimini/dashas";

type Props = {
  profile: BirthProfile;
  data: EphemerisResponse | null;
  asOfDate?: string;
};

const DASHA_LABELS: Record<string, string> = {
  charaKnRao: "Chara · K.N. Rao",
  charaParashara: "Chara · Parashara",
  sthira: "Sthira",
  shoola: "Shoola",
  navamsa: "Navamsa",
  brahma: "Brahma",
  mandooka: "Mandooka",
  trikona: "Trikona",
  drig: "Drig",
};

function parseLocalMs(date: string, time: string, timezone: string): number {
  const candidate = new Date(`${date}T${time.length === 5 ? `${time}:00` : time}Z`);
  const probe = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23",
  }).formatToParts(candidate).map(({type,value}) => [type,value]);
  const parts = Object.fromEntries(probe);
  const asUtc = Date.UTC(+parts.year, +parts.month-1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offset = asUtc - candidate.getTime();
  return candidate.getTime() - offset;
}

function localMinutesFromIso(iso: string, timezone: string): number {
  if (!iso) return 0;
  const date = new Date(iso);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23",
  }).formatToParts(date).map(({type,value}) => [type,value]));
  return +parts.hour * 60 + +parts.minute + (+parts.second || 0) / 60;
}

function formatDate(ms: number, timezone: string) {
  if (!Number.isFinite(ms)) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, day:"2-digit", month:"short", year:"numeric",
  }).format(new Date(ms));
}

function signDms(longitude: number) {
  const s = ((Math.floor(longitude / 30) % 12) + 12) % 12;
  const within = longitude - s * 30;
  const deg = Math.floor(within);
  const minFloat = (within - deg) * 60;
  const min = Math.floor(minFloat);
  return `${SIGN_NAMES[s]} ${deg}°${min}′`;
}

function SouthChart({ lagna, planets, result }: { lagna: number; planets: PlanetPosition[]; result: ReturnType<typeof computeJaiminiDashboard> }) {
  const positions = [11,0,1,2,10,-1,3,9,-1,4,8,7,6,5];
  const signBoxes = [11,12,1,2,10,-1,3,9,-1,4,7,6,5,8];
  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-sm" aria-label="South Indian rasi chart">
      <div className="mx-auto grid aspect-square w-full max-w-[620px] grid-cols-4 grid-rows-4 overflow-hidden border border-border bg-background">
        {[
          11,0,1,2,
          10,-1,-1,3,
          9,-1,-1,4,
          8,7,6,5,
        ].map((s, i) => s < 0 ? (
          i === 5 ? <div key={i} className="col-span-2 row-span-2 flex items-center justify-center bg-[#FFE8CC] px-4 text-center text-xs font-semibold text-slate-800">Lagna {SIGN_NAMES[lagna]} · AK {PLANET_NAMES[result.karakas[0]?.planet ?? 0]} · KK {SIGN_NAMES[result.kk]}</div> : null
        ) : (
          <div key={i} className="min-h-0 border-r border-b border-border p-2 text-[10px] leading-tight">
            <p className="font-semibold text-muted-foreground">{SIGN_SHORT[s]} <span className="ml-1">{SIGN_NAMES[s]}</span></p>
            <div className="mt-1 flex flex-wrap gap-x-1 gap-y-0.5">
              {planets.filter((p) => p.sign === s).map((p) => (
                <span key={p.name} className="font-semibold text-[#166534]">{PLANET_SHORT[PLANET_NAMES.indexOf(p.name as typeof PLANET_NAMES[number])]}</span>
              ))}
              {lagna === s && <span className="text-[#C2410C]">Asc</span>}
              {result.arudhas[0] === s && <span className="text-[#C2410C]">AL</span>}
              {result.arudhas[11] === s && <span className="text-[#C2410C]">UL</span>}
              {result.kk === s && <span className="text-[#C2410C]">KK</span>}
              {result.brahmaSign === s && <span className="text-[#C2410C]">Br</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function JaiminiDashboard({ profile, data, asOfDate }: Props) {
  const [scheme, setScheme] = useState<7 | 8>(7);
  const [asOf, setAsOf] = useState(asOfDate ?? new Date().toISOString().slice(0,10));
  const [dashaKey, setDashaKey] = useState("charaKnRao");
  const [presentOnly, setPresentOnly] = useState(false);
  const [panchang, setPanchang] = useState<{ sunrise?: string; sunset?: string } | null>(null);

  useEffect(() => {
    if (!profile.date) return;
    let active = true;
    fetch(`/api/panchang?date=${encodeURIComponent(profile.date)}&lat=${profile.lat}&lng=${profile.lng}`)
      .then((r) => r.json())
      .then((value: { solarEvents?: { sunrise?: string; sunset?: string } }) => {
        if (active) setPanchang(value.solarEvents ?? null);
      })
      .catch(() => { if (active) setPanchang(null); });
    return () => { active = false; };
  }, [profile.date, profile.lat, profile.lng]);

  const result = useMemo(() => {
    if (!data) return null;
    const planetNames = PLANET_NAMES;
    const planets = planetNames.map((name) => data.planets.find((p) => p.name === name)?.longitude ?? 0) as number[];
    if (data.planets.some((p) => p.name === "Rahu") && !data.planets.some((p) => p.name === "Ketu")) {
      planets[8] = ((planets[7] + 180) % 360);
    } else if (data.planets.find((p) => p.name === "Ketu")) {
      planets[8] = data.planets.find((p) => p.name === "Ketu")!.longitude;
    }
    const birthMs = parseLocalMs(profile.date, profile.time, profile.timezone);
    const asOfMs = parseLocalMs(asOf, "12:00:00", profile.timezone);
    const sunriseMs = panchang?.sunrise ? Date.parse(panchang.sunrise) : birthMs - 4 * 3600_000;
    const sunsetMs = panchang?.sunset ? Date.parse(panchang.sunset) : birthMs + 8 * 3600_000;
    const [birthHour = 0, birthMinute = 0] = profile.time.split(":").map(Number);
    const birthMinutes = birthHour * 60 + birthMinute;
    return computeJaiminiDashboard({
      lagnaLongitude: data.ascendant.longitude,
      moonLongitude: planets[1],
      sunLongitude: planets[0],
      birthMinutes: Number.isFinite(birthMinutes) ? birthMinutes : 0,
      planets,
      scheme,
      birthMs,
      asOfMs,
      sunriseMinutes: localMinutesFromIso(panchang?.sunrise ?? new Date(sunriseMs).toISOString(), profile.timezone),
      sunsetMinutes: localMinutesFromIso(panchang?.sunset ?? new Date(sunsetMs).toISOString(), profile.timezone),
      weekday: new Date(sunriseMs).getUTCDay(),
      ascendantAt: (ms) => data.ascendant.longitude,
    });
  }, [data, profile, scheme, asOf, panchang]);

  if (!data || !result) return (
    <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">Load a birth chart to view Jaimini analysis.</div>
  );

  const asOfTimezone = profile.timezone;
  const pointRows = [
    ["Lagna", result.lagna], ["Arudha Lagna", result.arudhas[0]], ["Darapada", result.arudhas[6]],
    ["Upapada", result.arudhas[11]], ["Karakamsha", result.kk], ["Indu Lagna", result.specialLagnas.il],
    ["Hora Lagna", result.specialLagnas.hl], ["Ghati Lagna", result.specialLagnas.gl],
    ["Bhava Lagna", result.specialLagnas.bl], ["Varnada Lagna", result.specialLagnas.vl],
    ["Sree Lagna", result.specialLagnas.sl], ["Pranapada", result.specialLagnas.pp],
  ];
  const dasha = result.dashas[dashaKey];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div><p className="text-sm font-semibold">{profile.name || "Native"} · Jaimini</p><p className="mt-1 text-xs text-muted-foreground">{profile.date} {profile.time} · {profile.city} · {profile.lat.toFixed(3)}, {profile.lng.toFixed(3)}</p></div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted-foreground">As-of date<select aria-label="As of date" value={asOf} onChange={(e)=>setAsOf(e.target.value)} className="sr-only" /></label>
          <input aria-label="As of date" type="date" value={asOf} onChange={(e)=>setAsOf(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-xs" />
          <fieldset className="flex h-9 items-center rounded-lg border border-border p-1 text-xs"><legend className="sr-only">Karaka scheme</legend><button type="button" onClick={()=>setScheme(7)} className={scheme===7?"rounded-md bg-primary px-2 py-1 text-primary-foreground":"rounded-md px-2 py-1"}>7 karaka</button><button type="button" onClick={()=>setScheme(8)} className={scheme===8?"rounded-md bg-primary px-2 py-1 text-primary-foreground":"rounded-md px-2 py-1"}>8 karaka</button></fieldset>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(360px,0.8fr)_1.2fr]">
        <SouthChart lagna={result.lagna} planets={data.planets} result={result} />
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Chara karakas</h2>
            <dl className="mt-3 divide-y divide-border">{result.karakas.map((k)=><div key={k.name} className="flex justify-between py-2 text-xs"><dt className="text-muted-foreground">{k.name}</dt><dd className="font-semibold">{PLANET_NAMES[k.planet]}</dd></div>)}</dl>
          </section>
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Key points</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">{pointRows.map(([label,sign])=><div key={String(label)} className="flex items-center justify-between gap-2"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold text-[#C2410C]">{typeof sign==="number"?SIGN_NAMES[sign]:sign}</dd></div>)}</dl>
          </section>
          <section className="rounded-xl border border-border bg-card p-4 md:col-span-2">
            <h2 className="text-sm font-semibold">Current dashas</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">{Object.entries(result.dashas).map(([key,d])=>{
              const md=d.periods.find((p)=>p.isCurrent);
              const ad=d.antardashas&&md?findCurrentAD(d,d.periods.indexOf(md),parseLocalMs(asOf,"12:00:00",profile.timezone)):undefined;
              return <button key={key} type="button" onClick={()=>setDashaKey(key)} className="rounded-lg border border-primary/20 bg-accent/40 px-3 py-2 text-left text-xs"><span className="block text-muted-foreground">{DASHA_LABELS[key]}</span><strong>{md?SIGN_NAMES[md.sign]:"—"}{ad?` · ${SIGN_NAMES[ad.sign]}`:""}</strong><span className="mt-1 block text-[11px] text-muted-foreground">{md?`MD ends ${formatDate(md.end,asOfTimezone)}`:"No active period"}</span></button>;
            })}</div>
          </section>
        </div>
      </div>

      <nav className="no-scrollbar flex w-full snap-x snap-mandatory gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1" aria-label="Jaimini analysis sections">
        {[
          ["dashas","Dashas"],["arudha","Arudha"],["karakamsha","Karakamsha"],["lagnas","Special Lagnas"],["upagrahas","Upagrahas"],["yogas","Yogas"],["argala","Argala"],["strength","Strength"],["aspects","Aspects"],["karakas","Karakas"],["dispositors","Dispositors"],["sutras","Sutras"],
        ].map(([id,label])=>{ const active=dashaKey===`section-${id}`; return <a key={id} href={`#jaimini-${id}`} onClick={()=>setDashaKey(`section-${id}`)} className={`shrink-0 snap-start rounded-lg px-3 py-2 text-xs font-medium ${active?"bg-accent text-accent-foreground":"text-muted-foreground hover:bg-muted"}`}>{label}</a>; })}
      </nav>

      <section id="jaimini-dashas" className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold">Dasha periods</h2><select aria-label="Dasha system" value={dashaKey} onChange={(e)=>setDashaKey(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-xs">{Object.entries(DASHA_LABELS).map(([key,label])=> <option key={key} value={key}>{label}</option>)}</select></div>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Sign</th><th className="px-3 py-2">Years</th><th className="px-3 py-2">Start</th><th className="px-3 py-2">End</th></tr></thead><tbody className="divide-y divide-border">{dasha?.periods.map((p,i)=><tr key={`${p.sign}-${i}`} className={p.isCurrent?"bg-accent/50":""}><th className="px-3 py-2">{SIGN_NAMES[p.sign]}</th><td className="px-3 py-2 font-mono">{p.years.toFixed(p.years%1?2:0)}</td><td className="px-3 py-2">{formatDate(p.start,asOfTimezone)}</td><td className="px-3 py-2">{formatDate(p.end,asOfTimezone)}</td></tr>)}</tbody></table></div>
        {dasha?.antardashas && <div className="mt-4"><h3 className="text-xs font-semibold">Antardashas · current Mahadasha</h3><div className="mt-2 flex gap-2 overflow-x-auto pb-2">{dasha.periods.map((md,i)=>md.isCurrent?dasha.antardashas?.[Object.keys(dasha.antardashas).find((k)=>k.endsWith(`-${i}`))??""]?.map((ad,j)=><span key={j} className={`shrink-0 rounded-lg border px-3 py-2 text-xs ${ad.isCurrent?"border-primary bg-primary text-primary-foreground":"border-border"}`}>{SIGN_NAMES[ad.sign]}<small className="block opacity-70">{formatDate(ad.start,asOfTimezone)}</small></span>):null)}</div></div>}
      </section>

      <section id="jaimini-yogas" className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Jaimini yogas · {result.yogas.filter((y)=>y.present).length} present</h2><label className="text-xs text-muted-foreground"><input type="checkbox" checked={presentOnly} onChange={(e)=>setPresentOnly(e.target.checked)} className="mr-2" />Present only</label></div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">{result.yogas.filter((y)=>!presentOnly||y.present).map((y)=><div key={y.id} className={`rounded-lg border px-3 py-2 ${y.present?"border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20":"border-border"}`}><p className="text-xs font-semibold">{y.present?"✓ ":""}{y.name}</p><p className="mt-1 text-[11px] text-muted-foreground">{y.category} · {y.meaning}</p></div>)}</div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section id="jaimini-arudha" className="rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Arudha padas</h2><dl className="mt-3 grid grid-cols-2 gap-2 text-xs">{result.arudhas.map((s,i)=><div key={i} className="flex justify-between rounded-lg bg-muted/40 px-3 py-2"><dt className="text-muted-foreground">A{i+1}</dt><dd className="font-semibold">{SIGN_NAMES[s]}</dd></div>)}</dl></section>
        <section id="jaimini-karakamsha" className="rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Karakamsha</h2><p className="mt-2 text-xs text-muted-foreground">KK: <strong className="text-foreground">{SIGN_NAMES[result.kk]}</strong></p><div className="mt-3 grid gap-2 text-xs"><p>Ishta: <strong>{result.ishta.name}</strong> · {result.ishta.deity}</p><p>Dharma: <strong>{result.dharma.name}</strong> · {result.dharma.deity}</p></div></section>
        <section id="jaimini-lagnas" className="rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Special lagnas</h2><dl className="mt-3 grid grid-cols-2 gap-2 text-xs">{[["BL",result.specialLagnas.bl],["HL",result.specialLagnas.hl],["GL",result.specialLagnas.gl],["VgL",result.specialLagnas.vgL],["SL",result.specialLagnas.sl],["PP",result.specialLagnas.pp],["VL",result.specialLagnas.vl],["IL",result.specialLagnas.il]].map(([l,v])=><div key={String(l)} className="flex justify-between rounded-lg bg-muted/40 px-3 py-2"><dt>{l}</dt><dd className="font-mono">{typeof v==="number"?signDms(v):v}</dd></div>)}</dl></section>
        <section id="jaimini-upagrahas" className="rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Upagrahas</h2><dl className="mt-3 grid gap-2 text-xs">{Object.entries(result.sunUpagrahas).map(([name,v])=><div key={name} className="flex justify-between"><dt className="capitalize text-muted-foreground">{name}</dt><dd className="font-mono">{signDms(v)}</dd></div>)}</dl><div className="mt-4 border-t border-border pt-3">{result.timeUpagrahas.map((u)=><p key={u.name} className="flex justify-between py-1 text-xs"><span>{u.name}</span><strong>{signDms(u.longitude)}</strong></p>)}</div></section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section id="jaimini-strength" className="overflow-x-auto rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Rashi strength</h2><table className="mt-3 w-full min-w-[620px] text-left text-xs"><thead className="text-[10px] uppercase text-muted-foreground"><tr><th className="py-2">Sign</th><th>Planets</th><th>Lord</th><th>Nature</th><th>Score</th><th>Rank</th></tr></thead><tbody className="divide-y divide-border">{result.signStrengthTable.map((r)=><tr key={r.sign}><th className="py-2">{SIGN_NAMES[r.sign]}</th><td>{r.planets.map((p)=>PLANET_SHORT[p]).join(" ")||"—"}</td><td>{PLANET_SHORT[r.lord]}</td><td>{r.nature}</td><td className="font-mono">{r.score.toFixed(1)}</td><td>{r.rank}</td></tr>)}</tbody></table></section>
        <section id="jaimini-aspects" className="overflow-x-auto rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Jaimini sign aspects</h2><table className="mt-3 text-center text-[10px]"><tbody>{result.aspects.signMatrix.map((row,a)=><tr key={a}><th className="sticky left-0 bg-card px-1">{SIGN_SHORT[a]}</th>{row.map((cell,b)=><td key={b} className={`size-6 border border-border ${cell?"bg-accent text-accent-foreground":""}`}>{cell?"•":""}</td>)}</tr>)}</tbody></table></section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section id="jaimini-karakas" className="rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Karaka houses</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-[10px] uppercase text-muted-foreground"><tr><th className="py-2">Karaka</th><th>Planet</th><th>Sign</th><th>From Lagna</th></tr></thead><tbody className="divide-y divide-border">{result.karakas.map((k)=><tr key={k.name}><th className="py-2">{k.name}</th><td>{PLANET_NAMES[k.planet]}</td><td>{SIGN_NAMES[((data.planets.find((p)=>p.name===PLANET_NAMES[k.planet])?.sign)??0)]}</td><td>{k.planet<9?((data.planets.find((p)=>p.name===PLANET_NAMES[k.planet])?.sign??0)-result.lagna+12)%12+1:"—"}</td></tr>)}</tbody></table></div></section>
        <section id="jaimini-dispositors" className="rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Dispositors</h2><dl className="mt-3 grid grid-cols-2 gap-2 text-xs">{result.dispositors.map((d)=><div key={d.planet} className="flex justify-between rounded-lg bg-muted/40 px-3 py-2"><dt>{PLANET_NAMES[d.planet]}</dt><dd>{d.finalDispositor==="Cycle"? "Cycle":PLANET_NAMES[d.finalDispositor]}{d.mutualExchange?" · Exchange":""}</dd></div>)}</dl></section>
      </div>

      <section id="jaimini-sutras" className="rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Jaimini sutras</h2><ol className="mt-3 grid gap-2 text-xs md:grid-cols-2">{[
        "Atmakaraka’s navamsa sign is the Karakamsha.",
        "Movable signs aspect fixed signs except adjacent signs; fixed aspect movable except adjacent; dual signs aspect dual signs.",
        "Argala arises from the 2nd, 4th, 5th and 11th houses and is obstructed by the 12th, 10th, 9th and 3rd.",
        "Arudha shows the outer image of a house.",
        "The 12th from Upapada gives strength or weakness to marriage.",
        "AK with AmK, PK or the 5th lord indicates Raja yoga.",
        "Planets in the 2nd or 11th from AL indicate wealth.",
        "The 12th from Karakamsha points to Ishta devata.",
        "Lagna, Moon–Saturn, and Lagna–Hora Lagna combinations indicate lifespan.",
        "Shoola dashas of signs trinal to Rudra indicate danger periods.",
      ].map((s,i)=><li key={s} className="rounded-lg bg-muted/40 px-3 py-2"><span className="mr-2 text-muted-foreground">{i+1}.</span>{s}</li>)}</ol></section>
    </div>
  );
}

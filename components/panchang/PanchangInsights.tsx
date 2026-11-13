"use client";

import { memo } from "react";
import { formatInTimeZone } from "date-fns-tz";
import type { PanchangDay, PanchangQuality, PanchangSlot } from "@/lib/astrology/panchang/PanchangEngine";

const qualityStyles: Record<PanchangQuality, string> = {
  auspicious: "bg-emerald-50 text-emerald-900 dark:bg-emerald-900/25 dark:text-emerald-100",
  inauspicious: "bg-rose-50 text-rose-900 dark:bg-rose-900/25 dark:text-rose-100",
  neutral: "bg-slate-100 text-slate-800 dark:bg-slate-800/60 dark:text-slate-200",
};

function formatTime(value: string, timezone: string) {
  return formatInTimeZone(new Date(value), timezone, "h:mm a");
}

function QualityLabel({ quality }: { quality: PanchangQuality }) {
  const label = quality === "auspicious" ? "Favorable" : quality === "inauspicious" ? "Avoid" : "Neutral";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${qualityStyles[quality]}`}>{label}</span>;
}

function ChoghadiyaGroup({
  title,
  slots,
  timezone,
}: {
  title: string;
  slots: PanchangSlot[];
  timezone: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold text-foreground">{title}</h3>
      <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {slots.map((slot) => (
          <li key={`${title}-${slot.index}-${slot.start}`} className={`min-w-0 rounded-lg px-2.5 py-2 ${qualityStyles[slot.quality]}`}>
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-xs font-semibold">{slot.name}</span>
              <span className="shrink-0 text-[9px] opacity-75">{slot.index + 1}</span>
            </div>
            <p className="mt-1 truncate text-[10px] tabular-nums opacity-80" title={`${formatTime(slot.start, timezone)} – ${formatTime(slot.end, timezone)}`}>
              {formatTime(slot.start, timezone)} – {formatTime(slot.end, timezone)}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PanchangInsightsView({ data }: { data: PanchangDay }) {
  const nakshatraHeaders = data.tarabalam.grid[0]?.janmaNakshatras ?? [];
  const solarSpecs = [
    { label: "Sun sign", value: `${data.astronomy.sunSign} · ${data.astronomy.sunDegree.toFixed(2)}°` },
    { label: "Moon sign", value: `${data.astronomy.moonSign} · ${data.astronomy.moonDegree.toFixed(2)}°` },
    { label: "Moon pada", value: `${data.astronomy.moonNakshatraPada} · ${data.panchangAtSunrise.nakshatra}` },
    { label: "Ascendant", value: data.astronomy.ascendantSign && data.astronomy.ascendantDegree !== null
      ? `${data.astronomy.ascendantSign} · ${data.astronomy.ascendantDegree.toFixed(2)}°`
      : "Unavailable at this latitude" },
    { label: "Lahiri ayanamsa", value: `${data.astronomy.ayanamsaDegrees.toFixed(4)}°` },
    { label: "Ritu", value: data.lunarSolar.ritu },
    { label: "Ayana", value: data.lunarSolar.ayana },
    { label: "Vikram Samvat", value: String(data.lunarSolar.vikramSamvat) },
    { label: "Shaka Samvat", value: String(data.lunarSolar.shakaSamvat) },
    { label: "Chaitra new year", value: data.lunarSolar.chaitraNewYear },
    { label: "Anandadi Yoga", value: data.anandadiYoga.name },
  ];

  return (
    <div className="space-y-5">
      <section aria-label="Lunar and solar specifications" className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-[0_12px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 dark:shadow-[0_12px_42px_rgba(2,6,23,0.28)]">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/70 px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold">Lunar &amp; solar specifications</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">Sidereal positions and Chaitra-start year convention at local sunrise.</p>
          </div>
          <p className="text-[10px] text-muted-foreground">{data.lunarSolar.convention}</p>
        </div>
        <dl className="grid grid-cols-2 divide-x divide-y divide-border/70 sm:grid-cols-3 lg:grid-cols-4">
          {solarSpecs.map(({ label, value }) => (
            <div key={label} className="min-w-0 px-4 py-3">
              <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="mt-1 truncate text-sm font-semibold text-card-foreground" title={value}>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="border-t border-border/70 px-4 py-3 sm:px-5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Panchang at sunrise</p>
          <p className="mt-1 text-xs text-card-foreground">
            {data.panchangAtSunrise.weekday} · {data.panchangAtSunrise.tithi} · {data.panchangAtSunrise.nakshatra} · {data.panchangAtSunrise.yoga} · {data.panchangAtSunrise.karana}
          </p>
        </div>
      </section>

      <section aria-label="Choghadiya periods" className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_12px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 dark:shadow-[0_12px_42px_rgba(2,6,23,0.28)] sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Choghadiya</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">Eight proportional divisions each from sunrise to sunset and sunset to next sunrise.</p>
          </div>
          <QualityLabel quality={data.anandadiYoga.quality} />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <ChoghadiyaGroup title="Day" slots={data.choghadiya.day} timezone={data.timezone} />
          <ChoghadiyaGroup title="Night" slots={data.choghadiya.night} timezone={data.timezone} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <section aria-label="Tarabalam grid" className="min-w-0 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_12px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 dark:shadow-[0_12px_42px_rgba(2,6,23,0.28)] sm:p-5">
          <div className="mb-3">
            <h2 className="text-sm font-semibold">Tarabalam</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Nine Tara categories across all Janma Nakshatras · transit Moon: {data.tarabalam.transitNakshatra}
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full min-w-[980px] border-collapse text-center text-[10px]">
              <thead className="sticky top-0 bg-muted/90 text-muted-foreground backdrop-blur">
                <tr>
                  <th scope="col" className="sticky left-0 z-10 min-w-28 bg-muted/95 px-2 py-2 text-left font-semibold">Tara</th>
                  {nakshatraHeaders.map(({ name }) => (
                    <th key={name} scope="col" className="min-w-7 px-0.5 py-2 font-medium" title={name}>
                      {name.slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.tarabalam.grid.map((row) => (
                  <tr key={row.name} className="border-t border-border/70">
                    <th scope="row" className="sticky left-0 z-[1] bg-card/95 px-2 py-1.5 text-left font-medium text-card-foreground">
                      <span className="flex items-center justify-between gap-2"><span>{row.name}</span><QualityLabel quality={row.quality} /></span>
                    </th>
                    {row.janmaNakshatras.map(({ name, selected }) => (
                      <td key={`${row.name}-${name}`} className="px-0.5 py-1.5" title={`${name}: ${row.name}${selected ? " for today's transit" : ""}`}>
                        <span className={`mx-auto block size-3 rounded-full ${selected ? qualityStyles[row.quality] : "bg-slate-200/70 dark:bg-slate-800/70"}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-label="Chandrabalam grid" className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_12px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 dark:shadow-[0_12px_42px_rgba(2,6,23,0.28)] sm:p-5">
          <div className="mb-3">
            <h2 className="text-sm font-semibold">Chandrabalam</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">Moon in {data.chandrabalam.transitMoonSign} · relative to Janma Rashi.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[300px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-2 py-2">Janma Rashi</th>
                  <th scope="col" className="px-2 py-2 text-center">House</th>
                  <th scope="col" className="px-2 py-2 text-right">Balam</th>
                </tr>
              </thead>
              <tbody>
                {data.chandrabalam.rows.map((row) => (
                  <tr key={row.janmaMoonSign} className="border-t border-border/70">
                    <th scope="row" className="px-2 py-2 font-medium text-card-foreground">{row.janmaMoonSign}</th>
                    <td className="px-2 py-2 text-center tabular-nums text-muted-foreground">{row.relativeHouse}</td>
                    <td className="px-2 py-2 text-right"><QualityLabel quality={row.quality} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section aria-label="Panchaka Rahita and Lagna transitions" className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-[0_12px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 dark:shadow-[0_12px_42px_rgba(2,6,23,0.28)]">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/70 px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold">Panchaka Rahita &amp; Lagna transitions</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">Ascendant sign changes split at exact Swiss Ephemeris boundaries; Rahita intervals mark Moon outside Panchaka.</p>
          </div>
          <QualityLabel quality="auspicious" />
        </div>
        {data.lagnaTransitions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-left text-xs">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2">Lagna</th>
                  <th scope="col" className="px-4 py-2">From</th>
                  <th scope="col" className="px-4 py-2">To</th>
                  <th scope="col" className="px-4 py-2 text-right">Panchaka</th>
                </tr>
              </thead>
              <tbody>
                {data.lagnaTransitions.map((transition, index) => (
                  <tr key={`${transition.sign}-${transition.start}`} className="border-t border-border/70">
                    <th scope="row" className="px-4 py-2.5 font-medium text-card-foreground">{transition.sign}</th>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{formatTime(transition.start, data.timezone)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{formatTime(transition.end, data.timezone)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <QualityLabel quality={transition.panchakaRahita ? "auspicious" : "inauspicious"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p role="status" className="px-4 py-4 text-xs text-muted-foreground">Lagna transitions are unavailable for this latitude.</p>
        )}
      </section>
    </div>
  );
}

export const PanchangInsights = memo(PanchangInsightsView);

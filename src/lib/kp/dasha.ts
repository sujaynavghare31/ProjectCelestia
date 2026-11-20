// Vimshottari dasha from the Moon: Dasha / Bhukti / Antara / Sookshma
import { DASHA_ORDER, DASHA_YEARS, NAK_SPAN, norm360, type Graha } from "./constants";

export interface DashaPeriod { lords: Graha[]; start: Date; end: Date }
export interface DashaOptions { yearDays?: number }   // default 365.2425 (matches the KP software sample); 365.25 also used

export function dashaBalance(moonLongitude: number, opts: DashaOptions = {}) {
  const yd = opts.yearDays ?? 365.2425;
  const L = norm360(moonLongitude);
  const nak = Math.floor(L / NAK_SPAN);
  const lord = DASHA_ORDER[nak % 9];
  const elapsedFrac = (L - nak * NAK_SPAN) / NAK_SPAN;
  const balanceYears = (1 - elapsedFrac) * DASHA_YEARS[lord];
  // years / months / days the way KP softwares print it (month = 1/12 year, day = yearDays/365.25 scaled)
  const y = Math.floor(balanceYears);
  const mFrac = (balanceYears - y) * 12, m = Math.floor(mFrac + 1e-9);
  const d = Math.floor((mFrac - m) * (yd / 12) + 1e-9);
  return { lord, elapsedFraction: elapsedFrac, balanceYears, text: `${y} Years ${m} Months ${d} Days` };
}

const sub9 = (first: Graha) => { const i = DASHA_ORDER.indexOf(first); return Array.from({ length: 9 }, (_, k) => DASHA_ORDER[(i + k) % 9]); };

/**
 * Full Vimshottari tree. `levels` = 1 (dasha) … 4 (sookshma).
 * The first mahadasha starts BEFORE birth (birth − elapsed part), as KP softwares list it.
 */
export function vimshottari(moonLongitude: number, birthUtcMs: number, levels: 1 | 2 | 3 | 4 = 3, opts: DashaOptions = {}) {
  const yd = opts.yearDays ?? 365.2425, dayMs = 86400000;
  const bal = dashaBalance(moonLongitude, opts);
  let t = birthUtcMs - bal.elapsedFraction * DASHA_YEARS[bal.lord] * yd * dayMs;
  const out: DashaPeriod[] = [];
  const walk = (lords: Graha[], startMs: number, years: number) => {
    if (lords.length === levels) { out.push({ lords, start: new Date(startMs), end: new Date(startMs + years * yd * dayMs) }); return; }
    let s = startMs;
    for (const l of sub9(lords[lords.length - 1])) { const y = (years * DASHA_YEARS[l]) / 120; walk([...lords, l], s, y); s += y * yd * dayMs; }
  };
  for (const md of sub9(bal.lord)) { walk([md], t, DASHA_YEARS[md]); t += DASHA_YEARS[md] * yd * dayMs; }
  return { balance: bal, periods: out };
}
/** Periods running at `when` for every level 1..4. */
export function dashaAt(moonLongitude: number, birthUtcMs: number, when: Date, opts: DashaOptions = {}) {
  return ([1, 2, 3, 4] as const).map((lv) => vimshottari(moonLongitude, birthUtcMs, lv, opts).periods.find((p) => p.start <= when && when < p.end) ?? null);
}

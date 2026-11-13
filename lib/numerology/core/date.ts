// ---------------------------------------------------------------------------
// Timezone-safe calendar helpers. All dates are plain calendar dates (no time zone).
// ---------------------------------------------------------------------------
import type { ISODate } from "../types";

export interface YMD { y: number; m: number; d: number }

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function parseISO(s: ISODate): YMD {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) throw new Error(`Invalid date "${s}" – expected YYYY-MM-DD`);
  return { y: +m[1], m: +m[2], d: +m[3] };
}
const toUTC = (x: YMD) => Date.UTC(x.y, x.m - 1, x.d);
const fromUTC = (t: number): YMD => { const dt = new Date(t); return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }; };

export const addDays = (x: YMD, n: number): YMD => fromUTC(toUTC(x) + n * 86400000);
/** 0 = Sunday … 6 = Saturday */
export const weekdayIndex = (x: YMD) => new Date(toUTC(x)).getUTCDay();
export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export const toISO = (x: YMD): ISODate => `${x.y}-${String(x.m).padStart(2, "0")}-${String(x.d).padStart(2, "0")}`;
/** "11-Dec-2026" (Excel format dd-mmm-yyyy) */
export const fmtDMY = (x: YMD) => `${String(x.d).padStart(2, "0")}-${MONTHS[x.m - 1]}-${x.y}`;

/** "HH:MM" -> fraction of a day (Excel time serial) */
export function timeFraction(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) throw new Error(`Invalid time "${hhmm}" – expected HH:MM`);
  return (+m[1] * 60 + +m[2]) / 1440;
}

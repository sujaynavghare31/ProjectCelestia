import { calculateBcpYears } from "./bcp";
import { getTimingChart } from "./core";
import { calculateCharaDasha } from "./chara";
import { calculateYoginiDasha } from "./yogini";
import { calculateBnnTransitEvents } from "./bnn";
import type { TransitProvider } from "./bnn";
import type { NadiYearView, Period, TimingInput } from "./types";

function activePeriod(periods: Period[] | undefined, date: Date): Period | undefined {
  if (!periods) return undefined;
  return periods.find((period) => {
    const visibleStart = typeof period.details?.visibleStart === "string" ? new Date(period.details.visibleStart) : new Date(period.start);
    return visibleStart <= date && date < new Date(period.end);
  });
}

function runningDasha(periods: Period[], date: Date) {
  const md = activePeriod(periods, date);
  const ad = activePeriod(md?.children, date);
  return { md, ad };
}

export async function calculateNadiTimeline(
  input: TimingInput,
  transitProvider: TransitProvider,
  avasthaSummary?: Record<string, unknown>,
): Promise<NadiYearView[]> {
  const chart = getTimingChart(input);
  const enabled = new Set(chart.config.nadiModules);
  const bcp = calculateBcpYears(input);
  const chara = calculateCharaDasha(input);
  const yogini = calculateYoginiDasha(input, avasthaSummary);
  const transit = enabled.has("BNN_TRANSIT") || enabled.has("BHRIGU_BINDU")
    ? await calculateBnnTransitEvents(input, transitProvider)
    : { events: [], bhriguBinduHits: [] };
  const endDate = chart.to;
  const rows: NadiYearView[] = [];
  for (const year of bcp) {
    const start = new Date(year.start);
    const end = new Date(year.end);
    if (start >= endDate) break;
    if (end <= chart.from) continue;
    rows.push({
      ageYear: year.ageYear,
      start: year.start,
      end: year.end,
      ...(enabled.has("BCP") ? { bcp: year } : {}),
      transitEvents: enabled.has("BNN_TRANSIT") ? transit.events.filter(({ date }) => new Date(date) >= start && new Date(date) < end) : [],
      bhriguBinduHits: enabled.has("BHRIGU_BINDU") ? transit.bhriguBinduHits.filter(({ date }) => new Date(date) >= start && new Date(date) < end) : [],
      runningChara: runningDasha(chara, start),
      runningYogini: runningDasha(yogini, start),
    });
  }
  return rows;
}

export function getCurrentPeriods(periods: Period[], date = new Date()) {
  return runningDasha(periods, date);
}

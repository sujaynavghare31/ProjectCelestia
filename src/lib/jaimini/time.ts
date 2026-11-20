export function dateInTimezone(ms: number, timezone: string): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms)).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function parseLocalMs(date: string, time: string, timezone: string): number {
  const candidate = new Date(`${date}T${time.length === 5 ? `${time}:00` : time}Z`);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(candidate).map(({ type, value }) => [type, value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offset = asUtc - candidate.getTime();
  return candidate.getTime() - offset;
}

export function asOfTimestamp(date: string, timezone: string, now = Date.now()): number {
  return date === dateInTimezone(now, timezone)
    ? now
    : parseLocalMs(date, "12:00:00", timezone);
}

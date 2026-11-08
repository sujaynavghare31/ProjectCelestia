export function localDateTimeToUtc(date: string, time: string, timezone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second] = time.split(":").map(Number);
  const localDate = new Date(0);
  localDate.setUTCFullYear(year, month - 1, day);
  localDate.setUTCHours(hour, minute, second, 0);
  const localAsUtc = localDate.getTime();

  if (/^[+-]\d{2}:\d{2}$/.test(timezone)) {
    const sign = timezone[0] === "-" ? -1 : 1;
    const [offsetHours, offsetMinutes] = timezone.slice(1).split(":").map(Number);
    if (offsetHours > 14 || offsetMinutes > 59 || (offsetHours === 14 && offsetMinutes !== 0)) {
      throw new Error("Timezone offset is outside the supported range.");
    }
    return new Date(localAsUtc - sign * (offsetHours * 60 + offsetMinutes) * 60_000);
  }

  let offset = 0;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const localParts = formatter.formatToParts(new Date(localAsUtc - offset * 60_000));
      const parts = Object.fromEntries(localParts.map(({ type, value }) => [type, Number(value)]));
      const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
      offset = Math.round((asUtc - (localAsUtc - offset * 60_000)) / 60_000);
    }
  } catch {
    throw new Error("Timezone must be a valid IANA timezone or a UTC offset such as +05:30.");
  }
  return new Date(localAsUtc - offset * 60_000);
}

export function shiftLocalDate(date: string, dayOffset: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(0);
  shifted.setUTCFullYear(year, month - 1, day + dayOffset);
  return `${String(shifted.getUTCFullYear()).padStart(4, "0")}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

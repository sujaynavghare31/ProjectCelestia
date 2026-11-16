export function getBirthDateTimeError(date: unknown, time: unknown): string | null {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return "Birth date must use YYYY-MM-DD.";
  }
  if (typeof time !== "string" || !/^\d{2}:\d{2}:\d{2}$/.test(time)) {
    return "Birth time must use HH:MM:SS.";
  }

  const [year, month, day] = date.split("-").map(Number);
  const checkDate = new Date(0);
  checkDate.setUTCFullYear(year, month - 1, day);
  checkDate.setUTCHours(0, 0, 0, 0);
  if (checkDate.getUTCFullYear() !== year || checkDate.getUTCMonth() !== month - 1 || checkDate.getUTCDate() !== day) {
    return "Enter a valid calendar date.";
  }

  const [hour, minute, second] = time.split(":").map(Number);
  if (hour > 23 || minute > 59 || second > 59) {
    return "Birth time must be between 00:00:00 and 23:59:59.";
  }

  return null;
}

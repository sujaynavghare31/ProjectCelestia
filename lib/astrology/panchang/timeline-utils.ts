export function isWithinPanchangTimeline(timestamp: number, start: string, end: string) {
  const startTime = Date.parse(start);
  const endTime = Date.parse(end);
  return Number.isFinite(timestamp) && timestamp >= startTime && timestamp < endTime;
}

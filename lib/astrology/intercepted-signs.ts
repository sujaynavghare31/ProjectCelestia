export function getInterceptedSigns(cuspSigns: number[]): number[] {
  const signsOnCusps = new Set(cuspSigns);
  return Array.from({ length: 12 }, (_, sign) => sign).filter((sign) => !signsOnCusps.has(sign));
}

/**
 * Carter (Poli-Equatorial) house cusps engine – port of Birth_to_Carter_Cusps_v2.xlsx.
 * Pure TypeScript, no runtime dependencies; runs in the browser or Node.
 */
export * from "./carter";
export * from "./format";
export * from "./kp";

/** Helper: degrees + minutes + direction → signed decimal (E/N positive). */
export function dmToDecimal(deg: number, min: number, dir: "E" | "W" | "N" | "S"): number {
  const v = Math.abs(deg) + Math.abs(min) / 60;
  return dir === "W" || dir === "S" ? -v : v;
}

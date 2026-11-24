export { timeUpagrahaMoments, timeUpagrahas } from "./upagrahas";
export type { TimeUpagraha, TimeUpagrahaInput, UpagrahaInput } from "./upagrahas";

export async function fetchTimeUpagrahas(input: {
  date: string;
  time: string;
  lat: number;
  lng: number;
  timezone: string;
  ayanamsa?: string;
  customAyanamsaDegrees?: number;
}) {
  const response = await fetch("/api/timepoints", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Unable to calculate time upagrahas.");
  return payload.values as Array<{
    key: string;
    name: string;
    abbr: string;
    partNo: number;
    lord: string;
    startTime: string;
    longitude: number;
    signIndex: number;
    degreeText: string;
    nakshatra: string;
    pada: number;
  }>;
}

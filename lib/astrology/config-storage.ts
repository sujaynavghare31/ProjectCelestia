import { z } from "zod";
import { avasthaConfigSchema } from "./avastha/validation";
import { timingConfigSchema } from "./timing/validation";

export const ASTROLOGY_CONFIG_STORAGE_KEY = "celestia.astrology-config.v1";

const savedConfigSchema = z.object({
  avastha: avasthaConfigSchema,
  timing: timingConfigSchema,
});

export type SavedAstrologyConfig = z.infer<typeof savedConfigSchema>;

export function readSavedAstrologyConfig(): SavedAstrologyConfig | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ASTROLOGY_CONFIG_STORAGE_KEY);
  if (!value) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Saved astrology configuration is not valid JSON. Open Admin → Astrology configuration and reset or save it again.");
  }
  const result = savedConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("Saved astrology configuration is invalid. Open Admin → Astrology configuration and save corrected settings.");
  }
  return result.data;
}

export function writeSavedAstrologyConfig(value: SavedAstrologyConfig) {
  const parsed = savedConfigSchema.parse(value);
  window.localStorage.setItem(ASTROLOGY_CONFIG_STORAGE_KEY, JSON.stringify(parsed));
}

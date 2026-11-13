import { z } from "zod";
import { DEFAULT_TIMING_CONFIG } from "./config";
import { GRAHAS } from "../avastha/types";
import { isValidTimezone } from "./core";

export const timingConfigSchema = z.object({
  yearLength: z.enum(["solar365.2425", "savana360", "sidereal365.256363"]).optional(),
  charaMethod: z.enum(["KNRao", "Iranganti"]).optional(),
  charaExaltAdjust: z.boolean().optional(),
  dualLordRule: z.enum(["KNRao", "custom"]).optional(),
  adDirection: z.enum(["byMDSign", "sameAsMD"]).optional(),
  charaLevels: z.union([z.literal(2), z.literal(3)]).optional(),
  karakaScheme: z.union([z.literal(7), z.literal(8)]).optional(),
  sankataLord: z.enum(["Rahu", "Ketu"]).optional(),
  bcpPlanetProgression: z.boolean().optional(),
  bcpYearBoundary: z.enum(["birthday", "solarReturn"]).optional(),
  jeevaKaraka: z.enum(["Jupiter", "Venus"]).optional(),
  bnnStepDays: z.number().min(1).max(366).optional(),
  bnnIncludeRetroPrevSign: z.boolean().optional(),
  bnnExchange: z.boolean().optional(),
  bnnTransitPlanets: z.array(z.enum(GRAHAS)).optional(),
  bbOrb: z.number().min(0).max(15).optional(),
  nadiModules: z.array(z.enum(["BCP", "BNN_TRANSIT", "BHRIGU_BINDU"])).optional(),
}).superRefine((config, context) => {
  if (config.bnnTransitPlanets?.length === 0 && config.nadiModules?.includes("BNN_TRANSIT")) {
    context.addIssue({ code: "custom", path: ["bnnTransitPlanets"], message: "At least one transit planet is required when BNN_TRANSIT is enabled." });
  }
});

export const timingInputSchema = z.object({
  birthDateTimeUTC: z.iso.datetime(),
  timezone: z.string().min(1).max(80).refine(isValidTimezone, "timezone must be a valid IANA timezone."),
  planets: z.array(z.object({
    planet: z.enum(GRAHAS),
    longitude: z.number().min(0).max(359.999999999),
    speed: z.number(),
  })).length(9),
  ascendantLongitude: z.number().min(0).max(359.999999999),
  gender: z.enum(["male", "female"]).optional(),
  fromDate: z.iso.datetime().optional(),
  toDate: z.iso.datetime().optional(),
  config: timingConfigSchema.optional(),
}).superRefine((input, context) => {
  if (input.fromDate && input.toDate && new Date(input.fromDate) >= new Date(input.toDate)) {
    context.addIssue({ code: "custom", path: ["toDate"], message: "toDate must be later than fromDate." });
  }
  if (input.fromDate && input.toDate && new Date(input.toDate).getTime() - new Date(input.fromDate).getTime() > 120 * 366 * 86_400_000) {
    context.addIssue({ code: "custom", path: ["toDate"], message: "Dasha timelines cannot exceed 120 years." });
  }
});

export const defaultTimingConfigSchema = z.object({
  yearLength: z.enum(["solar365.2425", "savana360", "sidereal365.256363"]).default(DEFAULT_TIMING_CONFIG.yearLength),
});

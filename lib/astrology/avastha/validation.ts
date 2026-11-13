import { z } from "zod";
import { GRAHAS } from "./types";

export const avasthaConfigSchema = z.object({
    friendshipMode: z.enum(["compound", "natural"]).optional(),
    nodeAspects: z.boolean().optional(),
    includeNodesInBaladi: z.boolean().optional(),
    vriddhaResultPercent: z.number().min(0).max(100).optional(),
    jagratIncludesMoolatrikona: z.boolean().optional(),
    deeptadiVariant: z.enum(["BPHS", "Phaladeepika"]).optional(),
    deeptadiPercentages: z.record(z.string(), z.number().min(0).max(100)).optional(),
    vikalaIncludesDefeatedWar: z.boolean().optional(),
    yuddhaWinnerRule: z.enum(["lowerLongitude", "brightness"]).optional(),
    conjunctionOrb: z.number().min(0).max(15).optional(),
    moonBeneficRule: z.enum(["paksha", "shuklaAshtami"]).optional(),
    wateryExtended: z.boolean().optional(),
    kshobhitaUseCombustionOrb: z.boolean().optional(),
    ketuNumber: z.union([z.literal(8), z.literal(9)]).optional(),
    navamsaMode: z.enum(["indexInSign", "navamsaSign"]).optional(),
    ghatiRounding: z.enum(["nearest", "ceil", "floor", "exact"]).optional(),
    rahuExaltSign: z.number().int().min(1).max(12).optional(),
    ketuExaltSign: z.number().int().min(1).max(12).optional(),
    rahuDebilSign: z.number().int().min(1).max(12).optional(),
    ketuDebilSign: z.number().int().min(1).max(12).optional(),
    rahuMoolatrikonaSigns: z.array(z.number().int().min(1).max(12)).optional(),
    ketuMoolatrikonaSigns: z.array(z.number().int().min(1).max(12)).optional(),
    rahuOwnSigns: z.array(z.number().int().min(1).max(12)).optional(),
    ketuOwnSigns: z.array(z.number().int().min(1).max(12)).optional(),
    nodeFriends: z.array(z.enum(GRAHAS)).optional(),
    nodeNeutral: z.array(z.enum(GRAHAS)).optional(),
    nodeEnemies: z.array(z.enum(GRAHAS)).optional(),
    strengthWeights: z.object({
      baladi: z.number().min(0),
      jagradadi: z.number().min(0),
      deeptadi: z.number().min(0),
      lajjitadi: z.number().min(0),
    }).optional(),
    nameLetterAnkas: z.record(z.string(), z.number().int().min(1).max(8)).optional(),
  }).partial().superRefine((config, context) => {
  if (config.yuddhaWinnerRule === "brightness") {
    context.addIssue({
      code: "custom",
      path: ["yuddhaWinnerRule"],
      message: "Brightness-based planetary war requires apparent-brightness inputs; use lowerLongitude until those are supplied.",
    });
  }
});

export const avasthaInputSchema = z.object({
  planets: z.array(z.object({
    planet: z.enum(GRAHAS),
    longitude: z.number().min(0).lt(360),
    speed: z.number(),
  })).length(9),
  ascendantLongitude: z.number().min(0).lt(360),
  birthDateTimeUTC: z.iso.datetime(),
  sunriseUTC: z.iso.datetime(),
  nameFirstLetter: z.string().max(12).optional(),
  config: avasthaConfigSchema.optional(),
});

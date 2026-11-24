export type PointGroup = "core" | "extended" | "centaurs" | "dwarf" | "points" | "uranian";

export type PointCatalogItem = {
  key: string;
  name: string;
  glyph: string;
  group: PointGroup;
  ipl?: number;
  astNumber?: number;
  calc?: "fortuna" | "vertex" | "eastpoint" | "priapus";
  file?: string;
  meaning: string;
};

export const POINT_CATALOG: PointCatalogItem[] = [
  { key: "chiron", name: "Chiron", glyph: "⚷", group: "core", ipl: 15, file: "seas_18.se1", meaning: "wounded healer, healing" },
  { key: "ceres", name: "Ceres", glyph: "⚳", group: "core", ipl: 17, file: "seas_18.se1", meaning: "nurturing, food, mother" },
  { key: "pallas", name: "Pallas", glyph: "⚴", group: "core", ipl: 18, file: "seas_18.se1", meaning: "wisdom, strategy, creative intelligence" },
  { key: "juno", name: "Juno", glyph: "⚵", group: "core", ipl: 19, file: "seas_18.se1", meaning: "marriage, commitment, partnership" },
  { key: "vesta", name: "Vesta", glyph: "⚶", group: "core", ipl: 20, file: "seas_18.se1", meaning: "devotion, sacred focus, service" },
  { key: "lilith-mean", name: "Black Moon Lilith (mean)", glyph: "⚸", group: "core", ipl: 12, file: "semo_18.se1", meaning: "lunar apogee, instinct, taboo, autonomy" },
  { key: "pholus", name: "Pholus", glyph: "⯛", group: "centaurs", ipl: 16, file: "seas_18.se1", meaning: "sudden turning points, released potential" },
  { key: "nessus", name: "Nessus", glyph: "⯟", group: "centaurs", astNumber: 7066, file: "ast7/se07066s.se1", meaning: "karma, consequence, inherited trauma" },
  { key: "lilith-1181", name: "Lilith (1181)", glyph: "⊙", group: "extended", astNumber: 1181, file: "ast1/se01181s.se1", meaning: "asteroid Lilith, defiance and independence" },
  { key: "eros", name: "Eros", glyph: "♥", group: "extended", astNumber: 433, file: "ast0/se00433s.se1", meaning: "eros, desire, creative passion" },
  { key: "psyche", name: "Psyche", glyph: "✦", group: "extended", astNumber: 16, file: "ast0/se00016s.se1", meaning: "soul, psychology, bonds" },
  { key: "hygiea", name: "Hygiea", glyph: "⚕", group: "extended", astNumber: 10, file: "ast0/se00010s.se1", meaning: "health, prevention, hygiene" },
  { key: "astraea", name: "Astraea", glyph: "⚸", group: "extended", astNumber: 5, file: "ast0/se00005s.se1", meaning: "justice, purity, discernment" },
  { key: "fortuna", name: "Fortuna (19)", glyph: "✿", group: "extended", astNumber: 19, file: "ast0/se00019s.se1", meaning: "fortune, luck, circumstance" },
  { key: "eris", name: "Eris", glyph: "⯰", group: "dwarf", astNumber: 136199, file: "ast136/s136199s.se1", meaning: "discord, disruption, awakening" },
  { key: "sedna", name: "Sedna", glyph: "⯲", group: "dwarf", astNumber: 90377, file: "ast90/s090377s.se1", meaning: "deep transformation, isolation, surrender" },
  { key: "makemake", name: "Makemake", glyph: "⯲", group: "dwarf", astNumber: 136472, file: "ast136/s136472s.se1", meaning: "creation, culture, self-determination" },
  { key: "haumea", name: "Haumea", glyph: "⯲", group: "dwarf", astNumber: 136108, file: "ast136/s136108s.se1", meaning: "fertility, renewal, manifestation" },
  { key: "quaoar", name: "Quaoar", glyph: "⯲", group: "dwarf", astNumber: 50000, file: "ast50/s050000s.se1", meaning: "creative order, culture, emergence" },
  { key: "orcus", name: "Orcus", glyph: "⯲", group: "dwarf", astNumber: 90482, file: "ast90/s090482s.se1", meaning: "oaths, consequence, transmutation" },
  { key: "lilith-true", name: "Black Moon Lilith (true)", glyph: "☽", group: "points", ipl: 13, meaning: "true lunar apogee, instinct, taboo" },
  { key: "lilith-interpolated", name: "Black Moon Lilith (interpolated)", glyph: "☽", group: "points", ipl: 21, meaning: "interpolated lunar apogee" },
  { key: "priapus", name: "Priapus", glyph: "P", group: "points", calc: "priapus", meaning: "shadow of Lilith, instinctive desire" },
  { key: "part-of-fortune", name: "Part of Fortune", glyph: "⊕", group: "points", calc: "fortuna", meaning: "fortune, embodied ease, worldly wellbeing" },
  { key: "vertex", name: "Vertex", glyph: "Vx", group: "points", calc: "vertex", meaning: "fated encounters, relationship turning points" },
  { key: "east-point", name: "East Point", glyph: "EP", group: "points", calc: "eastpoint", meaning: "public presentation, outward orientation" },
];

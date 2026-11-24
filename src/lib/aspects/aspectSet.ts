export type AspectKey =
  | "conjunction" | "opposition" | "trine" | "square" | "sextile"
  | "quincunx" | "semi-sextile" | "semi-square" | "sesquiquadrate"
  | "quintile" | "bi-quintile";

export type AspectDefinition = {
  key: AspectKey;
  name: string;
  angle: number;
  symbol: string;
  family: "hard" | "soft" | "quincunx" | "quintile";
  defaultEnabled: boolean;
};

export const ASPECT_SET: AspectDefinition[] = [
  { key: "conjunction", name: "Conjunction", angle: 0, symbol: "☌", family: "hard", defaultEnabled: true },
  { key: "opposition", name: "Opposition", angle: 180, symbol: "☍", family: "hard", defaultEnabled: true },
  { key: "trine", name: "Trine", angle: 120, symbol: "△", family: "soft", defaultEnabled: true },
  { key: "square", name: "Square", angle: 90, symbol: "□", family: "hard", defaultEnabled: true },
  { key: "sextile", name: "Sextile", angle: 60, symbol: "⚹", family: "soft", defaultEnabled: true },
  { key: "quincunx", name: "Quincunx", angle: 150, symbol: "⚻", family: "quincunx", defaultEnabled: true },
  { key: "semi-sextile", name: "Semi-sextile", angle: 30, symbol: "⚺", family: "quincunx", defaultEnabled: false },
  { key: "semi-square", name: "Semi-square", angle: 45, symbol: "∠", family: "hard", defaultEnabled: false },
  { key: "sesquiquadrate", name: "Sesquiquadrate", angle: 135, symbol: "⚼", family: "hard", defaultEnabled: false },
  { key: "quintile", name: "Quintile", angle: 72, symbol: "Q", family: "quintile", defaultEnabled: true },
  { key: "bi-quintile", name: "Bi-quintile", angle: 144, symbol: "bQ", family: "quintile", defaultEnabled: true },
];

export type OrbSettings = Record<AspectKey, { luminaries: number; planets: number; angles: number; small: number }>;

export const DEFAULT_ORBS: OrbSettings = Object.fromEntries(ASPECT_SET.map((aspect) => [
  aspect.key,
  aspect.key === "conjunction" || aspect.key === "opposition"
    ? { luminaries: 10, planets: 8, angles: 6, small: 2 }
    : aspect.key === "trine"
      ? { luminaries: 8, planets: 7, angles: 5, small: 2 }
      : aspect.key === "square"
        ? { luminaries: 8, planets: 7, angles: 5, small: 2 }
        : aspect.key === "sextile"
          ? { luminaries: 6, planets: 5, angles: 4, small: 1.5 }
          : aspect.key === "quincunx"
            ? { luminaries: 3, planets: 3, angles: 2, small: 1 }
            : { luminaries: 2, planets: 2, angles: 1.5, small: 1 },
])) as OrbSettings;

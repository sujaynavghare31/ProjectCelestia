// ---------------------------------------------------------------------------
// KP (Krishnamurti Paddhati) constants
// ---------------------------------------------------------------------------
export const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;
export const SIGN_SHORT = ["Ari", "Tau", "Gem", "Can", "Leo", "Vir", "Lib", "Sco", "Sag", "Cap", "Aqu", "Pis"] as const;

/** Bodies used by the engine. Uranus/Neptune/Pluto/Fortuna are optional extras (never lords). */
export type Graha = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn" | "Rahu" | "Ketu";
export type Outer = "Uranus" | "Neptune" | "Pluto";
export type Body = Graha | Outer | "Fortuna";

export const GRAHAS: Graha[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
export const OUTERS: Outer[] = ["Uranus", "Neptune", "Pluto"];
export const ABBR: Record<Body, string> = {
  Sun: "SUN", Moon: "MON", Mars: "MAR", Mercury: "MER", Jupiter: "JUP", Venus: "VEN", Saturn: "SAT", Rahu: "RAH", Ketu: "KET",
  Uranus: "URA", Neptune: "NEP", Pluto: "PLU", Fortuna: "FOR",
};
export const ABBR2: Record<Body, string> = {
  Sun: "SU", Moon: "MO", Mars: "MA", Mercury: "ME", Jupiter: "JU", Venus: "VE", Saturn: "SA", Rahu: "RA", Ketu: "KE",
  Uranus: "UR", Neptune: "NE", Pluto: "PL", Fortuna: "FO",
};

/** Sign lords (Aries..Pisces). KP uses the classical 7 lords; Rahu/Ketu own no sign. */
export const SIGN_LORD: Graha[] = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];

/** Vimshottari order and years (also the KP star / sub / sub-sub order). */
export const DASHA_ORDER: Graha[] = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
export const DASHA_YEARS: Record<Graha, number> = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };

export const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha",
  "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
  "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"] as const;

export const NAK_SPAN = 40 / 3;          // 13°20′
export const WEEKDAY_LORD: Graha[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];  // Sunday = 0
export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"] as const;

export const norm360 = (x: number) => ((x % 360) + 360) % 360;

import type { CelestialLanguage } from "@/lib/kundali-types";

const PLANET_NAMES: Record<string, { hi: string; mr: string; initials: string }> = {
  Sun: { hi: "सूर्य", mr: "सूर्य", initials: "Su" },
  Moon: { hi: "चन्द्र", mr: "चंद्र", initials: "Mo" },
  Mars: { hi: "मंगल", mr: "मंगळ", initials: "Ma" },
  Mercury: { hi: "बुध", mr: "बुध", initials: "Me" },
  Jupiter: { hi: "गुरु", mr: "गुरु", initials: "Ju" },
  Venus: { hi: "शुक्र", mr: "शुक्र", initials: "Ve" },
  Saturn: { hi: "शनि", mr: "शनि", initials: "Sa" },
  Rahu: { hi: "राहु", mr: "राहू", initials: "Ra" },
  Ketu: { hi: "केतु", mr: "केतू", initials: "Ke" },
  Uranus: { hi: "अरुण", mr: "अरुण", initials: "Ur" },
  Neptune: { hi: "वरुण", mr: "वरुण", initials: "Ne" },
  Pluto: { hi: "यम", mr: "यम", initials: "Pl" },
  Chiron: { hi: "कीरोन", mr: "कीरोन", initials: "Ch" },
  Lilith: { hi: "लिलिथ", mr: "लिलिथ", initials: "Li" },
  Ascendant: { hi: "लग्न", mr: "लग्न", initials: "As" },
  "Part of Fortune": { hi: "भाग्य बिंदु", mr: "भाग्य बिंदू", initials: "PoF" },
  Mandi: { hi: "मांदि", mr: "मांदी", initials: "Ma" },
  Gulika: { hi: "गुलिक", mr: "गुलिक", initials: "Gu" },
};

const SIGN_NAMES: Record<string, { hi: string; mr: string }> = {
  Aries: { hi: "मेष", mr: "मेष" },
  Taurus: { hi: "वृषभ", mr: "वृषभ" },
  Gemini: { hi: "मिथुन", mr: "मिथुन" },
  Cancer: { hi: "कर्क", mr: "कर्क" },
  Leo: { hi: "सिंह", mr: "सिंह" },
  Virgo: { hi: "कन्या", mr: "कन्या" },
  Libra: { hi: "तुला", mr: "तुला" },
  Scorpio: { hi: "वृश्चिक", mr: "वृश्चिक" },
  Sagittarius: { hi: "धनु", mr: "धनु" },
  Capricorn: { hi: "मकर", mr: "मकर" },
  Aquarius: { hi: "कुंभ", mr: "कुंभ" },
  Pisces: { hi: "मीन", mr: "मीन" },
};

export function planetName(name: string, language: CelestialLanguage, fallback?: string): string {
  if (language === "en") return name;
  const translation = PLANET_NAMES[name];
  if (!translation) return fallback ?? name;
  if (language === "initials") return translation.initials;
  return translation[language];
}

export function signName(name: string, language: CelestialLanguage): string {
  if (language === "en" || language === "initials") return name;
  return SIGN_NAMES[name]?.[language] ?? name;
}

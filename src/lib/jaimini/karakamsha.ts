import { DEITY, PLANET_NAMES, houseFrom, mod, navamsa, sign } from "./constants";
import { charaKarakas, planetLongitudes, lordOf, planetSigns } from "./core";
import type { PlanetPositions } from "./constants";

export const KARAKAMSHA_HOUSE_MEANINGS = [
  "Self, temperament", "Speech, family, wealth", "Courage, siblings", "Home, vehicles",
  "Learning, mantra, children", "Enemies, debts, disease, Dharma devata", "Spouse, trade",
  "Longevity, occult", "Dharma, guru, father", "Career", "Gains", "Moksha, Ishta devata",
] as const;

export const PLANET_IN_KK_RESULTS = [
  "Government, politics; devotion to Shiva",
  "Enjoyment, learning, public dealings",
  "Weapons, fire, engineering, police",
  "Trade, arts, writing, skilled work",
  "Knowledge, teaching, ritual",
  "Government favour, arts, long life",
  "Renowned in the family's line of work",
  "Machines, poisons, foreign lands",
  "Spiritual insight, mathematics",
] as const;

export interface DevataResult {
  planet: number | null;
  lord: number;
  name: string;
  deity: string;
}

export function devataForSign(signIndex: number, planets: PlanetPositions): DevataResult {
  const longs = planetLongitudes(planets);
  const rasiSigns = planetSigns(planets);
  const navSigns = longs.map(navamsa);
  const candidates = navSigns.map((ns, p) => ns === mod(signIndex, 12) ? p : -1).filter((p) => p >= 0);
  const planet = candidates.length ? candidates.sort((a, b) => a - b)[0] : null;
  const lord = planet ?? lordOf(signIndex, planets);
  return {
    planet,
    lord,
    name: planet === null ? PLANET_NAMES[lord] : PLANET_NAMES[planet],
    deity: DEITY[planet ?? lord],
  };
}

export function karakamshaHouses(kk: number, planets: PlanetPositions) {
  const rasiSigns = planetSigns(planets);
  const navSigns = planetLongitudes(planets).map(navamsa);
  return Array.from({ length: 12 }, (_, i) => {
    const signIndex = mod(kk + i, 12);
    const rasi = rasiSigns.map((s, p) => s === signIndex ? p : -1).filter((p) => p >= 0);
    const navamsaPlanets = navSigns.map((s, p) => s === signIndex ? p : -1).filter((p) => p >= 0);
    return {
      house: i + 1,
      sign: signIndex,
      meaning: KARAKAMSHA_HOUSE_MEANINGS[i],
      rasi,
      navamsa: navamsaPlanets,
    };
  });
}

import type { PlanetPosition } from "../kundali-types";
import type { GhatiResult } from "./ghati-calculator";
import { getNaturalFriendship, getPlanetaryDignity, getSignLord } from "./planetary-dignity-service";

const CLASSICAL_GRAHAS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
const PLANET_VALUES: Record<string, number> = {
  Sun: 1,
  Moon: 2,
  Mars: 3,
  Mercury: 4,
  Jupiter: 5,
  Venus: 6,
  Saturn: 7,
};

const SHAYANADI_STATES: Record<number, string> = {
  0: "Nidra",
  1: "Shayana",
  2: "Upaveshana",
  3: "Netrapani",
  4: "Prakashana",
  5: "Gamana",
  6: "Agamana",
  7: "Sabha",
  8: "Agama",
  9: "Bhojana",
  10: "Nrityalipsa",
  11: "Kautuka",
};

export interface ShayanadiInputs {
  nakshatra: number;
  planetValue: number;
  navamshaNumber: number;
  moonNakshatra: number;
  birthGhati: number;
  lagnaSign: number;
}

export interface ShayanadiResult {
  state: string;
  remainder: number;
  total: number;
  inputs: ShayanadiInputs;
  formula: string;
}

export function calculateShayanadiAvastha(inputs: ShayanadiInputs): ShayanadiResult {
  const { nakshatra, planetValue, navamshaNumber, moonNakshatra, birthGhati, lagnaSign } = inputs;
  const total = (nakshatra * planetValue * navamshaNumber) + moonNakshatra + birthGhati + lagnaSign;
  const remainder = total % 12;

  return {
    state: SHAYANADI_STATES[remainder],
    remainder,
    total,
    inputs,
    formula: `(${nakshatra} × ${planetValue} × ${navamshaNumber}) + ${moonNakshatra} + ${birthGhati} + ${lagnaSign} = ${total}; ${total} mod 12 = ${remainder}`,
  };
}

export function calculateGrahaAvasthas(
  planets: PlanetPosition[],
  moonNakshatra: number,
  birthGhati: GhatiResult,
  lagnaSign: number,
) {
  return planets.map((planet) => {
    const dignity = getPlanetaryDignity(planet.name, planet.sign, planet.degree);
    const planetValue = PLANET_VALUES[planet.name];
    if (planetValue === undefined) {
      return {
        planet: planet.name,
        sign: planet.signName,
        dignity,
        jagradadi: null,
        shayanadi: null,
        calculationTrace: {
          applicable: false,
          reason: "The supplied BPHS/JHora Shayanadi planet values cover the seven classical grahas only.",
          planetValue: null,
          birthGhati: birthGhati.runningGhati,
          sunrise: birthGhati,
        },
      };
    }

    const signLord = getSignLord(planet.sign);
    const relationship = getNaturalFriendship(planet.name, planet.sign);
    const jagradadiState = dignity === "Exalted" || dignity === "Own" || dignity === "Moolatrikona"
      ? "Jagrat"
      : dignity === "Debilitated" || relationship === "Enemy"
        ? "Sushupti"
        : "Swapna";
    const jagradadiExplanation = `${dignity} dignity in ${planet.signName}; ${signLord} is a natural ${relationship.toLowerCase()} of ${planet.name}. ${jagradadiState} follows the requested dignity/friendship mapping.`;
    const shayanadi = calculateShayanadiAvastha({
      nakshatra: planet.nakshatra,
      planetValue,
      navamshaNumber: Math.min(9, Math.floor(planet.degree / (30 / 9)) + 1),
      moonNakshatra,
      birthGhati: birthGhati.runningGhati,
      lagnaSign: lagnaSign + 1,
    });

    return {
      planet: planet.name,
      sign: planet.signName,
      dignity,
      jagradadi: {
        state: jagradadiState,
        signLord,
        naturalRelationship: relationship,
        explanation: jagradadiExplanation,
      },
      shayanadi: {
        state: shayanadi.state,
        remainder: shayanadi.remainder,
      },
      calculationTrace: {
        applicable: true,
        formula: "(S × P × N) + B + G + L",
        S: planet.nakshatra,
        P: planetValue,
        N: shayanadi.inputs.navamshaNumber,
        B: moonNakshatra,
        G: birthGhati.runningGhati,
        L: lagnaSign + 1,
        product: planet.nakshatra * planetValue * shayanadi.inputs.navamshaNumber,
        total: shayanadi.total,
        remainder: shayanadi.remainder,
        remainderMapping: shayanadi.remainder === 0 ? "0 → 12 → Nidra" : `${shayanadi.remainder} → ${shayanadi.state}`,
        equation: shayanadi.formula,
        jagradadi: {
          dignity,
          signLord,
          naturalRelationship: relationship,
          state: jagradadiState,
          explanation: jagradadiExplanation,
        },
        sunrise: birthGhati,
      },
    };
  });
}

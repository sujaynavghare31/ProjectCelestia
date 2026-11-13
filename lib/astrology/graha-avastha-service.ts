import type { PlanetPosition } from "../kundali-types";
import type { GhatiResult } from "./ghati-calculator";
import { getPlanetaryRelationship, calculateShayanadiState } from "./avastha/engine";
import { SIGN_LORDS } from "./avastha/graha";
import { GRAHAS, type AvasthaReport, type Graha } from "./avastha/types";
import { getNaturalFriendship, getPlanetaryDignity } from "./planetary-dignity-service";

const SHAYANADI_STATES: Record<number, string> = {
  0: "Nidra",
  1: "Sayana",
  2: "Upavesana",
  3: "Netrapani",
  4: "Prakasana",
  5: "Gamana",
  6: "Aagamana",
  7: "Sabha",
  8: "Aagama",
  9: "Bhojana",
  10: "Nritya Lipsa",
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
  const { total, remainder, state } = calculateShayanadiState({
    nakshatra,
    planetNumber: planetValue,
    navamsaNumber: navamshaNumber,
    moonNakshatra,
    ghati: birthGhati,
    lagnaSign,
  });
  const rawRemainder = total % 12;

  return {
    state: SHAYANADI_STATES[remainder % 12] ?? state,
    remainder,
    total,
    inputs,
    formula: `(${nakshatra} × ${planetValue} × ${navamshaNumber}) + ${moonNakshatra} + ${birthGhati} + ${lagnaSign} = ${total}; ${total} mod 12 = ${rawRemainder}${rawRemainder === 0 ? " → 12" : ""}`,
  };
}

export function calculateGrahaAvasthas(
  planets: PlanetPosition[],
  birthGhati: GhatiResult,
  report: AvasthaReport,
) {
  const byPlanet = new Map(report.planets.map((planet) => [planet.planet, planet]));
  const relationshipPositions = report.planets.map(({ planet, sign }) => ({ planet, sign }));
  return planets.map((planet) => {
    const graha = GRAHAS.includes(planet.name as Graha) ? planet.name as Graha : null;
    const detailed = graha ? byPlanet.get(graha) : undefined;
    if (!graha || !detailed) {
      return {
        planet: planet.name,
        sign: planet.signName,
        dignity: getPlanetaryDignity(planet.name, planet.sign, planet.degree),
        jagradadi: null,
        shayanadi: null,
        calculationTrace: {
          applicable: false,
          reason: "The detailed Avastha report does not include this body.",
          planetValue: null,
          birthGhati: birthGhati.runningGhati,
          sunrise: birthGhati,
        },
      };
    }

    const signLord = SIGN_LORDS[planet.sign + 1];
    const relationship = getPlanetaryRelationship(graha, signLord, relationshipPositions, report.configUsed);
    const naturalRelationship = getNaturalFriendship(graha, planet.sign);
    const jagradadiResult = {
      state: detailed.jagradadi.state,
      signLord,
      naturalRelationship,
      compoundRelationship: relationship,
      explanation: detailed.jagradadi.reasons.join(" "),
    };

    if (!detailed.shayanadi) {
      return {
        planet: planet.name,
        sign: planet.signName,
        dignity: detailed.dignity,
        jagradadi: jagradadiResult,
        shayanadi: null,
        calculationTrace: { applicable: false, reason: "Shayanadi does not apply to Rahu or Ketu." },
      };
    }

    const { nakshatra, planetNumber, navamsaNumber, moonNakshatra, ghati, lagnaSign } = detailed.shayanadi.formulaInputs;
    const { total, remainder } = detailed.shayanadi;
    const product = nakshatra * planetNumber * navamsaNumber;

    return {
      planet: planet.name,
      sign: planet.signName,
      dignity: detailed.dignity,
      jagradadi: jagradadiResult,
      shayanadi: {
        state: detailed.shayanadi.state,
        remainder,
      },
      calculationTrace: {
        applicable: true,
        formula: "(S × P × N) + B + G + L",
        S: nakshatra,
        P: planetNumber,
        N: navamsaNumber,
        B: moonNakshatra,
        G: ghati,
        L: lagnaSign,
        product,
        total,
        remainder,
        remainderMapping: remainder === 12 ? "0 → 12 → Nidra" : `${remainder} → ${detailed.shayanadi.state}`,
        equation: `(${nakshatra} × ${planetNumber} × ${navamsaNumber}) + ${moonNakshatra} + ${ghati} + ${lagnaSign} = ${total}; ${total} mod 12 = ${total % 12}${remainder === 12 ? " → 12" : ""}`,
        jagradadi: {
          dignity: detailed.dignity,
          signLord,
          naturalRelationship,
          compoundRelationship: relationship,
          state: detailed.jagradadi.state,
          ruleId: detailed.jagradadi.ruleId,
          explanation: detailed.jagradadi.reasons.join(" "),
        },
        sunrise: birthGhati,
      },
    };
  });
}

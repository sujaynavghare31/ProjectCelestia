import { describe, expect, it } from "vitest";
import { calculateShayanadiAvastha, calculateGrahaAvasthas } from "./graha-avastha-service";
import { calculateAvasthaReport } from "./avastha/engine";
import { GRAHAS } from "./avastha/types";
import { derivePosition, SIGNS } from "./avastha/graha";
import type { PlanetPosition } from "../kundali-types";
import type { GhatiResult } from "./ghati-calculator";

describe("GrahaAvasthaService Shayanadi formula", () => {
  it("maps remainder zero to Nidra", () => {
    const result = calculateShayanadiAvastha({
      nakshatra: 1,
      planetValue: 1,
      navamshaNumber: 1,
      moonNakshatra: 1,
      birthGhati: 5,
      lagnaSign: 5,
    });

    expect(result.total).toBe(12);
    expect(result.remainder).toBe(12);
    expect(result.state).toBe("Nidra");
  });

  it("reproduces the documented JHora formula and exposes its inputs", () => {
    const result = calculateShayanadiAvastha({
      nakshatra: 10,
      planetValue: 1,
      navamshaNumber: 2,
      moonNakshatra: 8,
      birthGhati: 4,
      lagnaSign: 6,
    });

    expect(result.total).toBe(38);
    expect(result.remainder).toBe(2);
    expect(result.state).toBe("Upavesana");
    expect(result.formula).toBe("(10 × 1 × 2) + 8 + 4 + 6 = 38; 38 mod 12 = 2");
    expect(result.inputs).toEqual({
      nakshatra: 10,
      planetValue: 1,
      navamshaNumber: 2,
      moonNakshatra: 8,
      birthGhati: 4,
      lagnaSign: 6,
    });
  });

  it("keeps the compact ephemeris response aligned with the detailed report", () => {
    const avasthaInput = {
      planets: GRAHAS.map((planet, index) => ({ planet, longitude: index * 37 + 3, speed: 1 })),
      ascendantLongitude: 0,
      birthDateTimeUTC: "2000-01-01T12:00:00.000Z",
      sunriseUTC: "2000-01-01T06:00:00.000Z",
    };
    const report = calculateAvasthaReport(avasthaInput);
    const planets: PlanetPosition[] = avasthaInput.planets.map(({ planet, longitude, speed }) => {
      const position = derivePosition(longitude);
      return {
        id: planet.toLowerCase(),
        name: planet,
        symbol: planet,
        longitude,
        sign: position.sign - 1,
        signName: SIGNS[position.sign - 1],
        degree: position.degree,
        speed,
        motion: "D",
        declination: 0,
        nakshatra: position.nakshatra,
        nakshatraName: `Nakshatra ${position.nakshatra}`,
        pada: position.pada,
        nakshatraLord: "Ketu",
        house: position.sign,
        dignity: "—",
      };
    });
    const birthGhati: GhatiResult = {
      birthUtc: avasthaInput.birthDateTimeUTC,
      sunriseUtc: avasthaInput.sunriseUTC,
      sunriseLocalDate: "2000-01-01",
      elapsedMinutes: 360,
      runningGhati: 15,
      convention: "nearest(elapsed minutes / 24)",
    };
    const compact = calculateGrahaAvasthas(planets, birthGhati, report);
    const compactMars = compact.find(({ planet }) => planet === "Mars");
    const compactRahu = compact.find(({ planet }) => planet === "Rahu");
    const detailedMars = report.planets.find(({ planet }) => planet === "Mars");

    expect(compactMars?.jagradadi?.state).toBe(detailedMars?.jagradadi.state);
    expect(compactMars?.shayanadi).toEqual({
      state: detailedMars?.shayanadi?.state,
      remainder: detailedMars?.shayanadi?.remainder,
    });
    expect(compactMars?.jagradadi?.compoundRelationship).toBeTruthy();
    expect(compactRahu?.jagradadi?.state).toBeTruthy();
    expect(compactRahu?.shayanadi).toBeNull();
  });
});

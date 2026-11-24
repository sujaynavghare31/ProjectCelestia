import { describe, expect, it } from "vitest";
import { specialLagnas, timeMinutes } from "../specialLagnas";
import { timeUpagrahaMoments, timeUpagrahas } from "../upagrahas";

describe("Jaimini special lagnas", () => {
  const input = {
    lagnaLongitude: 153.303611111111,
    moonLongitude: 135.295833333333,
    sunLongitude: 94.7330555555556,
    sunriseSunLongitude: 90.25,
    rahuLongitude: 20.8458333333333,
    birthMinutes: timeMinutes("10:30:27"),
    sunriseMinutes: timeMinutes("06:11:18"),
  };

  it("uses the sidereal sunrise Sun as the base and keeps seconds in elapsed time", () => {
    const result = specialLagnas(input);
    const elapsed = input.birthMinutes - input.sunriseMinutes;

    expect(result.bl).toBeCloseTo((input.sunriseSunLongitude + elapsed * 0.25) % 360, 10);
    expect(result.hl).toBeCloseTo((input.sunriseSunLongitude + elapsed * 0.5) % 360, 10);
    expect(result.gl).toBeCloseTo((input.sunriseSunLongitude + elapsed * 1.25) % 360, 10);
    expect(result.vgL).toBeCloseTo((input.sunriseSunLongitude + elapsed * 75) % 360, 10);
    expect(result.bl).not.toBeCloseTo((input.sunLongitude + elapsed * 0.25) % 360, 3);
    expect(timeMinutes("10:30:27") - timeMinutes("10:30:00")).toBeCloseTo(0.45, 10);
  });

  it("preserves the Moon degree for Indu Lagna and places Bhrigu Bindu halfway forward from Rahu", () => {
    const result = specialLagnas(input);

    expect(result.il % 30).toBeCloseTo(input.moonLongitude % 30, 10);
    expect(result.bb).toBeCloseTo(input.rahuLongitude + ((input.moonLongitude - input.rahuLongitude + 360) % 360) / 2, 10);
  });

  it("uses separate ascendant instants for the time-based upagrahas and places Mandi mid-Saturn-part", () => {
    const sunriseMs = Date.UTC(2026, 10, 20, 1, 25);
    const sunsetMs = Date.UTC(2026, 10, 20, 12, 55);
    const nextSunriseMs = Date.UTC(2026, 10, 21, 1, 24);
    const base = {
      birthMs: Date.UTC(2026, 10, 20, 8),
      sunriseMs,
      sunsetMs,
      nextSunriseMs,
      weekday: 5,
    };
    const schedule = timeUpagrahaMoments(base);
    const values = timeUpagrahas({
      ...base,
      ascendantAt: (moment) => moment / 60_000 % 360,
    });

    expect(new Set(schedule.slice(0, 5).map(({ momentMs }) => momentMs)).size).toBe(5);
    expect(new Set(values.slice(0, 5).map(({ longitude }) => longitude)).size).toBe(5);
    expect(values.at(-1)?.name).toBe("Mandi");
    expect(values.at(-1)?.longitude).not.toBe(values.find(({ name }) => name === "Gulika")?.longitude);
    expect(values.map(({ longitude }) => longitude)).toEqual(schedule.map(({ momentMs }) => momentMs / 60_000 % 360));
  });

  it("assigns post-midnight births to the preceding night interval", () => {
    const sunriseMs = Date.UTC(2026, 10, 19, 1, 25);
    const sunsetMs = Date.UTC(2026, 10, 19, 12, 55);
    const nextSunriseMs = Date.UTC(2026, 10, 20, 1, 24);
    const schedule = timeUpagrahaMoments({
      birthMs: Date.UTC(2026, 10, 20, 1, 0),
      sunriseMs,
      sunsetMs,
      nextSunriseMs,
      weekday: 5,
    });

    expect(schedule.every(({ momentMs }) => momentMs >= sunsetMs && momentMs < nextSunriseMs)).toBe(true);
  });

  it("keeps Mandi at Saturn part midpoint while the five time upagrahas use part starts", () => {
    const sunriseMs = Date.UTC(2026, 10, 20, 1, 25);
    const sunsetMs = Date.UTC(2026, 10, 20, 12, 55);
    const nextSunriseMs = Date.UTC(2026, 10, 21, 1, 24);
    const schedule = timeUpagrahaMoments({
      birthMs: Date.UTC(2026, 10, 20, 8),
      sunriseMs,
      sunsetMs,
      nextSunriseMs,
      weekday: 5,
      upagrahaPoint: "middle",
    });
    const partLength = (sunsetMs - sunriseMs) / 8;
    const gulika = schedule.find(({ name }) => name === "Gulika");
    const mandi = schedule.find(({ name }) => name === "Mandi");
    expect(gulika?.momentMs).not.toBe(mandi?.momentMs);
    expect(mandi && gulika ? mandi.momentMs - gulika.momentMs : 0).toBeCloseTo(partLength / 2, 6);
  });

  it("rejects a birth timestamp outside the supplied sunrise interval", () => {
    expect(() => timeUpagrahaMoments({
      birthMs: Date.UTC(2026, 10, 20, 1, 0),
      sunriseMs: Date.UTC(2026, 10, 20, 1, 25),
      sunsetMs: Date.UTC(2026, 10, 20, 12, 55),
      nextSunriseMs: Date.UTC(2026, 10, 21, 1, 24),
      weekday: 5,
    })).toThrow("Time-based upagrahas require ordered sunrise, sunset, next sunrise, and birth instants.");
  });
});

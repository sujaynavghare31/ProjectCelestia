import { describe, expect, it } from "vitest";
import { renderJamakkolChart } from "../../../lib/astro/jamakkol-engine/chartSvg";
import { jamakkol } from "../../../lib/astro/jamakkol-engine/jamakkol";
import {
  translateNakshatraPada,
  translatePanchangValue,
  translateSign,
} from "./jamakkol-locale";

describe("Jamakkol display language", () => {
  it("translates signs, nakshatra padas, and Jamakkol day without altering calculation values", () => {
    const result = jamakkol({
      date: "2026-11-18",
      time: "21:34:46",
      tz: 5.5,
      lat: 19.076,
      lon: 72.8777,
      planets: { Mars: 122, Mercury: 192, Jupiter: 121, Venus: 179, Saturn: 344 },
    });
    const original = JSON.stringify(result);

    expect(translateSign(result.panchang.moonSign, "ta")).toMatch(/^[\u0B80-\u0BFF]+$/u);
    expect(translateNakshatraPada("Purva Bhadrapada-4", "ta")).toBe("பூரட்டாதி - 4");
    expect(translatePanchangValue("jamakkolDay", result.panchang.jamakkolDay, "ta")).toContain("இரவு ஜாமம்");
    expect(translateSign("Simmam (Leo)", "en")).toBe("Simmam (Leo)");
    expect(JSON.stringify(result)).toBe(original);
  });

  it("renders a Tamil chart while keeping English as the renderer default", () => {
    const result = jamakkol({
      date: "2026-11-18",
      time: "21:34:46",
      tz: 5.5,
      lat: 19.076,
      lon: 72.8777,
      planets: { Mars: 122, Mercury: 192, Jupiter: 121, Venus: 179, Saturn: 344 },
    });

    const tamilChart = renderJamakkolChart(result, { language: "ta" });
    const englishChart = renderJamakkolChart(result);

    expect(tamilChart).toContain("ஜாமக்கோள் பிரசன்னம்");
    expect(tamilChart).toContain("மேஷம்");
    expect(tamilChart).toContain("சந்திரன்");
    expect(englishChart).toContain("Jamakkol South Indian chart");
    expect(englishChart).toContain("Udayam");
  });
});

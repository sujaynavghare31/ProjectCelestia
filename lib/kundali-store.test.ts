import { describe, expect, it } from "vitest";
import { getBirthDateTimeDefaults, getCurrentBirthDateTime, useKundaliStore } from "./kundali-store";

describe("chart settings store", () => {
  it("shows the Part of Fortune by default", () => {
    expect(useKundaliStore.getState().viewPreferences.showFortune).toBe(true);
  });

  it("commits calculation, language, and view settings in one shared state update", () => {
    const state = useKundaliStore.getState();
    const previousSettings = {
      ayanamsa: state.ayanamsa,
      zodiacMode: state.zodiacMode,
      customAyanamsaDegrees: state.customAyanamsaDegrees,
      houseSystem: state.houseSystem,
      carterZodiac: state.carterZodiac,
      language: state.language,
      viewPreferences: state.viewPreferences,
    };

    state.setChartSettings({
      ayanamsa: "raman",
      zodiacMode: "tropical",
      customAyanamsaDegrees: 23.5,
      houseSystem: "carter",
      carterZodiac: "nirayanaB",
      language: "hi",
      viewPreferences: { ...state.viewPreferences, showHouseLabels: true },
    });

    expect(useKundaliStore.getState()).toMatchObject({
      ayanamsa: "raman",
      zodiacMode: "tropical",
      customAyanamsaDegrees: 23.5,
      houseSystem: "carter",
      carterZodiac: "nirayanaB",
      language: "hi",
      viewPreferences: { showHouseLabels: true },
    });

    useKundaliStore.getState().setChartSettings(previousSettings);
  });
});

describe("getCurrentBirthDateTime", () => {
  it("does not prefill a sample birth date or time", () => {
    expect(useKundaliStore.getState().profile).toMatchObject({
      date: "",
      time: "",
      sex: "not-applicable",
      city: "Mumbai",
      lat: 19.076,
      lng: 72.8777,
      timezone: "Asia/Kolkata",
    });
  });

  it("uses the current date and wall-clock time in Mumbai", () => {
    expect(getCurrentBirthDateTime(new Date("2026-11-08T02:31:40.000Z"))).toEqual({
      date: "2026-11-08",
      time: "08:01:40",
    });
  });

  it("replaces the pre-existing sample date and time with current Mumbai values", () => {
    expect(getBirthDateTimeDefaults(
      { date: "1996-08-31", time: "09:30:00" },
      new Date("2026-11-08T02:31:40.000Z"),
    )).toEqual({ date: "2026-11-08", time: "08:01:40" });
  });

  it("preserves a user-entered birth date and time", () => {
    expect(getBirthDateTimeDefaults(
      { date: "1995-08-31", time: "09:30:00" },
      new Date("2026-11-08T02:31:40.000Z"),
    )).toBeNull();
  });
});

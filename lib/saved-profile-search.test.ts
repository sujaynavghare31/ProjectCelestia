import { describe, expect, it } from "vitest";
import { matchesSavedProfileQuery, type SavedProfileSearchFields } from "./saved-profile-search";

const profile: SavedProfileSearchFields = {
  chartName: "Avery's chart",
  fullName: "Avery Example",
  dateOfBirth: "2001-02-03",
  timeOfBirth: "10:20:30",
  sex: "male",
  latitude: 40.7128,
  longitude: -74.006,
  timezone: "America/New_York",
  city: "New York",
  notes: "Sample career question",
};

describe("saved profile search", () => {
  it.each([
    ["Avery", "full name"],
    ["Avery's chart", "chart name"],
    ["career question", "notes"],
    ["2001-02-03", "ISO birth date"],
    ["03/02/2001", "localized birth date"],
    ["10:20:30", "birth time"],
    ["America/New_York", "timezone"],
    ["40.7128", "latitude"],
    ["male", "gender value"],
  ])("matches %s by %s", (query) => {
    expect(matchesSavedProfileQuery(profile, query)).toBe(true);
  });

  it("matches multiple words across different profile details", () => {
    expect(matchesSavedProfileQuery(profile, "Avery 2001 career")).toBe(true);
  });

  it("ignores case and diacritics", () => {
    expect(matchesSavedProfileQuery({ ...profile, fullName: "José Navghare" }, "jose")).toBe(true);
  });

  it("matches every query word and returns all profiles for a blank query", () => {
    expect(matchesSavedProfileQuery(profile, "Sujay missing")).toBe(false);
    expect(matchesSavedProfileQuery(profile, "   ")).toBe(true);
  });
});

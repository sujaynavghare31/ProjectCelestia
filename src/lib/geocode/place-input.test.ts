import { describe, expect, it } from "vitest";
import { matchBirthInput } from "./place-input";
import { DEFAULT_PLACE } from "./place";

describe("match birth-place resolution", () => {
  it("uses the selected coordinates and the time-zone offset at the birth instant", () => {
    const birth = matchBirthInput({
      name: "A",
      date: "1990-07-15",
      time: "12:00:00",
      place: {
        ...DEFAULT_PLACE,
        name: "New York",
        admin: "New York",
        country: "United States",
        latitude: 40.7128,
        longitude: -74.006,
        timezone: "America/New_York",
      },
    });

    expect(birth).toMatchObject({
      latitude: 40.7128,
      longitude: -74.006,
      tzHours: -4,
      placeName: "New York, New York",
    });
  });
});

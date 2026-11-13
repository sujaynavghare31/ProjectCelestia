import { describe, expect, it } from "vitest";
import { calculatePanchang } from "./PanchangEngine";

const mumbai = {
  date: "2026-11-13",
  latitude: 19.076,
  longitude: 72.8777,
  timezone: "Asia/Kolkata",
};

describe("calculatePanchang", () => {
  it("labels the waning fortnight's final tithi as Amavasya", () => {
    const result = calculatePanchang({ ...mumbai, date: "2026-11-09" });

    expect(result.panchangAtSunrise.tithi).toBe("Amavasya");
  });

  it("builds a contiguous sunrise-to-next-sunrise timeline for the four limbs and muhurta", () => {
    const result = calculatePanchang(mumbai);
    const sunrise = Date.parse(result.solarEvents.sunrise);
    const sunset = Date.parse(result.solarEvents.sunset);
    const nextSunrise = Date.parse(result.solarEvents.nextSunrise);

    expect(sunrise).toBeLessThan(sunset);
    expect(sunset).toBeLessThan(nextSunrise);
    expect(result.timeline.start).toBe(result.solarEvents.sunrise);
    expect(result.timeline.end).toBe(result.solarEvents.nextSunrise);
    expect(result.panchangAtSunrise.weekday).toBe("Friday");
    expect(result.timeline.tracks.map(({ key }) => key)).toEqual([
      "tithi", "nakshatra", "yoga", "karana", "muhurta",
    ]);

    for (const track of result.timeline.tracks) {
      expect(track.segments.length).toBeGreaterThan(0);
      expect(track.segments[0].start).toBe(result.timeline.start);
      expect(track.segments.at(-1)?.end).toBe(result.timeline.end);
      for (let index = 0; index < track.segments.length; index += 1) {
        const segment = track.segments[index];
        expect(Date.parse(segment.start)).toBeLessThan(Date.parse(segment.end));
        if (index > 0) expect(track.segments[index - 1].end).toBe(segment.start);
      }
    }

    const tithiIndex = result.timeline.tracks[0].segments[0].index;
    const karanaIndex = result.timeline.tracks[3].segments[0].index;
    expect(Math.floor(karanaIndex / 2)).toBe(tithiIndex);
  });

  it("returns solar and lunar specifications with bala, choghadiya, and lagna intervals", () => {
    const result = calculatePanchang(mumbai);
    const sunrise = Date.parse(result.solarEvents.sunrise);
    const sunset = Date.parse(result.solarEvents.sunset);
    const nextSunrise = Date.parse(result.solarEvents.nextSunrise);

    expect(Date.parse(result.solarEvents.civilDawn!)).toBeLessThan(sunrise);
    expect(Date.parse(result.solarEvents.solarNoon!)).toBeGreaterThan(sunrise);
    expect(Date.parse(result.solarEvents.solarNoon!)).toBeLessThan(sunset);
    expect(Date.parse(result.solarEvents.civilDusk!)).toBeGreaterThan(sunset);
    expect(result.astronomy.moonSign).toBe("Sagittarius");
    expect(result.astronomy.ascendantSign).toBeTruthy();
    expect(result.lunarSolar).toMatchObject({
      vikramSamvat: 2083,
      shakaSamvat: 1948,
      ritu: "Sharad",
      ayana: "Dakshinayana",
    });
    expect(result.anandadiYoga.name).toBe("Sthira");
    expect(result.choghadiya.day).toHaveLength(8);
    expect(result.choghadiya.night).toHaveLength(8);
    expect(result.choghadiya.day[0].start).toBe(result.solarEvents.sunrise);
    expect(result.choghadiya.day.at(-1)?.end).toBe(result.solarEvents.sunset);
    expect(result.choghadiya.night[0].start).toBe(result.solarEvents.sunset);
    expect(result.choghadiya.night.at(-1)?.end).toBe(result.solarEvents.nextSunrise);
    expect(result.tarabalam.grid).toHaveLength(9);
    expect(result.tarabalam.grid.every(({ janmaNakshatras }) =>
      janmaNakshatras.length === 27 && janmaNakshatras.filter(({ selected }) => selected).length === 3
    )).toBe(true);
    expect(result.chandrabalam.rows).toHaveLength(12);
    expect(result.lagnaTransitions[0].start).toBe(result.timeline.start);
    expect(result.lagnaTransitions.at(-1)?.end).toBe(result.timeline.end);
    expect(result.panchakaRahita.length).toBeGreaterThan(0);
    expect(result.timeline.end).toBe(result.solarEvents.nextSunrise);
    expect(sunrise).toBeLessThan(sunset);
    expect(sunset).toBeLessThan(nextSunrise);
  });

  it("calculates local event and muhurta windows with explicit unavailable states", () => {
    const result = calculatePanchang(mumbai);
    const sunrise = Date.parse(result.solarEvents.sunrise);
    const sunriseMs = Date.parse(result.solarEvents.nextSunrise);
    const allTimings = [...result.timings.auspicious, ...result.timings.inauspicious];

    expect(result.timezone).toBe("Asia/Kolkata");
    expect(result.solarEvents.moonrise).not.toBeNull();
    expect(result.solarEvents.moonset).not.toBeNull();
    expect(result.timings.inauspicious.map(({ name }) => name)).toEqual([
      "Rahu Kalam", "Yamaganda", "Gulikai Kalam", "Dur Muhurtam",
    ]);
    expect(result.timings.auspicious.map(({ name }) => name)).toEqual([
      "Abhijit Muhurta", "Amrit Kalam", "Brahma Muhurta",
    ]);

    for (const timing of allTimings) {
      for (const window of timing.windows) {
        expect(Date.parse(window.start)).toBeLessThan(Date.parse(window.end));
      }
    }

    const rahu = result.timings.inauspicious[0].windows[0];
    expect(Date.parse(rahu.start)).toBeGreaterThanOrEqual(sunrise);
    expect(Date.parse(rahu.end)).toBeLessThan(Date.parse(result.solarEvents.sunset));
    const brahma = result.timings.auspicious[2].windows[0];
    expect(Date.parse(brahma.end)).toBeLessThan(sunrise);
    expect(Date.parse(brahma.start)).toBeLessThan(sunriseMs);
  });

  it("rejects invalid dates, coordinates, and time zones", () => {
    expect(() => calculatePanchang({ ...mumbai, date: "2026-02-30" })).toThrow(/valid calendar date/);
    expect(() => calculatePanchang({ ...mumbai, latitude: 91 })).toThrow(/Latitude/);
    expect(() => calculatePanchang({ ...mumbai, timezone: "Mars/Olympus" })).toThrow(/IANA time zone/);
  });
});

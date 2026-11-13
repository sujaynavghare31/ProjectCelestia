import { describe, expect, it } from "vitest";
import {
  TABLES,
  bankModule,
  businessModule,
  calendarModule,
  checkHouse,
  checkMobile,
  checkName,
  citiesModule,
  childNameModule,
  computeProfile,
  contextFromProfile,
  houseModule,
  judgeHorary,
  mobileModule,
  nameCheckModule,
  partnerModule,
  vehicleModule,
} from ".";

const profile = computeProfile({
  fullName: "Rahul Kumar Sharma",
  dob: "1990-08-15",
  gender: "Male",
  forecastYear: 2026,
  today: "2026-11-06",
});
const context = contextFromProfile(profile);

describe("numerology engine", () => {
  it("matches the supplied workbook profile and Lo Shu values", () => {
    expect(profile.chaldean).toMatchObject({
      moolank: 6,
      bhagyank: 6,
      kua: 1,
      nameTotal: 48,
      nameNumber: 3,
      compoundRating: "Caution",
      nameScore: 0.7,
      nameVerdict: "Name change recommended",
    });
    expect(profile.pythagorean).toMatchObject({
      expression: 4,
      soulUrge: 1,
      personality: 3,
      lifePath: 6,
      maturity: 1,
    });
    expect(profile.forecast.personalYear).toBe(6);
    expect(profile.loShu.counts.slice(1)).toEqual([3, 0, 0, 0, 1, 2, 0, 1, 2]);
  });

  it("scores names and string-based number checks without losing leading zeros", () => {
    expect(checkName(context, "Rahul Kumarr Sharma")).toMatchObject({
      total: 50,
      root: 5,
      score: 10,
      verdict: "Excellent",
    });
    expect(nameCheckModule(context, "Rahul Kumar Sharma", ["Rahul Sharma"]).alternatives[0].total).toBe(33);
    expect(checkMobile(context, "98111 22334")).toMatchObject({ total: 34, root: 7, score: 10 });
    expect(mobileModule(context, ["001234"]).checks[0].zeros).toBe(2);
    expect(checkHouse(context, "A-302")).toMatchObject({ total: 6, root: 6 });
    expect(houseModule(context, ["A-302"]).checks).toHaveLength(1);
    expect(bankModule(context, [{ bankName: "Celestia Bank", accountNumber: "001234" }], profile.lucky.datesEveryMonth).checks[0].accountNumber).toBe("001234");
    expect(vehicleModule(context, [{ plate: "MH12AB1234" }], profile.lucky.datesEveryMonth).checks[0].fourDigits).toBe("1234");
  });

  it("exposes the supplied business, relationship, place, calendar, and horary rules", () => {
    const business = businessModule(context, {
      industry: TABLES.industries[0].industry,
      names: ["Celestia Studio"],
      teams: [{ team: "Studio", headcount: 8 }],
    }, profile.lucky.datesEveryMonth);
    expect(business.names).toHaveLength(1);
    expect(business.teams).toHaveLength(1);

    expect(partnerModule(context, [{ name: "Asha", dob: "1992-04-03" }]).checks[0].percent).toBeGreaterThanOrEqual(0);
    expect(childNameModule("Sharma", "2026-10-12", ["Aarav"]).names[0].fullName).toBe("Aarav Sharma");
    expect(citiesModule(context, ["Mumbai"]).checked[0].city).toBe("Mumbai");
    expect(calendarModule(context, "1990-08-15", 11, 2026).days).toHaveLength(30);

    const question = judgeHorary({
      date: "2026-11-13",
      time: "10:30",
      category: TABLES.horaryCategories[0].question,
      number: 23,
      querentDob: "1990-08-15",
    });
    expect(question.score).toBeGreaterThanOrEqual(-7);
    expect(question.score).toBeLessThanOrEqual(7);
    expect(question.breakdown.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { formatJama, jamaGrahas, localNow } from "./jamaGrahas";

describe("Jamakkol Jama grahas", () => {
  it("matches the 2026-11-18 21:34:46 Night Jamam reference", () => {
    const result = jamaGrahas("2026-11-18", "21:34:46");
    expect(result).toMatchObject({ weekday: "Wednesday", half: "Night", jamam: 3 });
    expect(result.grahas.map((graha) => formatJama(graha.longitude))).toEqual([
      "Mesham 27°37′",
      "Meenam 12°37′",
      "Makaram 27°37′",
      "Dhanusu 12°37′",
      "Thulam 27°37′",
      "Kanni 12°37′",
      "Kadagam 27°37′",
      "Mithunam 12°37′",
    ]);
  });

  it("uses the previous weekday before 06:00", () => {
    const result = jamaGrahas("2026-11-19", "05:00:00");
    expect(result).toMatchObject({ weekday: "Wednesday", half: "Night", jamam: 8 });
  });

  it("starts Thursday Day at 06:00 using the fixed formula", () => {
    const result = jamaGrahas("2026-11-19", "06:00:00");
    expect(result).toMatchObject({ weekday: "Thursday", half: "Day", jamam: 1 });
    expect(result.grahas[2].longitude).toBe(0);
  });

  it("matches the Thursday Night 22:07:28 Jama positions", () => {
    const result = jamaGrahas("2026-11-19", "22:07:28");
    expect(result).toMatchObject({ weekday: "Thursday", half: "Night", jamam: 3 });
    const expected = [326.26666666666665, 281.26666666666665, 236.26666666666665, 191.26666666666665, 146.26666666666665, 101.26666666666665, 56.26666666666665, 11.26666666666665];
    result.grahas.forEach((graha, index) => {
      expect(graha.longitude).toBeCloseTo(expected[index], 10);
    });
  });

  it("formats degrees by truncating to minutes", () => {
    expect(formatJama(12.631)).toBe("Mesham 12°37′");
  });

  it("gets local Kolkata time from an instant", () => {
    expect(localNow("Asia/Kolkata", new Date("2026-11-18T16:04:46Z"))).toEqual({
      date: "2026-11-18",
      time: "21:34:46",
    });
  });
});

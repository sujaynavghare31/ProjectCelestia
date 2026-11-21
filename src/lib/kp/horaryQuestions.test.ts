import { describe, expect, it } from "vitest";
import { detectQuestionCategory, HORARY_QUESTION_GROUPS } from "./horaryQuestions";

describe("KP horary question detection", () => {
  it.each([
    ["will I win the case", "win_court_case"],
    ["Will I get the offer letter?", "offer_letter"],
    ["Will I have a second marriage?", "second_marriage"],
    ["Could I face job loss?", "job_loss"],
  ])("%s selects %s", (text, key) => {
    expect(detectQuestionCategory(text)).toBe(key);
  });

  it("provides the full grouped question catalogue and leaves unmatched text unselected", () => {
    expect(HORARY_QUESTION_GROUPS).toHaveLength(11);
    const count = HORARY_QUESTION_GROUPS.reduce((total, { questions }) => total + questions.length, 0);
    expect(count).toBe(53);
    expect(detectQuestionCategory("")).toBeNull();
    expect(detectQuestionCategory("Tell me about my future")).toBeNull();
  });
});

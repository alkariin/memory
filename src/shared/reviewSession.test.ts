import { describe, it, expect } from "vitest";
import {
  applySessionOrder,
  firstUnreviewedIndex,
  nextUnreviewedIndex,
  resumeSessionWords,
} from "./reviewSession";
import { EASE, Word } from "./types";

const TODAY = "2026-09-06";

function makeWord(id: string, lastReviewedDate: string | null = null): Word {
  return {
    id,
    word: id,
    correlation: "",
    date: "2026-09-01",
    reviewCount: lastReviewedDate ? 1 : 0,
    lastReviewedDate,
    nextReviewDate: TODAY,
    category: null,
    iteration: 0,
    ease: EASE.UNKNOWN,
  };
}

describe("resumeSessionWords", () => {
  it("keeps the words answered in the session, marked as reviewed", () => {
    const stored = [makeWord("a", TODAY), makeWord("b"), makeWord("c")];

    const session = resumeSessionWords(stored, ["a", "b", "c"], ["a"]);

    expect(session.map((w) => w.id)).toEqual(["a", "b", "c"]);
    expect(session.map((w) => w.reviewed)).toEqual([true, false, false]);
  });

  it("keeps the frozen order of the session ids", () => {
    const stored = [makeWord("a"), makeWord("b"), makeWord("c")];

    expect(resumeSessionWords(stored, ["c", "a", "b"], []).map((w) => w.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("ends the day once every word has been answered", () => {
    const stored = [makeWord("a", TODAY), makeWord("b", TODAY)];

    expect(resumeSessionWords(stored, ["a", "b"], ["a", "b"])).toEqual([]);
  });

  it("does not count a review made outside the session as reviewed", () => {
    // Answered today from the list: the day's own session is still untouched
    const stored = [makeWord("a", TODAY)];

    expect(resumeSessionWords(stored, ["a"], [])).toHaveLength(1);
    expect(resumeSessionWords(stored, ["a"], [])[0].reviewed).toBe(false);
  });

  it("ignores answered ids that are not part of the day", () => {
    const stored = [makeWord("a"), makeWord("b", TODAY)];

    expect(resumeSessionWords(stored, ["a"], ["b"]).map((w) => w.reviewed)).toEqual([false]);
  });

  it("skips ids whose word was deleted", () => {
    const stored = [makeWord("a")];

    expect(resumeSessionWords(stored, ["a", "gone"], []).map((w) => w.id)).toEqual(["a"]);
  });
});

describe("nextUnreviewedIndex", () => {
  // "a1 A" reads: word a1, of category A, still unanswered; "a1! A" is answered
  const session = (...words: string[]) =>
    words.map((word) => ({
      reviewed: word.includes("!"),
      assignedCategory: word.split(" ")[1],
    }));

  it("goes to the next word of the category being reviewed", () => {
    expect(nextUnreviewedIndex(session("a1! A", "a2 A", "b1 B"), 0)).toBe(1);
  });

  it("comes back for a word skipped earlier in the category", () => {
    // a1 was left behind with the navigation arrows, a3 has just been answered
    expect(nextUnreviewedIndex(session("a1 A", "a2! A", "a3! A", "b1 B"), 2)).toBe(0);
  });

  it("moves on once the category holds nothing unanswered", () => {
    expect(nextUnreviewedIndex(session("a1! A", "a2! A", "b1 B"), 1)).toBe(2);
  });

  it("wraps back to a category left behind", () => {
    expect(nextUnreviewedIndex(session("a1 A", "b1! B", "b2! B"), 2)).toBe(0);
  });

  it("stays put once every word is answered", () => {
    expect(nextUnreviewedIndex(session("a1! A", "b1! B"), 1)).toBe(1);
  });

  it("handles an empty session", () => {
    expect(nextUnreviewedIndex(session(), 0)).toBe(0);
  });
});

describe("firstUnreviewedIndex", () => {
  it("resumes on the first word still waiting for an answer", () => {
    expect(
      firstUnreviewedIndex([{ reviewed: true }, { reviewed: true }, { reviewed: false }]),
    ).toBe(2);
  });

  it("falls back to the first word when everything was answered", () => {
    expect(firstUnreviewedIndex([{ reviewed: true }])).toBe(0);
  });
});

describe("applySessionOrder", () => {
  it("restores the stored order", () => {
    const words = [{ id: "a" }, { id: "b" }, { id: "c" }];

    expect(applySessionOrder(words, ["c", "a", "b"]).map((w) => w.id)).toEqual(["c", "a", "b"]);
  });

  it("keeps the given order when the day has no stored one", () => {
    const words = [{ id: "a" }, { id: "b" }];

    expect(applySessionOrder(words, null)).toEqual(words);
  });

  it("appends the words that joined the day after it started", () => {
    const words = [{ id: "new" }, { id: "a" }, { id: "b" }];

    expect(applySessionOrder(words, ["b", "a"]).map((w) => w.id)).toEqual(["b", "a", "new"]);
  });
});

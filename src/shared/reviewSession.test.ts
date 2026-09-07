import { describe, it, expect } from "vitest";
import { applySessionOrder, firstUnreviewedIndex, resumeSessionWords } from "./reviewSession";
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

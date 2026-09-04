import { describe, it, expect } from "vitest";
import { resolveDailySelection } from "./dailySelection";

function makeWords(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: `w${i}` }));
}

describe("resolveDailySelection", () => {
  it("draws at most `limit` words when nothing was drawn yet", () => {
    const { words, wordIds } = resolveDailySelection(makeWords(40), 15, null);

    expect(words).toHaveLength(15);
    expect(wordIds).toEqual(words.map((w) => w.id));
  });

  it("draws every due word when there are fewer than the limit", () => {
    const { words } = resolveDailySelection(makeWords(5), 15, null);

    expect(words).toHaveLength(5);
  });

  it("draws without duplicates", () => {
    const { words } = resolveDailySelection(makeWords(40), 15, null);

    expect(new Set(words.map((w) => w.id)).size).toBe(15);
  });

  it("draws across categories, not the first words in order", () => {
    // A fixed order would always return w0..w14; a random draw practically never does
    const draws = Array.from({ length: 20 }, () =>
      resolveDailySelection(makeWords(40), 15, null).words.map((w) => w.id),
    );

    const inOrder = draws.filter(
      (ids) => ids.join() === makeWords(15).map((w) => w.id).join(),
    );
    expect(inOrder).toHaveLength(0);
  });

  it("reuses today's draw, in the same order", () => {
    const stored = ["w3", "w1", "w2"];

    const { words, wordIds } = resolveDailySelection(makeWords(40), 3, stored);

    expect(words.map((w) => w.id)).toEqual(stored);
    expect(wordIds).toEqual(stored);
  });

  it("drops answered words from the session but keeps them assigned to today", () => {
    // w1 answered today: it is no longer due, and no other word replaces it
    const due = makeWords(40).filter((w) => w.id !== "w1");

    const { words, wordIds } = resolveDailySelection(due, 3, ["w3", "w1", "w2"]);

    expect(words.map((w) => w.id)).toEqual(["w3", "w2"]);
    expect(wordIds).toEqual(["w3", "w1", "w2"]);
  });

  it("keeps the day capped once the draw is full", () => {
    const stored = makeWords(15).map((w) => w.id);

    const { words, wordIds } = resolveDailySelection(makeWords(40), 15, stored);

    expect(wordIds).toEqual(stored);
    expect(words).toHaveLength(15);
  });

  it("lets a word that became due later join a draw under the cap", () => {
    // The day was drawn with 2 words; 3 more were added since
    const { words, wordIds } = resolveDailySelection(makeWords(5), 4, ["w0", "w1"]);

    expect(wordIds).toHaveLength(4);
    expect(wordIds.slice(0, 2)).toEqual(["w0", "w1"]);
    expect(new Set(wordIds).size).toBe(4);
    expect(words.map((w) => w.id)).toEqual(wordIds);
  });

  it("never assigns more than the limit over the whole day", () => {
    // 3 already answered (out of `due`) plus a full round of new words
    const stored = ["gone1", "gone2", "gone3"];

    const { wordIds } = resolveDailySelection(makeWords(40), 5, stored);

    expect(wordIds).toHaveLength(5);
  });

  it("returns nothing once the whole draw has been answered", () => {
    // The 3 drawn words are answered, so none of them is due any more,
    // and the day has no room left even though 40 words are still due
    const { words } = resolveDailySelection(makeWords(40), 3, ["a", "b", "c"]);

    expect(words).toEqual([]);
  });
});

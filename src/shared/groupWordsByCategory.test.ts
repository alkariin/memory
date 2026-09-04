import { describe, it, expect } from "vitest";
import {
  groupWordsAsSingleGroup,
  groupWordsByCategory,
  MIXED,
  UNCATEGORIZED,
} from "./groupWordsByCategory";
import { EASE, Word } from "./types";

function makeWord(id: string, category: string | null): Word & { reviewed: boolean } {
  return {
    id,
    word: id,
    correlation: "",
    date: "2026-01-01",
    reviewCount: 0,
    lastReviewedDate: null,
    nextReviewDate: null,
    category,
    iteration: 0,
    ease: EASE.UNKNOWN,
    reviewed: false,
  };
}

describe("groupWordsByCategory", () => {
  it("groups words by their category", () => {
    const words = [
      makeWord("w1", "A"),
      makeWord("w2", "B"),
      makeWord("w3", "A"),
    ];

    const { categoryGroups } = groupWordsByCategory(words);

    expect(categoryGroups).toHaveLength(2);
    expect(categoryGroups[0].category).toBe("A");
    expect(categoryGroups[0].wordIds).toContain("w1");
    expect(categoryGroups[0].wordIds).toContain("w3");
    expect(categoryGroups[0].wordIds).toHaveLength(2);
    expect(categoryGroups[1].category).toBe("B");
    expect(categoryGroups[1].wordIds).toEqual(["w2"]);
  });

  it("sorts categories alphabetically", () => {
    const words = [makeWord("w1", "C"), makeWord("w2", "A"), makeWord("w3", "B")];

    const { categoryGroups } = groupWordsByCategory(words);

    expect(categoryGroups.map((g) => g.category)).toEqual(["A", "B", "C"]);
  });

  it("puts uncategorized words last", () => {
    const words = [makeWord("w1", null), makeWord("w2", "A")];

    const { categoryGroups } = groupWordsByCategory(words);

    expect(categoryGroups[0].category).toBe("A");
    expect(categoryGroups[1].category).toBe(UNCATEGORIZED);
  });

  it("assigns each word the category of its group", () => {
    const words = [makeWord("w1", "A"), makeWord("w2", null)];

    const { grouped } = groupWordsByCategory(words);

    expect(grouped.find((w) => w.id === "w1")!.assignedCategory).toBe("A");
    expect(grouped.find((w) => w.id === "w2")!.assignedCategory).toBe(UNCATEGORIZED);
  });

  it("keeps grouped words in category-group order", () => {
    const words = [makeWord("w1", "B"), makeWord("w2", null), makeWord("w3", "A")];

    const { grouped } = groupWordsByCategory(words);

    expect(grouped.map((w) => w.assignedCategory)).toEqual(["A", "B", UNCATEGORIZED]);
  });

  it("does not duplicate a word across groups", () => {
    const words = [makeWord("w1", "A"), makeWord("w2", "B"), makeWord("w3", null)];

    const { grouped } = groupWordsByCategory(words);

    const ids = grouped.map((w) => w.id);
    expect(ids).toHaveLength(new Set(ids).size);
    expect(ids).toHaveLength(words.length);
  });

  it("handles an empty session", () => {
    const { grouped, categoryGroups } = groupWordsByCategory([]);

    expect(grouped).toEqual([]);
    expect(categoryGroups).toEqual([]);
  });
});

describe("groupWordsAsSingleGroup", () => {
  it("puts every word in one group whatever its category", () => {
    const words = [makeWord("w1", "A"), makeWord("w2", "B"), makeWord("w3", null)];

    const { grouped, categoryGroups } = groupWordsAsSingleGroup(words);

    expect(categoryGroups).toHaveLength(1);
    expect(categoryGroups[0].category).toBe(MIXED);
    expect(categoryGroups[0].wordIds).toEqual(["w1", "w2", "w3"]);
    expect(grouped.map((w) => w.assignedCategory)).toEqual([MIXED, MIXED, MIXED]);
  });

  it("keeps the order it was given, so a drawn session stays stable", () => {
    const words = [makeWord("w3", "B"), makeWord("w1", null), makeWord("w2", "A")];

    const { grouped } = groupWordsAsSingleGroup(words);

    expect(grouped.map((w) => w.id)).toEqual(["w3", "w1", "w2"]);
  });

  it("handles an empty session", () => {
    const { grouped, categoryGroups } = groupWordsAsSingleGroup([]);

    expect(grouped).toEqual([]);
    expect(categoryGroups).toEqual([]);
  });
});

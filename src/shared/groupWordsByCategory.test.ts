import { describe, it, expect } from "vitest";
import {
  groupWordsByCategory,
  ReviewWord,
  sessionCategoryGroups,
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
    const groupOf = (category: string) =>
      categoryGroups.find((g) => g.category === category)!;

    expect(categoryGroups).toHaveLength(2);
    expect(groupOf("A").wordIds).toHaveLength(2);
    expect(groupOf("A").wordIds).toContain("w1");
    expect(groupOf("A").wordIds).toContain("w3");
    expect(groupOf("B").wordIds).toEqual(["w2"]);
  });

  it("draws the category order at random", () => {
    // A fixed order would come out alphabetical every time
    const orders = Array.from({ length: 20 }, () => {
      const words = [makeWord("w1", "C"), makeWord("w2", "A"), makeWord("w3", "B")];
      return groupWordsByCategory(words)
        .categoryGroups.map((g) => g.category)
        .join();
    });

    expect(orders.filter((order) => order === "A,B,C").length).toBeLessThan(20);
    expect(new Set(orders).size).toBeGreaterThan(1);
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

    const { grouped, categoryGroups } = groupWordsByCategory(words);

    expect(grouped.map((w) => w.assignedCategory)).toEqual(
      categoryGroups.map((g) => g.category),
    );
    expect(grouped[grouped.length - 1].assignedCategory).toBe(UNCATEGORIZED);
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

describe("sessionCategoryGroups", () => {
  const session = (...pairs: [string, string][]): ReviewWord[] =>
    pairs.map(([id, category]) => ({
      ...makeWord(id, category),
      assignedCategory: category,
    }));

  it("keeps the categories in the order the session reviews them", () => {
    const groups = sessionCategoryGroups(session(["w1", "B"], ["w2", "B"], ["w3", "A"]));

    expect(groups.map((g) => g.category)).toEqual(["B", "A"]);
    expect(groups.map((g) => g.wordIds)).toEqual([["w1", "w2"], ["w3"]]);
  });

  it("gathers a category split across the session in one group", () => {
    // A word that became due later joins at the end of the frozen order
    const groups = sessionCategoryGroups(session(["w1", "A"], ["w2", "B"], ["w3", "A"]));

    expect(groups.map((g) => g.category)).toEqual(["A", "B"]);
    expect(groups[0].wordIds).toEqual(["w1", "w3"]);
  });

  it("handles an empty session", () => {
    expect(sessionCategoryGroups([])).toEqual([]);
  });
});

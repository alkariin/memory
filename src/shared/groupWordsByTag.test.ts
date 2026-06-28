import { describe, it, expect } from "vitest";
import { groupWordsByTag } from "./groupWordsByTag";
import { EASE, Word } from "./types";

function makeWord(id: string, tags: string[]): Word & { reviewed: boolean } {
  return {
    id,
    word: id,
    correlation: "",
    date: "2026-01-01",
    reviewCount: 0,
    lastReviewedDate: null,
    nextReviewDate: null,
    tags,
    iteration: 0,
    ease: EASE.UNKNOWN,
    reviewed: false,
  };
}

describe("groupWordsByTag", () => {
  it("groups words by their first tag when no filterTag", () => {
    const words = [
      makeWord("w1", ["A"]),
      makeWord("w2", ["B"]),
      makeWord("w3", ["A"]),
    ];

    const { tagGroups } = groupWordsByTag(words);

    expect(tagGroups).toHaveLength(2);
    expect(tagGroups[0].tag).toBe("A");
    expect(tagGroups[0].wordIds).toEqual(["w1", "w3"]);
    expect(tagGroups[1].tag).toBe("B");
    expect(tagGroups[1].wordIds).toEqual(["w2"]);
  });

  it("puts untagged words last", () => {
    const words = [
      makeWord("w1", []),
      makeWord("w2", ["A"]),
    ];

    const { tagGroups } = groupWordsByTag(words);

    expect(tagGroups[0].tag).toBe("A");
    expect(tagGroups[1].tag).toBe("Untagged");
  });

  it("assigns word with tags [B, A] to group A when filterTag is A", () => {
    const words = [
      makeWord("w1", ["B", "A"]),
      makeWord("w2", ["A"]),
      makeWord("w3", ["A", "B"]),
    ];

    const { tagGroups, grouped } = groupWordsByTag(words, "A");

    // All words should be in group A since they all have tag A
    expect(tagGroups).toHaveLength(1);
    expect(tagGroups[0].tag).toBe("A");
    expect(tagGroups[0].wordIds).toEqual(["w1", "w2", "w3"]);

    // All words should have assignedTag = A
    expect(grouped.every((w) => w.assignedTag === "A")).toBe(true);
  });

  it("assigns multi-tag word to filterTag regardless of tag order", () => {
    const words = [
      makeWord("w1", ["B", "A"]), // tags order: B first, but filterTag is A
      makeWord("w2", ["A", "B"]), // tags order: A first
    ];

    const { tagGroups } = groupWordsByTag(words, "A");

    // Both words contain tag A, so both go to group A
    expect(tagGroups).toHaveLength(1);
    expect(tagGroups[0].tag).toBe("A");
    expect(tagGroups[0].wordIds).toContain("w1");
    expect(tagGroups[0].wordIds).toContain("w2");
  });

  it("without filterTag, word with tags [B, A] goes to group B (first tag)", () => {
    const words = [
      makeWord("w1", ["B", "A"]),
      makeWord("w2", ["A"]),
    ];

    const { tagGroups } = groupWordsByTag(words);

    expect(tagGroups).toHaveLength(2);
    const groupA = tagGroups.find((g) => g.tag === "A")!;
    const groupB = tagGroups.find((g) => g.tag === "B")!;
    expect(groupB.wordIds).toContain("w1");
    expect(groupA.wordIds).toContain("w2");
    expect(groupA.wordIds).not.toContain("w1");
  });

  it("word without the filterTag falls back to its first tag", () => {
    const words = [
      makeWord("w1", ["A"]),
      makeWord("w2", ["C", "D"]), // does not have filterTag "A"
    ];

    const { tagGroups } = groupWordsByTag(words, "A");

    expect(tagGroups).toHaveLength(2);
    const groupA = tagGroups.find((g) => g.tag === "A")!;
    const groupC = tagGroups.find((g) => g.tag === "C")!;
    expect(groupA.wordIds).toEqual(["w1"]);
    expect(groupC.wordIds).toEqual(["w2"]);
  });

  it("does not duplicate a word across groups", () => {
    const words = [
      makeWord("w1", ["A", "B"]),
      makeWord("w2", ["B", "A"]),
      makeWord("w3", ["C"]),
    ];

    const { grouped } = groupWordsByTag(words, "A");

    const ids = grouped.map((w) => w.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });
});

import { describe, it, expect } from "vitest";
import { migrateWord, migrateWords } from "./words";
import { EASE } from "./types";

describe("migrateWord", () => {
  it("takes the first tag of a legacy exported word as its category", () => {
    const migrated = migrateWord({ id: "1", word: "hello", tags: ["English", "Greeting"] });

    expect(migrated.category).toBe("English");
    expect("tags" in migrated).toBe(false);
  });

  it("leaves a legacy word without tags uncategorized", () => {
    expect(migrateWord({ id: "1", word: "hello", tags: [] }).category).toBeNull();
    expect(migrateWord({ id: "1", word: "hello" }).category).toBeNull();
  });

  it("keeps an existing category", () => {
    expect(migrateWord({ id: "1", word: "hello", category: "Verbs" }).category).toBe("Verbs");
  });

  it("fills in the review fields missing from older exports", () => {
    const migrated = migrateWord({ id: "1", word: "hello" });

    expect(migrated.correlation).toBe("");
    expect(migrated.reviewCount).toBe(0);
    expect(migrated.lastReviewedDate).toBeNull();
    expect(migrated.nextReviewDate).toBeNull();
    expect(migrated.iteration).toBe(0);
    expect(migrated.ease).toBe(EASE.UNKNOWN);
  });
});

describe("migrateWords", () => {
  it("migrates a whole export", () => {
    const words = migrateWords([
      { id: "1", word: "a", tags: ["A"] },
      { id: "2", word: "b", tags: [] },
    ]);

    expect(words.map((w) => w.category)).toEqual(["A", null]);
  });

  it("returns an empty list for a non-array payload", () => {
    expect(migrateWords(null)).toEqual([]);
    expect(migrateWords({})).toEqual([]);
  });
});

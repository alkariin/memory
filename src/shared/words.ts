import { EASE, Word } from "./types";

export const WORDS_KEY = "words";

/**
 * Normalizes a stored/imported record into the current Word shape.
 * Words saved before categories carried a `tags: string[]` array;
 * the first tag becomes the single category, the rest are dropped.
 */
export function migrateWord(raw: any): Word {
  const legacyTags: unknown = raw?.tags;
  const category =
    typeof raw?.category === "string" && raw.category.trim().length > 0
      ? raw.category
      : Array.isArray(legacyTags) && legacyTags.length > 0
        ? String(legacyTags[0])
        : null;

  const { tags: _tags, ...rest } = raw ?? {};

  return {
    ...rest,
    correlation: rest.correlation || "",
    reviewCount: rest.reviewCount || 0,
    lastReviewedDate: rest.lastReviewedDate || null,
    nextReviewDate: rest.nextReviewDate || null,
    category,
    iteration: rest.iteration || 0,
    ease: rest.ease || EASE.UNKNOWN,
  } as Word;
}

export function migrateWords(raw: unknown): Word[] {
  return Array.isArray(raw) ? raw.map(migrateWord) : [];
}

/** Reads the stored words, migrating legacy records on the way out. */
export function loadStoredWords(): Word[] {
  try {
    return migrateWords(JSON.parse(localStorage.getItem(WORDS_KEY) || "[]"));
  } catch {
    return [];
  }
}

export function saveWords(words: Word[]): void {
  localStorage.setItem(WORDS_KEY, JSON.stringify(words));
}

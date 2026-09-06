import { Word } from "./types";
import { shuffle } from "./shuffle";

/** Scheduling state a word had before this session's answer. */
export type ScheduleSnapshot = Pick<
  Word,
  "reviewCount" | "lastReviewedDate" | "nextReviewDate" | "iteration" | "ease"
>;

export type ReviewWord = Word & {
  reviewed: boolean;
  assignedCategory: string;
  /** Kept on the first answer so the answer can be changed without compounding */
  beforeAnswer?: ScheduleSnapshot;
};

export interface CategoryGroup {
  category: string;
  wordIds: string[];
}

export const UNCATEGORIZED = "Uncategorized";

/** Group name for a session drawn at random across every category. */
export const MIXED = "Mixed";

/**
 * Puts every word in a single group, keeping the order it was given.
 * Used by the daily-limit session: its words are drawn at random across all
 * categories, so grouping them by category would say nothing about progress.
 */
export function groupWordsAsSingleGroup(
  words: (Word & { reviewed: boolean })[],
): { grouped: ReviewWord[]; categoryGroups: CategoryGroup[] } {
  if (words.length === 0) return { grouped: [], categoryGroups: [] };

  return {
    grouped: words.map((word) => ({ ...word, assignedCategory: MIXED })),
    categoryGroups: [{ category: MIXED, wordIds: words.map((w) => w.id) }],
  };
}

/**
 * Groups words by category for the review session.
 * Each word appears in exactly one group; words without a category
 * land in the trailing "Uncategorized" group.
 */
export function groupWordsByCategory(
  words: (Word & { reviewed: boolean })[],
): { grouped: ReviewWord[]; categoryGroups: CategoryGroup[] } {
  // Shuffle words before grouping so order within each category is random
  const shuffled = shuffle(words);

  const categoryMap = new Map<string, string[]>();

  for (const word of shuffled) {
    const category = word.category || UNCATEGORIZED;
    if (!categoryMap.has(category)) categoryMap.set(category, []);
    categoryMap.get(category)!.push(word.id);
  }

  // Build ordered category groups (uncategorized last)
  const categoryOrder = Array.from(categoryMap.keys()).sort((a, b) => {
    if (a === UNCATEGORIZED) return 1;
    if (b === UNCATEGORIZED) return -1;
    return a.localeCompare(b);
  });

  const categoryGroups: CategoryGroup[] = categoryOrder.map((category) => ({
    category,
    wordIds: categoryMap.get(category)!,
  }));

  // Flatten words in category-group order
  const wordMap = new Map(words.map((w) => [w.id, w]));
  const grouped: ReviewWord[] = categoryGroups.flatMap((group) =>
    group.wordIds.map((id) => ({
      ...wordMap.get(id)!,
      assignedCategory: group.category,
    })),
  );

  return { grouped, categoryGroups };
}

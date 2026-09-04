import { Word } from "./types";

export type ReviewWord = Word & { reviewed: boolean; assignedCategory: string };

export interface CategoryGroup {
  category: string;
  wordIds: string[];
}

export const UNCATEGORIZED = "Uncategorized";

/**
 * Groups words by category for the review session.
 * Each word appears in exactly one group; words without a category
 * land in the trailing "Uncategorized" group.
 */
export function groupWordsByCategory(
  words: (Word & { reviewed: boolean })[],
): { grouped: ReviewWord[]; categoryGroups: CategoryGroup[] } {
  // Shuffle words before grouping so order within each category is random
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

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

import { ScheduleSnapshot, Word } from "./types";
import { shuffle } from "./shuffle";

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

/**
 * Groups words by category for the review session.
 * Each word appears in exactly one group; the category order is drawn at
 * random so the day does not always open on the same ones, and words without
 * a category land in the trailing "Uncategorized" group.
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

  // Build the category order at random, uncategorized last
  const categories = shuffle(Array.from(categoryMap.keys()));
  const categoryOrder = [
    ...categories.filter((c) => c !== UNCATEGORIZED),
    ...categories.filter((c) => c === UNCATEGORIZED),
  ];

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

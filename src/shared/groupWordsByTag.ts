import { Word } from "./types";

export type ReviewWord = Word & { reviewed: boolean; assignedTag: string };

export interface TagGroup {
  tag: string;
  wordIds: string[];
}

const UNTAGGED = "Untagged";

/**
 * Groups words by tag for the review session.
 * Each word appears in exactly one group.
 * If filterTag is provided (e.g. from a tag-based review filter),
 * words that contain that tag are always assigned to it,
 * regardless of their tag order.
 */
export function groupWordsByTag(
  words: (Word & { reviewed: boolean })[],
  filterTag?: string | null,
): { grouped: ReviewWord[]; tagGroups: TagGroup[] } {
  const tagMap = new Map<string, string[]>();
  const wordTagAssignment = new Map<string, string>();

  for (const word of words) {
    let tag: string;
    if (filterTag && word.tags?.includes(filterTag)) {
      tag = filterTag;
    } else {
      tag = word.tags && word.tags.length > 0 ? word.tags[0] : UNTAGGED;
    }
    wordTagAssignment.set(word.id, tag);
    if (!tagMap.has(tag)) tagMap.set(tag, []);
    tagMap.get(tag)!.push(word.id);
  }

  // Build ordered tag groups (untagged last)
  const tagOrder = Array.from(tagMap.keys()).sort((a, b) => {
    if (a === UNTAGGED) return 1;
    if (b === UNTAGGED) return -1;
    return a.localeCompare(b);
  });

  const tagGroups: TagGroup[] = tagOrder.map((tag) => ({ tag, wordIds: tagMap.get(tag)! }));

  // Flatten words in tag-group order
  const orderedIds = tagGroups.flatMap((g) => g.wordIds);
  const wordMap = new Map(words.map((w) => [w.id, w]));
  const grouped: ReviewWord[] = orderedIds.map((id) => ({
    ...wordMap.get(id)!,
    assignedTag: wordTagAssignment.get(id)!,
  }));

  return { grouped, tagGroups };
}

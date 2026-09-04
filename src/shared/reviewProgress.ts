import { CategoryGroup } from "./groupWordsByCategory";

/**
 * Total number of per-word segments the progress row can render legibly.
 *
 * Segments share the row width but the 2px gap between them does not shrink,
 * so past this budget the gaps consume every available pixel: the segments
 * collapse to zero width and the whole row overflows the viewport.
 * Derived from the narrowest supported content width (~320px) divided by a
 * 6px minimum segment plus its 2px gap.
 */
export const MAX_PROGRESS_SEGMENTS = 40;

/**
 * Number of words a single group can still show as per-word segments,
 * given how many groups share the row.
 */
export function maxSegmentsPerGroup(groupCount: number): number {
  if (groupCount <= 0) return MAX_PROGRESS_SEGMENTS;
  return Math.max(1, Math.floor(MAX_PROGRESS_SEGMENTS / groupCount));
}

/**
 * True when the session holds too many words to draw one segment per word.
 * The whole row then switches to continuous progress bars, so every group
 * keeps the same look instead of mixing both styles side by side.
 */
export function shouldUseContinuousBars(categoryGroups: CategoryGroup[]): boolean {
  const limit = maxSegmentsPerGroup(categoryGroups.length);
  return categoryGroups.some((group) => group.wordIds.length > limit);
}

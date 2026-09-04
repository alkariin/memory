import { getIsoDate } from "./dates";
import { shuffle } from "./shuffle";

export const DAILY_SELECTION_KEY = "dailyReviewSelection";

interface StoredSelection {
  date: string;
  wordIds: string[];
}

/**
 * Resolves the words a limited session should show today.
 *
 * `wordIds` is every word assigned to today, answered ones included, and is
 * persisted for the day: reloading the review keeps the same words in the same
 * order, and the "Today" filter can still list them once they have been
 * answered. `words` holds only the ones left to review.
 *
 * A word that becomes due after the draw can still join it while the day is
 * under its cap, so a limit switched on with nothing due does not lock the day.
 */
export function resolveDailySelection<T extends { id: string }>(
  dueWords: T[],
  limit: number,
  storedIds: string[] | null,
): { words: T[]; wordIds: string[] } {
  const cap = Math.max(0, limit);

  if (!storedIds) {
    const drawn = shuffle(dueWords).slice(0, cap);
    return { words: drawn, wordIds: drawn.map((w) => w.id) };
  }

  const assigned = new Set(storedIds);
  const room = cap - storedIds.length;
  const extra =
    room > 0
      ? shuffle(dueWords.filter((w) => !assigned.has(w.id))).slice(0, room)
      : [];

  const wordIds = [...storedIds, ...extra.map((w) => w.id)];
  const dueById = new Map(dueWords.map((w) => [w.id, w]));
  const words = wordIds
    .map((id) => dueById.get(id))
    .filter((w): w is T => Boolean(w));

  return { words, wordIds };
}

/** Today's persisted draw, or null when it has not been drawn yet. */
export function loadDailySelection(today: string = getIsoDate()): string[] | null {
  try {
    const raw = localStorage.getItem(DAILY_SELECTION_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredSelection;
    if (stored?.date !== today || !Array.isArray(stored.wordIds)) return null;
    return stored.wordIds;
  } catch {
    return null;
  }
}

export function saveDailySelection(wordIds: string[], today: string = getIsoDate()): void {
  const stored: StoredSelection = { date: today, wordIds };
  localStorage.setItem(DAILY_SELECTION_KEY, JSON.stringify(stored));
}

/** Drops today's draw so the next session draws a fresh set. */
export function clearDailySelection(): void {
  localStorage.removeItem(DAILY_SELECTION_KEY);
}

/**
 * Today's draw, created on first call and persisted on every one so that a
 * word that became due meanwhile joins it.
 */
export function ensureDailyDraw<T extends { id: string }>(
  dueWords: T[],
  limit: number,
  today: string = getIsoDate(),
): { words: T[]; wordIds: string[] } {
  const drawn = resolveDailySelection(dueWords, limit, loadDailySelection(today));
  saveDailySelection(drawn.wordIds, today);
  return drawn;
}

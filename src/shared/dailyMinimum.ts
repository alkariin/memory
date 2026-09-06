import { getIsoDate } from "./dates";
import { shuffle } from "./shuffle";

export const DAILY_FILLERS_KEY = "dailyReviewFillers";

interface StoredFillers {
  date: string;
  wordIds: string[];
}

/**
 * Picks the words that top the day up to `minimum` cards when fewer are due.
 *
 * Fillers already drawn today are kept (as long as the word still exists and
 * has not joined the session on its own), and more are drawn at random from
 * the rest of the list only while the day is short. A list too small to reach
 * the minimum simply yields what it has.
 */
export function resolveDailyFillers<T extends { id: string }>(
  sessionIds: string[],
  words: T[],
  minimum: number,
  storedIds: string[] | null,
): string[] {
  const inSession = new Set(sessionIds);
  const existing = new Set(words.map((w) => w.id));
  const kept = Array.from(
    new Set((storedIds ?? []).filter((id) => existing.has(id) && !inSession.has(id))),
  );

  const missing = Math.max(0, minimum - sessionIds.length - kept.length);
  if (missing === 0) return kept;

  const taken = new Set([...inSession, ...kept]);
  const extra = shuffle(words.filter((w) => !taken.has(w.id)))
    .slice(0, missing)
    .map((w) => w.id);

  return [...kept, ...extra];
}

/** Today's persisted fillers, or null when none were drawn yet. */
export function loadDailyFillers(today: string = getIsoDate()): string[] | null {
  try {
    const raw = localStorage.getItem(DAILY_FILLERS_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredFillers;
    if (stored?.date !== today || !Array.isArray(stored.wordIds)) return null;
    return stored.wordIds;
  } catch {
    return null;
  }
}

export function saveDailyFillers(wordIds: string[], today: string = getIsoDate()): void {
  const stored: StoredFillers = { date: today, wordIds };
  localStorage.setItem(DAILY_FILLERS_KEY, JSON.stringify(stored));
}

/** Drops today's fillers so the next session draws them again. */
export function clearDailyFillers(): void {
  localStorage.removeItem(DAILY_FILLERS_KEY);
}

/**
 * Today's fillers, drawn on first call and persisted on every one so a day
 * that shrinks below the minimum meanwhile is topped up again.
 */
export function ensureDailyFillers<T extends { id: string }>(
  sessionIds: string[],
  words: T[],
  minimum: number,
  today: string = getIsoDate(),
): string[] {
  const fillers = resolveDailyFillers(sessionIds, words, minimum, loadDailyFillers(today));
  saveDailyFillers(fillers, today);
  return fillers;
}

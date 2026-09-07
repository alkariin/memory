import { getIsoDate } from "./dates";
import { ScheduleSnapshot, Word } from "./types";

export const REVIEW_ANSWERS_KEY = "reviewAnswerSnapshots";
export const REVIEW_ORDER_KEY = "reviewSessionOrder";

interface StoredAnswers {
  date: string;
  snapshots: Record<string, ScheduleSnapshot>;
}

interface StoredOrder {
  date: string;
  wordIds: string[];
}

/**
 * Rebuilds today's session from its frozen word ids: a word already answered
 * stays in place, marked as reviewed, so leaving the tab or the app and coming
 * back resumes the session as it was left rather than dropping what was seen.
 *
 * Only `answeredIds`, the answers given in the day's own session, count as
 * progress. A session started from the list answers words for real as well, so
 * reading "reviewed today" off the word itself would show the day as partly
 * done because of work that has nothing to do with it.
 *
 * A fully answered day returns nothing: the session is over for today.
 */
export function resumeSessionWords(
  storedWords: Word[],
  sessionIds: string[],
  answeredIds: string[],
): (Word & { reviewed: boolean })[] {
  const byId = new Map(storedWords.map((w) => [w.id, w]));
  const answered = new Set(answeredIds);
  const session = sessionIds
    .map((id) => byId.get(id))
    .filter((w): w is Word => Boolean(w))
    .map((w) => ({ ...w, reviewed: answered.has(w.id) }));

  return session.every((w) => w.reviewed) ? [] : session;
}

/** Where to resume: the first word still waiting for an answer. */
export function firstUnreviewedIndex(words: { reviewed: boolean }[]): number {
  const index = words.findIndex((w) => !w.reviewed);
  return index === -1 ? 0 : index;
}

/**
 * Today's pre-answer scheduling states, kept so a restored session can still
 * change an answer without stacking iterations on top of the first one. Only
 * the day's own session writes them, so their ids are also the words it has
 * answered.
 */
export function loadAnswerSnapshots(
  today: string = getIsoDate(),
): Record<string, ScheduleSnapshot> {
  try {
    const raw = localStorage.getItem(REVIEW_ANSWERS_KEY);
    if (!raw) return {};
    const stored = JSON.parse(raw) as StoredAnswers;
    if (stored?.date !== today || !stored.snapshots) return {};
    return stored.snapshots;
  } catch {
    return {};
  }
}

export function saveAnswerSnapshot(
  wordId: string,
  snapshot: ScheduleSnapshot,
  today: string = getIsoDate(),
): void {
  const stored: StoredAnswers = {
    date: today,
    snapshots: { ...loadAnswerSnapshots(today), [wordId]: snapshot },
  };
  localStorage.setItem(REVIEW_ANSWERS_KEY, JSON.stringify(stored));
}

/**
 * Puts the session back in the order it was first shown in. The words are
 * shuffled when the session is built, so without this every visit would
 * reshuffle the day and move the words already answered around.
 *
 * Words missing from the stored order (they became due later) keep their
 * relative place at the end.
 */
export function applySessionOrder<T extends { id: string }>(
  words: T[],
  order: string[] | null,
): T[] {
  if (!order) return words;

  const rank = new Map(order.map((id, index) => [id, index]));
  return [...words].sort(
    (a, b) =>
      (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

/** Today's session order, or null when the day has not been started yet. */
export function loadSessionOrder(today: string = getIsoDate()): string[] | null {
  try {
    const raw = localStorage.getItem(REVIEW_ORDER_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredOrder;
    if (stored?.date !== today || !Array.isArray(stored.wordIds)) return null;
    return stored.wordIds;
  } catch {
    return null;
  }
}

export function saveSessionOrder(
  wordIds: string[],
  today: string = getIsoDate(),
): void {
  const stored: StoredOrder = { date: today, wordIds };
  localStorage.setItem(REVIEW_ORDER_KEY, JSON.stringify(stored));
}

import { getIsoDate } from "./dates";
import { ensureDailyDraw } from "./dailySelection";
import { loadSettings } from "./settings";
import { loadStoredWords } from "./words";
import { Word } from "./types";

export const DAILY_REVIEW_SNAPSHOTS_KEY = "dailyReviewSnapshots";

export function dueWordsFor(words: Word[], today: string = getIsoDate()): Word[] {
  return words.filter((w) => !w.nextReviewDate || w.nextReviewDate <= today);
}

function loadSnapshots(): Record<string, string[]> {
  try {
    const parsed = JSON.parse(localStorage.getItem(DAILY_REVIEW_SNAPSHOTS_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * The words today's review started from, frozen on the first visit of the day.
 * Reviewing a word pushes its next review date away, so without this the
 * "Today" filter would empty itself as the session goes.
 *
 * With the daily limit on, that set is the day's draw itself: the draw already
 * records every word assigned to today, so there is no second copy to keep in
 * sync when the limit changes and the day is drawn again.
 */
export function ensureDailySnapshot(today: string = getIsoDate()): string[] {
  const dueWords = dueWordsFor(loadStoredWords(), today);
  const { dailyLimitEnabled, dailyWordLimit } = loadSettings();

  if (dailyLimitEnabled) {
    return ensureDailyDraw(dueWords, dailyWordLimit, today).wordIds;
  }

  const snapshots = loadSnapshots();
  if (!snapshots[today]) {
    snapshots[today] = dueWords.map((w) => w.id);
    localStorage.setItem(DAILY_REVIEW_SNAPSHOTS_KEY, JSON.stringify(snapshots));
  }
  return snapshots[today];
}

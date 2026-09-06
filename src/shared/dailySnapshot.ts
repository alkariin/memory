import { getIsoDate } from "./dates";
import { ensureDailyDraw } from "./dailySelection";
import { ensureDailyFillers } from "./dailyMinimum";
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
 *
 * With the daily minimum on, a short day is topped up with fillers drawn from
 * the rest of the list; they are part of the day like any due word.
 */
export function ensureDailySnapshot(today: string = getIsoDate()): string[] {
  const storedWords = loadStoredWords();
  const dueWords = dueWordsFor(storedWords, today);
  const { dailyLimitEnabled, dailyWordLimit, dailyMinimumEnabled, dailyMinimumWords } =
    loadSettings();

  let dayIds: string[];
  if (dailyLimitEnabled) {
    dayIds = ensureDailyDraw(dueWords, dailyWordLimit, today).wordIds;
  } else {
    const snapshots = loadSnapshots();
    if (!snapshots[today]) {
      snapshots[today] = dueWords.map((w) => w.id);
      localStorage.setItem(DAILY_REVIEW_SNAPSHOTS_KEY, JSON.stringify(snapshots));
    }
    dayIds = snapshots[today];
  }

  if (!dailyMinimumEnabled) return dayIds;
  return [...dayIds, ...ensureDailyFillers(dayIds, storedWords, dailyMinimumWords, today)];
}

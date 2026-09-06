export const SETTINGS_KEY = "settings";

/** Default size of the daily draw, used when the limit is switched on. */
export const DEFAULT_DAILY_WORD_LIMIT = 15;

/** Default floor of the day, used when the minimum is switched on. */
export const DEFAULT_DAILY_MINIMUM_WORDS = 15;

export interface Settings {
  /**
   * When true, a daily review session draws at most `dailyWordLimit` words
   * at random from everything due, ignoring categories.
   */
  dailyLimitEnabled: boolean;
  dailyWordLimit: number;
  /**
   * When true, a day with fewer than `dailyMinimumWords` cards is topped up
   * with words drawn at random from the rest of the list.
   */
  dailyMinimumEnabled: boolean;
  dailyMinimumWords: number;
}

export const DEFAULT_SETTINGS: Settings = {
  dailyLimitEnabled: false,
  dailyWordLimit: DEFAULT_DAILY_WORD_LIMIT,
  dailyMinimumEnabled: false,
  dailyMinimumWords: DEFAULT_DAILY_MINIMUM_WORDS,
};

function positiveCount(value: unknown, fallback: number): number {
  const count = Number(value);
  return Number.isFinite(count) && count >= 1 ? Math.floor(count) : fallback;
}

/** Normalizes a stored record into the current Settings shape. */
export function migrateSettings(raw: any): Settings {
  return {
    dailyLimitEnabled: raw?.dailyLimitEnabled === true,
    dailyWordLimit: positiveCount(raw?.dailyWordLimit, DEFAULT_DAILY_WORD_LIMIT),
    dailyMinimumEnabled: raw?.dailyMinimumEnabled === true,
    dailyMinimumWords: positiveCount(raw?.dailyMinimumWords, DEFAULT_DAILY_MINIMUM_WORDS),
  };
}

export function loadSettings(): Settings {
  try {
    return migrateSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

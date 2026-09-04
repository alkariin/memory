export const SETTINGS_KEY = "settings";

/** Default size of the daily draw, used when the limit is switched on. */
export const DEFAULT_DAILY_WORD_LIMIT = 15;

export interface Settings {
  /**
   * When true, a daily review session draws at most `dailyWordLimit` words
   * at random from everything due, ignoring categories.
   */
  dailyLimitEnabled: boolean;
  dailyWordLimit: number;
}

export const DEFAULT_SETTINGS: Settings = {
  dailyLimitEnabled: false,
  dailyWordLimit: DEFAULT_DAILY_WORD_LIMIT,
};

/** Normalizes a stored record into the current Settings shape. */
export function migrateSettings(raw: any): Settings {
  const limit = Number(raw?.dailyWordLimit);

  return {
    dailyLimitEnabled: raw?.dailyLimitEnabled === true,
    dailyWordLimit:
      Number.isFinite(limit) && limit >= 1
        ? Math.floor(limit)
        : DEFAULT_DAILY_WORD_LIMIT,
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

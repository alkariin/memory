# Memory

Mobile app to help you remember words.

## Features

- **Add** words with a definition/example and an optional category (one per word)
- **Edit** existing words from the list (navigates to the edit form)
- **Review** words using spaced repetition
- **Filter** by category in the list and start a category-specific review session

## Review Logic

Words are scheduled using a spaced repetition system based on a fixed interval table:

`[0, 1, 3, 7, 14, 30, 60, 120, 240]` days

Two choices are available during review: **Got it** and **Again**.

Behavior depends on how the review session is started:

- **Standard review** (bottom nav `Review`)
  - **Got it** -> `iteration` increases by 1, `nextReviewDate` is recalculated.
  - **Again** -> `iteration` decreases by 2 (minimum `0`), `nextReviewDate` is recalculated.

- **Custom category review** (from `WordList`)
  - Runs in **no-impact mode**.
  - `iteration` and `nextReviewDate` do not change, regardless of **Got it** or **Again**.

## Data Format

Each word stores a single `category` (`string | null`). Exports produced by
earlier versions carry a `tags: string[]` array instead: on import (and when
reading local data) the first tag becomes the category and the others are
dropped.

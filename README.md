# Memory

Mobile app to help you remember words.

## Features

- **Add** words with a definition/example and optional tags
- **Edit** existing words from the list (navigates to the edit form)
- **Review** words using spaced repetition
- **Filter** by tag in the list and start a tag-specific review session

## Review Logic

Words are scheduled using a spaced repetition system based on a fixed interval table:

`[0, 1, 3, 7, 14, 30, 60, 120, 240]` days

Two choices are available during review: **Got it** and **Again**.

Behavior depends on how the review session is started:

- **Standard review** (bottom nav `Review`)
  - **Got it** -> `iteration` increases by 1, `nextReviewDate` is recalculated.
  - **Again** -> `iteration` resets to `0`, `nextReviewDate` is recalculated.

- **Custom tag review** (from `WordList` with a user-defined tag)
  - **Got it** -> `iteration` stays unchanged, `nextReviewDate` is recalculated.
  - **Again** -> `iteration` resets to `0`, `nextReviewDate` is recalculated.

- **Predefined review** (`Today` / `Tomorrow`)
  - Runs in **no-impact mode**.
  - `iteration` and `nextReviewDate` do not change, regardless of **Got it** or **Again**.

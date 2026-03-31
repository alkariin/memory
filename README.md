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

Two choices are available during review:

- **Got it** → the iteration increases, and the next review is scheduled further out.
- **Again** → the iteration resets to 0, and the word comes back the next day.

If the review is triggered by a tag filter, the iteration is not increased (even on "Got it").

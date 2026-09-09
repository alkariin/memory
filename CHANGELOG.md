# Changelog

All notable changes to this project are documented in this file.

## [1.4.0] - 2026-09-09

### Added

- Daily card limit and daily minimum, so a session can be sized to the time available
- Review is now the default view when the app opens
- A day's review resumes where it was left off
- Review categories are drawn at random, and the next one is announced before it starts
- Category filter in the list now has its own review row, and a filtered review can be stopped
- A review answer can be seen and changed instead of being final
- Review cards link back to their list entry
- Deletion is confirmed in the app before it happens
- Deployment to GitHub Pages
- Redesigned app icon: a maskable flashcard stack

### Changed

- Tags replaced by a single category per word
- The word field is now a textarea
- Review progress bars scale to the session size
- The flipped side of a card is highlighted, and the card is tinted only once flipped
- Review navigation stops at both ends instead of wrapping
- The day is frozen before a filtered session starts

### Fixed

- A category is now finished before moving on to the next one
- List reviews no longer count towards the day's progress
- Dates are computed in the local timezone
- The required-field message stays in English

[1.4.0]: https://github.com/alkariin/memory/compare/v1.3.0...v1.4.0

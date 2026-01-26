# Memory

Mobile app to help you remember words.

## Review Logic

The interval is calculated based on the current iteration and the ease of the word.

if HARD the current iteration **does not increase**, and the next review date is set to today + interval / 2.
if MEDIUM the  iteration **increase** and the next review date is today + interval.
if EASY the iteration **increase** and the next review date is today + interval * 1.5.

if the review is forced by tag, the iteration is not increased.
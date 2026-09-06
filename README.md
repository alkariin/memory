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

## Development

```sh
npm install
npm run dev      # local dev server on http://localhost:3000
npm run pwa      # same, exposed on the local network (phone testing)
npm test         # vitest
npm run build    # production build in build/
```

## Deployment

The app is a static PWA hosted on GitHub Pages at
<https://alkariin.github.io/memory/>. All data lives in the browser's
`localStorage`: there is no backend.

Every push to `master` runs `.github/workflows/deploy.yml`, which builds the
app and publishes the `build/` folder. The site is live about a minute later.

Things to know when touching the deployment:

- The app is served under `/memory/`: `base` in `vite.config.ts` drives the
  asset URLs, the router `basename` and the manifest `scope`/`start_url`.
- GitHub Pages has no SPA fallback, so the workflow copies `index.html` to
  `404.html`. Deep links get a 404 status but still load the app.
- The first push of a workflow file needs a `gh` token with the `workflow`
  scope (`gh auth refresh -s workflow`).

### Installing on a phone

1. Open <https://alkariin.github.io/memory/> in the browser.
2. Use "Add to Home screen" / "Install app".
3. Import a previous JSON export from the settings if needed.

### Updates

The service worker (`vite-plugin-pwa`, `autoUpdate` mode) is registered in
`src/pwa.ts`. It checks for a new version each time the app comes back to the
foreground and reloads the page as soon as the new version has taken over. No
manual step is needed: after a deploy, reopening the app is enough.

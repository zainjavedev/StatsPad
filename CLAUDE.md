# CLAUDE.md

StatsPads (statspads.com): a fast NBA stats site. Compare players and teams on a skill radar, leaders, standings, schedule, team pages, game pages. Solo project, owner is the first user. See `README.md` for features and data sources, `PRODUCT.md` for product and brand rules.

## Stack

Next.js 14 app router, React 18, Tailwind, Neon Postgres, web-push, satori + resvg for share/OG images. Deployed on Vercel from `master`. No TypeScript.

## Commands

```bash
npm run dev      # runs prerender first (SKIP_OG=1), then next dev
npm run build    # node scripts/prerender.mjs && next build
npm run lint     # eslint, zero warnings allowed
```

Run `npm run lint` before committing. The build fails on lint errors.

## How the site is laid out

- `src/app/` routes, `src/components/` UI, `src/lib/` data and helpers, `src/server/` API-side code.
- Stats are static JSON under `public/data/<season>/`. GitHub Actions (`refresh-stats.yml`) rebuilds them every 4 hours and the bot pushes "Refresh stats" commits to `master`. Always `git pull --rebase` before pushing.
- The app is client-rendered. `scripts/prerender.mjs` writes static SEO copy for search engines before `next build`.

## SEO and prerender

`scripts/prerender.mjs` generates `src/seo/pages.json`, `public/sitemap.xml`, `public/robots.txt` and `public/og/*`. All of these are gitignored, so never edit or commit them. Change the script instead.

- Pages render from `pages.json` through `src/lib/seo-page.jsx`. A route that isn't in it opens the app with generic tags and is `noindex`.
- Until the 2026-27 season has a player with `OPENING_WEEK_GAMES` games and 150+ players, the static pages use preseason stats. After that they switch to regular-season stats and the sitemap shrinks accordingly.
- `SEO_LIMIT=n` builds n pages of each kind for quick tests. `SKIP_OG=1` skips share-card images. A limited run overwrites `pages.json` and the sitemap, so rerun the full prerender afterwards.
- New indexable routes need an entry in `prerender.mjs` (title, description, body), not just a page file.

## Data rules

- ESPN public APIs are the source for 2026-27. Basketball Reference for older seasons.
- `scripts/fetch-espn-stats.mjs` refuses to write a season's file unless ESPN really returns that season. Don't bypass that.
- Regular-season stats are rebuilt from box scores (`scripts/build-regular-box-stats.mjs`) because ESPN's season feed lags about a day.
- Only ESPN data plus a few logos and headshots from `cdn.nba.com`. No other licensed or NBA-branded assets.
- Early season means thin or empty data is normal. Handle empty states.

## Browser tasks (Search Console etc.)

When the Claude in Chrome tools aren't available, drive the owner's already-open Chrome with `osascript` and `execute t javascript`. Find the tab by URL, navigate by setting `URL of t`, and `delay` before reading. Use `String.fromCharCode(10)` rather than `\n` inside the JS string.

- Search Console for `https://statspads.com/`: URL inspection takes a synthetic Enter on the "Inspect any URL" input, then click the Request indexing button.
- Do the work instead of handing back instructions, and leave the tab where it was.
- Chrome holds real sign-ins, so ask before anything outward-facing or hard to undo (sending, posting, deleting, real form submits).

## Design

Follow `PRODUCT.md` and `DESIGN.md` if present. Mobile first, since many visitors are on a phone. The look is part of the product, so don't ship plain default-styled UI.

## Git commits

- Do not add `Co-Authored-By: Claude ...`, `Claude-Session: ...`, or any other Claude/AI attribution lines to commit messages.
- Do not add "Generated with Claude Code" attribution to pull request descriptions.
- Commits should be authored as the repository owner (Zain Javed), not as Claude.
- Ask before committing or pushing.

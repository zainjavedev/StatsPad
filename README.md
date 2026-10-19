# StatsPad

An NBA player comparison tool built for quick, shareable debates.

## Features

- Compare two or three players or teams
- Official NBA player headshots and team logos with graceful fallbacks
- Regular season and playoff views
- League-adjusted percentile radar charts
- Head-to-head stat winners
- Shareable comparison URLs
- PNG chart download and debate-text copy
- Responsive dark interface

## Data

The committed dataset contains 2025–26 per-game player statistics from Basketball Reference. Percentile charts use rotation players only (at least 15 games and 10 minutes per game in the regular season; three games in the playoffs).

To rebuild a dataset after downloading a Basketball Reference per-game page:

```bash
node scripts/build-data.mjs season.html public/data/2025-26/regular-season.json "Regular Season"
```

## Development

```bash
npm ci
npm run dev
```

The site is a Next.js app. `scripts/prerender.mjs` runs before `dev` and `build`: it writes `src/seo/pages.json` (the readable page for every player, team and popular comparison), the share cards under `public/og` and the sitemap. All three are generated and git-ignored. Secrets (`DATABASE_URL`, `RESEND_API_KEY`) live in `.env.local`.

Checks:

```bash
npm run lint
npm run build   # prerender, then next build
```

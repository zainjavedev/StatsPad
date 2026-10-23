# StatsPad

The place for everything NBA: compare players and teams, follow your team, check scores, standings and leaders. Live at [statspads.com](https://statspads.com).

## Features

- **Compare** two or three players or teams, with percentile radar charts, head-to-head winners and shareable URLs
- **Season views** for preseason, regular season and playoffs; the site always shows the 2026–27 season
- **Team pages** with the expected starting five, bench, and sortable per-game stats
- **Games** with schedule, box scores, recent form and past matchups
- **Spoiler-free by default**: live and finished scores stay hidden until you tap to show them
- **Leaders, standings and news** on the front page
- **Share cards**: clean images with player photos, team stats and a link back
- **Favorite teams**, game-start push alerts and email sign-in codes
- Search-friendly pages for every player, team and popular comparison

## Stack

Next.js 14 (app router), React 18, Neon Postgres, Resend (email), web-push, deployed on Vercel.

## Data

| Source | Used for |
| --- | --- |
| ESPN public APIs | 2026–27 stats, schedule, box scores, news, rosters |
| Basketball Reference | 2025–26 and older seasons (`public/data/2025-26`) |

ESPN has no regular-season numbers before the first game, so until then the preseason stats stand in for the new season. `scripts/fetch-espn-stats.mjs` refuses to write a season's file unless ESPN actually returns that season.

GitHub Actions keep it fresh:

- `refresh-stats.yml` rebuilds stats, schedule, rosters and headshots every 4 hours
- `send-alerts.yml` triggers tip-off alerts (never final scores) every 5 minutes (needs the `CRON_SECRET` and `SITE_URL` repo secrets)

Rebuild a Basketball Reference season from a downloaded per-game page:

```bash
node scripts/build-data.mjs season.html public/data/2025-26/regular-season.json "Regular Season"
```

Percentile charts use rotation players only (15 games and 10 minutes per game, relaxed early in a season).

## Development

```bash
npm ci
npm run dev
```

`scripts/prerender.mjs` runs before `dev` and `build`. It writes `src/seo/pages.json`, the share cards in `public/og` and the sitemap; all three are generated and git-ignored.

Environment variables (`.env.local` locally, Vercel in production):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres (accounts, favorites, alerts) |
| `RESEND_API_KEY`, `MAIL_FROM` | Sign-in code emails |
| `VAPID_*` | Web push keys |
| `CRON_SECRET` | Protects the alerts endpoint |
| `SITE_URL` | Public origin, e.g. `https://statspads.com` |

Run `node scripts/db-setup.mjs` once to create the tables.

## Checks

```bash
npm run lint
npm run build   # prerender, then next build
```

## Contributing

Work on `master`. Commits are authored as the repository owner with no AI attribution lines.

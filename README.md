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

- **Stats** come from Basketball Reference per-game pages. `src/season.json` says which season the site shows (`stats`) and whether playoff files exist.
- **Rosters** for all 30 teams come from ESPN's roster and depth-chart feeds (`public/data/<season>/rosters/<TEAM>.json`), along with `current-teams.json` (where each player plays now). A roster file with `"curated": true` (the Sixers) is hand-maintained and never overwritten.
- **Games and news** load live in the browser from ESPN's public site API.

A GitHub Action (`.github/workflows/update-data.yml`) runs every morning:

```bash
node scripts/build-rosters.mjs   # rosters + current teams from ESPN
node scripts/update-stats.mjs    # new season's stats once 300+ players have played
```

and commits any changes, which redeploys the site. Run it by hand from the Actions tab with "Run workflow".

To rebuild a stats file manually from a downloaded Basketball Reference page:

```bash
node scripts/build-data.mjs season.html public/data/2025-26/regular-season.json "Regular Season" 2025-26
```

## Development

```bash
npm ci
npm run dev
```

Checks:

```bash
npm run lint
npm run build
```

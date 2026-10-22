# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
NBA fans who want everything in one quick glance: the stats, the rosters, what is happening right now, what is hot, and a way to compare players and teams. Many open it on a phone between other things; others at a desk. The owner, a solo developer, is the first user and tests it daily.

## Product Purpose
StatsPads is a fast NBA stats site with the numbers, rosters and live picture in one place: side-by-side player and team comparison with a skill radar, league leaders, standings, the full schedule, team pages with expected starting fives, and game pages with box score, shot chart and game flow. Success is a visitor getting the whole current picture of the league from one glance at the home page, then going deeper into a comparison or a game.

## Positioning
The best-looking stats site. Nearby stat sites are dense tables and ad-heavy pages; StatsPads aims to present the same numbers with real design care. Comparison (two players or teams on a radar scaled to the whole league) is the signature feature, and it is current within hours of a game ending.

## Operating Context
- Data comes from ESPN's public feeds and box scores, refreshed by a GitHub Actions job every four hours. Pages read static JSON, with live scores layered on from ESPN's scoreboard.
- The 2026-27 season has only just started (October 2026): few games played, so many players and teams are thin or empty. Early-season and empty states are a normal condition.
- Next.js 14 App Router on Vercel; client-rendered app with a static pre-rendered copy for search engines. Installable as a PWA.
- Optional sign-in (email or Google) only syncs followed teams across devices. There are no alerts or notifications.

## Capabilities and Constraints
- Pages: Home, Schedule, Standings, Leaders, Compare, Teams and team pages, game pages, account.
- No spoiler mode: every score and stat is always visible. No preseason in the UI; regular season and playoffs only.
- ESPN is the source for everything except a few logos and headshots from `cdn.nba.com`. No other licensed or NBA-branded assets.
- The ESPN season-stats feed lags the scoreboard by about a day, so regular-season stats are rebuilt from box scores (`scripts/build-regular-box-stats.mjs`).

## Brand Commitments
Name: StatsPads. The header mark is an outline basketball. The owner has rejected blue, red and grey as accent colours and the Poppins typeface; the site is currently black and white with Barlow. Top performers always stay on the home page.

## Evidence on Hand
Real data only: ESPN box scores and the generated JSON in `public/data/2026-27/`. There are no testimonials, case studies, press or public usage numbers; do not invent any.

## Product Principles
1. One glance tells the whole league's story: results, leaders, what is hot, what is next.
2. Numbers first: the figure the visitor came for is the biggest thing on screen.
3. Comparison is the signature move and is always one tap away.
4. Honest about thin data: say plainly when a team or player has played one game; never dress up an empty table.
5. Quick on a phone, with no sign-in wall.

## Accessibility & Inclusion
Text at least 12px, contrast at least 4.5:1, tap targets at least 44px on phones, visible keyboard focus, and no information carried by colour alone.

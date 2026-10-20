import fs from 'node:fs';
import { TEAMS } from '../src/lib/teams.js';

/* Writes public/data/2026-27/schedule.json: every game of the season, merged from ESPN's
   schedule for each of the 30 clubs (ESPN's scoreboard only answers one day at a time).
   Rows are [id, start ISO, away code, home code, venue, tv, state, away score, home score].
   The schedule page overlays live scores from ESPN's scoreboard on top.

   Usage: node scripts/build-schedule.mjs */

const out = 'public/data/2026-27/schedule.json';
const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());
const games = new Map();

for (const [code, team] of Object.entries(TEAMS)) {
  const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${team.espn}/schedule`);
  if (!response.ok) { console.warn(`schedule ${code}: ${response.status}`); continue; }
  const {events = []} = await response.json();
  for (const event of events) {
    const competition = event.competitions?.[0];
    if (!competition || games.has(event.id) || event.seasonType?.type !== 2) continue;
    const side = homeAway => competition.competitors.find(entry => entry.homeAway === homeAway);
    const away = side('away'), home = side('home');
    const awayCode = codeOf(away?.team?.abbreviation), homeCode = codeOf(home?.team?.abbreviation);
    if (!awayCode || !homeCode) continue;
    const score = entry => { const value = typeof entry.score === 'object' ? entry.score?.displayValue : entry.score; return value === undefined || value === null || value === '' ? null : Number(value); };
    games.set(event.id, [event.id, event.date, awayCode, homeCode, competition.venue?.fullName ?? '', competition.broadcasts?.map(item => item.media?.shortName).filter(Boolean)[0] ?? '', competition.status?.type?.state ?? 'pre', score(away), score(home)]);
  }
}

const rows = [...games.values()].sort((a, b) => a[1].localeCompare(b[1]));
if (rows.length < 800) throw new Error(`Only ${rows.length} games found; keeping the existing schedule`);
fs.writeFileSync(out, JSON.stringify(rows));
console.log(`schedule: ${rows.length} games`);

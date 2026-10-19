import fs from 'node:fs';
import { TEAMS } from '../src/lib/teams.js';

/* Writes public/data/espn-ids.json: player name -> ESPN athlete id, from ESPN's
   public roster API for all 30 clubs plus the ids already in the 2026-27 roster
   files. The app falls back to ESPN's headshot when the NBA CDN has no id for
   a player (player-ids.json only covers 545 names).

   Usage: node scripts/build-headshots.mjs */

const plain = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ć/g, 'c');
const out = 'public/data/espn-ids.json';
const ids = {};

for (const file of fs.readdirSync('public/data/2026-27/rosters')) {
  for (const entry of JSON.parse(fs.readFileSync(`public/data/2026-27/rosters/${file}`, 'utf8')).players) {
    if (entry.espnId) ids[plain(entry.name)] = Number(entry.espnId);
  }
}

await Promise.all(Object.values(TEAMS).map(async team => {
  try {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${team.espn}/roster`);
    if (!response.ok) throw new Error(response.status);
    for (const athlete of (await response.json()).athletes ?? []) ids[plain(athlete.fullName)] = Number(athlete.id);
  } catch (error) {
    console.warn(`headshots: ${team.espn} roster failed (${error.message})`);
  }
}));

const sorted = Object.fromEntries(Object.entries(ids).sort(([a], [b]) => a.localeCompare(b)));
if (Object.keys(sorted).length < 300) throw new Error(`only ${Object.keys(sorted).length} ids; leaving ${out} untouched`);
fs.writeFileSync(out, JSON.stringify(sorted, null, 1) + '\n');
console.log(`headshots: ${Object.keys(sorted).length} ESPN ids`);

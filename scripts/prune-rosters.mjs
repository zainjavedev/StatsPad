import fs from 'node:fs';
import { TEAMS } from '../src/lib/teams.js';

/* Drops waived and released players from the roster files by checking each name against ESPN's
   current roster for that club. Units, slots and everything else stay as they are, which keeps
   hand-curated files (PHI) intact. Players ESPN lists that a file lacks are reported, not added:
   rebuild that club with `node scripts/build-rosters.mjs --force CODE`.

   Usage: node scripts/prune-rosters.mjs [CODE ...] */

const only = process.argv.slice(2);
const plain = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.']/g, '').replace(/\s+/g, ' ').trim();

for (const code of only.length ? only : Object.keys(TEAMS)) {
  const file = `public/data/2026-27/rosters/${code}.json`;
  const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${TEAMS[code].espn}/roster`);
  if (!response.ok) { console.warn(`${code}: ESPN answered ${response.status}, skipped`); continue; }
  const active = new Set((await response.json()).athletes.map(athlete => plain(athlete.fullName)));
  const roster = JSON.parse(fs.readFileSync(file, 'utf8'));
  const gone = roster.players.filter(player => !active.has(plain(player.name)));
  const have = new Set(roster.players.map(player => plain(player.name)));
  const missing = [...active].filter(name => !have.has(name));
  if (gone.length) {
    roster.players = roster.players.filter(player => active.has(plain(player.name)));
    roster.lastUpdated = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(file, `${JSON.stringify(roster, null, 2)}\n`);
  }
  console.log(`${code}: ${gone.length ? `removed ${gone.map(player => player.name).join(', ')}` : 'already current'}${missing.length ? ` | on ESPN but not here: ${missing.join(', ')}` : ''}`);
}

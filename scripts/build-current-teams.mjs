import fs from 'node:fs';
import path from 'node:path';

/* Where every player plays now, from the roster files, as one small lookup the
   app reads (public/data/<roster season>/current-teams.json). Stats are last
   season's, so without it Jaylen Brown, LeBron and everyone who moved would be
   shown with the team they played for last year. Run by `npm run build` and
   `npm run dev`; rerun after refreshing rosters.

   node scripts/build-current-teams.mjs */

const season = '2026-27';
const dir = path.join(import.meta.dirname, '..', 'public/data', season);
const plain = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.']/g, '').replace(/ (jr|sr|ii|iii|iv)$/, '').trim();

const lookup = {season, updated: new Date().toISOString().slice(0, 10), byEspn: {}, byBbref: {}, byName: {}};
const ambiguous = new Set();
for (const file of fs.readdirSync(path.join(dir, 'rosters')).filter(name => name.endsWith('.json'))) {
  const roster = JSON.parse(fs.readFileSync(path.join(dir, 'rosters', file), 'utf8'));
  for (const player of roster.players) {
    if (player.espnId) lookup.byEspn[player.espnId] = roster.team;
    if (player.bbrefId) lookup.byBbref[player.bbrefId] = roster.team;
    const key = plain(player.name);
    if (key in lookup.byName && lookup.byName[key] !== roster.team) ambiguous.add(key);
    lookup.byName[key] = roster.team;
  }
}
/* Two players with the same name on different teams: only the ids can tell them apart. */
for (const key of ambiguous) delete lookup.byName[key];

fs.writeFileSync(path.join(dir, 'current-teams.json'), `${JSON.stringify(lookup)}\n`);
console.log(`current-teams: ${Object.keys(lookup.byName).length} names, ${Object.keys(lookup.byEspn).length} ESPN ids, ${Object.keys(lookup.byBbref).length} Basketball Reference ids${ambiguous.size ? `, ${ambiguous.size} shared names left to ids` : ''}`);

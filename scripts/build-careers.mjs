import fs from 'node:fs';
import path from 'node:path';
import { SEASONS } from '../src/lib/season.js';
import { TEAMS } from '../src/lib/teams.js';
import { slugify } from '../src/lib/routes.js';

/* Season-by-season per-game history for every player, from ESPN's player stats
   pages, written to public/data/careers/<slug>.json (slug = the player-page
   URL slug). Only completed seasons are stored; the app adds the season in
   progress from the live stats feed. Files that already exist are kept, so the
   scheduled run only fetches players it hasn't seen (new names after a season
   switch). `--all` re-fetches everyone, which is what you want once a season
   finishes.

   node scripts/build-careers.mjs [--all] */

const all = process.argv.includes('--all');
const BASE = 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba';
const outDir = 'public/data/careers';
const latest = SEASONS.find(key => {
  const file = `public/data/${key}/regular-season.json`;
  return fs.existsSync(file) && JSON.parse(fs.readFileSync(file, 'utf8')).players?.length;
});
/* Seasons before the current one are "completed" (e.g. 2025-26 while 2026-27 is current). */
const lastCompleted = Number(SEASONS[0].slice(0, 4));

const getJson = async (url, tries = 4) => {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(30000)});
      if (!response.ok) throw new Error(`${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt >= tries) throw new Error(`${url}: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 800 * attempt));
    }
  }
};
const plain = name => name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.']/g, '').replace(/ (jr|sr|ii|iii|iv)$/, '').trim();

/* The app's own player names, so file names match the URLs it builds. */
const appPlayers = JSON.parse(fs.readFileSync(`public/data/${latest}/regular-season.json`, 'utf8')).players;
const espnList = [];
for (let page = 1; ; page++) {
  const data = await getJson(`${BASE}/statistics/byathlete?region=us&lang=en&isqualified=false&page=${page}&limit=50&season=${Number(latest.slice(0, 4)) + 1}&seasontype=2`);
  if (!data.athletes?.length) break;
  espnList.push(...data.athletes.map(row => ({id: row.athlete.id, name: row.athlete.displayName})));
  if (page >= data.pagination.pages) break;
}
const idByName = new Map(espnList.map(entry => [plain(entry.name), entry.id]));
const jobs = appPlayers
  .map(player => ({name: player.playerName, slug: slugify(player.playerName), id: player.playerId.startsWith('espn-') ? player.playerId.slice(5) : idByName.get(plain(player.playerName))}))
  .filter(job => job.id && (all || !fs.existsSync(path.join(outDir, `${job.slug}.json`))));

const codeBySlug = Object.fromEntries(Object.entries(TEAMS).map(([code, team]) => [slugify(team.name), code]));
/* Past franchises have no code; show the nickname ("Nets", "SuperSonics"). */
const teamLabel = slug => codeBySlug[slug] || slug.split('-').slice(-1)[0].replace(/^./, letter => letter.toUpperCase());
const num = value => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; };
const split = value => String(value).split('-').map(num);

async function career(job) {
  const data = await getJson(`${BASE}/athletes/${job.id}/stats`);
  const averages = data.categories?.find(category => category.name === 'averages');
  if (!averages) return null;
  const at = (row, label) => row.stats[averages.labels.indexOf(label)];
  const rows = averages.statistics.filter(row => row.season?.year <= lastCompleted).map(row => {
    const [fgm, fga] = split(at(row, 'FG')), [tpm, tpa] = split(at(row, '3PT')), [ftm, fta] = split(at(row, 'FT'));
    const total = !row.teamId;
    return {
      s: row.season.displayName, t: total ? 'TOT' : teamLabel(row.teamSlug), ...(total && {tot: 1}),
      gp: num(at(row, 'GP')), gs: num(at(row, 'GS')), mpg: num(at(row, 'MIN')),
      pts: num(at(row, 'PTS')), reb: num(at(row, 'REB')), ast: num(at(row, 'AST')), stl: num(at(row, 'STL')), blk: num(at(row, 'BLK')),
      tov: num(at(row, 'TO')), pf: num(at(row, 'PF')),
      fgm, fga, fgp: num(at(row, 'FG%')), tpm, tpa, tpp: num(at(row, '3P%')), ftm, fta, ftp: num(at(row, 'FT%')),
    };
  });
  return rows.length ? {name: job.name, espnId: job.id, rows} : null;
}

fs.mkdirSync(outDir, {recursive: true});
let cursor = 0, written = 0, empty = 0, failed = 0;
await Promise.all(Array.from({length: 8}, async () => {
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    try {
      const result = await career(job);
      if (!result) { empty += 1; fs.writeFileSync(path.join(outDir, `${job.slug}.json`), JSON.stringify({name: job.name, espnId: job.id, rows: []})); continue; }
      fs.writeFileSync(path.join(outDir, `${job.slug}.json`), JSON.stringify(result));
      written += 1;
    } catch (error) {
      failed += 1;
      console.error(`${job.name}: ${error.message}`);
    }
  }
}));
console.log(`careers: ${written} written, ${empty} with no earlier seasons, ${failed} failed, ${appPlayers.length - jobs.length} already present`);
if (failed > jobs.length / 2) process.exit(1);

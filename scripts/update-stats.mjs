/* Nightly stats refresh. Downloads Basketball Reference's per-game pages for
   the current season, rebuilds the player and team JSON with the existing
   build scripts, and points src/season.json at the new season once enough of
   it has been played (until then the site keeps last season's numbers).

   node scripts/update-stats.mjs */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const MIN_PLAYERS = 300;   // roughly the first week of the regular season
const MIN_PLAYOFF_PLAYERS = 100;

const today = new Date();
const startYear = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
const season = `${startYear}-${String(startYear + 1).slice(2)}`;
const endYear = startYear + 1;
const config = JSON.parse(await fs.readFile('src/season.json', 'utf8'));
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'statspad-'));

async function download(url, name) {
  const response = await fetch(url, {headers: {'User-Agent': 'Mozilla/5.0 (StatsPad nightly update)'}});
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  const file = path.join(tmp, name);
  await fs.writeFile(file, await response.text());
  await new Promise(resolve => setTimeout(resolve, 4000)); // be polite to Basketball Reference
  return file;
}
const build = (script, input, output, type) => execFileSync('node', [`scripts/${script}`, input, output, type, season], {stdio: 'inherit'});
const count = async file => JSON.parse(await fs.readFile(file, 'utf8')).players.length;

const dir = `public/data/${season}`;
const staging = path.join(tmp, 'out');
const regular = await download(`https://www.basketball-reference.com/leagues/NBA_${endYear}_per_game.html`, 'regular.html');
let players = 0;
try {
  build('build-data.mjs', regular, `${staging}/regular-season.json`, 'Regular Season');
  players = await count(`${staging}/regular-season.json`);
} catch {
  players = 0; // no per-game table yet: season hasn't started
}
console.log(`${season} regular season: ${players} players`);
if (players < MIN_PLAYERS) {
  console.log(`Fewer than ${MIN_PLAYERS} players; keeping ${config.stats} stats.`);
  process.exit(0);
}

const teamsPage = await download(`https://www.basketball-reference.com/leagues/NBA_${endYear}.html`, 'teams.html');
build('build-team-data.mjs', teamsPage, `${staging}/teams-regular-season.json`, 'Regular Season');

let playoffs = false;
try {
  const playoffPage = await download(`https://www.basketball-reference.com/playoffs/NBA_${endYear}_per_game.html`, 'playoffs.html');
  build('build-data.mjs', playoffPage, `${staging}/playoffs.json`, 'Playoffs');
  if (await count(`${staging}/playoffs.json`) >= MIN_PLAYOFF_PLAYERS) {
    const playoffTeams = await download(`https://www.basketball-reference.com/playoffs/NBA_${endYear}.html`, 'playoff-teams.html');
    build('build-team-data.mjs', playoffTeams, `${staging}/teams-playoffs.json`, 'Playoffs');
    playoffs = true;
  }
} catch {
  playoffs = false; // playoffs not started
}

await fs.mkdir(dir, {recursive: true});
const files = ['regular-season.json', 'teams-regular-season.json', ...(playoffs ? ['playoffs.json', 'teams-playoffs.json'] : [])];
for (const file of files) await fs.copyFile(`${staging}/${file}`, `${dir}/${file}`);
const next = {...config, stats: season, playoffs};
await fs.writeFile('src/season.json', `${JSON.stringify(next, null, 2)}\n`);
console.log(`Stats now ${season}${playoffs ? ' with playoffs' : ''}.`);

import fs from 'node:fs';
import path from 'node:path';

/* Pulls per-game player and team stats from ESPN's public stats API and writes
   them in the same shape build-data.mjs / build-team-data.mjs produce from
   Basketball Reference, so the app reads either one.

   node scripts/fetch-espn-stats.mjs <seasonEndYear|auto> [regular|playoffs] [--force]

   e.g. `2027` is the 2026-27 season. Nothing is written until at least one game
   has been played, so the site keeps showing the previous season until then.
   --force writes anyway (used to check this script against a finished season). */

const [yearArg, kind = 'regular'] = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
/* "auto" is the season in progress: the one that ends next calendar year from September on. */
const now = new Date();
const endYear = yearArg === 'auto' ? String(now.getFullYear() + (now.getMonth() >= 8 ? 1 : 0)) : yearArg;
const force = process.argv.includes('--force');
if (!/^\d{4}$/.test(endYear || '') || !['regular', 'playoffs'].includes(kind)) {
  console.error('Usage: node scripts/fetch-espn-stats.mjs 2027 [regular|playoffs] [--force]');
  process.exit(1);
}
const season = `${Number(endYear) - 1}-${endYear.slice(2)}`;
const seasonType = kind === 'playoffs' ? 3 : 2;
const label = kind === 'playoffs' ? 'Playoffs' : 'Regular Season';
const fileSuffix = kind === 'playoffs' ? 'playoffs' : 'regular-season';
const outDir = process.env.OUT_DIR || path.join('public/data', season);
const BASE = 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba';

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
/* ESPN's abbreviations for six clubs differ from the codes the app uses. */
const CODES = {UTAH: 'UTA', NO: 'NOP', WSH: 'WAS', SA: 'SAS', GS: 'GSW', NY: 'NYK'};
const codeOf = abbr => CODES[abbr] || abbr;
const plain = name => name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.']/g, '').replace(/ (jr|sr|ii|iii|iv)$/, '');
/* ESPN only says G / F / C. Keep last season's five-position label when we have it. */
const lastSeason = path.join('public/data', `${Number(endYear) - 2}-${String(Number(endYear) - 1).slice(2)}`, `${fileSuffix === 'playoffs' ? 'regular-season' : fileSuffix}.json`);
const knownPositions = fs.existsSync(lastSeason) ? new Map(JSON.parse(fs.readFileSync(lastSeason, 'utf8')).players.map(player => [plain(player.playerName), player.position])) : new Map();
const round = (value, places = 1) => Number(Number(value || 0).toFixed(places));
const pct = (made, attempted) => (attempted ? round((made / attempted) * 100) : 0);
let statNames = {};
const named = (athlete, group) => {
  const values = athlete.categories.find(entry => entry.name === group)?.values;
  const names = statNames[group] || [];
  return key => values?.[names.indexOf(key)] ?? 0;
};

async function fetchPlayers() {
  const rows = [];
  for (let page = 1; ; page++) {
    const data = await getJson(`${BASE}/statistics/byathlete?region=us&lang=en&isqualified=false&page=${page}&limit=50&season=${endYear}&seasontype=${seasonType}&sort=offensive.avgPoints%3Adesc`);
    /* Before a season's first game ESPN answers a request for it with the PREVIOUS season's numbers
       (requestedSeason is then last year's), which would be saved here as this season. Stop unless
       the season that came back is the one asked for. */
    if (page === 1 && !force && data.requestedSeason?.year !== Number(endYear)) {
      console.log(`ESPN is still serving ${data.requestedSeason?.displayName ?? 'another season'} for ${season}; leaving data untouched.`);
      process.exit(0);
    }
    if (!data.athletes?.length) break; // a season with no games yet comes back empty
    rows.push(...data.athletes);
    statNames = Object.fromEntries(data.categories.map(category => [category.name, category.names]));
    if (page >= data.pagination.pages) break;
  }
  return rows;
}

/* The league-wide table has no offensive/defensive rebound split, but each
   player's own stats page does. Reuse earlier answers while games played is
   unchanged so a refresh only re-asks about players who actually played. */
const cacheFile = path.join('.cache', `espn-reb-${season}-${fileSuffix}.json`);
const rebCache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
async function reboundSplit(id, gamesPlayed) {
  const cached = rebCache[id];
  if (cached && cached.gamesPlayed === gamesPlayed) return cached;
  const data = await getJson(`${BASE}/athletes/${id}/stats`);
  const averages = data.categories?.find(category => category.name === 'averages');
  /* A player traded mid-season has one row per club plus a Totals row (no teamId); weight the club rows by games played. */
  const stints = (averages?.statistics || []).filter(row => row.season?.year === Number(endYear) && row.teamId);
  const at = (row, label) => Number(row.stats?.[averages.labels.indexOf(label)]) || 0;
  const games = stints.reduce((sum, row) => sum + at(row, 'GP'), 0);
  const weighted = label => (games ? stints.reduce((sum, row) => sum + at(row, label) * at(row, 'GP'), 0) / games : 0);
  const result = {gamesPlayed, offensive: weighted('OR'), defensive: weighted('DR'), started: stints.reduce((sum, row) => sum + at(row, 'GS'), 0)};
  rebCache[id] = result;
  return result;
}

const athletes = await fetchPlayers();
const played = athletes.filter(row => named(row, 'general')('gamesPlayed') > 0);
if (!played.length && !force) {
  console.log(`No ${season} ${label.toLowerCase()} games yet — leaving data untouched.`);
  process.exit(0);
}

const seen = new Set();
const players = [];
const queue = played.filter(row => !seen.has(row.athlete.displayName) && seen.add(row.athlete.displayName));
let cursor = 0;
await Promise.all(Array.from({length: 8}, async () => {
  while (cursor < queue.length) {
    const row = queue[cursor++];
    const general = named(row, 'general'), offense = named(row, 'offensive'), defense = named(row, 'defensive');
    const gamesPlayed = general('gamesPlayed');
    const split = await reboundSplit(row.athlete.id, gamesPlayed).catch(() => ({offensive: 0, defensive: 0}));
    const fgm = offense('avgFieldGoalsMade'), fga = offense('avgFieldGoalsAttempted'), tpm = offense('avgThreePointFieldGoalsMade');
    players.push({
      playerId: `espn-${row.athlete.id}`,
      playerName: row.athlete.displayName,
      team: codeOf(row.athlete.teamShortName || ''),
      position: knownPositions.get(plain(row.athlete.displayName)) || row.athlete.position?.abbreviation || '',
      age: row.athlete.age || 0,
      gamesPlayed,
      gamesStarted: split.started || 0,
      minutesPerGame: round(general('avgMinutes')),
      rank: 0,
      stats: {
        points: round(offense('avgPoints')),
        assists: round(offense('avgAssists')),
        totalRebounds: round(general('avgRebounds')),
        offensiveRebounds: round(split.offensive),
        defensiveRebounds: round(split.defensive),
        steals: round(defense('avgSteals')),
        blocks: round(defense('avgBlocks')),
        turnovers: round(offense('avgTurnovers')),
        personalFouls: round(general('avgFouls')),
        fieldGoalsMade: round(fgm),
        fieldGoalsAttempted: round(fga),
        fieldGoalPercentage: round(offense('fieldGoalPct')),
        threePointersMade: round(tpm),
        threePointersAttempted: round(offense('avgThreePointFieldGoalsAttempted')),
        threePointPercentage: round(offense('threePointFieldGoalPct')),
        freeThrowsMade: round(offense('avgFreeThrowsMade')),
        freeThrowsAttempted: round(offense('avgFreeThrowsAttempted')),
        freeThrowPercentage: round(offense('freeThrowPct')),
        effectiveFieldGoalPercentage: fga ? round(((fgm + 0.5 * tpm) / fga) * 100) : 0,
      },
    });
  }
}));
if (!players.length) throw new Error('Refusing to write an empty player list');
fs.mkdirSync('.cache', {recursive: true});
fs.writeFileSync(cacheFile, JSON.stringify(rebCache));
players.sort((a, b) => b.stats.points - a.stats.points || a.playerName.localeCompare(b.playerName));
players.forEach((player, index) => { player.rank = index + 1; });

const source = {name: 'ESPN', url: 'https://www.espn.com/nba/stats/_/season/' + endYear};
const stamp = new Date().toISOString().slice(0, 10);
/* Leave a file alone when only the date stamp would change, so a refresh with no
   new games doesn't produce a commit (and a redeploy). */
const write = (file, payload) => {
  const target = path.join(outDir, file);
  if (fs.existsSync(target)) {
    const before = JSON.parse(fs.readFileSync(target, 'utf8'));
    if (JSON.stringify({...before, lastUpdated: ''}) === JSON.stringify({...payload, lastUpdated: ''})) return console.log(`${file}: unchanged`);
  }
  fs.mkdirSync(outDir, {recursive: true});
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`${file}: updated`);
};
write(`${fileSuffix}.json`, {season, seasonType: label, description: `NBA player per-game statistics for the ${season} ${label.toLowerCase()}`, lastUpdated: stamp, source, totalPlayers: players.length, players});

/* Teams: ESPN returns each team's own row first in every category, then the
   opponents'. Indexes below are positions inside that first row. */
const teamData = await getJson(`${BASE}/statistics/byteam?region=us&lang=en&season=${endYear}&seasontype=${seasonType}`);
const ids = JSON.parse(fs.readFileSync('src/lib/team-ids.json', 'utf8'));
const teams = teamData.teams.map(entry => {
  const own = name => entry.categories.find(category => category.name === name).values;
  const general = own('general'), offense = own('offensive'), defense = own('defensive');
  const abbr = codeOf(entry.team.abbreviation);
  const fgm = offense[6], fga = offense[7], tpm = offense[8];
  return {
    entityType: 'team', teamId: ids[abbr], team: abbr, playerName: entry.team.displayName, rank: 0,
    gamesPlayed: general[7], position: 'Team',
    stats: {
      points: round(offense[0]), assists: round(offense[13]), totalRebounds: round(general[1]),
      offensiveRebounds: round(offense[12]), defensiveRebounds: round(defense[1]),
      steals: round(defense[2]), blocks: round(defense[3]), turnovers: round(offense[4]), personalFouls: round(general[8]),
      fieldGoalsMade: round(fgm), fieldGoalsAttempted: round(fga), fieldGoalPercentage: round(offense[1]),
      threePointersMade: round(tpm), threePointersAttempted: round(offense[9]), threePointPercentage: round(offense[2]),
      freeThrowsMade: round(offense[10]), freeThrowsAttempted: round(offense[11]), freeThrowPercentage: round(offense[3]),
      effectiveFieldGoalPercentage: fga ? round(((fgm + 0.5 * tpm) / fga) * 100) : 0,
    },
  };
}).filter(team => team.gamesPlayed > 0).sort((a, b) => b.stats.points - a.stats.points).map((team, index) => ({...team, rank: index + 1}));
write(`teams-${fileSuffix}.json`, {season, seasonType: label, description: `NBA team per-game statistics for the ${season} ${label.toLowerCase()}`, lastUpdated: stamp, source, totalTeams: teams.length, players: teams});

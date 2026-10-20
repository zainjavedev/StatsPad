import fs from 'node:fs';
import { TEAMS } from '../src/lib/teams.js';

/* The 2026-27 preseason as a season of its own: per-game player and team averages built from every finished
   preseason box score, in the same shape fetch-espn-stats.mjs writes, as public/data/2026-27/preseason.json and
   teams-preseason.json. The site offers it beside the regular season and playoffs, and uses it for the pages that
   show "current" numbers until real 2026-27 regular-season stats exist.

   Usage: node scripts/build-preseason-stats.mjs */

const dir = 'public/data/2026-27';
const playersFile = `${dir}/preseason.json`, teamsFile = `${dir}/teams-preseason.json`;

const plain = name => name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.']/g, '').replace(/ (jr|sr|ii|iii|iv)$/, '');
const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());
const round = (value, places = 1) => Number(Number(value || 0).toFixed(places));
const pct = (made, attempted) => (attempted ? round(made / attempted * 100) : 0);
const pair = value => String(value ?? '0-0').split('-').map(Number).map(number => number || 0);
const minutes = value => Number(String(value ?? '0').split(':')[0]) || 0;

const lastSeason = JSON.parse(fs.readFileSync('public/data/2025-26/regular-season.json', 'utf8')).players;
const known = new Map(lastSeason.map(player => [plain(player.playerName), player.position]));
const rosterInfo = new Map();
for (const code of Object.keys(TEAMS)) for (const player of JSON.parse(fs.readFileSync(`${dir}/rosters/${code}.json`, 'utf8')).players) rosterInfo.set(String(player.espnId), player);

const schedule = JSON.parse(fs.readFileSync(`${dir}/schedule.json`, 'utf8')).filter(row => row[9] === 1 && row[6] === 'post');
const blank = () => ({games: 0, started: 0, min: 0, pts: 0, ast: 0, reb: 0, oreb: 0, dreb: 0, stl: 0, blk: 0, tov: 0, pf: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0});
const players = new Map(), teams = Object.fromEntries(Object.keys(TEAMS).map(code => [code, blank()]));

for (const [id] of schedule) {
  const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${id}`);
  if (!response.ok) continue;
  const data = await response.json();
  for (const entry of data.boxscore?.players ?? []) {
    const code = codeOf(entry.team.abbreviation);
    if (!code) continue;
    const block = entry.statistics?.[0];
    if (!block) continue;
    const at = (item, label) => item.stats[block.labels.indexOf(label)];
    teams[code].games += 1;
    for (const item of block.athletes) {
      if (item.didNotPlay || !item.stats?.length) continue;
      const key = `${item.athlete.id}:${code}`;
      const row = players.get(key) ?? {id: item.athlete.id, name: item.athlete.displayName, code, position: item.athlete.position?.abbreviation ?? '', ...blank()};
      const [fgm, fga] = pair(at(item, 'FG')), [tpm, tpa] = pair(at(item, '3PT')), [ftm, fta] = pair(at(item, 'FT'));
      const add = {games: 1, started: item.starter ? 1 : 0, min: minutes(at(item, 'MIN')), pts: +at(item, 'PTS') || 0, ast: +at(item, 'AST') || 0, reb: +at(item, 'REB') || 0, oreb: +at(item, 'OREB') || 0, dreb: +at(item, 'DREB') || 0, stl: +at(item, 'STL') || 0, blk: +at(item, 'BLK') || 0, tov: +at(item, 'TO') || 0, pf: +at(item, 'PF') || 0, fgm, fga, tpm, tpa, ftm, fta};
      for (const [field, value] of Object.entries(add)) { row[field] += value; teams[code][field] += field === 'games' || field === 'started' ? 0 : value; }
      players.set(key, row);
    }
  }
}

const stats = (row, per) => ({
  points: round(row.pts / per), assists: round(row.ast / per), totalRebounds: round(row.reb / per), offensiveRebounds: round(row.oreb / per), defensiveRebounds: round(row.dreb / per),
  steals: round(row.stl / per), blocks: round(row.blk / per), turnovers: round(row.tov / per), personalFouls: round(row.pf / per),
  fieldGoalsMade: round(row.fgm / per), fieldGoalsAttempted: round(row.fga / per), fieldGoalPercentage: pct(row.fgm, row.fga),
  threePointersMade: round(row.tpm / per), threePointersAttempted: round(row.tpa / per), threePointPercentage: pct(row.tpm, row.tpa),
  freeThrowsMade: round(row.ftm / per), freeThrowsAttempted: round(row.fta / per), freeThrowPercentage: pct(row.ftm, row.fta),
  effectiveFieldGoalPercentage: row.fga ? round((row.fgm + 0.5 * row.tpm) / row.fga * 100) : 0,
});

const list = [...players.values()].map(row => {
  const info = rosterInfo.get(String(row.id));
  return {
    playerId: `espn-${row.id}`, playerName: row.name, team: row.code,
    position: known.get(plain(row.name)) || info?.pos || row.position,
    age: info?.birthDate ? Math.floor((Date.now() - new Date(info.birthDate)) / 31557600000) : 0,
    gamesPlayed: row.games, gamesStarted: row.started, minutesPerGame: round(row.min / row.games), rank: 0, stats: stats(row, row.games),
  };
}).sort((a, b) => b.stats.points - a.stats.points || a.playerName.localeCompare(b.playerName));
list.forEach((player, index) => { player.rank = index + 1; });

const ids = JSON.parse(fs.readFileSync('src/lib/team-ids.json', 'utf8'));
const teamList = Object.entries(teams).filter(([, row]) => row.games > 0).map(([code, row]) => ({
  entityType: 'team', teamId: ids[code], team: code, playerName: TEAMS[code].name, rank: 0, gamesPlayed: row.games, position: 'Team', stats: stats(row, row.games),
})).sort((a, b) => b.stats.points - a.stats.points).map((team, index) => ({...team, rank: index + 1}));

const source = {name: 'ESPN preseason box scores', url: 'https://www.espn.com/nba/schedule'};
const stamp = new Date().toISOString().slice(0, 10);
fs.mkdirSync(dir, {recursive: true});
fs.writeFileSync(playersFile, `${JSON.stringify({season: '2026-27', seasonType: 'Preseason', description: 'NBA player per-game statistics for the 2026-27 preseason', lastUpdated: stamp, source, totalPlayers: list.length, players: list}, null, 2)}\n`);
fs.writeFileSync(teamsFile, `${JSON.stringify({season: '2026-27', seasonType: 'Preseason', description: 'NBA team per-game statistics for the 2026-27 preseason', lastUpdated: stamp, source, totalTeams: teamList.length, players: teamList}, null, 2)}\n`);
console.log(`preseason stats: ${schedule.length} games, ${list.length} players, ${teamList.length} teams`);

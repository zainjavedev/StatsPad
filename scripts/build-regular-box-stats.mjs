import fs from 'node:fs';
import { TEAMS } from '../src/lib/teams.js';

/* The 2026-27 regular season built from every finished box score, in the same shape fetch-espn-stats.mjs writes.
   ESPN's season-stats feed runs about a day behind the scoreboard, so right after a game night it lists only some
   teams. This fills the gap: it replaces regular-season.json and teams-regular-season.json only when the box scores
   cover more teams than the files already do, so ESPN's own numbers win once they catch up.

   Usage: node scripts/build-regular-box-stats.mjs */

const dir = 'public/data/2026-27';
const playersFile = `${dir}/regular-season.json`, teamsFile = `${dir}/teams-regular-season.json`;

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

const schedule = JSON.parse(fs.readFileSync(`${dir}/schedule.json`, 'utf8')).filter(row => row[9] !== 1 && Date.parse(row[1]) < Date.now());
/* schedule.json only learns a game is over when it is rebuilt, so every game that has tipped off is asked about and kept only if ESPN calls it final. */
const blank = () => ({games: 0, started: 0, min: 0, pts: 0, ast: 0, reb: 0, oreb: 0, dreb: 0, stl: 0, blk: 0, tov: 0, pf: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0});
const players = new Map(), teams = Object.fromEntries(Object.keys(TEAMS).map(code => [code, blank()]));

/* Every player-game, with the (Eastern) day it was played, so the ladders can be ranked as of any night. */
const dayOf = iso => new Date(iso).toLocaleDateString('en-CA', {timeZone: 'America/New_York'});
const log = [], results = [];
schedule.sort((a, b) => a[1].localeCompare(b[1]));
for (const [id, date] of schedule) {
  const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${id}`);
  if (!response.ok) continue;
  const data = await response.json();
  if (data.header?.competitions?.[0]?.status?.type?.state !== 'post') continue;
  for (const side of data.header.competitions[0].competitors ?? []) { const code = codeOf(side.team?.abbreviation); if (code) results.push({day: dayOf(date), code, won: Boolean(side.winner)}); }
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
      log.push({day: dayOf(date), id: String(item.athlete.id), name: item.athlete.displayName, code, team: code, ...add});
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


/* ---------- MVP and rookie ladders ----------
   Ranked on per-game game score (Hollinger's linear mix of the box score), among players with real minutes who have
   played enough of their team's games. Ranked as of the end of every game day, so each player's move is the change
   in his place since the previous night. */
const days = [...new Set(log.map(entry => entry.day))].sort();
const gameScore = row => (row.pts + 0.4 * row.fgm - 0.7 * row.fga - 0.4 * (row.fta - row.ftm) + 0.7 * row.oreb + 0.3 * row.dreb + row.stl + 0.7 * row.ast + 0.7 * row.blk - 0.4 * row.pf - row.tov);
function rankAsOf(day) {
  const upto = log.filter(entry => entry.day <= day);
  const byPlayer = new Map();
  for (const entry of upto) {
    const row = byPlayer.get(entry.id) ?? {id: entry.id, name: entry.name, code: entry.code, games: 0, min: 0, pts: 0, reb: 0, ast: 0, gs: 0, fgm: 0, fga: 0, fta: 0, ftm: 0};
    row.games += 1; row.min += entry.min; row.pts += entry.pts; row.reb += entry.reb; row.ast += entry.ast; row.gs += gameScore(entry);
    row.fgm += entry.fgm; row.fga += entry.fga; row.fta += entry.fta; row.ftm += entry.ftm; row.code = entry.code;
    byPlayer.set(entry.id, row);
  }
  /* "Games a team has played" is the typical team's count, not the busiest player's: one team playing a game early
     must not push everyone else off the ladder for the night (that made nearly the whole top six read as NEW). */
  const teamDays = new Map();
  for (const entry of upto) { if (!teamDays.has(entry.code)) teamDays.set(entry.code, new Set()); teamDays.get(entry.code).add(entry.day); }
  const counts = [...teamDays.values()].map(days => days.size).sort((a, b) => a - b);
  const gamesOf = Math.max(1, counts[Math.floor(counts.length / 2)] ?? 1);
  const need = Math.max(1, Math.ceil(gamesOf * 0.6));
  const eligible = [...byPlayer.values()].filter(row => row.games >= need && row.min / row.games >= 20);
  /* The rating is per-game game score alone. Each average is pulled toward its pool's by six games' worth (it fades as the season
     fills in, and stops a one-game fluke leapfrogging someone who has done it for several). */
  const WEIGHT = 6;
  const meanOf = (list, get) => (list.length ? list.reduce((sum, row) => sum + get(row) / row.games, 0) / list.length : 0);
  const rank = list => {
    const gsPrior = meanOf(list, row => row.gs);
    return list.map(row => {
      /* The rating is per-game game score alone, pulled toward the pool's average by six games' worth. */
      const gs = (row.gs + WEIGHT * gsPrior) / (row.games + WEIGHT);
      return {...row, rate: gs};
    }).sort((a, b) => b.rate - a.rate || a.name.localeCompare(b.name));
  };
  const mvp = rank(eligible);
  /* Rookies play fewer minutes, so they only need a short rotation role, but they still have to have played most of
     their team's games to be on a ladder. */
  const firstYear = [...byPlayer.values()].filter(row => (rosterInfo.get(row.id)?.exp === 0 || rosterInfo.get(row.id)?.exp === '0') && row.games >= need && row.min / row.games >= 12);
  const rookies = rank(firstYear);
  /* Every other first-year player who has played comes after the ranked ones, ordered the same way, so the rookie page lists them all. */
  const ranked = new Set(firstYear.map(row => row.id));
  const others = rank([...byPlayer.values()].filter(row => (rosterInfo.get(row.id)?.exp === 0 || rosterInfo.get(row.id)?.exp === '0') && !ranked.has(row.id)));
  return {mvp, rookies: [...rookies, ...others], qualifiedRookies: rookies.length};
}
const latest = days.at(-1), before = days.length > 1 ? days.at(-2) : null;
if (latest) {
  const now = rankAsOf(latest), then = before ? rankAsOf(before) : null;
  const place = (list, id) => { const index = list.findIndex(row => row.id === id); return index < 0 ? null : index + 1; };
  const entry = (row, rank, board, thenBoard) => {
    const info = rosterInfo.get(row.id);
    const prev = thenBoard ? place(thenBoard, row.id) : undefined;
    return {rank, qualified: rank <= (board.qualifiedCount ?? board.length), playerId: `espn-${row.id}`, espnId: row.id, name: row.name, team: row.code, position: known.get(plain(row.name)) || info?.pos || '', games: row.games,
      pts: round(row.pts / row.games), reb: round(row.reb / row.games), ast: round(row.ast / row.games), min: round(row.min / row.games),
      ts: row.fga + 0.44 * row.fta ? round(row.pts / (2 * (row.fga + 0.44 * row.fta)) * 100) : 0, score: round(row.rate),
      /* positive = moved up; null = was not on the ladder the night before; undefined = no earlier night to compare with */
      move: prev === undefined ? undefined : prev === null ? null : prev - rank};
  };
  /* The MVP ladder lists 30; the rookie ladder lists every rookie who has played, with a flag for the ones who have not yet met the games and minutes bar. */
  const top = (list, thenList, size = list.length, qualifiedCount = list.length) => { list.qualifiedCount = qualifiedCount; return list.slice(0, size).map((row, index) => entry(row, index + 1, list, thenList)); };
  const out = {season: '2026-27', updated: new Date().toISOString().slice(0, 10), through: latest, compared: before, mvp: top(now.mvp, then?.mvp, 30), rookie: top(now.rookies, then?.rookies, now.rookies.length, now.qualifiedRookies)};
  fs.writeFileSync(`${dir}/ladders.json`, `${JSON.stringify(out)}\n`);
  console.log(`ladders: through ${latest}${before ? `, compared with ${before}` : ''}; MVP ${out.mvp.map(row => row.name).join(', ')}`);
}

/* Box scores win whenever they hold more games than the files already do: ESPN's season feed runs about a day
   behind, so on its own it can list a player at one game when he has played two. Once the feed catches up the
   totals are equal and ESPN's own numbers stay. */
let existingTeams = 0, existingTeamGames = 0, existingPlayerGames = 0;
try {
  const teamsOnFile = JSON.parse(fs.readFileSync(teamsFile, 'utf8')).players;
  existingTeams = teamsOnFile.length;
  existingTeamGames = teamsOnFile.reduce((sum, team) => sum + (team.gamesPlayed || 0), 0);
  existingPlayerGames = JSON.parse(fs.readFileSync(playersFile, 'utf8')).players.reduce((sum, player) => sum + (player.gamesPlayed || 0), 0);
} catch { /* no file yet */ }
const boxTeamGames = teamList.reduce((sum, team) => sum + team.gamesPlayed, 0), boxPlayerGames = list.reduce((sum, player) => sum + player.gamesPlayed, 0);
if (teamList.length <= existingTeams && boxTeamGames <= existingTeamGames && boxPlayerGames <= existingPlayerGames) {
  console.log(`regular-season stats: ESPN's files already cover ${existingTeamGames} team games and ${existingPlayerGames} player games, box scores cover ${boxTeamGames} and ${boxPlayerGames}; leaving them`);
  process.exit(0);
}
const source = {name: 'ESPN box scores', url: 'https://www.espn.com/nba/schedule'};
const stamp = new Date().toISOString().slice(0, 10);
fs.mkdirSync(dir, {recursive: true});
fs.writeFileSync(playersFile, `${JSON.stringify({season: '2026-27', seasonType: 'Regular Season', description: 'NBA player per-game statistics for the 2026-27 regular season', lastUpdated: stamp, source, totalPlayers: list.length, players: list}, null, 2)}\n`);
fs.writeFileSync(teamsFile, `${JSON.stringify({season: '2026-27', seasonType: 'Regular Season', description: 'NBA team per-game statistics for the 2026-27 regular season', lastUpdated: stamp, source, totalTeams: teamList.length, players: teamList}, null, 2)}\n`);
console.log(`regular-season box-score stats: ${schedule.length} games, ${list.length} players, ${teamList.length} teams`);

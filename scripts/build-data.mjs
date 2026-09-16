import fs from 'node:fs';
import path from 'node:path';

const [input, output, seasonType] = process.argv.slice(2);
if (!input || !output || !seasonType) {
  console.error('Usage: node scripts/build-data.mjs input.html output.json "Regular Season"');
  process.exit(1);
}

const html = fs.readFileSync(input, 'utf8');
const table = html.match(/<table[^>]+id="per_game_stats"[\s\S]*?<\/table>/)?.[0];
if (!table) throw new Error('Could not find per_game_stats table');

const text = (value = '') => value
  .replace(/<[^>]+>/g, '')
  .replaceAll('&nbsp;', ' ')
  .replaceAll('&amp;', '&')
  .replaceAll('&#x27;', "'")
  .replaceAll('&quot;', '"')
  .trim();
const number = (value, percentage = false) => {
  const parsed = Number(text(value));
  if (!Number.isFinite(parsed)) return 0;
  return percentage ? Number((parsed * 100).toFixed(1)) : parsed;
};

const get = (row, stat) => row.match(new RegExp(`<t[dh][^>]*data-stat="${stat}"[^>]*>([\\s\\S]*?)<\\/t[dh]>`))?.[1] ?? '';
const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
  .map((match) => match[1])
  .filter((row) => (get(row, 'name_display') || get(row, 'player')).includes('/players/'));

const seen = new Set();
const players = rows.map((row, index) => ({
  playerId: row.match(/data-append-csv="([^"]+)"/)?.[1] ?? `player-${index}`,
  playerName: text(get(row, 'name_display') || get(row, 'player')),
  team: text(get(row, 'team_name_abbr') || get(row, 'team_id')),
  position: text(get(row, 'pos')),
  age: number(get(row, 'age')),
  gamesPlayed: number(get(row, 'games') || get(row, 'g')),
  gamesStarted: number(get(row, 'games_started') || get(row, 'gs')),
  minutesPerGame: number(get(row, 'mp_per_g')),
  rank: index + 1,
  stats: {
    points: number(get(row, 'pts_per_g')),
    assists: number(get(row, 'ast_per_g')),
    totalRebounds: number(get(row, 'trb_per_g')),
    offensiveRebounds: number(get(row, 'orb_per_g')),
    defensiveRebounds: number(get(row, 'drb_per_g')),
    steals: number(get(row, 'stl_per_g')),
    blocks: number(get(row, 'blk_per_g')),
    turnovers: number(get(row, 'tov_per_g')),
    personalFouls: number(get(row, 'pf_per_g')),
    fieldGoalsMade: number(get(row, 'fg_per_g')),
    fieldGoalsAttempted: number(get(row, 'fga_per_g')),
    fieldGoalPercentage: number(get(row, 'fg_pct'), true),
    threePointersMade: number(get(row, 'fg3_per_g')),
    threePointersAttempted: number(get(row, 'fg3a_per_g')),
    threePointPercentage: number(get(row, 'fg3_pct'), true),
    freeThrowsMade: number(get(row, 'ft_per_g')),
    freeThrowsAttempted: number(get(row, 'fta_per_g')),
    freeThrowPercentage: number(get(row, 'ft_pct'), true),
    effectiveFieldGoalPercentage: number(get(row, 'efg_pct'), true),
  },
})).filter((player) => {
  if (seen.has(player.playerName)) return false;
  seen.add(player.playerName);
  return true;
}).sort((a, b) => b.stats.points - a.stats.points)
  .map((player, index) => ({ ...player, rank: index + 1 }));

const payload = {
  season: '2025-26',
  seasonType,
  description: `NBA player per-game statistics for the 2025-26 ${seasonType.toLowerCase()}`,
  lastUpdated: '2026-09-15',
  source: {
    name: 'Basketball Reference',
    url: seasonType === 'Playoffs'
      ? 'https://www.basketball-reference.com/playoffs/NBA_2026_per_game.html'
      : 'https://www.basketball-reference.com/leagues/NBA_2026_per_game.html',
  },
  totalPlayers: players.length,
  players,
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${players.length} players to ${output}`);

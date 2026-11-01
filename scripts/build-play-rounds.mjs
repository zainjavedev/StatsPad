import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { SEASONS } from '../src/lib/season.js';
import { parseSummary, shotsOf } from '../src/lib/boxscore.js';

/* Ready-made lines for Guess the Player: every starter's night from the latest finished regular-season games that is good enough
   for a round (22+ minutes, 7+ shots, 12+ points, 6+ charted shots, an ESPN headshot), with the shot chart. The game reads this
   one small file instead of fetching a 400 KB ESPN summary before it can show anything; it still picks the decoys itself.
   Reads the summaries that scripts/sync-espn-db.mjs stores in game_raw, so it runs after that step.

   Usage: node --env-file=.env.local scripts/build-play-rounds.mjs [season] [--games n] */

const args = process.argv.slice(2), GAMES = Number(args[args.indexOf('--games') + 1]) || 120;
const season = args.find(arg => /^\d{4}-\d{2}$/.test(arg)) ?? SEASONS[0];
const sql = neon(process.env.DATABASE_URL);
const num = value => Number(String(value ?? '').replace('+', '')) || 0;
const attempts = value => Number(String(value ?? '0-0').split('-')[1]) || 0;

const schedule = JSON.parse(fs.readFileSync(`public/data/${season}/schedule.json`, 'utf8'));
/* Rows are [id, start ISO, away, home, venue, tv, state, away score, home score, preseason flag]. */
const ids = schedule.filter(row => row[6] === 'post' && row[9] !== 1).sort((a, b) => b[1].localeCompare(a[1])).slice(0, GAMES).map(row => String(row[0]));
/* A summary is about 400 KB, so each game comes on its own with only the parts a round needs (shots, not every play), retried if the connection drops. */
const rows = [];
for (const id of ids) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      rows.push(...await sql`select game_id, jsonb_build_object('header', data->'header', 'boxscore', data->'boxscore',
        'plays', jsonb_path_query_array(data->'plays', '$[*] ? (@.shootingPlay == true)')) as data from game_raw where game_id = ${id}`);
      break;
    } catch (error) {
      if (attempt === 3) { console.warn(`skipped ${id}: ${error.message}`); break; }
    }
  }
}

const games = [];
for (const {game_id: id, data} of rows) {
  const box = parseSummary(data);
  if (box.state !== 'post' || box.preseason || !box.away || !box.home) continue;
  const players = box.teams.flatMap(team => team.players
    .filter(player => player.starter && !player.out && player.id && player.hasPhoto && num(player.stats.MIN) >= 22 && attempts(player.stats.FG) >= 7 && num(player.stats.PTS) >= 12)
    .map(player => ({id: player.id, name: player.name, team: team.abbr, line: player.stats, shots: shotsOf(box.plays, player.id).map(shot => [shot.x, shot.y, shot.made ? 1 : 0])}))
    .filter(player => player.shots.length >= 6));
  if (players.length) games.push({id, date: box.date, away: {abbr: box.away.abbr, score: box.away.score}, home: {abbr: box.home.abbr, score: box.home.score}, players});
}
games.sort((a, b) => String(b.date).localeCompare(String(a.date)));

const out = `public/data/${season}/play-rounds.json`;
fs.writeFileSync(out, JSON.stringify({updated: new Date().toISOString(), games}));
console.log(`${out}: ${games.length} games, ${games.reduce((sum, game) => sum + game.players.length, 0)} lines, ${Math.round(fs.statSync(out).size / 1024)} KB`);

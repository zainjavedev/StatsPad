import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { TEAMS } from '../src/lib/teams.js';
import { SEASONS } from '../src/lib/season.js';

/* Copies every finished game's ESPN box score into Postgres (games, team_game_stats, player_game_stats).
   Games already stored are skipped, so a run only fetches what finished since the last one and it is safe to repeat.
   The season comes from the first argument and defaults to the current one (SEASONS[0]); it reads
   public/data/<season>/schedule.json, so a new season works as soon as that file exists.
   Playoff games only sync if the schedule file lists them.

   Every game also keeps ESPN's full summary in game_raw, and each box-score line keeps every stat ESPN lists (stats / totals as jsonb),
   so nothing ESPN offers is lost. --refresh re-fetches games that are already stored.

   Usage: node --env-file=.env.local scripts/sync-espn-db.mjs [season] [--limit n] [--refresh] */

const args = process.argv.slice(2);
const season = args.find(arg => /^\d{4}-\d{2}$/.test(arg)) ?? SEASONS[0];
const limit = Number(args[args.indexOf('--limit') + 1]) || Infinity;
const sql = neon(process.env.DATABASE_URL);

const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());
const pair = value => String(value ?? '0-0').split('-').map(Number).map(number => number || 0);
const whole = value => Number.parseInt(value, 10) || 0;

const file = `public/data/${season}/schedule.json`;
if (!fs.existsSync(file)) throw new Error(`No schedule for ${season}: ${file}`);
const schedule = JSON.parse(fs.readFileSync(file, 'utf8'));
const stored = new Set((await sql`select id from games where season = ${season}`).map(row => row.id));
/* Rows are [id, start ISO, away, home, venue, tv, state, away score, home score, preseason flag]. A game that has tipped off is asked about; only ESPN's own "final" keeps it. */
const refresh = args.includes('--refresh');
const due = schedule.filter(row => (refresh || !stored.has(row[0])) && Date.parse(row[1]) < Date.now()).sort((a, b) => a[1].localeCompare(b[1])).slice(0, limit);

let added = 0;
for (const [id, start, away, home, venue, , , , , preseason] of due) {
  /* A failed fetch skips the game; it is still unstored, so the next run picks it up. */
  const data = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${id}`).then(response => response.ok ? response.json() : null).catch(() => null);
  if (!data) continue;
  const competition = data.header?.competitions?.[0];
  if (competition?.status?.type?.state !== 'post') continue;
  const sides = Object.fromEntries((competition.competitors ?? []).map(side => [side.homeAway, {code: codeOf(side.team?.abbreviation), score: whole(side.score), won: Boolean(side.winner)}]));
  if (!sides.home?.code || !sides.away?.code) continue;
  const seasonType = preseason === 1 ? 'preseason' : competition.series ? 'playoffs' : 'regular';
  const teams = [['home', 'away'], ['away', 'home']].map(([mine, theirs]) => ({team: sides[mine].code, opponent: sides[theirs].code, is_home: mine === 'home', score: sides[mine].score, opponent_score: sides[theirs].score, won: sides[mine].won}));
  const totalsOf = code => { const side = data.boxscore?.teams?.find(item => codeOf(item.team?.abbreviation) === code); return side ? Object.fromEntries(side.statistics.map(stat => [stat.label, stat.displayValue])) : null; };
  for (const team of teams) team.totals = totalsOf(team.team);
  const {videos, news, standings, ...raw} = data;
  const players = [];
  for (const entry of data.boxscore?.players ?? []) {
    const code = codeOf(entry.team?.abbreviation), block = entry.statistics?.[0];
    if (!code || !block) continue;
    const opponent = code === sides.home.code ? sides.away.code : sides.home.code;
    const at = (item, label) => item.stats[block.labels.indexOf(label)];
    for (const item of block.athletes) {
      if (item.didNotPlay || !item.stats?.length) continue;
      const [fgm, fga] = pair(at(item, 'FG')), [tpm, tpa] = pair(at(item, '3PT')), [ftm, fta] = pair(at(item, 'FT'));
      players.push({espn_player_id: String(item.athlete.id), team: code, opponent, name: item.athlete.displayName, starter: Boolean(item.starter), minutes: whole(at(item, 'MIN')), pts: whole(at(item, 'PTS')), reb: whole(at(item, 'REB')), oreb: whole(at(item, 'OREB')), dreb: whole(at(item, 'DREB')), ast: whole(at(item, 'AST')), stl: whole(at(item, 'STL')), blk: whole(at(item, 'BLK')), tov: whole(at(item, 'TO')), pf: whole(at(item, 'PF')), fgm, fga, tpm, tpa, ftm, fta, plus_minus: whole(at(item, '+/-')), stats: Object.fromEntries(block.labels.map((label, index) => [label, item.stats[index]]))});
    }
  }
  await sql.transaction([
    sql`delete from games where id = ${id}`,
    sql`insert into games (id, season, season_type, played_at, away, home, away_score, home_score, venue) values (${id}, ${season}, ${seasonType}, ${start}, ${sides.away.code}, ${sides.home.code}, ${sides.away.score}, ${sides.home.score}, ${venue || null}) on conflict (id) do update set away_score = excluded.away_score, home_score = excluded.home_score, synced_at = now()`,
    sql`insert into team_game_stats (game_id, team, opponent, is_home, score, opponent_score, won, totals) select ${id}, t.team, t.opponent, t.is_home, t.score, t.opponent_score, t.won, t.totals from jsonb_to_recordset(${JSON.stringify(teams)}::jsonb) as t(team text, opponent text, is_home boolean, score int, opponent_score int, won boolean, totals jsonb) on conflict (game_id, team) do nothing`,
    sql`insert into player_game_stats (game_id, espn_player_id, season, team, opponent, name, starter, minutes, pts, reb, oreb, dreb, ast, stl, blk, tov, pf, fgm, fga, tpm, tpa, ftm, fta, plus_minus, stats)
      select ${id}, p.espn_player_id, ${season}, p.team, p.opponent, p.name, p.starter, p.minutes, p.pts, p.reb, p.oreb, p.dreb, p.ast, p.stl, p.blk, p.tov, p.pf, p.fgm, p.fga, p.tpm, p.tpa, p.ftm, p.fta, p.plus_minus, p.stats
      from jsonb_to_recordset(${JSON.stringify(players)}::jsonb) as p(espn_player_id text, team text, opponent text, name text, starter boolean, minutes int, pts int, reb int, oreb int, dreb int, ast int, stl int, blk int, tov int, pf int, fgm int, fga int, tpm int, tpa int, ftm int, fta int, plus_minus int, stats jsonb)
      on conflict (game_id, espn_player_id) do nothing`,
    sql`insert into game_raw (game_id, data) values (${id}, ${JSON.stringify(raw)}::jsonb)`,
  ]);
  added += 1;
}
console.log(`sync-espn-db ${season}: ${added} new games (${stored.size} already stored, ${due.length} checked)`);

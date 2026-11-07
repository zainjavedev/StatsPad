import { sql } from './db';
import { SEASONS } from '../lib/season';

/* Grading picks without waiting for the box-score sync: the games table only fills when the refresh workflow runs (often an
   hour or more after the last final), so finished games that have picks but no stored score are looked up on ESPN's
   scoreboard and their winner kept in pick_results. The grading queries read games first and pick_results for the rest. */

export const eastern = date => new Date(date).toLocaleDateString('en-CA', {timeZone: 'America/New_York'});

/* The schedule file the site serves (preseason left out, as on /fixtures), cached for five minutes: game id -> {start, away, home}. */
let schedule, fetchedAt = 0;
export const loadSchedule = async origin => {
  if (schedule && Date.now() - fetchedAt < 300e3) return schedule;
  const rows = await fetch(new URL(`/data/${SEASONS[0]}/schedule.json`, origin), {cache: 'no-store'}).then(response => response.json());
  schedule = new Map(rows.filter(row => row[9] !== 1).map(([id, start, away, home]) => [String(id), {start, away, home}]));
  fetchedAt = Date.now();
  return schedule;
};

let ready;
export const ensurePicks = () => (ready ??= (async () => {
  await sql`create table if not exists predictions (
    game_id text not null,
    subscriber_id uuid not null,
    pick text not null,
    at timestamptz not null default now(),
    primary key (game_id, subscriber_id)
  )`;
  await sql`create table if not exists pick_results (game_id text primary key, winner text not null, day date not null)`;
})().catch(error => { ready = undefined; throw error; }));

/* At most once a minute per server: picked games that tipped off over two hours ago and have no stored winner yet. */
let settledAt = 0, settling;
export async function settle(origin) {
  if (Date.now() - settledAt < 60e3) return settling;
  settledAt = Date.now();
  settling = (async () => {
    const open = await sql`select distinct p.game_id from predictions p
      where not exists (select 1 from games g where g.id = p.game_id and g.home_score is not null and g.away_score is not null)
        and not exists (select 1 from pick_results r where r.game_id = p.game_id)`;
    if (!open.length) return;
    const games = await loadSchedule(origin);
    const due = open.map(row => [row.game_id, games.get(row.game_id)]).filter(([, game]) => game && Date.parse(game.start) < Date.now() - 2 * 36e5);
    for (const day of [...new Set(due.map(([, game]) => eastern(game.start)))].slice(0, 4)) {
      const board = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${day.replaceAll('-', '')}`, {cache: 'no-store', signal: AbortSignal.timeout(4000)}).then(response => response.json());
      for (const event of board.events ?? []) {
        const game = games.get(String(event.id)), match = event.competitions?.[0];
        if (!game || !match?.status?.type?.completed || !due.some(([id]) => id === String(event.id))) continue;
        const winner = match.competitors?.find(side => side.winner);
        if (!winner) continue;
        await sql`insert into pick_results (game_id, winner, day) values (${String(event.id)}, ${winner.homeAway === 'home' ? game.home : game.away}, ${day}) on conflict do nothing`;
      }
    }
  })().catch(error => console.error('settle picks', error.message));
  return settling;
}

import { NextResponse } from 'next/server';
import { sql } from '../../../server/db';
import { SEASONS } from '../../../lib/season';

export const dynamic = 'force-dynamic';

/* Fixture predictions: one pick (a team code) per account per game, changeable until tip-off. The table is created on first use
   (and by scripts/db-setup.mjs). A pick is graded against the games table, which the box-score sync fills after each game. */
let ready;
const ensure = () => (ready ??= (async () => {
  await sql`create table if not exists predictions (
    game_id text not null,
    subscriber_id uuid not null,
    pick text not null,
    at timestamptz not null default now(),
    primary key (game_id, subscriber_id)
  )`;
})().catch(error => { ready = undefined; throw error; }));

/* The schedule file the site serves (preseason left out, as on /fixtures), cached for five minutes: game id -> {start, away, home}. */
let schedule, fetchedAt = 0;
const loadSchedule = async origin => {
  if (schedule && Date.now() - fetchedAt < 300e3) return schedule;
  const rows = await fetch(new URL(`/data/${SEASONS[0]}/schedule.json`, origin), {cache: 'no-store'}).then(response => response.json());
  schedule = new Map(rows.filter(row => row[9] !== 1).map(([id, start, away, home]) => [String(id), {start, away, home}]));
  fetchedAt = Date.now();
  return schedule;
};

const ID = /^\d{1,14}$/;
const fail = (error, status) => NextResponse.json({error}, {status});
const account = async token => (token ? (await sql`select id from subscribers where token = ${token} and channel = 'email'`)[0] : null);

/* How many picked each side, by game: {id: {BOS: 12, NYK: 5}}. */
const crowdFor = async ids => {
  const rows = ids.length ? await sql`select game_id, pick, count(*)::int as n from predictions where game_id = any(${ids}) group by game_id, pick` : [];
  return rows.reduce((all, row) => ({...all, [row.game_id]: {...all[row.game_id], [row.pick]: row.n}}), {});
};

/* GET ?ids=1,2,3&token=…: the crowd split for those games, plus this account's picks for them, its record so far and its rank. */
export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const ids = [...new Set(String(params.get('ids') || '').split(',').filter(id => ID.test(id)))].slice(0, 120);
  await ensure();
  const [me, crowd] = await Promise.all([account(String(params.get('token') || '')), crowdFor(ids)]);
  if (!me) return NextResponse.json({crowd, picks: {}, record: null});
  const [picks, [record]] = await Promise.all([
    ids.length ? sql`select game_id, pick from predictions where subscriber_id = ${me.id} and game_id = any(${ids})` : [],
    /* Every picker's graded record; you rank by wins, ties sharing a place. */
    sql`with graded as (
        select p.subscriber_id, count(*) filter (where p.pick = case when g.home_score > g.away_score then g.home else g.away end)::int as won, count(*)::int as total
        from predictions p join games g on g.id = p.game_id
        where g.home_score is not null and g.away_score is not null and g.home_score <> g.away_score
        group by p.subscriber_id)
      select me.won, me.total, (select count(*) from graded other where other.won > me.won)::int + 1 as rank, (select count(*) from graded)::int as players
      from graded me where me.subscriber_id = ${me.id}`,
  ]);
  return NextResponse.json({crowd, picks: Object.fromEntries(picks.map(row => [row.game_id, row.pick])), record: record ? {won: record.won, lost: record.total - record.won, rank: record.rank, players: record.players} : null});
}

/* POST {token, game, pick}: saves (or changes) this account's pick while the game has not started, and returns the game's split. */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const game = String(body?.game || ''), pick = String(body?.pick || '');
  if (!ID.test(game)) return fail('Unknown game.', 400);
  const found = (await loadSchedule(request.url).catch(() => new Map())).get(game);
  if (!found || (pick !== found.away && pick !== found.home)) return fail('Unknown game.', 400);
  if (new Date(found.start) <= new Date()) return fail('This game has started. Picks are locked.', 409);
  await ensure();
  const me = await account(String(body?.token || ''));
  if (!me) return fail('Sign in to make picks.', 401);
  await sql`insert into predictions (game_id, subscriber_id, pick) values (${game}, ${me.id}, ${pick})
    on conflict (game_id, subscriber_id) do update set pick = excluded.pick, at = now()`;
  return NextResponse.json({crowd: (await crowdFor([game]))[game] || {}});
}

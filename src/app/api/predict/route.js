import { NextResponse } from 'next/server';
import { sql } from '../../../server/db';
import { eastern, ensurePicks as ensure, loadSchedule, settle } from '../../../server/picks';

export const dynamic = 'force-dynamic';

/* Fixture predictions: one pick (a team code) per account per game, changeable until tip-off. The table is created on first use
   (and by scripts/db-setup.mjs). A pick is graded against the games table (the box-score sync), or pick_results until the sync catches up (server/picks.js). */
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
  await settle(request.url);
  const [picks, [record]] = await Promise.all([
    ids.length ? sql`select game_id, pick from predictions where subscriber_id = ${me.id} and game_id = any(${ids})` : [],
    /* Every picker's graded record; you rank by wins, ties sharing a place. */
    sql`with graded as (
        select p.subscriber_id, count(*) filter (where p.pick = g.winner)::int as won, count(*)::int as total
        from predictions p join (
          select id, case when home_score > away_score then home else away end as winner from games where home_score is not null and away_score is not null and home_score <> away_score
          union all
          select r.game_id, r.winner from pick_results r where not exists (select 1 from games s where s.id = r.game_id and s.home_score is not null and s.away_score is not null)
        ) g on g.id = p.game_id
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
  const schedule = await loadSchedule(request.url).catch(() => new Map()), found = schedule.get(game);
  if (!found || (pick !== found.away && pick !== found.home)) return fail('Unknown game.', 400);
  if (new Date(found.start) <= new Date()) return fail('This game has started. Picks are locked.', 409);
  /* One day open at a time: the earliest day (Eastern) with a game still to tip off. */
  const pickDay = [...schedule.values()].filter(row => new Date(row.start) > new Date()).map(row => eastern(row.start)).sort()[0];
  if (eastern(found.start) !== pickDay) return fail('Picks for this day open once the earlier games have tipped off.', 409);
  await ensure();
  const me = await account(String(body?.token || ''));
  if (!me) return fail('Sign in to make picks.', 401);
  await sql`insert into predictions (game_id, subscriber_id, pick) values (${game}, ${me.id}, ${pick})
    on conflict (game_id, subscriber_id) do update set pick = excluded.pick, at = now()`;
  return NextResponse.json({crowd: (await crowdFor([game]))[game] || {}});
}

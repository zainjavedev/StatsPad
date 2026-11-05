import { NextResponse } from 'next/server';
import { sql } from '../../../server/db';

export const dynamic = 'force-dynamic';

/* Blind test picks: one vote per account per pair (two ESPN ids, sorted, joined by "_"). The table is created on first use. */
let ready;
const ensure = () => (ready ??= (async () => {
  await sql`create table if not exists blind_votes (
    pair text not null,
    subscriber_id uuid not null,
    pick text not null,
    at timestamptz not null default now(),
    primary key (pair, subscriber_id)
  )`;
})().catch(error => { ready = undefined; throw error; }));

const PAIR = /^\d{1,12}_\d{1,12}$/;
const fail = (error, status) => NextResponse.json({error}, {status});

/* POST {token, pair, pick}: records (or changes) this account's pick and returns how many picked the same and how many voted. */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token || ''), pair = String(body?.pair || ''), pick = String(body?.pick || '');
  if (!PAIR.test(pair) || !pair.split('_').includes(pick)) return fail('Unknown pair.', 400);
  await ensure();
  const [me] = token ? await sql`select id from subscribers where token = ${token} and channel = 'email'` : [];
  if (!me) return fail('Sign in to play.', 401);
  await sql`insert into blind_votes (pair, subscriber_id, pick) values (${pair}, ${me.id}, ${pick})
    on conflict (pair, subscriber_id) do update set pick = excluded.pick, at = now()`;
  const [row] = await sql`select count(*) filter (where pick = ${pick})::int as same, count(*)::int as total from blind_votes where pair = ${pair}`;
  return NextResponse.json(row);
}

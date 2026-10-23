import { NextResponse } from 'next/server';
import { sql } from '../../../server/db';

export const dynamic = 'force-dynamic';

/* Guess the Player scores, one row per account (the email subscriber's token). The table is created on first use. */
let ready;
const ensure = () => (ready ??= sql`create table if not exists play_scores (
  token text primary key,
  correct int not null default 0,
  total int not null default 0,
  streak int not null default 0,
  best int not null default 0,
  updated_at timestamptz not null default now()
)`.catch(error => { ready = undefined; throw error; }));

const signedIn = async token => token && (await sql`select 1 from subscribers where token = ${token} and channel = 'email'`).length > 0;
const shape = row => ({correct: row?.correct ?? 0, total: row?.total ?? 0, streak: row?.streak ?? 0, best: row?.best ?? 0});
const fail = (error, status) => NextResponse.json({error}, {status});

export async function GET(request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  await ensure();
  if (!await signedIn(token)) return fail('Sign in to play.', 401);
  const [row] = await sql`select correct, total, streak, best from play_scores where token = ${token}`;
  return NextResponse.json(shape(row));
}

/* POST {token, correct: boolean} records one answer and returns the new totals. */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token || '');
  await ensure();
  if (!await signedIn(token)) return fail('Sign in to play.', 401);
  const right = body?.correct === true ? 1 : 0;
  const [row] = await sql`insert into play_scores (token, correct, total, streak, best) values (${token}, ${right}, 1, ${right}, ${right})
    on conflict (token) do update set
      correct = play_scores.correct + ${right},
      total = play_scores.total + 1,
      streak = case when ${right} = 1 then play_scores.streak + 1 else 0 end,
      best = greatest(play_scores.best, case when ${right} = 1 then play_scores.streak + 1 else 0 end),
      updated_at = now()
    returning correct, total, streak, best`;
  return NextResponse.json(shape(row));
}

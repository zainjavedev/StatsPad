import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { sql } from '../../../../server/db';
import { TEAMS } from '../../../../lib/teams';

export const dynamic = 'force-dynamic';

/* POST {credential, teams}: Google has verified the email, so signing in confirms it. Teams from this
   browser are merged into the account's, and the merged list goes back to the browser. */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(String(body?.credential || ''))}`);
  const info = response.ok ? await response.json() : null;
  if (!info || info.aud !== process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || info.email_verified !== 'true' || !info.email) {
    return NextResponse.json({error: 'Google sign-in failed. Try again.'}, {status: 401});
  }
  const local = (Array.isArray(body.teams) ? body.teams : []).filter(code => TEAMS[code]);
  const [row] = await sql`insert into subscribers (token, channel, email, email_confirmed_at, teams) values (${randomBytes(24).toString('hex')}, 'email', ${info.email}, now(), ${local})
    on conflict (lower(email)) where email is not null do update set email_confirmed_at = coalesce(subscribers.email_confirmed_at, now()),
      password_hash = case when subscribers.email_confirmed_at is null then null else subscribers.password_hash end,
      teams = (select coalesce(array_agg(distinct t), '{}') from unnest(subscribers.teams || excluded.teams) t)
    returning token, email, teams`;
  return NextResponse.json({token: row.token, email: row.email, teams: row.teams});
}

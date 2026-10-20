import { NextResponse } from 'next/server';
import { sql } from '../../../server/db';

export const dynamic = 'force-dynamic';

/* The emailed link lands on the app, which trades the one-time code for the account token. */
export const GET = request => NextResponse.redirect(new URL(`/account?signin=${encodeURIComponent(new URL(request.url).searchParams.get('code') || '')}`, request.url));

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const [login] = await sql`delete from login_codes where code = ${String(body?.code || '')} and expires_at > now() returning subscriber_token`;
  if (!login) return NextResponse.json({error: 'This sign-in link has expired. Ask for a new one.'}, {status: 400});
  const [row] = await sql`select token, email, teams from subscribers where token = ${login.subscriber_token}`;
  return row ? NextResponse.json({token: row.token, email: row.email, teams: row.teams}) : NextResponse.json({error: 'Account not found.'}, {status: 404});
}

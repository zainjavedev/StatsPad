import { NextResponse } from 'next/server';
import { sql } from '../../../../server/db';
import { MIN_PASSWORD, hashPassword } from '../../../../server/password';

export const dynamic = 'force-dynamic';

/* POST {token, password}: a signed-in browser sets or changes its password. This is also how a
   forgotten one is reset: the emailed sign-in link signs the browser in, then it picks a new one. */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const password = String(body?.password || '');
  if (password.length < MIN_PASSWORD) return NextResponse.json({error: `Use at least ${MIN_PASSWORD} characters`}, {status: 400});
  const rows = await sql`update subscribers set password_hash = ${hashPassword(password)}, failed_logins = 0, locked_until = null where token = ${String(body?.token || '')} and channel = 'email' and email_confirmed_at is not null returning id`;
  return rows.length ? NextResponse.json({ok: true}) : NextResponse.json({error: 'Sign in first'}, {status: 401});
}

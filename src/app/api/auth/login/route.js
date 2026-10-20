import { NextResponse } from 'next/server';
import { sql } from '../../../../server/db';
import { checkPassword } from '../../../../server/password';

export const dynamic = 'force-dynamic';

const MAX_FAILURES = 5;
const fail = (error, status = 401) => NextResponse.json({error}, {status});

/* POST {email, password}. Five wrong passwords lock the account for 15 minutes. */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email || '').trim();
  const [row] = email ? await sql`select token, email, teams, password_hash, email_confirmed_at, failed_logins, locked_until from subscribers where lower(email) = lower(${email}) and channel = 'email'` : [];
  if (row?.locked_until && new Date(row.locked_until) > new Date()) return fail('Too many attempts. Try again in a few minutes.', 429);
  if (!row || !row.password_hash || !checkPassword(String(body.password || ''), row.password_hash)) {
    if (row) await sql`update subscribers set failed_logins = failed_logins + 1, locked_until = case when failed_logins + 1 >= ${MAX_FAILURES} then now() + interval '15 minutes' else null end where token = ${row.token}`;
    return fail('Wrong email or password. If you signed up with Google, use Continue with Google.');
  }
  await sql`update subscribers set failed_logins = 0, locked_until = null where token = ${row.token}`;
  return NextResponse.json({token: row.token, email: row.email, teams: row.teams, confirmed: Boolean(row.email_confirmed_at)});
}

import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { sql } from '../../../../server/db';
import { confirmMail, notifyOwner, sendMail } from '../../../../server/mail';
import { MIN_PASSWORD, hashPassword } from '../../../../server/password';
import { TEAMS } from '../../../../lib/teams';

export const dynamic = 'force-dynamic';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const bad = (error, status = 400) => NextResponse.json({error}, {status});

/* POST {email, password, teams}: creates an account and signs it in. Alerts start once the emailed
   link is clicked. An address that is already confirmed can't be taken over: use Google or "Forgot password". */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email || '').trim();
  const password = String(body?.password || '');
  if (!EMAIL.test(email)) return bad('Enter a valid email address');
  if (password.length < MIN_PASSWORD) return bad(`Use at least ${MIN_PASSWORD} characters for your password`);
  const teams = [...new Set((Array.isArray(body.teams) ? body.teams : []).filter(code => TEAMS[code]))];

  const [existing] = await sql`select email_confirmed_at from subscribers where lower(email) = lower(${email})`;
  if (existing?.email_confirmed_at) return bad('That email already has an account. Sign in, or use Forgot password.', 409);

  const [row] = await sql`insert into subscribers (token, channel, email, teams, password_hash) values (${randomBytes(24).toString('hex')}, 'email', ${email}, ${teams}, ${hashPassword(password)})
    on conflict (lower(email)) where email is not null do update set password_hash = excluded.password_hash, teams = excluded.teams returning token, email, teams`;
  try { await sendMail({to: email, ...confirmMail(row.token)}); } catch (error) { console.error('confirm mail failed', error.message); }
  if (!existing) {
    const [{count}] = await sql`select count(*)::int as count from subscribers where channel = 'email'`;
    await notifyOwner(`New StatsPads account: ${row.email}`, [`${row.email} just created an account with email and password.`, `Teams followed: ${row.teams.length ? row.teams.join(', ') : 'none yet'}.`, `Accounts so far: ${count}.`]);
  }
  return NextResponse.json({token: row.token, email: row.email, teams: row.teams, confirmed: false});
}

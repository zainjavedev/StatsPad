import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { sql } from '../../../server/db';
import { confirmMail, sendMail } from '../../../server/mail';
import { TEAMS } from '../../../lib/teams';

export const dynamic = 'force-dynamic';

const cleanTeams = teams => [...new Set(Array.isArray(teams) ? teams.filter(code => TEAMS[code]) : [])];
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const bad = (error, status = 400) => NextResponse.json({error}, {status});

/* POST {channel: 'email', email, teams} or, once an email is registered,
   {channel: 'push', subscription, teams, emailToken} starts alerts and returns the token the browser keeps to manage them. */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) return bad('Invalid request');
  const teams = cleanTeams(body.teams);
  if (!teams.length) return bad('Pick at least one team first');
  const token = randomBytes(24).toString('hex');

  if (body.channel === 'push') {
    const endpoint = body.subscription?.endpoint;
    if (!endpoint || !body.subscription.keys) return bad('Invalid push subscription');
    const [owner] = await sql`select email from subscribers where token = ${String(body.emailToken || '')} and channel = 'email'`;
    if (!owner) return bad('Add your email first');
    const [row] = await sql`insert into subscribers (token, channel, push, push_endpoint, owner_email, teams) values (${token}, 'push', ${JSON.stringify(body.subscription)}::jsonb, ${endpoint}, ${owner.email}, ${teams})
      on conflict (push_endpoint) where push_endpoint is not null do update set teams = excluded.teams, push = excluded.push, owner_email = excluded.owner_email returning token`;
    return NextResponse.json({token: row.token});
  }

  if (body.channel === 'email') {
    const email = String(body.email || '').trim();
    if (!EMAIL.test(email)) return bad('Enter a valid email address');
    const [row] = await sql`insert into subscribers (token, channel, email, teams) values (${token}, 'email', ${email}, ${teams})
      on conflict (lower(email)) where email is not null do update set teams = excluded.teams returning token, email_confirmed_at`;
    if (!row.email_confirmed_at) {
      try { await sendMail({to: email, ...confirmMail(row.token)}); } catch (error) { console.error('confirm mail failed', error.message); return bad('Could not send the confirmation email. Try again later.', 502); }
    }
    return NextResponse.json({token: row.token, confirmed: Boolean(row.email_confirmed_at)});
  }
  return bad('Unknown channel');
}

/* PUT {token, teams} keeps the alerts in step with the favorites. */
export async function PUT(request) {
  const body = await request.json().catch(() => null);
  if (!body?.token) return bad('Missing token');
  const rows = await sql`update subscribers set teams = ${cleanTeams(body.teams)} where token = ${String(body.token)} returning id`;
  return rows.length ? NextResponse.json({ok: true}) : bad('Unknown subscription', 404);
}

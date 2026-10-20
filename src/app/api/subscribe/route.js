import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { sql } from '../../../server/db';
import { TEAMS } from '../../../lib/teams';

export const dynamic = 'force-dynamic';

const cleanTeams = teams => [...new Set(Array.isArray(teams) ? teams.filter(code => TEAMS[code]) : [])];
const bad = (error, status = 400) => NextResponse.json({error}, {status});

/* POST {channel: 'push', subscription, teams, emailToken} starts browser alerts for a signed-in account
   and returns the token the browser keeps to manage them. */
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

  return bad('Unknown channel');
}

/* PUT {token, teams} keeps the alerts in step with the favorites. */
export async function PUT(request) {
  const body = await request.json().catch(() => null);
  if (!body?.token) return bad('Missing token');
  const rows = await sql`update subscribers set teams = ${cleanTeams(body.teams)} where token = ${String(body.token)} returning id`;
  return rows.length ? NextResponse.json({ok: true}) : bad('Unknown subscription', 404);
}

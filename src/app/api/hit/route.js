import { NextResponse } from 'next/server';
import { sql } from '../../../server/db';
import { ensureActivity } from '../../../server/activity';

export const dynamic = 'force-dynamic';

/* POST {visitor, token, path, referrer}: one page view, {visitor, token, events: [...]}: a batch of taps (or {visitor, hide: true}, below), sent by src/components/Tracker.jsx with sendBeacon.
   The body is read as text because a beacon's content type isn't reliable. No IP is stored. */
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly/i;
const VISITOR = /^[a-z0-9]{8,40}$/;
const done = () => new NextResponse(null, {status: 204});
/* The emailed sign-in link lands on /account?signin=<code>, so one-time codes are dropped before anything is stored. */
const clean = path => {
  const [pathname, search] = path.split('?');
  const params = new URLSearchParams(search || '');
  ['signin', 'code', 'token'].forEach(key => params.delete(key));
  return params.size ? `${pathname}?${params}` : pathname;
};
const device = ua => /ipad|tablet/i.test(ua) ? 'tablet' : /mobi|iphone|android/i.test(ua) ? 'phone' : 'desktop';

/* A batch of taps from Tracker.jsx: at most 40, each trimmed, admin pages left out. */
const KINDS = new Set(['tap', 'tab', 'toggle', 'select']);
const text = (value, size) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, size);
async function events(visitor, token, list) {
  if (!VISITOR.test(visitor)) return done();
  const rows = list.slice(0, 40).map(event => ({path: clean(text(event?.path, 300)), label: text(event?.label, 120), area: text(event?.area, 80) || null, kind: KINDS.has(event?.kind) ? event.kind : 'tap'}))
    .filter(row => row.label && row.path.startsWith('/') && !row.path.startsWith('/admin'));
  if (!rows.length) return done();
  await ensureActivity();
  await sql`insert into ui_events (visitor, subscriber_id, path, label, area, kind)
    select ${visitor}, (select id from subscribers where token = ${token} and channel = 'email'), * from unnest(${rows.map(row => row.path)}::text[], ${rows.map(row => row.label)}::text[], ${rows.map(row => row.area)}::text[], ${rows.map(row => row.kind)}::text[])`;
  return done();
}

export async function POST(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!ua || BOT.test(ua)) return done();
  let body;
  try { body = JSON.parse(await request.text()); } catch { return done(); }
  const visitor = String(body?.visitor || ''), path = clean(String(body?.path || '')).slice(0, 300);
  /* {visitor, hide: true}: this browser opened ?notme=1. Marking a browser only ever hides that browser, so it needs no sign-in. */
  if (body?.hide === true && VISITOR.test(visitor)) {
    await ensureActivity();
    await sql`insert into hidden_visitors (visitor) values (${visitor}) on conflict do nothing`;
    return done();
  }
  if (Array.isArray(body?.events)) return events(visitor, String(body?.token || ''), body.events);
  if (!VISITOR.test(visitor) || !path.startsWith('/') || path.startsWith('/admin')) return done();
  const referrer = body?.referrer ? String(body.referrer).slice(0, 300) : null;
  await ensureActivity();
  await sql`insert into page_views (visitor, subscriber_id, path, referrer, device, country)
    values (${visitor}, (select id from subscribers where token = ${String(body?.token || '')} and channel = 'email'), ${path}, ${referrer}, ${device(ua)}, ${request.headers.get('x-vercel-ip-country') || null})`;
  return done();
}

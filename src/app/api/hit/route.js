import { NextResponse } from 'next/server';
import { sql } from '../../../server/db';
import { ensureActivity } from '../../../server/activity';

export const dynamic = 'force-dynamic';

/* POST {visitor, token, path, referrer}: one page view, sent by src/components/Tracker.jsx with sendBeacon.
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

export async function POST(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!ua || BOT.test(ua)) return done();
  let body;
  try { body = JSON.parse(await request.text()); } catch { return done(); }
  const visitor = String(body?.visitor || ''), path = clean(String(body?.path || '')).slice(0, 300);
  if (!VISITOR.test(visitor) || !path.startsWith('/') || path.startsWith('/admin')) return done();
  const referrer = body?.referrer ? String(body.referrer).slice(0, 300) : null;
  await ensureActivity();
  await sql`insert into page_views (visitor, subscriber_id, path, referrer, device, country)
    values (${visitor}, (select id from subscribers where token = ${String(body?.token || '')} and channel = 'email'), ${path}, ${referrer}, ${device(ua)}, ${request.headers.get('x-vercel-ip-country') || null})`;
  return done();
}

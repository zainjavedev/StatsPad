import { sql } from '../../../server/db';

export const dynamic = 'force-dynamic';

const page = (title, text) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font:16px/1.5 system-ui,sans-serif;max-width:480px;margin:15vh auto;padding:0 20px;color:#14140f"><h2>${title}</h2><p>${text}</p><p><a href="/">Back to StatsPad</a></p>`, {headers: {"Content-Type": "text/html; charset=utf-8"}});

export async function GET(request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  const rows = await sql`update subscribers set email_confirmed_at = coalesce(email_confirmed_at, now()) where token = ${token} and channel = 'email' returning id`;
  return rows.length ? page('Alerts are on', 'We will email you when your favorite teams tip off and finish.') : page('Link not valid', 'This confirmation link has expired or was already removed.');
}

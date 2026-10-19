import { sql } from '../../../server/db';

export const dynamic = 'force-dynamic';

const page = (title, text) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font:16px/1.5 system-ui,sans-serif;max-width:480px;margin:15vh auto;padding:0 20px;color:#14140f"><h2>${title}</h2><p>${text}</p><p><a href="/">Back to StatsPad</a></p>`, {headers: {"Content-Type": "text/html; charset=utf-8"}});

export async function GET(request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  await sql`delete from subscribers where token = ${token}`;
  return page('Unsubscribed', 'You will not get any more StatsPad alerts on this device or email.');
}

/* The page's own "turn off" button. */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (body?.token) await sql`delete from subscribers where token = ${String(body.token)}`;
  return Response.json({ok: true});
}

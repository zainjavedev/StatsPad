import { sql } from '../../../server/db';

export const dynamic = 'force-dynamic';

/* Removing an email also removes the browser alerts that hang off it. */
const removeSubscriber = async token => {
  const [row] = await sql`delete from subscribers where token = ${token} returning channel, email`;
  if (row?.channel === 'email') await sql`delete from subscribers where lower(owner_email) = lower(${row.email})`;
};

const page = (title, text) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font:16px/1.5 system-ui,sans-serif;max-width:480px;margin:15vh auto;padding:0 20px;color:#14140f"><h2>${title}</h2><p>${text}</p><p><a href="/">Back to StatsPads</a></p>`, {headers: {"Content-Type": "text/html; charset=utf-8"}});

export async function GET(request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  await removeSubscriber(token);
  return page('Unsubscribed', 'You will not get any more StatsPads alerts on this device or email.');
}

/* The page's own "turn off" button. */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (body?.token) await removeSubscriber(String(body.token));
  return Response.json({ok: true});
}

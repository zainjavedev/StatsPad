import { sql } from '../../../../server/db';
import { ensureProfile } from '../../../../server/profile';

export const dynamic = 'force-dynamic';

/* An uploaded profile photo as an image. The leaderboard links here with a version in the query, so it caches for a day. */
export async function GET(request, {params}) {
  const id = String(params.id || '');
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('Not found', {status: 404});
  await ensureProfile();
  const [row] = await sql`select photo from subscribers where id = ${id}`;
  const match = row?.photo?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) return new Response('Not found', {status: 404});
  return new Response(Buffer.from(match[2], 'base64'), {headers: {'Content-Type': match[1], 'Cache-Control': 'public, max-age=86400, immutable'}});
}

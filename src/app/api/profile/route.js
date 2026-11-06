import { NextResponse } from 'next/server';
import { sql } from '../../../server/db';
import { NAME_MAX, cleanName, ensureProfile, photoUrl, validPhoto } from '../../../server/profile';

export const dynamic = 'force-dynamic';
const fail = (error, status) => NextResponse.json({error}, {status});

/* GET ?token=…: this account's display name and photo. */
export async function GET(request) {
  await ensureProfile();
  const token = new URL(request.url).searchParams.get('token') || '';
  const [row] = token ? await sql`select id, display_name, photo from subscribers where token = ${token} and channel = 'email'` : [];
  if (!row) return fail('Sign in first.', 401);
  return NextResponse.json({name: row.display_name || '', photo: photoUrl(row.id, row.photo)});
}

/* POST {token, name, photo}: name is trimmed to 24 characters (empty clears it); photo is a small data URL, a Google
   picture URL, null to remove it, or left out to keep the current one. */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token || ''), name = cleanName(body?.name), keep = body?.photo === undefined;
  if (String(body?.name ?? '').trim().length > NAME_MAX + 8) return fail(`Keep the name under ${NAME_MAX} characters.`, 400);
  if (!keep && !validPhoto(body.photo)) return fail('That photo could not be used. Try a smaller JPEG or PNG.', 400);
  await ensureProfile();
  const [row] = keep
    ? await sql`update subscribers set display_name = ${name || null} where token = ${token} and channel = 'email' returning id, display_name, photo`
    : await sql`update subscribers set display_name = ${name || null}, photo = ${body.photo} where token = ${token} and channel = 'email' returning id, display_name, photo`;
  if (!row) return fail('Sign in first.', 401);
  return NextResponse.json({name: row.display_name || '', photo: photoUrl(row.id, row.photo)});
}

import { NextResponse } from 'next/server';
import { sql } from '../../../server/db';
import { sendSignin } from '../../../server/session';

export const dynamic = 'force-dynamic';

/* POST {email} mails a sign-in link if that address has an account. The answer is the same either way. */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email || '').trim();
  const [row] = email ? await sql`select token from subscribers where lower(email) = lower(${email}) and email_confirmed_at is not null` : [];
  if (row) return sendSignin(row.token, email);
  return NextResponse.json({linkSent: true});
}

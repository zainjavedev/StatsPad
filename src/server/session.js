import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { sql } from './db';
import { sendMail, signinMail } from './mail';

/* A one-time sign-in link to the account's inbox. Opening it hands the browser the account token. */
export async function sendSignin(subscriberToken, email) {
  const code = randomBytes(24).toString('hex');
  await sql`delete from login_codes where expires_at < now()`;
  await sql`insert into login_codes (code, subscriber_token, expires_at) values (${code}, ${subscriberToken}, now() + interval '30 minutes')`;
  try { await sendMail({to: email, ...signinMail(code)}); } catch (error) { console.error('sign-in mail failed', error.message); return NextResponse.json({error: 'Could not send the sign-in email. Try again later.'}, {status: 502}); }
  return NextResponse.json({linkSent: true});
}

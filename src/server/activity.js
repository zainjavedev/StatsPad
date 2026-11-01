import { sql } from './db';

/* First-party activity log: page views from every browser and each Guess the Player answer.
   Tables are created on first use, the same as play_scores, so nothing needs a setup run. */
let ready;
export const ensureActivity = () => (ready ??= (async () => {
  await sql`create table if not exists page_views (
    id bigserial primary key,
    visitor text not null,
    subscriber_id uuid,
    path text not null,
    referrer text,
    device text,
    country text,
    at timestamptz not null default now()
  )`;
  await sql`create index if not exists page_views_at on page_views (at desc)`;
  await sql`create index if not exists page_views_visitor on page_views (visitor, at desc)`;
  /* Browsers the owner marked as his own with ?notme=1; the dashboard leaves them out like his signed-in ones. */
  await sql`create table if not exists hidden_visitors (visitor text primary key, at timestamptz not null default now())`;
  /* The owner's other accounts, hidden along with the one he signs in to the dashboard with. Filled by hand. */
  await sql`create table if not exists hidden_accounts (subscriber_id uuid primary key)`;
  await sql`create table if not exists play_answers (
    id bigserial primary key,
    subscriber_id uuid not null,
    game_id text not null,
    step int,
    player text,
    correct boolean not null,
    at timestamptz not null default now()
  )`;
  await sql`create index if not exists play_answers_at on play_answers (at desc)`;
})().catch(error => { ready = undefined; throw error; }));

/* Only the confirmed account for ADMIN_EMAIL gets in. Password sign-up hands back a token before the
   address is confirmed, so the confirmed check is what stops someone registering the owner's email. */
const ADMIN = () => (process.env.ADMIN_EMAIL || 'zain.javed.965@gmail.com').toLowerCase();
export const isAdmin = async token => Boolean(token) && (await sql`select 1 from subscribers where token = ${token} and channel = 'email' and email_confirmed_at is not null and lower(email) = ${ADMIN()}`).length > 0;

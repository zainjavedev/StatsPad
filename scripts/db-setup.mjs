import { neon } from '@neondatabase/serverless';

/* Creates the tables the alerts use. Safe to run again.
   Usage: node --env-file=.env.local scripts/db-setup.mjs */

const sql = neon(process.env.DATABASE_URL);

await sql`create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  channel text not null check (channel in ('email', 'push')),
  email text,
  email_confirmed_at timestamptz,
  push jsonb,
  push_endpoint text,
  teams text[] not null default '{}',
  created_at timestamptz not null default now()
)`;
await sql`alter table subscribers add column if not exists owner_email text`;
await sql`alter table subscribers add column if not exists password_hash text`;
await sql`alter table subscribers add column if not exists failed_logins int not null default 0`;
await sql`alter table subscribers add column if not exists locked_until timestamptz`;
await sql`create unique index if not exists subscribers_email on subscribers (lower(email)) where email is not null`;
await sql`create unique index if not exists subscribers_push on subscribers (push_endpoint) where push_endpoint is not null`;
await sql`create table if not exists alerts_sent (
  game_id text not null,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (game_id, kind)
)`;
await sql`create table if not exists login_codes (
  code text primary key,
  subscriber_token text not null,
  expires_at timestamptz not null
)`;
console.log('db: ready');

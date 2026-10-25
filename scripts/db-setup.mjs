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
await sql`create table if not exists play_scores (
  token text primary key,
  correct int not null default 0,
  total int not null default 0,
  streak int not null default 0,
  best int not null default 0,
  updated_at timestamptz not null default now()
)`;
/* ESPN box scores, kept per season: scripts/sync-espn-db.mjs fills these. Season is a text key like 2026-27, so a new season needs no schema change. */
await sql`create table if not exists games (
  id text primary key,
  season text not null,
  season_type text not null check (season_type in ('preseason', 'regular', 'playoffs')),
  played_at timestamptz not null,
  away text not null,
  home text not null,
  away_score int,
  home_score int,
  venue text,
  synced_at timestamptz not null default now()
)`;
await sql`create index if not exists games_season on games (season, played_at)`;
await sql`create table if not exists team_game_stats (
  game_id text not null references games (id) on delete cascade,
  team text not null,
  opponent text not null,
  is_home boolean not null,
  score int,
  opponent_score int,
  won boolean,
  primary key (game_id, team)
)`;
await sql`create table if not exists player_game_stats (
  game_id text not null references games (id) on delete cascade,
  espn_player_id text not null,
  season text not null,
  team text not null,
  opponent text not null,
  name text not null,
  starter boolean not null default false,
  minutes int, pts int, reb int, oreb int, dreb int, ast int, stl int, blk int, tov int, pf int,
  fgm int, fga int, tpm int, tpa int, ftm int, fta int, plus_minus int,
  primary key (game_id, espn_player_id)
)`;
await sql`create index if not exists player_game_stats_player on player_game_stats (espn_player_id, season)`;
await sql`create index if not exists player_game_stats_team on player_game_stats (season, team)`;
await sql`alter table team_game_stats add column if not exists totals jsonb`;
await sql`alter table player_game_stats add column if not exists stats jsonb`;
/* The whole ESPN summary for a game (box score, play by play, leaders, injuries, win probability, odds...), minus videos, news and standings. */
await sql`create table if not exists game_raw (
  game_id text primary key references games (id) on delete cascade,
  data jsonb not null
)`;
console.log('db: ready');

import webpush from 'web-push';
import { TEAMS } from '../lib/teams';
import { sql } from './db';
import { alertMail, sendMail, siteUrl } from './mail';

/* Looks at ESPN's scoreboard and tells subscribers about games of their
   favorite teams: once when a game is about to start, once when it ends.
   alerts_sent makes each (game, kind) fire a single time even if the
   scheduler overlaps itself. Called by /api/cron/alerts. */

const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
const TIPOFF_WINDOW_MIN = 60;
const FINAL_WINDOW_HOURS = 8;
const CODE_BY_ESPN = Object.fromEntries(Object.entries(TEAMS).map(([code, team]) => [team.espn, code]));
const ymd = date => date.toISOString().slice(0, 10).replace(/-/g, '');
const nick = code => TEAMS[code].name.split(' ').slice(code === 'POR' ? -2 : -1).join(' ');

async function games() {
  const now = new Date(), days = [now, new Date(now.getTime() - 864e5)];
  const found = new Map();
  for (const day of days) {
    const response = await fetch(`${SCOREBOARD}?dates=${ymd(day)}`);
    if (!response.ok) continue;
    for (const event of (await response.json()).events ?? []) {
      const sides = event.competitions[0].competitors.map(side => ({code: CODE_BY_ESPN[side.team.abbreviation.toLowerCase()], score: side.score, home: side.homeAway === 'home'}));
      if (sides.every(side => side.code)) found.set(event.id, {id: event.id, start: new Date(event.date), state: event.status.type.state, sides});
    }
  }
  return [...found.values()];
}

function message(game, kind) {
  const [away, home] = [game.sides.find(side => !side.home), game.sides.find(side => side.home)];
  if (kind === 'tipoff') {
    const minutes = Math.max(1, Math.round((game.start - Date.now()) / 6e4));
    return {title: `${nick(away.code)} at ${nick(home.code)} tips off in ${minutes} min`, body: 'Follow the game and compare the players on StatsPad.'};
  }
  const winner = Number(home.score) > Number(away.score) ? home : away, loser = winner === home ? away : home;
  return {title: `Final: ${nick(winner.code)} ${winner.score}, ${nick(loser.code)} ${loser.score}`, body: 'See how the players stacked up on StatsPad.'};
}

async function deliver(subscriber, {title, body}) {
  if (subscriber.channel === 'push') {
    try {
      await webpush.sendNotification(subscriber.push, JSON.stringify({title, body, url: siteUrl()}));
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) await sql`delete from subscribers where id = ${subscriber.id}`;
      else throw error;
    }
  } else {
    await sendMail({to: subscriber.email, ...alertMail({title, body, token: subscriber.token})});
  }
}

export async function runAlerts() {
  webpush.setVapidDetails(`mailto:${process.env.VAPID_CONTACT || 'alerts@statspads.com'}`, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const sent = {tipoff: 0, final: 0, failed: 0};
  for (const game of await games()) {
    const minutesAway = (game.start - Date.now()) / 6e4, hoursAgo = -minutesAway / 60;
    const kind = game.state === 'pre' && minutesAway <= TIPOFF_WINDOW_MIN ? 'tipoff' : game.state === 'post' && hoursAgo <= FINAL_WINDOW_HOURS ? 'final' : null;
    if (!kind) continue;
    const claimed = await sql`insert into alerts_sent (game_id, kind) values (${game.id}, ${kind}) on conflict do nothing returning game_id`;
    if (!claimed.length) continue;
    const audience = await sql`select s.* from subscribers s where s.teams && ${game.sides.map(side => side.code)}::text[]
      and (s.email_confirmed_at is not null or (s.channel = 'push' and exists (select 1 from subscribers e where e.channel = 'email' and lower(e.email) = lower(s.owner_email) and e.email_confirmed_at is not null)))`;
    const text = message(game, kind);
    for (const subscriber of audience) {
      try { await deliver(subscriber, text); sent[kind] += 1; } catch (error) { sent.failed += 1; console.error('alert failed', subscriber.channel, error.message); }
    }
  }
  return sent;
}

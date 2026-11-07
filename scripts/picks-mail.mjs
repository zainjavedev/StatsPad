/* One-off announcement: "pick the winners on /fixtures, climb the leaderboard", with the day's real games drawn like the
   fixtures cards. Table layout and inline styles only, since mail clients ignore most CSS.

   node --env-file=.env.local scripts/picks-mail.mjs --preview out.html [--day 2026-11-07]
   node --env-file=.env.local scripts/picks-mail.mjs --send --yes   (confirmed email subscribers, one mail per address) */
import { readFileSync, writeFileSync } from 'node:fs';
import { TEAMS } from '../src/lib/teams.js';

const args = process.argv.slice(2), flag = name => args.includes(name), value = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const SITE = (process.env.SITE_URL || 'https://statspads.com').replace(/\/$/, '');
const eastDay = date => new Intl.DateTimeFormat('en-CA', {timeZone: 'America/New_York'}).format(new Date(date));
const clock = new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit'});
const nick = code => (code === 'POR' ? 'Trail Blazers' : TEAMS[code].name.split(' ').pop());
const logo = code => `https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/${TEAMS[code].espn}.png&w=80&h=80`;
const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const font = 'Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Arial,Helvetica,sans-serif';

const schedule = JSON.parse(readFileSync(new URL('../public/data/2026-27/schedule.json', import.meta.url)));
const day = value('--day') || eastDay(Date.now());
const games = schedule.filter(row => eastDay(row[1]) === day && !row[9]).sort((a, b) => a[1].localeCompare(b[1]));

/* A game as one quiet line: both logos and nicknames, the tip-off time. The line opens /fixtures, where the pick is made. */
const side = code => `<img src="${logo(code)}" width="22" height="22" alt="" style="display:inline-block;vertical-align:middle;border:0">&nbsp;<span style="vertical-align:middle">${esc(nick(code))}</span>`;
const line = row => `<tr><td style="padding:12px 0;border-top:1px solid #ecebe4"><a href="${SITE}/fixtures" style="display:block;text-decoration:none;color:#14140f">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="font:600 15px/1.4 ${font};color:#14140f">${side(row[2])}<span style="vertical-align:middle;color:#a3a39a">&nbsp;&nbsp;at&nbsp;&nbsp;</span>${side(row[3])}</td>
    <td align="right" style="font:500 13px ${font};color:#8a8a80;white-space:nowrap">${clock.format(new Date(row[1]))} ET</td>
  </tr></table></a></td></tr>`;

export function build({token} = {}) {
  const shown = games.slice(0, 4), more = games.length - shown.length;
  const unsubscribe = `<a href="${token ? `${SITE}/api/unsubscribe?token=${token}` : '#'}" style="color:#a3a39a">Unsubscribe</a>`;
  const subject = 'Pick tonight\'s NBA winners on StatsPads';
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff">
<div style="display:none;max-height:0;overflow:hidden">Tap who wins, get graded after every game, see where you rank.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto"><tr><td style="padding:36px 24px">
  <div style="font:800 15px ${font};letter-spacing:.02em;color:#14140f">StatsPads</div>
  <h1 style="margin:32px 0 10px;font:800 26px/1.2 ${font};letter-spacing:-.01em;color:#14140f">Who wins tonight?</h1>
  <p style="margin:0 0 24px;font:16px/1.55 ${font};color:#55554d">You can now pick the winner of every NBA game on StatsPads. Picks are graded after each final, and the leaderboard ranks everyone on correct picks.</p>
  ${shown.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #ecebe4">${shown.map(line).join('')}</table>
  ${more > 0 ? `<p style="margin:10px 0 0;font:500 13px ${font};color:#8a8a80">and ${more} more ${more === 1 ? 'game' : 'games'} tonight</p>` : ''}` : ''}
  <p style="margin:28px 0 0"><a href="${SITE}/fixtures" style="display:inline-block;padding:13px 26px;border-radius:999px;background:#14140f;color:#ffffff;font:700 15px ${font};text-decoration:none">Make my picks</a></p>
  <p style="margin:16px 0 0;font:14px ${font}"><a href="${SITE}/play/leaderboard" style="color:#14140f">See the leaderboard</a></p>
  <p style="margin:44px 0 0;font:12px/1.5 ${font};color:#a3a39a">You get this because you signed up for StatsPads emails. ${unsubscribe}</p>
</td></tr></table></body></html>`;
  return {subject, html};
}

if (flag('--preview')) {
  writeFileSync(value('--preview'), build().html);
  console.log(`${games.length} games on ${day}, written to ${value('--preview')}`);
}

if (flag('--send')) {
  if (!flag('--yes')) { console.error('Add --yes to really send.'); process.exit(1); }
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL);
  const people = await sql`select distinct on (lower(email)) email, token from subscribers where channel = 'email' and email_confirmed_at is not null order by lower(email), id`;
  let sent = 0, failed = 0;
  for (const person of people) {
    const {subject, html} = build({token: person.token});
    const response = await fetch('https://api.resend.com/emails', {method: 'POST', headers: {Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({from: process.env.MAIL_FROM, to: person.email, subject, html})});
    if (response.ok) sent += 1; else { failed += 1; console.error('failed', response.status, await response.text()); }
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  console.log(`sent ${sent}, failed ${failed}`);
}

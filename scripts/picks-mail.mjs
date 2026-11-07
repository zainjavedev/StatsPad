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
const longDay = new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric'});
const nick = code => (code === 'POR' ? 'Trail Blazers' : TEAMS[code].name.split(' ').pop());
const logo = code => `https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/${TEAMS[code].espn}.png&w=80&h=80`;
const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const font = 'Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Arial,Helvetica,sans-serif';

const schedule = JSON.parse(readFileSync(new URL('../public/data/2026-27/schedule.json', import.meta.url)));
const day = value('--day') || eastDay(Date.now());
const games = schedule.filter(row => eastDay(row[1]) === day && !row[9]).sort((a, b) => a[1].localeCompare(b[1]));

/* One team line of a fixtures card: colour bar, logo, nickname. The whole line links to /fixtures, where the pick is made. */
const team = code => `<tr><td style="padding:0"><a href="${SITE}/fixtures" style="display:block;text-decoration:none;color:#f2f2f0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="4" style="width:4px;background:${TEAMS[code].color};border-radius:2px;font-size:0;line-height:0">&nbsp;</td>
    <td width="40" style="padding:7px 0 7px 10px;width:30px"><img src="${logo(code)}" width="26" height="26" alt="" style="display:block;border:0"></td>
    <td style="padding:7px 8px;font:700 15px/1.2 ${font};color:#f2f2f0">${esc(nick(code))}</td>
  </tr></table></a></td></tr>`;

const card = row => `<tr><td style="padding:0 0 8px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111215;border:1px solid #1f2126;border-radius:14px">
    <tr><td style="padding:8px 4px 8px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${team(row[2])}${team(row[3])}</table></td>
    <td width="96" align="right" valign="middle" style="padding:8px 14px 8px 4px;font:700 14px/1.3 ${font};color:#f2f2f0;white-space:nowrap">${clock.format(new Date(row[1]))}<div style="font:600 11px/1.3 ${font};color:#8e8f8a">ET${row[5] ? ` · ${esc(row[5].split(' (')[0])}` : ''}</div></td></tr>
  </table></td></tr>`;

const step = (number, title, line, art) => `<tr><td style="padding:0 0 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
  <td width="40" valign="top" style="width:40px"><div style="width:30px;height:30px;border-radius:50%;background:#14140f;color:#ffffff;font:800 14px/30px ${font};text-align:center">${number}</div></td>
  <td valign="top" style="font:15px/1.5 ${font};color:#44443d"><b style="color:#14140f">${title}</b><br>${line}</td>
  ${art ? `<td width="86" align="right" valign="top">${art}</td>` : ''}
</tr></table></td></tr>`;
const tick = (fill, mark) => `<span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:${fill};color:#ffffff;font:800 13px/22px ${font};text-align:center">${mark}</span>`;

export function build({token} = {}) {
  const shown = games.slice(0, 6), more = games.length - shown.length;
  const unsubscribe = token ? `<a href="${SITE}/api/unsubscribe?token=${token}" style="color:#8a8a80">Unsubscribe</a>` : '<a href="#" style="color:#8a8a80">Unsubscribe</a>';
  const subject = 'New on StatsPads: pick the winners, climb the leaderboard';
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f0ea">
<div style="display:none;max-height:0;overflow:hidden">Tap who wins each night, get graded after every game, and see where you rank against other fans.</div>
<div style="margin:0;padding:24px 12px;background:#f1f0ea">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden">
  <tr><td style="padding:18px 28px;background:#14140f"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="font:800 17px ${font};letter-spacing:.02em;color:#ffffff">StatsPads</td>
    <td align="right"><span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#34d399;color:#06281c;font:800 11px ${font};letter-spacing:.08em">NEW</span></td>
  </tr></table></td></tr>

  <tr><td style="padding:32px 28px 8px">
    <div style="font:700 11px/1 ${font};letter-spacing:.14em;text-transform:uppercase;color:#8a8a80">Fixtures · Picks</div>
    <h1 style="margin:12px 0 10px;font:800 28px/1.15 ${font};letter-spacing:-.01em;color:#14140f">Who wins tonight? Call it.</h1>
    <p style="margin:0;font:16px/1.55 ${font};color:#44443d">You can now pick the winner of every NBA game on StatsPads. Tap a team on the fixtures page, change your mind any time before tip-off, and see how you do once the final buzzer goes.</p>
  </td></tr>

  <tr><td style="padding:22px 16px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050506;border-radius:16px">
    <tr><td style="padding:18px 16px 6px">
      <div style="font:800 18px/1.2 ${font};color:#f2f2f0">${games.length ? `${longDay.format(new Date(`${day}T12:00Z`))} <span style="font:600 13px ${font};color:#8e8f8a">${games.length} games</span>` : 'Tonight'}</div>
      <div style="margin-top:6px;font:500 13px/1.4 ${font};color:#8e8f8a">Tap who you think wins. Change it any time before tip-off.</div>
    </td></tr>
    <tr><td style="padding:10px 12px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${shown.map(card).join('')}</table></td></tr>
    ${more > 0 ? `<tr><td align="center" style="padding:0 0 6px;font:600 13px ${font};color:#8e8f8a">+ ${more} more ${more === 1 ? 'game' : 'games'}</td></tr>` : ''}
    <tr><td align="center" style="padding:10px 16px 22px"><a href="${SITE}/fixtures" style="display:inline-block;padding:14px 30px;border-radius:999px;background:#f2f2f0;color:#0a0a0b;font:800 15px ${font};text-decoration:none">Make my picks</a></td></tr>
  </table></td></tr>

  <tr><td style="padding:26px 28px 6px">
    <div style="font:700 11px/1 ${font};letter-spacing:.14em;text-transform:uppercase;color:#8a8a80;margin-bottom:16px">How it works</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${step(1, 'Pick', 'One day opens at a time. Tap the team you think wins each game.', '')}
      ${step(2, 'Get graded', 'Every pick is marked right or wrong after the final.', `${tick('#22a06b', '&#10003;')}&nbsp;${tick('#e5484d', '&#10005;')}`)}
      ${step(3, 'Climb the leaderboard', 'Ranked on correct picks. Watch your spot move up the ladder after each night.', `<span style="font:800 13px ${font};color:#22a06b">&#9650; 3</span>`)}
    </table>
  </td></tr>

  <tr><td style="padding:4px 16px 8px"><a href="${SITE}/play/leaderboard" style="display:block;text-decoration:none">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050506;border-radius:16px">
      <tr><td style="padding:16px 16px 4px;font:700 11px/1 ${font};letter-spacing:.14em;text-transform:uppercase;color:#8e8f8a">Predictor leaderboard</td></tr>
      <tr><td style="padding:10px 12px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111215;border:1px solid #1f2126;border-radius:14px"><tr>
        <td width="34" align="center" style="padding:14px 0 14px 12px;font:800 22px ${font};color:#f2f2f0">1</td>
        <td width="52" style="padding:10px 6px 10px 10px"><div style="width:44px;height:44px;border-radius:50%;background:#26282e;color:#f2f2f0;font:800 18px/44px ${font};text-align:center">?</div></td>
        <td style="padding:10px 6px;font:700 15px/1.25 ${font};color:#f2f2f0">This could be you<div style="font:600 12px/1.4 ${font};color:#8e8f8a">Most correct picks this season</div></td>
        <td align="right" style="padding:10px 14px 10px 4px;white-space:nowrap"><span style="font:800 22px ${font};color:#f2f2f0">0–0</span><div style="font:800 12px ${font};color:#22a06b">&#9650; new</div></td>
      </tr></table></td></tr>
    </table></a></td></tr>

  <tr><td style="padding:18px 28px 30px">
    <p style="margin:0 0 18px;font:15px/1.55 ${font};color:#44443d">Sign in once on the fixtures page to keep your picks on every device, and add a name and photo for the leaderboard. There's a share button too: your picks come out as a card ready to post on X.</p>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:10px"><a href="${SITE}/fixtures" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#14140f;color:#ffffff;font:700 14px ${font};text-decoration:none">Pick tonight's games</a></td>
      <td><a href="${SITE}/play/leaderboard" style="display:inline-block;padding:12px 20px;border-radius:999px;border:1px solid #d8d7cf;color:#14140f;font:700 14px ${font};text-decoration:none">See the leaderboard</a></td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:16px 28px;border-top:1px solid #ecebe4;font:12px/1.5 ${font};color:#8a8a80" align="center">You get this because you signed up for StatsPads emails. ${unsubscribe}.</td></tr>
</table></div></body></html>`;
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

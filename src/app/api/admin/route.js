import { NextResponse } from 'next/server';
import { sql } from '../../../server/db';
import { ensureActivity, isAdmin } from '../../../server/activity';

export const dynamic = 'force-dynamic';

/* Where a visit came from: AI answers, search and social get a readable name. ChatGPT sends no referrer, only
   ?utm_source=chatgpt.com on the link, so the tag counts first and the referrer's host second. */
const SOURCES = [
  [/chatgpt|openai/, 'ChatGPT', 'ai'], [/perplexity/, 'Perplexity', 'ai'], [/gemini\.google|bard\.google/, 'Gemini', 'ai'],
  [/copilot|bing\.com\/chat/, 'Copilot', 'ai'], [/claude\.ai|anthropic/, 'Claude', 'ai'], [/deepseek/, 'DeepSeek', 'ai'], [/grok/, 'Grok', 'ai'],
  [/(^|\.)google\./, 'Google', 'search'], [/bing\./, 'Bing', 'search'], [/duckduckgo/, 'DuckDuckGo', 'search'], [/yahoo\./, 'Yahoo', 'search'], [/yandex/, 'Yandex', 'search'], [/ecosia/, 'Ecosia', 'search'],
  [/^t\.co$|twitter|(^|\.)x\.com$/, 'X', 'social'], [/facebook|^fb\./, 'Facebook', 'social'], [/instagram/, 'Instagram', 'social'], [/reddit/, 'Reddit', 'social'],
  [/whatsapp/, 'WhatsApp', 'social'], [/linkedin|lnkd/, 'LinkedIn', 'social'], [/youtube/, 'YouTube', 'social'], [/discord/, 'Discord', 'social'], [/threads/, 'Threads', 'social'],
];
const sourceOf = (path, referrer) => {
  const tag = /[?&]utm_source=([^&#]+)/.exec(path || '')?.[1];
  const raw = (tag ? decodeURIComponent(tag) : /^[a-z]+:\/\/(?:www\.)?([^/:]+)/i.exec(referrer || '')?.[1] ?? (referrer || '')).toLowerCase();
  if (!raw) return {name: 'Direct', kind: 'direct'};
  const known = SOURCES.find(([pattern]) => pattern.test(raw));
  return known ? {name: known[1], kind: known[2]} : {name: raw, kind: 'other'};
};

/* The owner's timezone buckets the chart, so "today" is their today. A name Postgres doesn't know falls back to UTC. */
const zoneOf = async value => {
  const zone = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(String(value || '')) ? String(value) : 'UTC';
  try { await sql`select now() at time zone ${zone}`; return zone; } catch { return 'UTC'; }
};

/* Post kit: what's worth posting from the last few nights, from the box scores scripts/sync-espn-db.mjs stores.
   Big nights (40 pieces, triple-doubles, near-perfect shooting...), streaks over the season so far, and blowouts or close finishes. */
const gameScore = l => l.pts + .4 * l.fgm - .7 * l.fga - .4 * (l.fta - l.ftm) + .7 * l.oreb + .3 * l.dreb + l.stl + .7 * l.ast + .7 * l.blk - .4 * l.pf - l.tov;
const tagsOf = l => {
  const tags = [], tens = [l.pts, l.reb, l.ast, l.stl, l.blk].filter(value => value >= 10).length, ts = l.fga + .44 * l.fta ? l.pts / (2 * (l.fga + .44 * l.fta)) : 0;
  if (l.pts >= 50) tags.push('50-point game'); else if (l.pts >= 40) tags.push('40-point game');
  if (tens >= 4) tags.push('Quadruple-double'); else if (tens === 3) tags.push('Triple-double');
  if (l.pts >= 20 && l.reb >= 20) tags.push('20-20 game');
  if ([l.pts, l.reb, l.ast, l.stl, l.blk].every(value => value >= 5)) tags.push('5x5');
  if (l.fga >= 10 && l.fgm / l.fga >= .8) tags.push(`${l.fgm} of ${l.fga} shooting`);
  if (l.tpm >= 8) tags.push(`${l.tpm} threes`);
  if (l.ast >= 15) tags.push(`${l.ast} assists`);
  if (l.reb >= 20 && l.pts < 20) tags.push(`${l.reb} rebounds`);
  if (l.blk >= 7) tags.push(`${l.blk} blocks`);
  if (l.stl >= 6) tags.push(`${l.stl} steals`);
  if (l.pts >= 30 && ts >= .7 && l.pts < 40) tags.push(`${l.pts} on ${Math.round(ts * 100)}% TS`);
  return tags;
};
async function postKit() {
  const [lines, games] = await Promise.all([
    sql`select p.game_id, p.espn_player_id as id, p.name, p.team, p.opponent, p.minutes, p.pts, p.reb, p.oreb, p.dreb, p.ast, p.stl, p.blk, p.tov, p.pf,
        p.fgm, p.fga, p.tpm, p.tpa, p.ftm, p.fta, p.plus_minus, g.played_at, g.away, g.home, g.away_score, g.home_score
      from player_game_stats p join games g on g.id = p.game_id
      where g.season_type = 'regular' and g.season = (select max(season) from games) and p.minutes > 0 order by g.played_at`,
    sql`select id, played_at, away, home, away_score, home_score from games
      where season_type = 'regular' and away_score is not null and played_at > now() - interval '4 days' order by played_at desc`,
  ]);
  const since = Date.now() - 4 * 86400000;
  const recent = lines.filter(line => new Date(line.played_at) > since).map(line => ({...line, score: gameScore(line), tags: tagsOf(line)}));
  const nights = recent.filter(line => line.tags.length).sort((a, b) => b.score - a.score).slice(0, 12);
  for (const line of [...recent].sort((a, b) => b.score - a.score)) { if (nights.length >= 8) break; if (!nights.includes(line)) nights.push({...line, tags: ['Top game score']}); }

  /* Streaks over the season: 30-point games in a row, double-doubles in a row, and a last three games well above the season average. */
  const byPlayer = new Map();
  for (const line of lines) (byPlayer.get(line.id) ?? byPlayer.set(line.id, []).get(line.id)).push(line);
  const streaks = [];
  for (const games of byPlayer.values()) {
    const last = games.at(-1);
    if (new Date(last.played_at) < since) continue;
    const run = test => { let count = 0; for (let index = games.length - 1; index >= 0 && test(games[index]); index -= 1) count += 1; return count; };
    const thirty = run(line => line.pts >= 30), doubles = run(line => [line.pts, line.reb, line.ast, line.stl, line.blk].filter(value => value >= 10).length >= 2);
    const avg = list => list.reduce((sum, line) => sum + line.pts, 0) / list.length, lastThree = games.slice(-3), before = games.slice(0, -3);
    const base = {id: last.id, name: last.name, team: last.team, games: games.length, season: {pts: avg(games), reb: games.reduce((sum, line) => sum + line.reb, 0) / games.length, ast: games.reduce((sum, line) => sum + line.ast, 0) / games.length}};
    if (thirty >= 3) streaks.push({...base, kind: 'thirty', count: thirty, rank: 100 + thirty});
    if (doubles >= 4) streaks.push({...base, kind: 'double', count: doubles, rank: 50 + doubles});
    if (before.length >= 3 && avg(lastThree) >= 20 && avg(lastThree) - avg(before) >= 7) streaks.push({...base, kind: 'heating', last3: avg(lastThree), before: avg(before), rank: avg(lastThree) - avg(before)});
  }
  streaks.sort((a, b) => b.rank - a.rank);

  const stories = games.map(game => ({...game, margin: Math.abs(game.away_score - game.home_score)}))
    .filter(game => game.margin >= 25 || game.margin <= 3).sort((a, b) => (b.margin >= 25) - (a.margin >= 25) || b.margin - a.margin).slice(0, 8);
  return {nights, streaks: streaks.slice(0, 10), stories};
}

const tally = (rows, key) => {
  const counts = new Map();
  for (const row of rows) { const name = key(row); counts.set(name, (counts.get(name) ?? 0) + 1); }
  return [...counts].map(([name, count]) => ({name, count})).sort((a, b) => b.count - a.count);
};

/* POST {token, days, hideMe, tz, person?, check?}: the owner's dashboard data. The token rides in the body so it
   stays out of request logs. A person is a signed-in account (its id) or an anonymous browser id;
   one browser that later signs in is folded into the account. Anyone else gets a plain 404. */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token || '');
  if (!await isAdmin(token)) return NextResponse.json({error: 'Not found'}, {status: 404});
  if (body?.check) return NextResponse.json({ok: true});
  if (body?.feed) return NextResponse.json(await postKit());
  await ensureActivity();
  const days = [1, 7, 30].includes(body?.days) ? body.days : 7;
  const zone = await zoneOf(body?.tz);
  const [me] = await sql`select id from subscribers where token = ${token}`;
  /* "Hide me" drops the owner's accounts (this one plus any in hidden_accounts) and every browser they have signed in on, including views from before sign-in,
   plus any browser opened once with ?notme=1 (see Tracker.jsx), for signed-out browsing and test browsers. */
  const hiding = body?.hideMe !== false;
  const owners = hiding ? [me.id, ...(await sql`select subscriber_id::text as id from hidden_accounts`).map(row => row.id)] : [];

  if (body?.person) {
    const person = String(body.person);
    const [views, answers] = await Promise.all([
      sql`with v as (select visitor from page_views group by visitor having coalesce((array_agg(subscriber_id) filter (where subscriber_id is not null))[1]::text, visitor) = ${person})
        select path, at, device, country, referrer from page_views where visitor in (select visitor from v) or subscriber_id::text = ${person} order by at desc limit 300`,
      sql`select game_id, step, player, correct, at from play_answers where subscriber_id::text = ${person} order by at desc limit 200`,
    ]);
    return NextResponse.json({views: views.map(view => ({...view, source: sourceOf(view.path, view.referrer)})), answers});
  }

  const [summary, series, people, pages, firsts, devices, countries, hours, players] = await Promise.all([
    sql`with p as (select * from page_views where visitor not in (select visitor from page_views where subscriber_id = any(${owners}::uuid[]) union select visitor from hidden_visitors where ${hiding})),
        a as (select * from play_answers where not coalesce(subscriber_id = any(${owners}::uuid[]), false))
      select
        (select count(distinct visitor)::int from p where at > now() - interval '5 minutes') as live,
        (select count(distinct visitor)::int from p where at > now() - interval '1 day') as visitors_day,
        (select count(distinct visitor)::int from p where at > now() - make_interval(days => ${days})) as visitors,
        (select count(distinct visitor)::int from p where at > now() - make_interval(days => ${days * 2}) and at <= now() - make_interval(days => ${days})) as visitors_before,
        (select count(*)::int from p where at > now() - make_interval(days => ${days})) as views,
        (select count(*)::int from p where at > now() - make_interval(days => ${days * 2}) and at <= now() - make_interval(days => ${days})) as views_before,
        (select count(distinct subscriber_id)::int from p where at > now() - make_interval(days => ${days}) and subscriber_id is not null) as members,
        (select count(distinct game_id)::int from a where at > now() - make_interval(days => ${days})) as games,
        (select count(distinct game_id)::int from a where at > now() - make_interval(days => ${days}) and step = 10) as finished,
        (select count(*)::int from a where at > now() - make_interval(days => ${days})) as answers,
        (select coalesce(round(100.0 * avg(correct::int)), 0)::int from a where at > now() - make_interval(days => ${days})) as accuracy,
        (select count(*)::int from subscribers where channel = 'email') as accounts,
        (select min(at) from page_views) as since`,
    /* 24 hourly bars for the last day, otherwise one bar per day in the owner's timezone. */
    days === 1
      ? sql`select to_char(h at time zone ${zone}, 'YYYY-MM-DD"T"HH24:00') as at, count(p.id)::int as views, count(distinct p.visitor)::int as visitors
          from generate_series(date_trunc('hour', now()) - interval '23 hours', date_trunc('hour', now()), interval '1 hour') h
          left join page_views p on p.at >= h and p.at < h + interval '1 hour' and p.visitor not in (select visitor from page_views where subscriber_id = any(${owners}::uuid[]) union select visitor from hidden_visitors where ${hiding})
          group by h order by h`
      : sql`select to_char(d, 'YYYY-MM-DD') as at, count(p.id)::int as views, count(distinct p.visitor)::int as visitors
          from generate_series(date_trunc('day', now() at time zone ${zone}) - make_interval(days => ${days - 1}), date_trunc('day', now() at time zone ${zone}), interval '1 day') d
          left join page_views p on (p.at at time zone ${zone}) >= d and (p.at at time zone ${zone}) < d + interval '1 day' and p.visitor not in (select visitor from page_views where subscriber_id = any(${owners}::uuid[]) union select visitor from hidden_visitors where ${hiding})
          group by d order by d`,
    sql`with linked as (select visitor, (array_agg(subscriber_id) filter (where subscriber_id is not null))[1] as sid from page_views group by visitor),
        v as (select p.*, coalesce(l.sid::text, p.visitor) as person, l.sid,
          case when lag(p.at) over (partition by coalesce(l.sid::text, p.visitor) order by p.at) > p.at - interval '30 minutes' then 0 else 1 end as fresh
          from page_views p join linked l using (visitor) where not coalesce(l.sid = any(${owners}::uuid[]), false) and p.visitor not in (select visitor from hidden_visitors where ${hiding}) and p.at > now() - make_interval(days => ${days}))
      select v.person, max(s.email) as email, max(v.at) as last_seen, min(v.at) as first_seen, count(*)::int as views, sum(v.fresh)::int as visits,
        count(distinct split_part(v.path, '?', 1))::int as pages,
        (array_agg(v.path order by v.at desc))[1] as last_path,
        (array_agg(v.path order by v.at))[1] as first_path,
        (array_agg(v.device order by v.at desc))[1] as device,
        (array_agg(v.country order by v.at desc))[1] as country,
        (array_agg(v.referrer order by v.at) filter (where v.referrer is not null))[1] as referrer
      from v left join subscribers s on s.id = v.sid
      group by v.person order by max(v.at) desc limit 100`,
    sql`select split_part(path, '?', 1) as path, count(*)::int as views, count(distinct visitor)::int as visitors
      from page_views where at > now() - make_interval(days => ${days}) and visitor not in (select visitor from page_views where subscriber_id = any(${owners}::uuid[]) union select visitor from hidden_visitors where ${hiding})
      group by 1 order by 2 desc limit 25`,
    /* Each visitor's first view in the range: where they came from and the page they landed on. */
    sql`select distinct on (visitor) visitor, path, referrer from page_views
      where at > now() - make_interval(days => ${days}) and visitor not in (select visitor from page_views where subscriber_id = any(${owners}::uuid[]) union select visitor from hidden_visitors where ${hiding})
      order by visitor, at`,
    sql`select coalesce(device, 'desktop') as name, count(distinct visitor)::int as count from page_views
      where at > now() - make_interval(days => ${days}) and visitor not in (select visitor from page_views where subscriber_id = any(${owners}::uuid[]) union select visitor from hidden_visitors where ${hiding}) group by 1 order by 2 desc`,
    sql`select coalesce(country, '??') as name, count(distinct visitor)::int as count from page_views
      where at > now() - make_interval(days => ${days}) and visitor not in (select visitor from page_views where subscriber_id = any(${owners}::uuid[]) union select visitor from hidden_visitors where ${hiding}) group by 1 order by 2 desc limit 8`,
    sql`select extract(hour from at at time zone ${zone})::int as hour, count(*)::int as views from page_views
      where at > now() - make_interval(days => ${days}) and visitor not in (select visitor from page_views where subscriber_id = any(${owners}::uuid[]) union select visitor from hidden_visitors where ${hiding}) group by 1`,
    sql`select s.id::text as person, s.email, ps.correct, ps.total, ps.best, ps.streak, ps.updated_at,
        count(distinct a.game_id)::int as games, count(distinct a.game_id) filter (where a.step = 10)::int as finished,
        count(a.id) filter (where a.at > now() - make_interval(days => ${days}))::int as recent
      from play_scores ps join subscribers s on s.token = ps.token
      left join play_answers a on a.subscriber_id = s.id
      where not (s.id = any(${owners}::uuid[]))
      group by s.id, s.email, ps.correct, ps.total, ps.best, ps.streak, ps.updated_at
      order by ps.updated_at desc limit 100`,
  ]);
  const withSource = firsts.map(row => ({...row, source: sourceOf(row.path, row.referrer)}));
  const sources = tally(withSource, row => row.source.name).map(entry => ({...entry, kind: withSource.find(row => row.source.name === entry.name).source.kind}));
  const entries = tally(withSource, row => row.path.split('?')[0]).slice(0, 25).map(({name, count}) => ({path: name, visitors: count}));
  const byHour = Array.from({length: 24}, (_, hour) => hours.find(row => row.hour === hour)?.views ?? 0);
  return NextResponse.json({
    days, zone, summary: summary[0], series, pages, entries, sources, devices, countries, hours: byHour, players,
    people: people.map(person => ({...person, source: sourceOf(person.first_path, person.referrer)})),
  });
}

import { NextResponse } from 'next/server';
import { sql } from '../../../server/db';
import { ensureActivity, isAdmin } from '../../../server/activity';

export const dynamic = 'force-dynamic';

const NOBODY = '00000000-0000-0000-0000-000000000000';

/* POST {token, days, hideMe, person?}: the owner's dashboard data. The token rides in the body so it
   stays out of request logs. A person is a signed-in account (its id) or an anonymous browser id;
   one browser that later signs in is folded into the account. Anyone else gets a plain 404. */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token || '');
  if (!await isAdmin(token)) return NextResponse.json({error: 'Not found'}, {status: 404});
  await ensureActivity();
  const days = [1, 7, 30].includes(body?.days) ? body.days : 7;
  const [me] = await sql`select id from subscribers where token = ${token}`;
  /* "Hide me" drops the owner's account and every browser it has signed in on, including views from before sign-in. */
  const hide = body?.hideMe === false ? NOBODY : me.id;

  if (body?.person) {
    const person = String(body.person);
    const [views, answers] = await Promise.all([
      sql`with v as (select visitor from page_views group by visitor having coalesce((array_agg(subscriber_id) filter (where subscriber_id is not null))[1]::text, visitor) = ${person})
        select path, at, device, country, referrer from page_views where visitor in (select visitor from v) or subscriber_id::text = ${person} order by at desc limit 300`,
      sql`select game_id, step, player, correct, at from play_answers where subscriber_id::text = ${person} order by at desc limit 200`,
    ]);
    return NextResponse.json({views, answers});
  }

  const [summary, daily, people, pages, referrers, players] = await Promise.all([
    sql`with p as (select * from page_views where visitor not in (select visitor from page_views where subscriber_id = ${hide})),
        a as (select * from play_answers where subscriber_id is distinct from ${hide})
      select
        (select count(*)::int from p where at > now() - interval '1 day') as views_day,
        (select count(distinct visitor)::int from p where at > now() - interval '1 day') as visitors_day,
        (select count(distinct visitor)::int from p where at > now() - make_interval(days => ${days})) as visitors,
        (select count(*)::int from p where at > now() - make_interval(days => ${days})) as views,
        (select count(distinct subscriber_id)::int from p where at > now() - make_interval(days => ${days}) and subscriber_id is not null) as members,
        (select count(distinct game_id)::int from a where at > now() - make_interval(days => ${days})) as games,
        (select count(distinct game_id)::int from a where at > now() - make_interval(days => ${days}) and step = 10) as finished,
        (select count(*)::int from a where at > now() - make_interval(days => ${days})) as answers,
        (select coalesce(round(100.0 * avg(correct::int)), 0)::int from a where at > now() - make_interval(days => ${days})) as accuracy,
        (select count(*)::int from subscribers where channel = 'email') as accounts,
        (select min(at) from page_views) as since`,
    sql`select to_char(d, 'YYYY-MM-DD') as day, count(p.id)::int as views, count(distinct p.visitor)::int as visitors
      from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
      left join page_views p on p.at >= d and p.at < d + interval '1 day' and p.visitor not in (select visitor from page_views where subscriber_id = ${hide})
      group by d order by d`,
    sql`with linked as (select visitor, (array_agg(subscriber_id) filter (where subscriber_id is not null))[1] as sid from page_views group by visitor),
        v as (select p.*, coalesce(l.sid::text, p.visitor) as person, l.sid,
          case when lag(p.at) over (partition by coalesce(l.sid::text, p.visitor) order by p.at) > p.at - interval '30 minutes' then 0 else 1 end as fresh
          from page_views p join linked l using (visitor) where l.sid is distinct from ${hide} and p.at > now() - make_interval(days => ${days}))
      select v.person, max(s.email) as email, max(v.at) as last_seen, min(v.at) as first_seen, count(*)::int as views, sum(v.fresh)::int as visits,
        count(distinct split_part(v.path, '?', 1))::int as pages,
        (array_agg(v.path order by v.at desc))[1] as last_path,
        (array_agg(v.device order by v.at desc))[1] as device,
        (array_agg(v.country order by v.at desc))[1] as country,
        (array_agg(v.referrer order by v.at) filter (where v.referrer is not null))[1] as referrer
      from v left join subscribers s on s.id = v.sid
      group by v.person order by max(v.at) desc limit 100`,
    sql`select split_part(path, '?', 1) as path, count(*)::int as views, count(distinct visitor)::int as visitors
      from page_views where at > now() - make_interval(days => ${days}) and visitor not in (select visitor from page_views where subscriber_id = ${hide})
      group by 1 order by 2 desc limit 25`,
    sql`select coalesce(substring(referrer from '^https?://(?:www\\.)?([^/]+)'), referrer) as source, count(distinct visitor)::int as visitors
      from page_views where referrer is not null and at > now() - make_interval(days => ${days}) and visitor not in (select visitor from page_views where subscriber_id = ${hide})
      group by 1 order by 2 desc limit 10`,
    sql`select s.id::text as person, s.email, ps.correct, ps.total, ps.best, ps.streak, ps.updated_at,
        count(distinct a.game_id)::int as games, count(distinct a.game_id) filter (where a.step = 10)::int as finished,
        count(a.id) filter (where a.at > now() - make_interval(days => ${days}))::int as recent
      from play_scores ps join subscribers s on s.token = ps.token
      left join play_answers a on a.subscriber_id = s.id
      where s.id is distinct from ${hide}
      group by s.id, s.email, ps.correct, ps.total, ps.best, ps.streak, ps.updated_at
      order by ps.updated_at desc limit 100`,
  ]);
  return NextResponse.json({days, summary: summary[0], daily, people, pages, referrers, players});
}

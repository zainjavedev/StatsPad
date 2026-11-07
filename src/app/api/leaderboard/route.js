import { NextResponse } from 'next/server';
import { sql } from '../../../server/db';
import { ensureProfile, photoUrl } from '../../../server/profile';
import { ensurePicks, settle } from '../../../server/picks';

export const dynamic = 'force-dynamic';

/* The predictor leaderboard: every account with a graded pick, ranked on correct picks, then hit rate, then picks made;
   level records share a place. Each row also has its place before the latest graded game day (the move, like the ladders;
   null when that day was its first), and the team it picks most. GET ?token=… marks the caller's own row. */
const rankOf = (rows, won, total) => {
  const sorted = rows.filter(row => row[total] > 0).sort((a, b) => b[won] - a[won] || b[won] / b[total] - a[won] / a[total] || b[total] - a[total]);
  const places = new Map();
  sorted.forEach((row, index) => {
    const prev = sorted[index - 1];
    const same = prev && prev[won] === row[won] && prev[total] === row[total];
    places.set(row.id, same ? places.get(prev.id) : index + 1);
  });
  return [sorted, places];
};

export async function GET(request) {
  await ensureProfile();
  const token = new URL(request.url).searchParams.get('token') || '';
  await ensurePicks();
  /* Finished games the box-score sync hasn't stored yet are graded from ESPN's scoreboard (server/picks.js). */
  await settle(request.url);
  const rows = await sql`with g as (
      select id, case when home_score > away_score then home else away end as winner, (played_at at time zone 'America/New_York')::date as day
      from games where home_score is not null and away_score is not null and home_score <> away_score
      union all
      select r.game_id, r.winner, r.day from pick_results r
      where not exists (select 1 from games s where s.id = r.game_id and s.home_score is not null and s.away_score is not null)),
    graded as (select p.subscriber_id, p.pick, g.winner, g.day from predictions p join g on g.id = p.game_id),
    last as (select max(day) as day from graded)
    select s.id, s.token = ${token} as me, s.display_name, s.photo,
      count(*) filter (where graded.pick = graded.winner)::int as won, count(*)::int as total,
      count(*) filter (where graded.pick = graded.winner and graded.day < last.day)::int as won_before,
      count(*) filter (where graded.day < last.day)::int as total_before,
      mode() within group (order by graded.pick) as fav, max(last.day)::text as through
    from graded join subscribers s on s.id = graded.subscriber_id cross join last
    group by s.id, s.token, s.display_name, s.photo`;
  const [sorted, now] = rankOf(rows, 'won', 'total'), [, before] = rankOf(rows, 'won_before', 'total_before');
  const shape = row => ({
    rank: now.get(row.id), move: before.has(row.id) ? before.get(row.id) - now.get(row.id) : null, me: row.me,
    name: row.display_name || `Fan ${row.id.slice(0, 4).toUpperCase()}`, named: Boolean(row.display_name), photo: photoUrl(row.id, row.photo),
    won: row.won, lost: row.total - row.won, fav: row.fav,
  });
  const top = sorted.slice(0, 100).map(shape), mine = sorted.find(row => row.me);
  return NextResponse.json({rows: top, me: mine && !top.some(row => row.me) ? shape(mine) : null, players: sorted.length, through: rows[0]?.through ?? null});
}

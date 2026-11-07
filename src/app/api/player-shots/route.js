import { NextResponse } from 'next/server';
import { sql } from '../../../server/db';

/* Every field-goal attempt one player took this regular season, from the play-by-play kept in game_raw: where on the floor
   (ESPN's x across, y feet up from the basket), made or not, and whether it was a three. Plus his season points and free throws, so the shot zones can say what share of his scoring each zone makes. */
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const id = (new URL(request.url).searchParams.get('id') || '').replace(/\D/g, '');
  if (!id) return NextResponse.json({error: 'Missing player id'}, {status: 400});
  try {
    const [games, plays] = await Promise.all([
      sql`select count(*)::int as games, coalesce(sum(p.pts), 0)::int as pts, coalesce(sum(p.ftm), 0)::int as ftm, coalesce(sum(p.fta), 0)::int as fta from player_game_stats p join games g on g.id = p.game_id
        where p.espn_player_id = ${id} and g.season_type <> 'preseason'`,
      sql`select jsonb_path_query_array(r.data->'plays', '$[*] ? (@.shootingPlay == true && @.participants[0].athlete.id == $id)', jsonb_build_object('id', ${id}::text)) as plays
        from player_game_stats p join games g on g.id = p.game_id join game_raw r on r.game_id = g.id
        where p.espn_player_id = ${id} and g.season_type <> 'preseason'`,
    ]);
    const shots = plays.flatMap(row => row.plays ?? [])
      .filter(play => !/Free Throw/i.test(play.type?.text ?? '') && /\b(makes|misses|blocks)\b/i.test(play.text ?? '') && Number.isFinite(play.coordinate?.x) && play.coordinate.x >= 0 && play.coordinate.y > -100)
      .map(play => ({x: play.coordinate.x, y: play.coordinate.y, made: /\bmakes\b/i.test(play.text) ? 1 : 0, three: play.pointsAttempted === 3 ? 1 : 0}));
    return NextResponse.json({games: games[0].games, pts: games[0].pts, ftm: games[0].ftm, fta: games[0].fta, shots}, {headers: {'Cache-Control': 'public, s-maxage=600'}});
  } catch {
    return NextResponse.json({error: 'Could not read the shots'}, {status: 502});
  }
}

import { NextResponse } from 'next/server';
import { sql } from '../../../server/db';
import { TEAMS, espnHeadshotUrl } from '../../../lib/teams';
import { CURRENT } from '../../../lib/season';

/* The whole season's best (or worst) single-game lines for one sort on /performances, from the stored box scores.
   GET ?sort=grade&dir=down returns the top 200 lines for that sort, shaped like the box-score lines the cards use;
   the page orders them again with its own rule, so this only has to pick the right 200. */
export const dynamic = 'force-dynamic';

const abbr = code => TEAMS[code]?.espn?.toUpperCase() ?? code;
/* Each sort as SQL over player_game_stats (p), with the same filters the page uses. */
const ORDER = {
  grade: sql => sql`p.pts + .4 * p.fgm - .7 * p.fga - .4 * (p.fta - p.ftm) + .7 * p.oreb + .3 * p.dreb + p.stl + .7 * p.ast + .7 * p.blk - .4 * p.pf - p.tov`,
  pts: sql => sql`p.pts`, reb: sql => sql`p.reb`, ast: sql => sql`p.ast`, stl: sql => sql`p.stl`, blk: sql => sql`p.blk`, '3pm': sql => sql`p.tpm`,
  fg: sql => sql`case when p.fga >= 8 then p.fgm::float / p.fga end`, fta: sql => sql`p.fta`, to: sql => sql`p.tov`, pm: sql => sql`p.plus_minus`,
  fps: sql => sql`p.pts + 1.2 * p.reb + 1.5 * p.ast + 3 * p.stl + 3 * p.blk - p.tov`,
};

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const key = ORDER[params.get('sort')] ? params.get('sort') : 'grade', up = params.get('dir') === 'up';
  try {
    const value = ORDER[key](sql);
    /* Lowest first only makes sense among players who really played, so it skips lines under 10 minutes. */
    const rows = await sql`select * from (select p.game_id, p.espn_player_id, p.team, p.opponent, p.name, p.minutes, p.pts, p.fgm, p.fga, p.tpm, p.tpa, p.ftm, p.fta, p.oreb, p.dreb, p.reb, p.ast, p.stl, p.blk, p.tov, p.pf, p.plus_minus,
        g.played_at, g.home, g.away_score, g.home_score, ${value} as v
      from player_game_stats p join games g on g.id = p.game_id
      where g.season = ${CURRENT} and g.season_type <> 'preseason' and g.home_score is not null and coalesce(p.minutes, 0) > ${up ? 9 : 0}) lines
      where v is not null order by case when ${up} then v end asc, case when not ${up} then v end desc, played_at desc limit 200`;
    const lines = rows.map(row => {
      const home = row.home === row.team, mine = home ? row.home_score : row.away_score, theirs = home ? row.away_score : row.home_score;
      return {
        gameId: row.game_id, team: abbr(row.team), opp: abbr(row.opponent), home, won: mine > theirs, score: `${mine}–${theirs}`, date: row.played_at,
        player: {id: row.espn_player_id, name: row.name, photo: espnHeadshotUrl(row.espn_player_id), stats: {
          MIN: String(row.minutes ?? 0), PTS: String(row.pts), FG: `${row.fgm}-${row.fga}`, '3PT': `${row.tpm}-${row.tpa}`, FT: `${row.ftm}-${row.fta}`, REB: String(row.reb), AST: String(row.ast), TO: String(row.tov),
          STL: String(row.stl), BLK: String(row.blk), OREB: String(row.oreb), DREB: String(row.dreb), PF: String(row.pf), '+/-': row.plus_minus > 0 ? `+${row.plus_minus}` : String(row.plus_minus ?? 0),
        }},
      };
    });
    return NextResponse.json({lines}, {headers: {'Cache-Control': 'public, s-maxage=300'}});
  } catch {
    return NextResponse.json({error: 'Could not read the games'}, {status: 502});
  }
}

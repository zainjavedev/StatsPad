import { NextResponse } from 'next/server';
import { sql } from '../../../server/db';
import { TEAMS } from '../../../lib/teams';

/* One player's latest regular-season games from the stored box scores, shaped like the box-score lines the performance cards use.
   Reading them here replaces downloading the last sixty games' box scores from ESPN to find a single player's lines. */
export const dynamic = 'force-dynamic';

const abbr = code => TEAMS[code]?.espn?.toUpperCase() ?? code;
const gameScore = line => line.pts + .4 * line.fgm - .7 * line.fga - .4 * (line.fta - line.ftm) + .7 * line.oreb + .3 * line.dreb + line.stl + .7 * line.ast + .7 * line.blk - .4 * line.pf - line.tov;

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const id = (params.get('id') || '').replace(/\D/g, ''), limit = Math.min(100, Number(params.get('limit')) || 8);
  if (!id) return NextResponse.json({error: 'Missing player id'}, {status: 400});
  try {
    const rows = await sql`select p.game_id, p.team, p.opponent, p.name, p.minutes, p.pts, p.fgm, p.fga, p.tpm, p.tpa, p.ftm, p.fta, p.oreb, p.dreb, p.reb, p.ast, p.stl, p.blk, p.tov, p.pf,
        g.played_at, g.home, g.away_score, g.home_score
      from player_game_stats p join games g on g.id = p.game_id
      where p.espn_player_id = ${id} and g.season_type <> 'preseason' order by g.played_at desc limit ${limit}`;
    const lines = rows.map(row => {
      const home = row.home === row.team, mine = home ? row.home_score : row.away_score, theirs = home ? row.away_score : row.home_score;
      return {
        gameId: row.game_id, team: abbr(row.team), opp: abbr(row.opponent), home, won: mine > theirs, score: `${mine}–${theirs}`, date: row.played_at, rating: gameScore(row),
        player: {id, name: row.name, photo: `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`, stats: {
          MIN: String(row.minutes ?? 0), PTS: String(row.pts), FG: `${row.fgm}-${row.fga}`, '3PT': `${row.tpm}-${row.tpa}`, FT: `${row.ftm}-${row.fta}`, REB: String(row.reb), AST: String(row.ast), TO: String(row.tov),
          STL: String(row.stl), BLK: String(row.blk), OREB: String(row.oreb), DREB: String(row.dreb), PF: String(row.pf),
        }},
      };
    });
    return NextResponse.json({lines}, {headers: {'Cache-Control': 'public, s-maxage=60'}});
  } catch {
    return NextResponse.json({error: 'Could not read the games'}, {status: 502});
  }
}

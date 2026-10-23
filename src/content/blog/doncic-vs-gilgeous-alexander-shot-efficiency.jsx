import React from 'react';
import { PlayerCards, RadarFigure, RankTable } from '../../components/blog/Figures';
import { fixed, list, loadSeason, playerIn, plays, trueShooting } from '../../lib/blogData';
import { radarAxes } from '../../lib/radarAxes';
import { compareUrl } from '../../lib/routes';

/* Every number below comes from the pinned 2025-26 season file, so the prose and the charts agree. */
export default function Post() {
  const season = loadSeason('2025-26');
  const luka = playerIn(season, 'luka-doncic'), shai = playerIn(season, 'shai-gilgeous-alexander');
  const [l, s] = [luka.stats, shai.stats];
  const axes = radarAxes(luka, shai, season.pool);
  const nameOf = axis => (axis.label.length > 4 && !axis.label.includes('%') ? axis.label.toLowerCase() : axis.label);
  const lukaLeads = axes.filter(axis => axis.sides[0].pct > axis.sides[1].pct).map(nameOf);
  const shaiLeads = axes.filter(axis => axis.sides[1].pct > axis.sides[0].pct).map(nameOf);
  const scorers = season.players.filter(p => p.gamesPlayed >= 40 && p.minutesPerGame >= 25).sort((x, y) => y.stats.points - x.stats.points).slice(0, 12);
  const byEfficiency = [...scorers].sort((x, y) => trueShooting(y.stats) - trueShooting(x.stats));
  const rankOf = player => byEfficiency.indexOf(player) + 1;
  const leagueTs = season.pool.reduce((sum, p) => sum + trueShooting(p.stats), 0) / season.pool.length;
  const ordinal = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
  const top = byEfficiency[0];

  return <>
    <p>Luka Dončić averaged {fixed(l.points)} points a game in 2025–26. Shai Gilgeous-Alexander averaged {fixed(s.points)}. Dončić needed {fixed(Number(fixed(plays(l))) - Number(fixed(plays(s))))} more scoring plays a game to get there.</p>
    <p>A scoring play here means a field-goal attempt plus 0.44 of a free-throw attempt, the usual estimate of how many possessions a player ends by shooting. Dončić used {fixed(plays(l))} a game. Gilgeous-Alexander used {fixed(plays(s))}.</p>

    <PlayerCards a={luka} b={shai} caption={`Both played most of the season: ${luka.gamesPlayed} games for Dončić and ${shai.gamesPlayed} for Gilgeous-Alexander. TS% is true shooting, which counts threes and free throws in one number.`}/>

    <h2>Where the radar separates them</h2>
    <p>The chart below scales each skill from the lowest to the highest rotation player in the league, using the {season.pool.length} players who qualified in 2025–26. A shape that reaches further out sits higher in the league range.</p>
    <RadarFigure season={season} a={luka} b={shai} caption="The same radar the compare tool draws. Hover or tap a dot for the number behind it."/>
    <p>Dončić’s shape is bigger on {list(lukaLeads)}. Gilgeous-Alexander’s is bigger on {list(shaiLeads)}. Behind the rebounding and playmaking spokes: Dončić grabbed {fixed(l.totalRebounds)} rebounds a game to {fixed(s.totalRebounds)} and passed for {fixed(l.assists)} assists to {fixed(s.assists)}.</p>

    <h2>What the extra shots bought</h2>
    <p>Each of Dončić’s scoring plays produced {fixed(l.points / plays(l), 2)} points. Each of Gilgeous-Alexander’s produced {fixed(s.points / plays(s), 2)}. True shooting puts the same difference in percentage terms: {fixed(trueShooting(l))}% for Dončić and {fixed(trueShooting(s))}% for Gilgeous-Alexander. The average qualified player shot {fixed(leagueTs)}%.</p>
    <p>The shot mix differs. Dončić took {fixed(l.threePointersAttempted)} threes a game and made {fixed(l.threePointPercentage)}%. Gilgeous-Alexander took {fixed(s.threePointersAttempted)} and made {fixed(s.threePointPercentage)}%. Overall, Gilgeous-Alexander made {fixed(s.fieldGoalPercentage)}% of his field goals to Dončić’s {fixed(l.fieldGoalPercentage)}%, and {fixed(s.freeThrowPercentage)}% of his free throws to {fixed(l.freeThrowPercentage)}%.</p>

    <RankTable
      label="Twelve highest scorers of 2025–26, sorted by true shooting"
      rows={byEfficiency}
      highlight={[luka.playerId, shai.playerId]}
      columns={[{label: 'PPG', get: p => fixed(p.stats.points)}, {label: 'TS%', get: p => fixed(trueShooting(p.stats))}, {label: 'Plays', get: p => fixed(plays(p.stats))}]}
      caption="Players with at least 40 games and 25 minutes a game, the 12 who scored the most. Dončić and Gilgeous-Alexander are highlighted. Plays is scoring plays per game."/>
    <p>Gilgeous-Alexander’s {fixed(trueShooting(s))}% ranks {ordinal[rankOf(shai) - 1]} in that group{rankOf(shai) > 1 ? `, behind ${top.playerName} at ${fixed(trueShooting(top.stats))}%` : ''}. Dončić’s {fixed(trueShooting(l))}% ranks {ordinal[rankOf(luka) - 1]}.</p>

    <h2>Passing and turnovers</h2>
    <p>Dončić recovered some of the gap as a passer, with {fixed(l.assists)} assists to {fixed(s.assists)}. He also turned the ball over {fixed(l.turnovers)} times a game to Gilgeous-Alexander’s {fixed(s.turnovers)}. That works out to {fixed(l.assists / l.turnovers)} assists per turnover for Dončić and {fixed(s.assists / s.turnovers)} for Gilgeous-Alexander.</p>

    <h2>What these numbers leave out</h2>
    <p>True shooting measures how well a player scores. It says nothing about defense, teammates or how much of the offense a player runs. Per-game averages also ignore playing time: Dončić played {fixed(luka.minutesPerGame)} minutes a night and Gilgeous-Alexander {fixed(shai.minutesPerGame)}.</p>

    <h2>Check it against this season</h2>
    <p>The rosters list both players on the same teams for 2026–27. The compare page uses current-season numbers, so you can watch the radar shapes move as games pile up: <a href={compareUrl([luka.playerName, shai.playerName])}>Dončić vs Gilgeous-Alexander</a>. Each player also has a full page with league rankings and a career table: <a href="/players/luka-doncic">Dončić</a> and <a href="/players/shai-gilgeous-alexander">Gilgeous-Alexander</a>. The <a href="/stats/points">points leaders</a> page shows who sits where right now.</p>
    <p className="blog-note">Numbers are the final 2025–26 regular season from Basketball Reference. Scoring plays = field-goal attempts + 0.44 × free-throw attempts. True shooting = points ÷ (2 × scoring plays). Qualified players have 15 games and 10 minutes a game, the same rule the site uses.</p>
  </>;
}

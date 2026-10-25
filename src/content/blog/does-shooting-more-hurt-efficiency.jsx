import React from 'react';
import { RankTable } from '../../components/blog/Figures';
import { ScatterChart } from '../../components/blog/Charts';
import { loadSeason } from '../../lib/blogData';
import { fit, fixed, list, mean, plays, surname, trueShooting } from '../../lib/blogStats';

/* Every number comes from the pinned 2025-26 season file, so the prose and the chart agree. */
export default function Post() {
  const season = loadSeason('2025-26');
  const rotation = season.players.filter(p => p.gamesPlayed >= 40 && p.minutesPerGame >= 20);
  const dot = p => ({name: p.playerName, x: plays(p.stats), y: trueShooting(p.stats), group: p.position === 'C' ? 0 : 1});
  const all = rotation.map(dot);
  const centers = rotation.filter(p => p.position === 'C'), others = rotation.filter(p => p.position !== 'C');
  const [rAll, rOthers, rCenters] = [all, others.map(dot), centers.map(dot)].map(points => fit(points).r);
  const line = fit(all);
  const lo = Math.floor(Math.min(...all.map(p => p.x))), hi = Math.ceil(Math.max(...all.map(p => p.x)));
  const leagueTs = mean(all.map(p => p.y));

  const byPoints = [...rotation].sort((a, b) => b.stats.points - a.stats.points);
  const stars = new Set(byPoints.slice(0, 7).map(p => p.playerName));
  const bestOverall = [...rotation].sort((a, b) => trueShooting(b.stats) - trueShooting(a.stats))[0];
  stars.add(bestOverall.playerName);
  const points = all.map(p => stars.has(p.name) ? {...p, label: surname(p.name)} : p);

  const club = rotation.filter(p => plays(p.stats) >= 19);
  const clubByTs = [...club].sort((a, b) => trueShooting(b.stats) - trueShooting(a.stats));
  const best = clubByTs[0], worst = clubByTs.at(-1);
  const heavy = [...rotation].sort((a, b) => plays(b.stats) - plays(a.stats)).slice(0, 10);

  return <>
    <p>Mostly no. Among the {rotation.length} players who played at least 40 games at 20 or more minutes in 2025–26, how many shots a player took says almost nothing about how efficiently he scored. The correlation is {fixed(rAll, 2)}, where 0 means no link and −1 would mean every extra shot costs efficiency.</p>
    <p>Shots here means scoring plays: field-goal attempts plus 0.44 of a free-throw attempt. Efficiency is true shooting, points divided by twice the scoring plays, so threes and free throws count properly.</p>

    <ScatterChart
      points={points}
      line={{x0: lo, y0: line.intercept + line.slope * lo, x1: hi, y1: line.intercept + line.slope * hi}}
      x={{label: 'Scoring plays per game', unit: 'plays'}}
      y={{label: 'True shooting %', unit: '%'}}
      groups={['Centers', 'Everyone else']}
      caption={`Each dot is one of the ${rotation.length} rotation players. The black line is the league-wide trend. Hover a dot for the numbers.`}/>

    <h2>The cloud hides two opposite stories</h2>
    <p>Split by position and the flat line stops being flat. For guards, wings and forwards the correlation is {fixed(rOthers, 2)}: the players who take more shots are slightly <em>more</em> efficient. That makes sense. Teams hand the ball to the players who score well, so volume follows skill.</p>
    <p>For centers it runs the other way, at {fixed(rCenters, 2)}. Centers averaged {fixed(mean(centers.map(p => plays(p.stats))))} scoring plays a game at {fixed(mean(centers.map(p => trueShooting(p.stats))))}% true shooting, against {fixed(mean(others.map(p => plays(p.stats))))} plays at {fixed(mean(others.map(p => trueShooting(p.stats))))}% for everyone else. Most of what a low-volume center scores comes off dunks, lobs and putbacks, and those shots do not scale. A center who has to create his own shot is a worse shooter than the one finishing plays for others. {bestOverall.playerName} is the extreme case: {fixed(plays(bestOverall.stats))} plays a game at {fixed(trueShooting(bestOverall.stats))}%, the best mark in the group.</p>

    <h2>Where the volume club stands</h2>
    <p>{club.length} players used 19 or more scoring plays a game. If volume cost efficiency, this group would be the worst in the league. It is not: its true shooting runs from {fixed(trueShooting(worst.stats))}% ({worst.playerName}) up to {fixed(trueShooting(best.stats))}% ({best.playerName}), against a league average of {fixed(leagueTs)}% for rotation players. Same workload, a {fixed(trueShooting(best.stats) - trueShooting(worst.stats))}-point spread.</p>
    <RankTable
      label="The ten biggest shot loads of 2025–26"
      rows={heavy}
      highlight={heavy.filter(p => trueShooting(p.stats) >= leagueTs + 4).map(p => p.playerId)}
      columns={[{label: 'Plays', get: p => fixed(plays(p.stats))}, {label: 'PPG', get: p => fixed(p.stats.points)}, {label: 'TS%', get: p => fixed(trueShooting(p.stats))}]}
      caption={`Sorted by scoring plays per game. Bold rows shot at least four points above the ${fixed(leagueTs)}% rotation average.`}/>
    <p>{list(heavy.filter(p => trueShooting(p.stats) >= leagueTs + 4).map(p => p.playerName))} carried a top-ten load and stayed at least four points above average. {list(heavy.filter(p => trueShooting(p.stats) < leagueTs).map(p => p.playerName)) || 'Nobody in the top ten'} fell below it{heavy.some(p => trueShooting(p.stats) < leagueTs) ? '. Their points cost more shots.' : '.'}</p>

    <h2>The short answer</h2>
    <p>Across the league, ten extra scoring plays a game goes with a true-shooting change of {fixed(line.slope * 10, 1)} points, which is noise. Shot volume does not predict efficiency. Skill does, and the best scorers have it at any volume. The one group where taking more shots does tend to cost something is centers, because their easy shots run out.</p>
    <p>This is one season, and per-game averages hide shot difficulty and defense. A player with a lot of volume may also have drawn the toughest defender every night. See the <a href="/stats/points">points leaders</a> for the current season, or put two scorers on the <a href="/compare">compare page</a> to see where they differ.</p>
    <p className="blog-note">Numbers are the final 2025–26 regular season from Basketball Reference. Rotation players have at least 40 games and 20 minutes a game. Scoring plays = field-goal attempts + 0.44 × free-throw attempts. True shooting = points ÷ (2 × scoring plays). Positions are as listed in the source data.</p>
  </>;
}

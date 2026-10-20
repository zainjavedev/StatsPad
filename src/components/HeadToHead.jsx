import React, { useMemo, useState } from 'react';
import { ArrowRight, Shuffle } from 'lucide-react';
import Radar from './Radar';

/* A live matchup right on the home page: two players, their numbers side by side, a score for who
   wins more categories. Cycle through the classic debates or shuffle two random stars. */

const ROWS = [
  ['PPG', p => p.stats.points],
  ['RPG', p => p.stats.totalRebounds],
  ['APG', p => p.stats.assists],
  ['SPG', p => p.stats.steals],
  ['BPG', p => p.stats.blocks],
  ['FG%', p => p.stats.fieldGoalPercentage],
  ['3P%', p => p.stats.threePointPercentage],
];

/* Seven skills, each scaled from the league's lowest to highest rotation player, as on the compare page. */
const ts = stats => stats.points / (2 * (stats.fieldGoalsAttempted + .44 * stats.freeThrowsAttempted)) * 100 || 0;
const AXES = [
  ['Scoring', [[p => p.stats.points, 'PPG']]],
  ['Efficiency', [[p => ts(p.stats), 'TS%']]],
  ['FG%', [[p => p.stats.fieldGoalPercentage, 'FG%']]],
  ['3P%', [[p => p.stats.threePointPercentage, '3P%']]],
  ['Playmaking', [[p => p.stats.assists, 'APG']]],
  ['Rebounding', [[p => p.stats.totalRebounds, 'RPG']]],
  ['Defense', [[p => p.stats.steals, 'SPG'], [p => p.stats.blocks, 'BPG']]],
];

const pick = list => list[Math.floor(Math.random() * list.length)];

export default function HeadToHead({debates, stars, pool, Art, playerIds, onCompare}) {
  const [index, setIndex] = useState(0), [custom, setCustom] = useState(null);
  const pair = custom ?? debates[index % Math.max(debates.length, 1)] ?? stars.slice(0, 2);
  const [a, b] = pair;
  const tally = useMemo(() => (a && b ? ROWS.reduce((sum, [, get]) => {
    const x = get(a), y = get(b);
    return [sum[0] + (x > y ? 1 : 0), sum[1] + (y > x ? 1 : 0)];
  }, [0, 0]) : [0, 0]), [a, b]);
  const axes = useMemo(() => (a && b ? AXES.map(([label, parts]) => ({label, sides: [a, b].map(player => {
    const shares = parts.map(([get]) => {
      const values = pool.map(get).filter(Number.isFinite), low = Math.min(...values), high = Math.max(...values);
      return high > low ? Math.max(0, Math.min(1, (get(player) - low) / (high - low))) : .5;
    });
    const pct = Math.round(shares.reduce((sum, share) => sum + share, 0) / shares.length * 100);
    return {pct, text: parts.map(([get, short]) => `${get(player).toFixed(1)} ${short}`).join(' · '), rank: `${pct}% of the league range`};
  })})) : []), [a, b, pool]);
  if (!a || !b) return null;

  const next = () => { setCustom(null); setIndex(current => current + 1); };
  const shuffle = () => {
    const first = pick(stars);
    let second = pick(stars);
    while (second === first) second = pick(stars);
    setCustom([first, second]);
  };
  const leader = tally[0] === tally[1] ? null : tally[0] > tally[1] ? a : b;
  const Side = ({player, side}) => <div className={`h2h-player ${side}`}>
    <Art entity={player} playerIds={playerIds} className="h2h-art"/>
    <b>{player.playerName}</b>
    <small>{player.team} · {player.position}</small>
  </div>;

  return <section className="h2h" aria-label="Head to head">
    <div className="h2h-head">
      <div><h2>Head to head</h2><p>{leader ? <><b>{leader.playerName}</b> takes it {Math.max(...tally)}–{Math.min(...tally)}</> : 'Dead even'} on this season&apos;s numbers</p></div>
      <div className="h2h-actions">
        <button onClick={next}>Next debate <ArrowRight size={14}/></button>
        <button onClick={shuffle}><Shuffle size={14}/> Surprise me</button>
      </div>
    </div>
    <div className="h2h-body">
      <Side player={a} side="left"/>
      <Radar axes={axes} names={[a.playerName, b.playerName]} colors={['var(--accent)', 'var(--text-1)']} scope={`${pool.length} players`}/>
      <Side player={b} side="right"/>
    </div>
    <button className="h2h-open" onClick={() => onCompare([a, b])}>Open the full comparison <ArrowRight size={15}/></button>
  </section>;
}

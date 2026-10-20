import React, { useMemo, useState } from 'react';
import { ArrowRight, Shuffle } from 'lucide-react';
import Radar from './Radar';

/* A matchup right on the home page: two players and a radar of how their games compare. It opens on
   the first classic debate; "Surprise me" shuffles two random stars. */

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
  const [custom, setCustom] = useState(null);
  const pair = custom ?? debates[0] ?? stars.slice(0, 2);
  const [a, b] = pair;
  const axes = useMemo(() => (a && b ? AXES.map(([label, parts]) => ({label, sides: [a, b].map(player => {
    const shares = parts.map(([get]) => {
      const values = pool.map(get).filter(Number.isFinite), low = Math.min(...values), high = Math.max(...values);
      return high > low ? Math.max(0, Math.min(1, (get(player) - low) / (high - low))) : .5;
    });
    const pct = Math.round(shares.reduce((sum, share) => sum + share, 0) / shares.length * 100);
    return {pct, text: parts.map(([get, short]) => `${get(player).toFixed(1)} ${short}`).join(' · '), rank: `${pct}% of the league range`};
  })})) : []), [a, b, pool]);
  if (!a || !b) return null;

  const shuffle = () => {
    const first = pick(stars);
    let second = pick(stars);
    while (second === first) second = pick(stars);
    setCustom([first, second]);
  };
  const Side = ({player, side}) => <div className={`h2h-player ${side}`}>
    <Art entity={player} playerIds={playerIds} className="h2h-art"/>
    <b><i className="h2h-dot" aria-hidden="true"/>{player.playerName}</b>
    <small>{player.team}</small>
  </div>;

  return <section className="h2h" aria-label="Head to head">
    <div className="h2h-head">
      <h2>Head to head</h2>
      <div className="h2h-actions">
        <button onClick={shuffle}><Shuffle size={14}/> Surprise me</button>
        <button className="primary" onClick={() => onCompare([a, b])}>Full comparison <ArrowRight size={14}/></button>
      </div>
    </div>
    <div className="h2h-body">
      <Side player={a} side="left"/>
      <Radar axes={axes} names={[a.playerName, b.playerName]} colors={['var(--accent)', 'var(--text-1)']} scope={`${pool.length} players`}/>
      <Side player={b} side="right"/>
    </div>
  </section>;
}

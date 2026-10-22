import React, { useMemo, useState } from 'react';
import { ArrowRight, Shuffle } from 'lucide-react';
import Radar from './Radar';
import { TEAMS, teamCodeOf } from '../lib/teams';

/* A matchup right on the home page: two players and a radar of how their games compare. It opens on
   the first classic debate; "Surprise me" shuffles two random stars. */

/* Each player is drawn in their team's colour. Two teams with near-identical colours (or one team) get the orange
   series colour for the second player so the shapes never merge. */
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
/* Clubs whose official primary is too dark to read as a data colour use their gold instead. */
const RADAR_COLOR = {IND: '#fdbb30'};
const teamHex = player => { const code = teamCodeOf(player?.team); return RADAR_COLOR[code] || TEAMS[code]?.color || '#8a8a8a'; };
const hue = hex => {
  const [r, g, b] = rgb(hex).map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return null;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
/* Apart means a different hue family, or far apart in RGB when one is a neutral. */
const apart = (x, y) => {
  const [hx, hy] = [hue(x), hue(y)];
  if (hx === null || hy === null) return Math.hypot(...rgb(x).map((v, i) => v - rgb(y)[i])) > 110;
  const gap = Math.abs(hx - hy);
  return Math.min(gap, 360 - gap) > 40;
};

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

  const [hexA, hexB] = [teamHex(a), teamHex(b)], clash = !apart(hexA, hexB);
  const tint = {'--ta': hexA, '--tb': clash ? '#ff8a3d' : hexB};
  return <section className="h2h" aria-label="Head to head" style={tint}>
    <div className="h2h-head">
      <h2>Head to head</h2>
      <div className="h2h-actions">
        <button onClick={shuffle}><Shuffle size={14}/> Surprise me</button>
        <button className="primary" onClick={() => onCompare([a, b])}>Full comparison <ArrowRight size={14}/></button>
      </div>
    </div>
    <div className="h2h-body">
      <Side player={a} side="left"/>
      <Radar axes={axes} names={[a.playerName, b.playerName]} colors={['var(--ra)', 'var(--rb)']} scope={`${pool.length} players`}/>
      <Side player={b} side="right"/>
    </div>
  </section>;
}

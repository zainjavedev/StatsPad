import React, { useMemo, useState } from 'react';
import { ArrowRight, Shuffle } from 'lucide-react';
import Radar from './Radar';
import { radarAxes, radarTints } from '../lib/radarAxes';

/* A matchup right on the home page: two players and a radar of how their games compare. It opens on
   the first classic debate; "Surprise me" shuffles two random stars. */

const pick = list => list[Math.floor(Math.random() * list.length)];

export default function HeadToHead({debates, stars, pool, Art, playerIds, onCompare}) {
  const [custom, setCustom] = useState(null);
  const pair = custom ?? debates[0] ?? stars.slice(0, 2);
  const [a, b] = pair;
  const axes = useMemo(() => (a && b ? radarAxes(a, b, pool) : []), [a, b, pool]);
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

  const tint = radarTints(a, b);
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

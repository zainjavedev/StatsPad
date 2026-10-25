import React, { forwardRef } from 'react';
import ShareSheet from './ShareSheet';
import Radar from './Radar';
import { radarAxes, radarTints } from '../lib/radarAxes';
import { siteOrigin } from '../lib/share';

/* The picture behind the share button on Head to head: both players with their per-game line either side of the
   skill radar, scaled to the whole league. */

const headshot = player => { const id = (/^espn-(\d+)$/.exec(player.playerId ?? '') || [])[1]; return id ? `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png` : null; };
const f1 = value => Number(value || 0).toFixed(1);
const split = name => { const parts = name.split(' '); return parts.length > 1 ? [parts[0], parts.slice(1).join(' ')] : ['', name]; };

function Side({player, rival, side}) {
  const [first, last] = split(player.playerName), photo = headshot(player);
  return <div className={`vp-side ${side}`}>
    <span className="vp-face">{photo ? <img src={photo} alt="" crossOrigin="anonymous"/> : <i/>}</span>
    <span className="vp-first"><i className="vp-dot" aria-hidden="true"/>{first}</span>
    <b className="vp-last" style={{'--n': Math.max(last.length, 5)}}>{last}</b>
    <span className="vp-line">
      {[['points', 'pts'], ['totalRebounds', 'reb'], ['assists', 'ast']].map(([key, label]) => <span key={key} className={player.stats[key] < rival.stats[key] ? 'behind' : ''}><b>{f1(player.stats[key])}</b>{label}</span>)}
    </span>
  </div>;
}

const Poster = forwardRef(function Poster({a, b, pool}, ref) {
  const axes = radarAxes(a, b, pool);
  return <div className="vp" ref={ref} style={radarTints(a, b)}>
    <div className="vp-body">
      <Side player={a} rival={b} side="left"/>
      <Radar axes={axes} names={[a.playerName, b.playerName]} colors={['var(--ra)', 'var(--rb)']} scope={`${pool.length} players`}/>
      <Side player={b} rival={a} side="right"/>
    </div>
    <p className="vp-foot"><b>statspads.com</b></p>
  </div>;
});

export default function VersusShare({a, b, pool, onClose}) {
  const slug = player => player.playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return <ShareSheet ready onClose={onClose} filename={`${slug(a)}-vs-${slug(b)}`} title={`${a.playerName} vs ${b.playerName}`}
    text={`${a.playerName} vs ${b.playerName}: ${f1(a.stats.points)} vs ${f1(b.stats.points)} PPG`} url={`${siteOrigin()}/`}>
    {ref => <Poster ref={ref} a={a} b={b} pool={pool}/>}
  </ShareSheet>;
}

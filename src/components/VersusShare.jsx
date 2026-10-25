import React, { forwardRef, useEffect, useState } from 'react';
import ShareSheet from './ShareSheet';
import Radar from './Radar';
import { radarAxes, radarTints } from '../lib/radarAxes';
import { siteOrigin } from '../lib/share';
import { espnLogoUrl, teamCodeOf, TEAMS } from '../lib/teams';
import { loadSchedule } from '../lib/schedule';

/* The picture behind the share button on Head to head: both players with their per-game line either side of the
   skill radar, scaled to the whole league. */

const headshot = player => {
  if (player.entityType === 'team') { const code = teamCodeOf(player.team); return TEAMS[code] ? espnLogoUrl(code) : null; }
  const id = (/^espn-(\d+)$/.exec(player.playerId ?? '') || [])[1]; return id ? `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png` : null; };
const f1 = value => Number(value || 0).toFixed(1);
const split = name => { const parts = name.split(' '); return parts.length > 1 ? [parts[0], parts.slice(1).join(' ')] : ['', name]; };

/* W-L this regular season from the finished games, by team code. */
function useRecords(enabled) {
  const [records, setRecords] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    loadSchedule().then(games => {
      const table = {};
      for (const game of games) {
        if (game.preseason || game.state !== 'post') continue;
        const [away, home] = [Number(game.away.score), Number(game.home.score)];
        if (!(away >= 0 && home >= 0) || away === home) continue;
        for (const [team, won] of [[game.away, away > home], [game.home, home > away]]) {
          const row = table[team.code] ??= {w: 0, l: 0};
          if (won) row.w += 1; else row.l += 1;
        }
      }
      if (live) setRecords(table);
    }).catch(() => { if (live) setRecords({}); });
    return () => { live = false; };
  }, [enabled]);
  return records;
}

function Side({player, rival, side, records}) {
  const team = player.entityType === 'team', code = team ? teamCodeOf(player.team) : null;
  const record = team && records?.[code] ? `${records[code].w}\u2013${records[code].l}` : null;
  const [first, last] = team ? ['Record', record || '\u2013'] : split(player.playerName), photo = headshot(player);
  return <div className={`vp-side ${side}`}>
    <span className={`vp-face${player.entityType === 'team' ? ' is-logo' : ''}`}>{photo ? <img src={photo} alt="" crossOrigin="anonymous"/> : <i/>}</span>
    <span className="vp-first"><i className="vp-dot" aria-hidden="true"/>{first}</span>
    <b className="vp-last" style={{'--n': Math.max(last.length, 5)}}>{last}</b>
    {!team && <span className="vp-line">
      {[['points', 'pts'], ['totalRebounds', 'reb'], ['assists', 'ast']].map(([key, label]) => <span key={key} className={player.stats[key] < rival.stats[key] ? 'behind' : ''}><b>{f1(player.stats[key])}</b>{label}</span>)}
    </span>}
  </div>;
}

const Poster = forwardRef(function Poster({a, b, pool, records}, ref) {
  const axes = radarAxes(a, b, pool);
  return <div className="vp" ref={ref} style={radarTints(a, b)}>
    <div className="vp-body">
      <Side player={a} rival={b} side="left" records={records}/>
      <Radar axes={axes} names={[a.playerName, b.playerName]} colors={['var(--ra)', 'var(--rb)']} scope={`${pool.length} players`}/>
      <Side player={b} rival={a} side="right" records={records}/>
    </div>
    <p className="vp-foot"><b>statspads.com</b></p>
  </div>;
});

export default function VersusShare({a, b, pool, onClose}) {
  const records = useRecords(a.entityType === 'team');
  const slug = player => player.playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return <ShareSheet ready={a.entityType !== 'team' || records !== null} onClose={onClose} filename={`${slug(a)}-vs-${slug(b)}`} title={`${a.playerName} vs ${b.playerName}`}
    text={`${a.playerName} vs ${b.playerName}: ${f1(a.stats.points)} vs ${f1(b.stats.points)} PPG`} url={`${siteOrigin()}/`}>
    {ref => <Poster ref={ref} a={a} b={b} pool={pool} records={records}/>}
  </ShareSheet>;
}

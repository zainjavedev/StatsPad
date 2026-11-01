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

/* One side, laid out like the Compare card: the photo cut off at the shoulders, the full name, the side's colour bar and the team logo
   (a team gets its logo up top and its record under the name). */
function Side({player, side, records}) {
  const team = player.entityType === 'team', code = teamCodeOf(player.team), photo = headshot(player);
  const record = team && records?.[code] ? `${records[code].w}\u2013${records[code].l}` : null;
  return <div className={`vp-side ${side}`}>
    <span className={`vp-photo${team ? ' is-logo' : ''}`}>{photo ? <img src={photo} alt="" crossOrigin="anonymous"/> : <i/>}</span>
    <b className="vp-name">{player.playerName}</b>
    <i className="vp-bar" aria-hidden="true"/>
    {team ? <span className="vp-record">{record || '\u2013'}</span> : TEAMS[code] && <img className="vp-team" src={espnLogoUrl(code)} alt="" crossOrigin="anonymous"/>}
  </div>;
}

const Poster = forwardRef(function Poster({a, b, pool, records}, ref) {
  const axes = radarAxes(a, b, pool);
  /* Both names take the size that fits the longer one, so the two sides match and the photos line up. */
  const longest = Math.max(8, a.playerName.length, b.playerName.length);
  return <div className="vp" ref={ref} style={{...radarTints(a, b), '--n': longest}}>
    <div className="vp-body">
      <Side player={a} side="left" records={records}/>
      <Radar axes={axes} names={[a.playerName, b.playerName]} colors={['var(--ra)', 'var(--rb)']} scope={`${pool.length} players`}/>
      <Side player={b} side="right" records={records}/>
    </div>
    <p className="vp-foot"><b>statspads.com</b></p>
  </div>;
});

export default function VersusShare({a, b, pool, onClose}) {
  const records = useRecords(a.entityType === 'team');
  const slug = player => player.playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return <ShareSheet width={1600} ready={a.entityType !== 'team' || records !== null} onClose={onClose} filename={`${slug(a)}-vs-${slug(b)}`} title={`${a.playerName} vs ${b.playerName}`}
    text={`${a.playerName} vs ${b.playerName}: ${f1(a.stats.points)} vs ${f1(b.stats.points)} PPG`} url={`${siteOrigin()}/`}>
    {ref => <Poster ref={ref} a={a} b={b} pool={pool} records={records}/>}
  </ShareSheet>;
}

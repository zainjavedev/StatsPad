import React, { forwardRef } from 'react';
import ShareSheet from './ShareSheet';
import Radar from './Radar';
import { radarAxes, teamHex } from '../lib/radarAxes';
import { onDark, siteOrigin } from '../lib/share';
import { teamCodeOf, espnLogoUrl, TEAMS, espnHeadshotLarge } from '../lib/teams';
import { playerUrl, teamUrl } from '../lib/routes';

/* The picture behind the share button on a player's profile: the performance-card header with his season
   averages, the rest of the per-game line, and his skill radar beside it. A team page uses the same card with its logo
   in place of the face and the team line (no minutes). */

const f1 = value => Number(value || 0).toFixed(1);
const headshot = player => { const id = (/^espn-(\d+)$/.exec(player.playerId ?? '') || [])[1]; return id ? espnHeadshotLarge(id) : null; };
const LINE = [
  ['MPG', p => p.minutesPerGame], ['SPG', p => p.stats.steals], ['BPG', p => p.stats.blocks], ['TO', p => p.stats.turnovers],
  ['FG%', p => p.stats.fieldGoalPercentage], ['3P%', p => p.stats.threePointPercentage], ['FT%', p => p.stats.freeThrowPercentage], ['TS%', p => p.trueShooting],
];
const TEAM_LINE = [['SPG', p => p.stats.steals], ['BPG', p => p.stats.blocks], ['TO', p => p.stats.turnovers], ['FG%', p => p.stats.fieldGoalPercentage], ['3P%', p => p.stats.threePointPercentage]];

const Poster = forwardRef(function Poster({player, pool, season, team}, ref) {
  const code = teamCodeOf(player.team), photo = team ? (TEAMS[code] ? espnLogoUrl(code) : null) : headshot(player), s = player.stats;
  const name = team ? player.playerName : player.playerName.replace(/^(\S)\S*\s+/, '$1. ');
  const axes = radarAxes(player, player, pool).map(axis => ({...axis, sides: [axis.sides[0]]}));
  return <div className="pr" ref={ref}>
    <div className="pr-left">
      <div className="rp-card pr-card">
        <span className={`rp-face${team ? ' is-logo' : ''}`}>{photo ? <img src={photo} alt="" crossOrigin="anonymous"/> : <i/>}{code && !team && <img className="rp-team" src={espnLogoUrl(code)} alt="" crossOrigin="anonymous"/>}</span>
        <span className="rp-main">
          <span className="rp-top"><b>{name}</b><small> · {player.gamesPlayed} {player.gamesPlayed === 1 ? 'game' : 'games'}</small></span>
          <span className="rp-trio"><span><b>{f1(s.points)}</b>pts</span><span><b>{f1(s.totalRebounds)}</b>reb</span><span><b>{f1(s.assists)}</b>ast</span></span>
          <small className="pr-sub">{team ? 'Team' : player.position} · {season}</small>
        </span>
      </div>
      <div className="pr-line">{(team ? TEAM_LINE : LINE).map(([label, get]) => <span key={label}><b>{f1(get(player))}</b>{label}</span>)}</div>
    </div>
    <div className="pr-radar"><Radar axes={axes} names={[player.playerName]} colors={[onDark(teamHex(player))]}/></div>
    <p className="pr-foot"><b>statspads.com</b><span>{season} season</span></p>
  </div>;
});

export default function PlayerShare({player, pool, season, team = false, onClose}) {
  const slug = player.playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), code = teamCodeOf(player.team);
  return <ShareSheet ready onClose={onClose} filename={`${slug}-season`} title={player.playerName}
    text={`${player.playerName}: ${f1(player.stats.points)} PPG, ${f1(player.stats.totalRebounds)} RPG, ${f1(player.stats.assists)} APG`} url={`${siteOrigin()}${team && TEAMS[code] ? teamUrl(code) : playerUrl(player.playerName)}`}>
    {ref => <Poster ref={ref} player={player} pool={pool} season={season} team={team}/>}
  </ShareSheet>;
}

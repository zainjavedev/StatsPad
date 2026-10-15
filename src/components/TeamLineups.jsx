import React, { useEffect, useMemo, useState } from 'react';
import { TEAMS, logoUrl, teamCodeOf } from '../lib/teams';
import { Headshot } from './TeamPage';

/* Shown under a team-vs-team comparison. The starting fives are lined up
   position by position, the full rosters are simply listed side by side. */

const SLOTS = ['PG', 'SG', 'SF', 'PF', 'C'];
const LINE = [['points', 'PTS'], ['totalRebounds', 'REB'], ['assists', 'AST']];

function useRoster(code) {
  const [roster, setRoster] = useState(null);
  useEffect(() => {
    let active = true;
    setRoster(null);
    fetch(`/data/2026-27/rosters/${code}.json`).then(response => response.json()).then(data => active && setRoster(data)).catch(() => active && setRoster(false));
    return () => { active = false; };
  }, [code]);
  return roster;
}

/* Last season's numbers, joined on the Basketball Reference id. */
function withStats(roster, byId) {
  return roster ? roster.players.map(entry => ({...entry, stats: (entry.bbrefId && byId.get(entry.bbrefId)?.stats) || null})) : [];
}

function Line({player, other}) {
  if (!player?.stats) return <span>{player ? (player.exp === 0 ? 'Rookie' : 'No NBA stats last season') : '—'}</span>;
  return <span>{LINE.map(([key, label]) => {
    const mine = player.stats[key], theirs = other?.stats?.[key];
    const ahead = theirs != null && mine > theirs;
    return <em key={key} className={ahead ? 'ahead' : ''}>{mine.toFixed(1)}<small>{label}</small></em>;
  })}</span>;
}

function LineupPlayer({player, other, right}) {
  if (!player) return <div className={right ? 'lineup-player right' : 'lineup-player'}><span className="lineup-who"><strong>—</strong></span></div>;
  return <div className={right ? 'lineup-player right' : 'lineup-player'}>
    <Headshot player={player} className="lineup-art"/>
    <span className="lineup-who"><strong>{player.name}</strong><Line player={player} other={other}/></span>
  </div>;
}

function RosterColumn({code, players}) {
  return <div className="roster-col">
    <div className="roster-col-head"><img src={logoUrl(code)} alt="" onError={event => { event.currentTarget.style.visibility = 'hidden'; }}/><strong>{TEAMS[code].name}</strong></div>
    <ul>{players.map(player => <li key={player.name}>
      <Headshot player={player} className="roster-art"/>
      <span className="roster-who"><b>{player.name}</b><small>{[player.slot || player.pos, player.stats && `${player.stats.points.toFixed(1)} PPG`].filter(Boolean).join(' · ')}</small></span>
    </li>)}</ul>
  </div>;
}

export default function TeamLineups({teams, leaguePlayers, colors}) {
  const codes = teams.map(team => teamCodeOf(team.team));
  const first = useRoster(codes[0]), second = useRoster(codes[1]);
  const byId = useMemo(() => new Map(leaguePlayers.map(player => [player.playerId, player])), [leaguePlayers]);
  const sides = useMemo(() => [withStats(first, byId), withStats(second, byId)], [first, second, byId]);
  if (codes.some(code => !TEAMS[code])) return null;
  if (first === null || second === null) return <section className="team-h2h" aria-busy="true"><div className="sk" style={{height: 420, borderRadius: 14}}/></section>;
  if (first === false || second === false) return null;
  const starter = (players, slot) => players.find(player => player.slot === slot) || null;

  return <section className="team-h2h">
    <div className="team-h2h-head"><small>Expected starting five · 2026–27</small><span>Per game, last season</span></div>
    <div className="lineup-teams">
      {[0, 1].map(side => <span key={codes[side]} className={side ? 'right' : ''}><i style={{background: colors[side]}}/>{TEAMS[codes[side]].name}</span>)}
    </div>
    {SLOTS.map(slot => {
      const a = starter(sides[0], slot), b = starter(sides[1], slot);
      return <div className="lineup-row" key={slot}>
        <LineupPlayer player={a} other={b}/>
        <span className="lineup-slot">{slot}</span>
        <LineupPlayer player={b} other={a} right/>
      </div>;
    })}
    <div className="team-h2h-head rosters-title"><small>Rosters</small><span>Expected starters first</span></div>
    <div className="rosters-grid">
      <RosterColumn code={codes[0]} players={sides[0]}/>
      <RosterColumn code={codes[1]} players={sides[1]}/>
    </div>
  </section>;
}

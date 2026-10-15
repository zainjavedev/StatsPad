import React, { useEffect, useMemo, useState } from 'react';
import { TEAMS, teamCodeOf } from '../lib/teams';
import { Headshot } from './TeamPage';

/* The two expected starting fives under a team-vs-team header, one row per
   team with the positions lined up, so each card sits over its opposite. */

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
function starters(roster, byId) {
  if (!roster) return {};
  return Object.fromEntries(SLOTS.map(slot => {
    const entry = roster.players.find(player => player.slot === slot);
    return [slot, entry && {...entry, stats: (entry.bbrefId && byId.get(entry.bbrefId)?.stats) || null}];
  }));
}

function Card({slot, player, other, color}) {
  if (!player) return <div className="lc lc-empty"><span className="lc-badge-plain">{slot}</span>—</div>;
  return <div className="lc" style={{'--team': color}}>
    <span className="lc-stage">
      <span className="lc-badge">{slot}</span>
      <Headshot player={player} className="lc-art"/>
    </span>
    <b className="lc-name" title={player.name}>{player.name}</b>
    {player.stats
      ? <span className="lc-line">{LINE.map(([key, label]) => {
        const theirs = other?.stats?.[key];
        return <em key={key} className={theirs != null && player.stats[key] > theirs ? 'ahead' : ''}>{player.stats[key].toFixed(1)}<small>{label}</small></em>;
      })}</span>
      : <span className="lc-line"><em>{player.exp === 0 ? 'Rookie' : 'No stats yet'}</em></span>}
  </div>;
}

export default function TeamLineups({teams, leaguePlayers, colors}) {
  const codes = teams.map(team => teamCodeOf(team.team));
  const first = useRoster(codes[0]), second = useRoster(codes[1]);
  const byId = useMemo(() => new Map(leaguePlayers.map(player => [player.playerId, player])), [leaguePlayers]);
  const fives = useMemo(() => [starters(first, byId), starters(second, byId)], [first, second, byId]);
  if (codes.some(code => !TEAMS[code]) || first === false || second === false) return null;
  if (first === null || second === null) return <section className="lineup" aria-busy="true"><div className="sk" style={{height: 330, borderRadius: 12}}/></section>;

  return <section className="lineup">
    <div className="lineup-head"><small>Expected starting five</small><span>Per game, last season</span></div>
    {[0, 1].map(side => <div className="lineup-side" key={codes[side]}>
      <div className="lineup-team"><i style={{background: colors[side]}}/>{TEAMS[codes[side]].name}</div>
      <div className="lineup-grid">{SLOTS.map(slot => <Card key={slot} slot={slot} player={fives[side][slot]} other={fives[1 - side][slot]} color={TEAMS[codes[side]].color}/>)}</div>
    </div>)}
  </section>;
}

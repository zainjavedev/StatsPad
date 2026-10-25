import React, { useEffect, useMemo, useState } from 'react';
import { TEAMS, teamCodeOf } from '../lib/teams';
import { playerUrl } from '../lib/routes';
import { indexPlayers, isCurrent, isPreseason, statsFor } from '../lib/season';
import { loadSchedule } from '../lib/schedule';
import { Headshot } from './TeamPage';

/* The two expected starting fives under a team-vs-team header, one row per
   team with the positions lined up, so each card sits over its opposite. */

const SLOTS = ['PG', 'SG', 'SF', 'PF', 'C'];
const LINE = [['points', 'PPG'], ['totalRebounds', 'RPG'], ['assists', 'APG']];

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
function starters(roster, index) {
  if (!roster) return {};
  const five = roster.players.filter(player => player.unit === 'starters');
  return Object.fromEntries(SLOTS.map((slot, position) => {
    const entry = five[position];
    return [slot, entry && {...entry, stats: statsFor(entry, index)?.stats || null}];
  }));
}

/* Every game between the two teams this season, newest regular-season meetings first: final scores, or the date when it is still to come. */
function useMeetings(codes) {
  const [games, setGames] = useState(null);
  const [a, b] = codes;
  useEffect(() => {
    let active = true;
    setGames(null);
    loadSchedule().then(all => active && setGames(all.filter(game => [a, b].includes(game.away.code) && [a, b].includes(game.home.code) && game.away.code !== game.home.code))).catch(() => active && setGames([]));
    return () => { active = false; };
  }, [a, b]);
  return games;
}

const dayOf = date => date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});

function Meetings({games}) {
  if (!games?.length) return null;
  const ordered = [...games].sort((x, y) => x.date - y.date);
  return <div className="meetings">
    <div className="lineup-head"><small>Matchups this season</small><span>{ordered.length} {ordered.length === 1 ? 'game' : 'games'}</span></div>
    <div className="meet-row">{ordered.map(game => {
      const done = game.state === 'post', live = game.state === 'in', awayScore = Number(game.away.score), homeScore = Number(game.home.score);
      return <a key={game.id} href={`/games/${game.id}`} className={`meet${live ? ' live' : ''}`}>
        <small>{dayOf(game.date)}{game.preseason ? ' · Preseason' : ''}{live ? ' · Live' : ''}</small>
        {[game.away, game.home].map((team, index) => {
          const won = done && (index === 0 ? awayScore > homeScore : homeScore > awayScore);
          return <span key={team.code} className={`meet-team${won ? ' won' : ''}`}><img src={team.logo} alt="" width="20" height="20" loading="lazy"/><b>{team.name}</b>{(done || live) && <strong>{team.score}</strong>}</span>;
        })}
        {!done && !live && <em>{game.date.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}</em>}
      </a>;
    })}</div>
  </div>;
}

function Card({slot, player, other, color}) {
  if (!player) return <div className="lc lc-empty"><span className="lc-badge-plain">{slot}</span>—</div>;
  return <a className="lc" href={playerUrl(player.name)} aria-label={`${player.name} stats`} style={{'--team': color}}>
    <span className="lc-stage">
      <span className="lc-badge">{player.slot ?? player.pos ?? slot}</span>
      <Headshot player={player} className="lc-art"/>
    </span>
    <b className="lc-name" title={player.name}>{player.name}</b>
    {player.stats
      ? <span className="lc-line">{LINE.map(([key, label]) => {
        const theirs = other?.stats?.[key];
        return <em key={key} className={theirs != null && player.stats[key] > theirs ? 'ahead' : ''}>{player.stats[key].toFixed(1)}<small>{label}</small></em>;
      })}</span>
      : <span className="lc-line"><em>{player.exp === 0 ? 'Rookie' : 'No stats yet'}</em></span>}
  </a>;
}

export default function TeamLineups({teams, leaguePlayers, season, colors}) {
  const codes = teams.map(team => teamCodeOf(team.team));
  const first = useRoster(codes[0]), second = useRoster(codes[1]);
  const meetings = useMeetings(codes);
  const index = useMemo(() => indexPlayers(leaguePlayers), [leaguePlayers]);
  const fives = useMemo(() => [starters(first, index), starters(second, index)], [first, second, index]);
  if (codes.some(code => !TEAMS[code]) || first === false || second === false) return null;
  if (first === null || second === null) return <section className="lineup" aria-busy="true" aria-label="Loading the lineups"><div className="sk sk-title sk-small"/><div className="meet-row">{[0, 1, 2].map(index => <div key={index} className="sk" style={{flex: '0 0 172px', height: 112, borderRadius: 12}}/>)}</div><div className="sk" style={{height: 330, borderRadius: 12, marginTop: 18}}/></section>;

  return <section className="lineup">
    <Meetings games={meetings}/>
    <div className="lineup-head"><small>Expected starting five</small><span>Per game, {isCurrent(season) ? (isPreseason() ? 'preseason' : 'this season') : 'last season'}</span></div>
    {[0, 1].map(side => <div className="lineup-side" key={codes[side]}>
      <div className="lineup-team"><i style={{background: colors[side]}}/>{TEAMS[codes[side]].name}</div>
      <div className="lineup-grid">{SLOTS.map(slot => <Card key={slot} slot={slot} player={fives[side][slot]} other={fives[1 - side][slot]} color={TEAMS[codes[side]].color}/>)}</div>
    </div>)}
  </section>;
}

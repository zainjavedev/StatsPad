import React, { useEffect, useMemo, useState } from 'react';
import { loadSchedule } from '../lib/schedule';
import { TEAMS } from '../lib/teams';
import { useFavorites } from '../lib/favorites';
import GameTimeline from './GameTimeline';
import { navigate } from '../lib/nav';

/* Every game of the season, filterable down to a team or a single matchup. */

const PAGE = 40;
const codes = Object.keys(TEAMS).sort((a, b) => TEAMS[a].name.localeCompare(TEAMS[b].name));

export default function SchedulePage() {
  const favorites = useFavorites();
  const [games, setGames] = useState(null), [team, setTeam] = useState(''), [other, setOther] = useState(''), [mine, setMine] = useState(false), [when, setWhen] = useState('upcoming'), [count, setCount] = useState(PAGE);

  useEffect(() => {
    loadSchedule().then(all => setGames(all.filter(game => !game.preseason))).catch(() => setGames([]));
    const params = new URLSearchParams(window.location.search);
    if (TEAMS[params.get('team')]) setTeam(params.get('team'));
    if (TEAMS[params.get('vs')]) setOther(params.get('vs'));
  }, []);

  const shown = useMemo(() => {
    if (!games) return null;
    const cutoff = Date.now() - 3 * 3600 * 1000;
    const list = games.filter(game => {
      const codesIn = [game.away.code, game.home.code];
      if (team && !codesIn.includes(team)) return false;
      if (other && !codesIn.includes(other)) return false;
      if (mine && !codesIn.some(code => favorites.includes(code))) return false;
      return when === 'all' || (when === 'upcoming' ? game.date >= cutoff || game.state === 'in' : game.date < cutoff && game.state !== 'in');
    });
    return when === 'past' ? [...list].reverse() : list;
  }, [games, team, other, mine, when, favorites]);

  useEffect(() => setCount(PAGE), [team, other, mine, when]);

  return <section className="sched">
    <div className="sched-head">
      <h1>Schedule</h1>
    </div>
    <div className="sched-filters">
      <label>Team<select value={team} onChange={event => setTeam(event.target.value)}><option value="">All teams</option>{codes.map(code => <option key={code} value={code}>{TEAMS[code].name}</option>)}</select></label>
      <span className="sched-vs">vs</span>
      <label>Opponent<select value={other} onChange={event => setOther(event.target.value)}><option value="">Anyone</option>{codes.filter(code => code !== team).map(code => <option key={code} value={code}>{TEAMS[code].name}</option>)}</select></label>
      {favorites.length > 0 && <button className={mine ? 'sched-mine on' : 'sched-mine'} onClick={() => setMine(!mine)}>My teams</button>}
      <div className="front-tabs" role="group" aria-label="When">
        {[['upcoming', 'Upcoming'], ['past', 'Played'], ['all', 'All']].map(([key, label]) => <button key={key} className={when === key ? 'active' : ''} onClick={() => setWhen(key)}>{label}</button>)}
      </div>
    </div>
    <div className="front-panel">
      <div className="front-panel-head"><h2>{shown ? `${shown.length} game${shown.length === 1 ? '' : 's'}` : 'Loading…'}</h2></div>
      <GameTimeline games={shown && shown.slice(0, count)} favorites={favorites} results={when === 'past'} all onOpen={game => navigate(`/games/${game.id}`)}/>
      {shown && shown.length > count && <button className="tl-more" onClick={() => setCount(value => value + PAGE)}>Show {Math.min(PAGE, shown.length - count)} more</button>}
    </div>
  </section>;
}

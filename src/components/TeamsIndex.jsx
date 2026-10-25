import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { TEAMS } from '../lib/teams';
import { favoritesFirst, useFavorites } from '../lib/favorites';
import { TeamLogo } from './TeamRail';
import FavoriteStar from './FavoriteStar';
import AlertsBanner from './AlertsBanner';

/* Divisions in the order the league lists them; a team belongs to exactly one. */
const DIVISIONS = [
  ['East', 'Atlantic', ['BOS', 'BKN', 'NYK', 'PHI', 'TOR']],
  ['East', 'Central', ['CHI', 'CLE', 'DET', 'IND', 'MIL']],
  ['East', 'Southeast', ['ATL', 'CHA', 'MIA', 'ORL', 'WAS']],
  ['West', 'Northwest', ['DEN', 'MIN', 'OKC', 'POR', 'UTA']],
  ['West', 'Pacific', ['GSW', 'LAC', 'LAL', 'PHX', 'SAC']],
  ['West', 'Southwest', ['DAL', 'HOU', 'MEM', 'NOP', 'SAS']],
];
const FILTERS = ['All', 'East', 'West', ...DIVISIONS.map(([, name]) => name)];
const inFilter = (code, filter) => filter === 'All' || DIVISIONS.some(([conf, name, codes]) => (conf === filter || name === filter) && codes.includes(code));

export default function TeamsIndex({onOpen}) {
  const favorites = useFavorites();
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('All'), [fives, setFives] = useState({});
  /* public/lineups.json: each team's expected starting five, written by the prerender step. */
  useEffect(() => { fetch('/lineups.json').then(response => (response.ok ? response.json() : null)).then(data => data && setFives(data.teams ?? {})).catch(() => {}); }, []);
  const term = query.trim().toLowerCase();
  const shown = favoritesFirst(favorites).filter(code => TEAMS[code] && inFilter(code, filter) && (!term || TEAMS[code].name.toLowerCase().includes(term) || code.toLowerCase() === term));
  return <section className="teams-index">
    <div className="teams-index-head">
      <h1>Teams and starting lineups</h1>
      <p>The expected starting five for all 30 clubs. Pick one to see its bench rotation, 2026–27 roster, numbers and recent games. Tap the bell on a team to get its tip-off alerts.</p>
    </div>
    <AlertsBanner/>
    <div className="teams-filter">
      <input className="teams-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search teams" aria-label="Search teams"/>
      <div className="teams-chips" role="group" aria-label="Conference or division">{FILTERS.map(name => <button key={name} className={filter === name ? 'active' : ''} onClick={() => setFilter(name)}>{name}</button>)}</div>
    </div>
    {shown.length === 0 && <p className="teams-empty">No team matches that search.</p>}
    <div className="teams-index-grid">{shown.map(code => <div key={code} className="team-tile-wrap">
      <button className="team-tile" style={{'--team': TEAMS[code].color}} onClick={() => onOpen(code)}>
        <TeamLogo code={code} className="team-tile-logo"/>
        <b>{TEAMS[code].name}</b>
        {fives[code]?.length > 0 && <ol className="team-five">{fives[code].map(([slot, name]) => <li key={slot + name}><i>{slot}</i>{name}</li>)}</ol>}
        <span>Full lineup <ArrowRight size={14}/></span>
      </button>
      <FavoriteStar code={code} active={favorites.includes(code)} className="on-tile"/>
    </div>)}</div>
  </section>;
}

import React, { useMemo, useState } from 'react';
import { ArrowRight, BarChart3, Search } from 'lucide-react';
import { GameList, NewsList } from './Feeds';
import { useFeed } from '../lib/useFeed';
import { latestNews, upcomingGames } from '../lib/espn';

/* The front door: find a player, jump to a tool, see what's on this week.
   Deep leaderboards live on the Leaders page. */

const fold = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const LEADERS = [
  {key: 'points', label: 'Points', unit: 'PPG'},
  {key: 'totalRebounds', label: 'Rebounds', unit: 'RPG'},
  {key: 'assists', label: 'Assists', unit: 'APG'},
  {key: 'threePointPercentage', label: 'Three-point %', unit: '3P%', pct: true},
];
const loadGames = () => upcomingGames(7, 6);
const loadNews = () => latestNews(5);

function PlayerSearch({players, Art, playerIds, onOpen}) {
  const [query, setQuery] = useState(''), [active, setActive] = useState(0);
  const results = useMemo(() => {
    const needle = fold(query.trim());
    if (!needle) return [];
    return players.filter(player => fold(player.playerName).includes(needle))
      .sort((a, b) => fold(a.playerName).indexOf(needle) - fold(b.playerName).indexOf(needle) || b.stats.points - a.stats.points)
      .slice(0, 6);
  }, [players, query]);
  const choose = player => { setQuery(''); onOpen(player); };
  const onKeyDown = event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(index => Math.min(index + 1, results.length - 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(index - 1, 0)); }
    if (event.key === 'Enter' && results[active]) choose(results[active]);
    if (event.key === 'Escape') setQuery('');
  };
  return <div className="front-search">
    <label>
      <Search size={20}/>
      <input value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} onKeyDown={onKeyDown}
        placeholder="Search any NBA player" aria-label="Search players" autoComplete="off" enterKeyHint="search"/>
    </label>
    {query.trim() && <ul className="front-results" role="listbox">
      {results.length ? results.map((player, index) => <li key={player.playerId}>
        <button className={index === active ? 'active' : ''} onMouseEnter={() => setActive(index)} onClick={() => choose(player)}>
          <Art entity={player} playerIds={playerIds} className="front-result-art"/>
          <span><b>{player.playerName}</b><small>{player.team} · {player.position}</small></span>
          <strong>{player.stats.points.toFixed(1)} <small>PPG</small></strong>
        </button>
      </li>) : <li className="front-no-results">No player matches “{query.trim()}”.</li>}
    </ul>}
  </div>;
}

export default function FrontPage({players, teams, playerIds, Art, onOpen, onCompare, onTeam, onLeaders}) {
  const games = useFeed(loadGames), news = useFeed(loadNews);
  const leaders = useMemo(() => {
    const pool = players.filter(player => player.gamesPlayed >= 15 && player.minutesPerGame >= 10);
    return LEADERS.map(entry => {
      const eligible = entry.key === 'threePointPercentage' ? pool.filter(player => player.stats.threePointersAttempted >= 3) : pool;
      return {...entry, player: [...eligible].sort((a, b) => b.stats[entry.key] - a.stats[entry.key])[0]};
    }).filter(entry => entry.player);
  }, [players]);

  return <section className="front-page">
    <div className="front-hero">
      <div className="front-hero-copy">
        <h1>Look up any player.</h1>
        <p>Last season&apos;s numbers for {players.length} players, this season&apos;s games and news.</p>
        <PlayerSearch players={players} Art={Art} playerIds={playerIds} onOpen={onOpen}/>
      </div>
      <div className="front-tiles">
        <button className="front-tile" onClick={onCompare}>
          <span className="front-tile-icon"><BarChart3 size={20}/></span>
          <span><b>Compare players</b><small>Head-to-head on every stat</small></span>
          <ArrowRight size={18}/>
        </button>
        <button className="front-tile sixers" onClick={onTeam}>
          <span className="front-tile-icon"><img src="https://cdn.nba.com/logos/nba/1610612755/global/L/logo.svg" alt=""/></span>
          <span><b>Philadelphia 76ers</b><small>2026–27 roster and rotation</small></span>
          <ArrowRight size={18}/>
        </button>
      </div>
    </div>

    <section className="front-block">
      <div className="front-block-head"><h2>2025–26 leaders</h2><button onClick={onLeaders}>All leaders <ArrowRight size={14}/></button></div>
      <div className="front-leaders">{leaders.map(entry => <button key={entry.key} className="front-leader" onClick={() => onOpen(entry.player)}>
        <Art entity={entry.player} playerIds={playerIds} className="front-leader-art"/>
        <span>
          <small>{entry.label}</small>
          <strong>{entry.player.stats[entry.key].toFixed(1)}{entry.pct ? '%' : ''} <em>{entry.unit}</em></strong>
          <b>{entry.player.playerName}</b>
        </span>
      </button>)}</div>
    </section>

    <div className="front-feeds">
      <section className="front-panel">
        <h2>Upcoming games</h2>
        <GameList games={games}/>
      </section>
      <section className="front-panel">
        <h2>Latest news</h2>
        <NewsList articles={news}/>
      </section>
    </div>

    <section className="front-block">
      <div className="front-block-head"><h2>Teams</h2></div>
      <div className="front-teams">{[...teams].sort((a, b) => a.playerName.localeCompare(b.playerName)).map(team => <button key={team.teamId} onClick={() => team.team === 'PHI' ? onTeam() : onOpen(team)} title={team.playerName}>
        <Art entity={team} playerIds={playerIds} className="front-team-logo"/>
        <span>{team.team}</span>
      </button>)}</div>
    </section>
  </section>;
}

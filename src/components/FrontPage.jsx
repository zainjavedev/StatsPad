import React, { useMemo, useState } from 'react';
import { ArrowRight, BarChart3, Search } from 'lucide-react';
import { GameList, NewsList } from './Feeds';
import { useFeed } from '../lib/useFeed';
import { latestNews, recentResults, upcomingGames } from '../lib/espn';
import { TEAMS, nickname, teamCodeOf } from '../lib/teams';
import { pretty, qualified } from '../lib/season';
import { favoritesFirst, useFavorites } from '../lib/favorites';
import FavoriteStar from './FavoriteStar';
import NextUp, { useGames } from './NextUp';
import GameTimeline from './GameTimeline';

/* The front door: settle a debate, find a player, see the league's top
   performers and what's on. Deep leaderboards live on the Leaders page. */

const fold = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const LEADERS = [
  {key: 'points', label: 'Points', unit: 'PPG'},
  {key: 'totalRebounds', label: 'Rebounds', unit: 'RPG'},
  {key: 'assists', label: 'Assists', unit: 'APG'},
  {key: 'threePointPercentage', label: 'Three-point %', unit: '3P%', pct: true},
];
const DEBATES = [
  ['Luka Dončić', 'Nikola Jokić'],
  ['Shai Gilgeous-Alexander', 'Anthony Edwards'],
  ['Victor Wembanyama', 'Chet Holmgren'],
  ['Nikola Jokić', 'Shai Gilgeous-Alexander'],
];
/* Shown (after any followed teams) until someone has picked their own. */
const HOT_TEAMS = ['LAL', 'PHI', 'BOS', 'NYK', 'GSW', 'OKC'];
const TEAM_ROW = 6;
const colorOf = player => TEAMS[teamCodeOf(player.team)]?.color || '#3b3b45';
const loadGames = () => upcomingGames(7, 12);
const loadResults = () => recentResults(7, 8);
const loadNews = () => latestNews(4);

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

function Debate({pair, Art, playerIds, onCompare}) {
  const [a, b] = pair;
  const line = player => `${player.stats.points.toFixed(1)} PPG · ${player.stats.assists.toFixed(1)} APG`;
  return <button className="debate-card" onClick={() => onCompare(pair)} style={{'--a': colorOf(a), '--b': colorOf(b)}}>
    <span className="debate-stage">
      <Art entity={a} playerIds={playerIds} className="debate-art"/>
      <i className="debate-vs">VS</i>
      <Art entity={b} playerIds={playerIds} className="debate-art"/>
    </span>
    <span className="debate-names">
      <span><b>{a.playerName}</b><small>{line(a)}</small></span>
      <span><b>{b.playerName}</b><small>{line(b)}</small></span>
    </span>
    <span className="debate-cta">Compare them <ArrowRight size={14}/></span>
  </button>;
}

export default function FrontPage({players, teams, playerIds, season, Art, onOpen, onCompare, onTeam, onLeaders}) {
  const loaded = useFeed(loadGames), results = useFeed(loadResults), news = useFeed(loadNews);
  const [tab, setTab] = useState(null), [allTeams, setAllTeams] = useState(false);
  const favorites = useFavorites(), games = useGames(loaded);
  const teamByCode = useMemo(() => new Map(teams.map(team => [teamCodeOf(team.team), team]).filter(([code]) => TEAMS[code])), [teams]);
  const teamCodes = useMemo(() => {
    const order = allTeams ? favoritesFirst(favorites) : [...favorites, ...HOT_TEAMS.filter(code => !favorites.includes(code))].slice(0, Math.max(TEAM_ROW, favorites.length));
    return order.filter(code => teamByCode.has(code));
  }, [allTeams, favorites, teamByCode]);
  const view = tab ?? (games?.length ? 'upcoming' : 'results');
  const pool = useMemo(() => qualified(players), [players]);
  const leaders = useMemo(() => {
    const base = pool.length ? pool : players;
    return LEADERS.map(entry => {
      const eligible = entry.key === 'threePointPercentage' ? base.filter(player => player.stats.threePointersAttempted >= 3) : base;
      return {...entry, player: [...eligible].sort((a, b) => b.stats[entry.key] - a.stats[entry.key])[0]};
    }).filter(entry => entry.player);
  }, [pool, players]);
  const debates = useMemo(() => DEBATES.map(names => names.map(name => players.find(player => fold(player.playerName) === fold(name)))).filter(pair => pair.every(Boolean)), [players]);

  return <section className="front-page">
    <div className="front-top">
      <NextUp games={games} favorites={favorites}/>
      <section className="find" aria-label="Search and compare">
        <h2>Find a player or settle a debate</h2>
        <PlayerSearch players={players} Art={Art} playerIds={playerIds} onOpen={onOpen}/>
        <div className="front-hero-actions">
          <button className="front-btn primary" onClick={() => onCompare()}><BarChart3 size={16}/> Compare any two</button>
          <button className="front-btn" onClick={() => onTeam('PHI')}>Browse rosters <ArrowRight size={16}/></button>
        </div>
        {debates.length > 0 && <>
          <p className="find-label">Popular debates</p>
          <div className="find-debates">{debates.slice(0, 3).map(pair => <button key={`${pair[0].playerId}-${pair[1].playerId}`} onClick={() => onCompare(pair)}>{pair[0].playerName} vs {pair[1].playerName}<span>Compare</span></button>)}</div>
        </>}
      </section>
    </div>

    <section className="front-block">
      <div className="front-block-head">
        <h2>{favorites.length ? 'Your teams' : 'Hot teams'}</h2>
        <button onClick={() => setAllTeams(open => !open)}>{allTeams ? 'Show fewer' : 'All 30 teams'} <ArrowRight size={14}/></button>
      </div>
      <div className="team-grid">{teamCodes.map(code => <div key={code} className="team-chip-wrap">
        <button className="team-chip" style={{'--team': TEAMS[code].color}} onClick={() => onTeam(code)} title={TEAMS[code].name}>
          <Art entity={teamByCode.get(code)} playerIds={playerIds} className="team-chip-logo"/>
          <span>{nickname(code)}</span>
        </button>
        <FavoriteStar code={code} active={favorites.includes(code)} className="on-chip"/>
      </div>)}</div>
      {!favorites.length && <p className="front-footnote">Tap the bell on a team to follow it: it stays here and you can get its game alerts.</p>}
    </section>

    <div className="front-feeds">
      <section className="front-panel">
        <div className="front-panel-head">
          <h2>Games</h2>
          <div className="front-tabs" role="group" aria-label="Games">
            <button className={view === 'upcoming' ? 'active' : ''} onClick={() => setTab('upcoming')}>Upcoming</button>
            <button className={view === 'results' ? 'active' : ''} onClick={() => setTab('results')}>Results</button>
          </div>
        </div>
        {view === 'upcoming' ? <GameTimeline games={games} favorites={favorites}/> : <GameList games={results} results empty="No finished games in the last week."/>}
      </section>
      <section className="front-panel">
        <div className="front-panel-head"><h2>Latest news</h2></div>
        <NewsList articles={news}/>
      </section>
    </div>

    {debates.length > 0 && <section className="front-block">
      <div className="front-block-head"><h2>Hot debates</h2><button onClick={() => onCompare()}>Make your own <ArrowRight size={14}/></button></div>
      <div className="debates">{debates.map(pair => <Debate key={`${pair[0].playerId}-${pair[1].playerId}`} pair={pair} Art={Art} playerIds={playerIds} onCompare={onCompare}/>)}</div>
    </section>}

    <section className="front-block">
      <div className="front-block-head"><h2>League leaders</h2><button onClick={onLeaders}>All leaders <ArrowRight size={14}/></button></div>
      <div className="leader-grid">{leaders.map(entry => <button key={entry.key} className="leader-card" style={{'--team': colorOf(entry.player)}} onClick={() => onOpen(entry.player)}>
        <small>{entry.label}</small>
        <strong>{entry.player.stats[entry.key].toFixed(1)}{entry.pct ? '%' : ''}<em>{entry.unit}</em></strong>
        <b>{entry.player.playerName}</b>
        <Art entity={entry.player} playerIds={playerIds} className="leader-art"/>
      </button>)}</div>
      <p className="front-footnote">{season ? pretty(season) : ''} regular season per-game leaders.</p>
    </section>

  </section>;
}

import React, { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { NewsList } from './Feeds';
import { useFeed } from '../lib/useFeed';
import { latestNews } from '../lib/espn';
import { finished, loadSchedule, upcoming } from '../lib/schedule';
import { TEAMS, nickname, teamCodeOf } from '../lib/teams';
import { qualified } from '../lib/season';
import { favoritesFirst, useFavorites } from '../lib/favorites';
import FavoriteStar from './FavoriteStar';
import GameTicker, { useGames } from './NextUp';
import ResultCards from './ResultCards';
import { navigate } from '../lib/nav';
import HeadToHead from './HeadToHead';

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
const loadGames = () => loadSchedule().then(all => upcoming(all, 12));
const loadResults = () => loadSchedule().then(all => finished(all, 8));
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


export default function FrontPage({players, teams, playerIds, Art, onOpen, onCompare, onTeam, onLeaders}) {
  const loaded = useFeed(loadGames), results = useFeed(loadResults), news = useFeed(loadNews);
  const [allTeams, setAllTeams] = useState(false);
  const favorites = useFavorites(), games = useGames(loaded);
  const teamByCode = useMemo(() => new Map(teams.map(team => [teamCodeOf(team.team), team]).filter(([code]) => TEAMS[code])), [teams]);
  const teamCodes = useMemo(() => {
    const order = allTeams ? favoritesFirst(favorites) : [...favorites, ...HOT_TEAMS.filter(code => !favorites.includes(code))].slice(0, Math.max(TEAM_ROW, favorites.length));
    return order.filter(code => teamByCode.has(code));
  }, [allTeams, favorites, teamByCode]);
  const pool = useMemo(() => qualified(players), [players]);
  const stars = useMemo(() => [...pool].sort((a, b) => b.stats.points - a.stats.points).slice(0, 40), [pool]);
  const leaders = useMemo(() => {
    const base = pool.length ? pool : players;
    return LEADERS.map(entry => {
      const eligible = entry.key === 'threePointPercentage' ? base.filter(player => player.stats.threePointersAttempted >= 3) : base;
      return {...entry, player: [...eligible].sort((a, b) => b.stats[entry.key] - a.stats[entry.key])[0]};
    }).filter(entry => entry.player);
  }, [pool, players]);
  const debates = useMemo(() => DEBATES.map(names => names.map(name => pool.find(player => fold(player.playerName) === fold(name)))).filter(pair => pair.every(Boolean)), [pool]);

  return <section className="front-page">
    <div className="home-search"><PlayerSearch players={players} Art={Art} playerIds={playerIds} onOpen={onOpen}/></div>

    <GameTicker games={games} favorites={favorites}/>

    <div className="home-grid">
      <section className="front-panel">
        <div className="front-panel-head"><h2>Results</h2><a className="front-more" href="/schedule">Full schedule <ArrowRight size={14}/></a></div>
        <ResultCards games={results} favorites={favorites} onOpen={game => navigate(`/games/${game.id}`)} empty="No games played yet. Results show up here after the season opener."/>
      </section>

      <div className="home-side">
        <section className="front-panel">
          <div className="front-panel-head"><h2>Top performers</h2><button className="front-more" onClick={onLeaders}>All leaders <ArrowRight size={14}/></button></div>
          <ol className="performers">{leaders.map((entry, index) => <li key={entry.key}><button onClick={() => onOpen(entry.player)}>
            <span className="perf-rank">{index + 1}</span>
            <Art entity={entry.player} playerIds={playerIds} className="perf-art"/>
            <span className="perf-name"><b>{entry.player.playerName}</b><small>{entry.label} · {entry.player.team}</small></span>
            <strong>{entry.player.stats[entry.key].toFixed(1)}{entry.pct ? '%' : ''} <small>{entry.unit}</small></strong>
          </button></li>)}</ol>
        </section>

        <section className="front-panel">
          <div className="front-panel-head">
            <h2>{favorites.length ? 'Your teams' : 'Hot teams'}</h2>
            <button className="front-more" onClick={() => setAllTeams(open => !open)}>{allTeams ? 'Show fewer' : 'All 30 teams'} <ArrowRight size={14}/></button>
          </div>
          <div className="team-grid side-teams">{teamCodes.map(code => <div key={code} className="team-chip-wrap">
            <button className="team-chip" onClick={() => onTeam(code)} title={TEAMS[code].name}>
              <Art entity={teamByCode.get(code)} playerIds={playerIds} className="team-chip-logo"/>
              <span>{nickname(code)}</span>
            </button>
            <FavoriteStar code={code} active={favorites.includes(code)} className="on-chip"/>
          </div>)}</div>
          {!favorites.length && <p className="front-footnote">Tap the star on a team to add it to your favorites: they show up here first.</p>}
        </section>
      </div>
    </div>


    {pool.length >= 2 && <HeadToHead debates={debates} stars={stars} pool={pool} Art={Art} playerIds={playerIds} onCompare={onCompare}/>}

    <section className="front-panel front-news">
      <div className="front-panel-head"><h2>Latest news</h2></div>
      <NewsList articles={news}/>
    </section>


  </section>;
}

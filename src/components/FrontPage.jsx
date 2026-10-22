import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { NewsList } from './Feeds';
import { useFeed } from '../lib/useFeed';
import { latestNews } from '../lib/espn';
import { finished, loadSchedule, upcoming } from '../lib/schedule';
import { TEAMS, espnLogoUrl, nickname } from '../lib/teams';
import { qualified } from '../lib/season';
import { favoritesFirst, useFavorites } from '../lib/favorites';
import FavoriteStar from './FavoriteStar';
import GameTicker, { useGames } from './NextUp';
import HeadToHead from './HeadToHead';
import { StandingsPeek } from './Peeks';
import NightPanel from './NightPanel';

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
const HOT_TEAMS = ['LAL', 'PHI', 'BOS', 'NYK', 'GSW', 'OKC', 'DEN', 'MIL', 'DAL', 'MIA'];
const TEAM_ROW = 8;
const regularOnly = all => all.filter(game => !game.preseason);
const loadGames = () => loadSchedule().then(all => upcoming(regularOnly(all), 12));
const loadResults = () => loadSchedule().then(all => finished(regularOnly(all), 8));
const loadNews = () => latestNews(4);

export default function FrontPage({players, playerIds, Art, onOpen, onCompare, onTeam, onLeaders, leaderPeek}) {
  const loaded = useFeed(loadGames), results = useFeed(loadResults), news = useFeed(loadNews);
  const [allTeams, setAllTeams] = useState(false);
  const favorites = useFavorites(), games = useGames(loaded);
  const teamCodes = useMemo(() => {
    const order = allTeams ? favoritesFirst(favorites) : [...new Set([...favorites, ...HOT_TEAMS, ...Object.keys(TEAMS)])].slice(0, Math.max(TEAM_ROW, favorites.length));
    return order.filter(code => TEAMS[code]);
  }, [allTeams, favorites]);
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
    <GameTicker games={games} results={results} favorites={favorites}/>

    {pool.length >= 2 && <HeadToHead debates={debates} stars={stars} pool={pool} Art={Art} playerIds={playerIds} onCompare={onCompare}/>}

    <div className="home-grid">
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
              <img className="team-chip-logo" src={espnLogoUrl(code)} alt="" loading="lazy"/>
              <span>{nickname(code)}</span>
            </button>
            <FavoriteStar code={code} active={favorites.includes(code)} className="on-chip"/>
          </div>)}</div>
          {!favorites.length && <p className="front-footnote">Tap the star on a team to add it to your favorites: they show up here first.</p>}
        </section>
      </div>
    </div>

    <NightPanel results={results}/>

    {leaderPeek}
    <div className="peek-pair">
      <StandingsPeek/>
    </div>

    <section className="front-panel front-news">
      <div className="front-panel-head"><h2>Latest news</h2></div>
      <NewsList articles={news}/>
    </section>


  </section>;
}

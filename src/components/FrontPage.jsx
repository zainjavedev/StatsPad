import React, { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { NewsList } from './Feeds';
import { useFeed } from '../lib/useFeed';
import { latestNews } from '../lib/espn';
import { finished, loadSchedule, upcoming } from '../lib/schedule';
import { TEAMS, teamCodeOf } from '../lib/teams';
import { qualified } from '../lib/season';
import { useFavorites } from '../lib/favorites';
import GameTicker, { useGames } from './NextUp';
import HeadToHead from './HeadToHead';
import { StandingsPeek } from './Peeks';
import RecentPerformances from './RecentPerformances';

/* The front door: settle a debate, find a player, see the league's top
   performers and what's on. Deep leaderboards live on the Leaders page. */

const fold = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const LEADERS = [
  {key: 'points', label: 'Points', unit: 'PPG'},
  {key: 'totalRebounds', label: 'Rebounds', unit: 'RPG'},
  {key: 'assists', label: 'Assists', unit: 'APG'},
  {key: 'steals', label: 'Steals', unit: 'SPG'},
  {key: 'blocks', label: 'Blocks', unit: 'BPG'},
  {key: 'threePointersMade', label: 'Threes made', unit: '3PM'},
  {key: 'threePointPercentage', label: 'Three-point %', unit: '3P%', pct: true, min: ['threePointersAttempted', 3]},
  {key: 'fieldGoalPercentage', label: 'Field-goal %', unit: 'FG%', pct: true, min: ['fieldGoalsAttempted', 8]},
  {key: 'freeThrowPercentage', label: 'Free-throw %', unit: 'FT%', pct: true, min: ['freeThrowsAttempted', 4]},
];
const DEBATES = [
  ['Luka Dončić', 'Nikola Jokić'],
  ['Shai Gilgeous-Alexander', 'Anthony Edwards'],
  ['Victor Wembanyama', 'Chet Holmgren'],
  ['Nikola Jokić', 'Shai Gilgeous-Alexander'],
];
const regularOnly = all => all.filter(game => !game.preseason);
const loadGames = () => loadSchedule().then(all => upcoming(regularOnly(all), 12));
const loadResults = () => loadSchedule().then(all => finished(regularOnly(all), 60));
const loadNews = () => latestNews(5);

export default function FrontPage({players, playerIds, Art, onOpen, onCompare, onLeaders}) {
  const loaded = useFeed(loadGames), results = useFeed(loadResults), news = useFeed(loadNews);
  const favorites = useFavorites(), games = useGames(loaded);
  const pool = useMemo(() => qualified(players), [players]);
  const stars = useMemo(() => [...pool].sort((a, b) => b.stats.points - a.stats.points).slice(0, 40), [pool]);
  const leaders = useMemo(() => {
    const base = pool.length ? pool : players;
    return LEADERS.map(entry => {
      const eligible = entry.min ? base.filter(player => player.stats[entry.min[0]] >= entry.min[1]) : base;
      const ranked = [...eligible].sort((a, b) => b.stats[entry.key] - a.stats[entry.key] || a.playerName.localeCompare(b.playerName));
      /* Everyone level on the top number shares the spot. */
      const tied = ranked.filter(player => player.stats[entry.key] === ranked[0]?.stats[entry.key]).slice(0, 3);
      return {...entry, player: ranked[0], tied};
    }).filter(entry => entry.player);
  }, [pool, players]);
  const debates = useMemo(() => DEBATES.map(names => names.map(name => pool.find(player => fold(player.playerName) === fold(name)))).filter(pair => pair.every(Boolean)), [pool]);

  return <section className="front-page">
    <GameTicker games={games} results={results} favorites={favorites}/>

    {pool.length >= 2 &&<HeadToHead debates={debates} stars={stars} pool={pool} Art={Art} playerIds={playerIds} onCompare={onCompare}/>}

    <div className="home-grid">
      <div className="home-side">
        <section className="front-panel">
          <div className="front-panel-head"><h2>Top performers</h2><button className="front-more" onClick={onLeaders}>All leaders <ArrowRight size={14}/></button></div>
          {leaders[0] && <button className={leaders[0].tied.length > 1 ? 'perf-feature tied' : 'perf-feature'} style={{'--tc': TEAMS[teamCodeOf(leaders[0].player.team)]?.color || '#8a8a8a'}} onClick={() => onOpen(leaders[0].player)}>
            <span className="perf-feature-copy">
              <small>{leaders[0].label} {leaders[0].tied.length > 1 ? 'leaders' : 'leader'} · {[...new Set(leaders[0].tied.map(player => player.team))].join(' & ')}</small>
              <b>{leaders[0].tied.map(player => player.playerName).join(' & ')}</b>
              <strong>{leaders[0].player.stats[leaders[0].key].toFixed(1)}{leaders[0].pct ? '%' : ''}<em>{leaders[0].unit}</em></strong>
            </span>
            <span className="perf-hero-arts">{leaders[0].tied.slice(0, 2).map(player => <Art key={player.playerId} entity={player} playerIds={playerIds} className="perf-hero-art"/>)}</span>
          </button>}
          <ol className="performers perf-rest">{leaders.slice(1, -1).map((entry, index) => <li key={entry.key} style={{'--tc': TEAMS[teamCodeOf(entry.player.team)]?.color || '#8a8a8a'}}><button onClick={() => onOpen(entry.player)}>
            <span className="perf-rank">{index + 2}</span>
            <Art entity={entry.player} playerIds={playerIds} className="perf-art"/>
            <span className="perf-name"><b>{entry.player.playerName}</b><small>{entry.label} · {entry.player.team}</small></span>
            <strong>{entry.player.stats[entry.key].toFixed(1)}{entry.pct ? '%' : ''} <small>{entry.unit}</small></strong>
          </button></li>)}</ol>        </section>

        <RecentPerformances results={results}/>
      </div>
    </div>


    <div className="peek-pair">
      <StandingsPeek games={games}/>
    </div>




    <section className="front-panel front-news">
      <div className="front-panel-head"><h2>Latest news</h2></div>
      <NewsList articles={news}/>
    </section>
  </section>;
}

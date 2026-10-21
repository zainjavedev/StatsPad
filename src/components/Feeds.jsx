import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import SpoilerToggle, { Hidden } from './SpoilerToggle';
import { revealGame, useSpoilers } from '../lib/spoilers';

/* Renderers for ESPN-backed lists. A null list is still loading and shows
   placeholder rows; an empty one shows a short note. */
const dayFormat = new Intl.DateTimeFormat(undefined, {weekday: 'short', month: 'short', day: 'numeric'});
const timeFormat = new Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit'});
function gameDay(date) {
  const today = new Date(), tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return dayFormat.format(date);
}

function Team({team, home}) {
  const logo = team.logo ? <img src={team.logo} alt="" loading="lazy"/> : <i/>;
  return <span className="game-team" title={team.name}>{!home && logo}<b>{team.abbr}</b>{home && logo}</span>;
}

export function GameList({games, empty = 'No games scheduled this week.', results = false}) {
  const spoilers = useSpoilers();
  if (games === null) return <ul className="game-list loading">{[0, 1, 2].map(index => <li key={index}/>)}</ul>;
  if (!games.length) return <p className="feed-empty">{empty}</p>;
  return <><ul className={results ? 'game-list results' : 'game-list'}>{games.map(game => {
    const live = game.state === 'in', final = game.state === 'post', hidden = (final || live) && !spoilers.revealed(game.id), scored = live || final;
    const away = Number(game.away.score), home = Number(game.home.score);
    const lead = final && !hidden && away !== home ? (away > home ? 'away' : 'home') : null;
    return <li key={game.id}>
      {game.result && !hidden && <span className={`game-result ${game.result === 'W' ? 'win' : 'loss'}`} title={game.result === 'W' ? 'Win' : 'Loss'}>{game.result}</span>}
      <span className="game-line">
        <Team team={game.away}/>
        {hidden ? <Hidden id={game.id} onReveal={revealGame}/> : scored ? <><b className={lead === 'away' ? 'game-score won' : 'game-score'}>{game.away.score}</b><span className="game-sep">–</span><b className={lead === 'home' ? 'game-score won' : 'game-score'}>{game.home.score}</b></> : <span className="game-sep">@</span>}
        <Team team={game.home} home/>
      </span>
      <span className="game-when">
        {live ? <><span className="game-live">Live</span> {game.detail}</> : <>{gameDay(game.date)} · {final ? 'Final' : timeFormat.format(game.date)}</>}
      </span>
    </li>;
  })}</ul>{results && <SpoilerToggle/>}</>;
}

const ago = date => {
  const minutes = Math.round((Date.now() - date) / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
};

export function NewsList({articles}) {
  if (articles === null) return <ul className="news-list loading">{[0, 1, 2].map(index => <li key={index}/>)}</ul>;
  if (!articles.length) return <p className="feed-empty">News is unavailable right now.</p>;
  return <ul className="news-list">{articles.map(article => <li key={article.id}>
    <a href={article.url} target="_blank" rel="noreferrer">
      {article.image && <img src={article.image} alt="" loading="lazy"/>}
      <span><b>{article.headline}</b><small>ESPN · {ago(article.published)} <ArrowUpRight size={12}/></small></span>
    </a>
  </li>)}</ul>;
}

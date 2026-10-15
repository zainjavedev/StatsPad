import React from 'react';
import { ArrowUpRight } from 'lucide-react';

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

function Side({team, scored, won, home}) {
  return <span className={won ? 'game-side won' : 'game-side'}>
    {team.logo ? <img src={team.logo} alt="" loading="lazy"/> : <i/>}
    <b>{home && <em>@</em>}{team.name}</b>
    {scored && <strong>{team.score}</strong>}
  </span>;
}

export function GameList({games, empty = 'No games scheduled this week.', results = false}) {
  if (games === null) return <ul className="game-list loading">{[0, 1, 2].map(index => <li key={index}/>)}</ul>;
  if (!games.length) return <p className="feed-empty">{empty}</p>;
  return <ul className={results ? 'game-list results' : 'game-list'}>{games.map(game => {
    const live = game.state === 'in', final = game.state === 'post', scored = live || final;
    const winner = final && Number(game.away.score) !== Number(game.home.score) ? (Number(game.away.score) > Number(game.home.score) ? 'away' : 'home') : null;
    return <li key={game.id}>
      <div className="game-teams"><Side team={game.away} scored={scored} won={winner === 'away'}/><Side team={game.home} scored={scored} won={winner === 'home'} home/></div>
      <div className="game-when">
        {live ? <span className="game-live">Live</span> : <b>{gameDay(game.date)}</b>}
        <span>{live ? game.detail : final ? 'Final' : timeFormat.format(game.date)}</span>
        {(game.preseason || game.tv) && <small>{[game.preseason && 'Preseason', game.tv].filter(Boolean).join(' · ')}</small>}
      </div>
    </li>;
  })}</ul>;
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

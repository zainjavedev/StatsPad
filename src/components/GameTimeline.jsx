import React, { useEffect, useState } from 'react';
import { followedGame } from './NextUp';

/* Upcoming games grouped by day, one row per game: start time and how long to go, the matchup,
   and where it is played. */

const timeFormat = new Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit'});
const dayFormat = new Intl.DateTimeFormat(undefined, {weekday: 'long', month: 'short', day: 'numeric'});

const dayLabel = date => {
  const today = new Date(), tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  return date.toDateString() === today.toDateString() ? 'Today' : date.toDateString() === tomorrow.toDateString() ? 'Tomorrow' : dayFormat.format(date);
};

const until = ms => {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `in ${minutes}m`;
  if (minutes < 1440) return `in ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `in ${Math.floor(minutes / 1440)}d ${Math.floor(minutes % 1440 / 60)}h`;
};

const Team = ({team}) => <span className="tl-team">{team.logo ? <img src={team.logo} alt=""/> : <i/>}<b>{team.name}</b></span>;

export default function GameTimeline({games, favorites}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const tick = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(tick); }, []);
  if (games === null) return <ul className="game-list loading">{[0, 1, 2].map(index => <li key={index}/>)}</ul>;
  if (!games.length) return <p className="feed-empty">No games scheduled this week.</p>;
  const days = [];
  for (const game of games) {
    const key = game.date.toDateString();
    const day = days.find(entry => entry.key === key);
    if (day) day.games.push(game); else days.push({key, label: dayLabel(game.date), games: [game]});
  }
  return <div className="timeline">{days.map(day => <section key={day.key}>
    <h3>{day.label} <small>{day.games.length} game{day.games.length === 1 ? '' : 's'}</small></h3>
    {day.games.map(game => <div key={game.id} className={followedGame(game, favorites) ? 'tl-row mine' : 'tl-row'}>
      <div className="tl-when"><b>{timeFormat.format(game.date)}</b><span className={game.state === 'in' ? 'tl-live' : ''}>{game.state === 'in' ? 'Live' : until(game.date - now)}</span></div>
      <div className="tl-match"><Team team={game.away}/><em>{game.state === 'in' ? `${game.away.score}–${game.home.score}` : 'at'}</em><Team team={game.home}/></div>
      <div className="tl-meta">{game.preseason && <span className="tl-pill">Preseason</span>}{game.tv && <span className="tl-pill">{game.tv}</span>}{game.venue && <small>{game.venue}</small>}</div>
    </div>)}
  </section>)}</div>;
}

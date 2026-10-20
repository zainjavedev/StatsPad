import React, { useEffect, useState } from 'react';
import { followedGame } from './NextUp';

/* Upcoming games grouped by day, one row per game: start time and how long to go, the matchup,
   and where it is played. */

const LIMIT = 4;
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

const Team = ({team, won}) => <span className={won ? 'tl-team won' : 'tl-team'}>{team.logo ? <img src={team.logo} alt=""/> : <i/>}<b>{team.name}</b></span>;

export default function GameTimeline({games, favorites, results = false, all: showEverything = false}) {
  const [now, setNow] = useState(() => Date.now()), [all, setAll] = useState(showEverything);
  useEffect(() => { const tick = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(tick); }, []);
  if (games === null) return <div className="timeline" aria-busy="true">{[0, 1, 2].map(index => <div key={index} className="tl-row skeleton"><div className="tl-when"><b/><span/></div><div className="tl-match"><i/><i/></div></div>)}</div>;
  if (!games.length) return <p className="feed-empty">{results ? 'No finished games in the last week.' : 'No games scheduled this week.'}</p>;
  const shown = all ? games : games.slice(0, LIMIT);
  const days = [];
  for (const game of shown) {
    const key = game.date.toDateString();
    const day = days.find(entry => entry.key === key);
    if (day) day.games.push(game); else days.push({key, label: dayLabel(game.date), games: [game]});
  }
  return <div className="timeline">{days.map(day => <section key={day.key}>
    <h3>{day.label} <small>{day.games.length} game{day.games.length === 1 ? '' : 's'}</small></h3>
    {day.games.map(game => {
      const final = game.state === 'post', scored = results || final || game.state === 'in', away = Number(game.away.score), home = Number(game.home.score);
      const lead = (results || final) && away !== home ? (away > home ? 'away' : 'home') : null;
      return <div key={game.id} className={followedGame(game, favorites) ? 'tl-row mine' : 'tl-row'}>
        <div className="tl-when">{results || final ? <><b>Final</b><span className="tl-done">{timeFormat.format(game.date)}</span></> : <><b>{timeFormat.format(game.date)}</b><span className={game.state === 'in' ? 'tl-live' : ''}>{game.state === 'in' ? 'Live' : until(game.date - now)}</span></>}</div>
        <div className="tl-match">
          <Team team={game.away} won={lead === 'away'}/>
          {scored ? <em className="tl-score"><b className={lead === 'away' ? 'won' : ''}>{game.away.score}</b>–<b className={lead === 'home' ? 'won' : ''}>{game.home.score}</b></em> : <em>at</em>}
          <Team team={game.home} won={lead === 'home'}/>
        </div>
        <div className="tl-meta">{game.preseason && <span className="tl-pill">Preseason</span>}{game.tv && !results && <span className="tl-pill">{game.tv}</span>}{game.venue && <small>{game.venue}</small>}</div>
      </div>;
    })}
  </section>)}{!showEverything && games.length > LIMIT && <button className="tl-more" onClick={() => setAll(open => !open)}>{all ? 'Show fewer' : `Show all ${games.length} games`}</button>}</div>;
}

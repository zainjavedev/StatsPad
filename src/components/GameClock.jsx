import React, { useEffect, useState } from 'react';
import { upcomingGames } from '../lib/espn';
import { TEAMS } from '../lib/teams';

/* The home page's "what's next": a live countdown to the next tip-off (or the score of a
   game in progress), with the games after it. Games a visitor follows are marked. */

const pad = value => String(value).padStart(2, '0');
const dayFormat = new Intl.DateTimeFormat(undefined, {weekday: 'short'});
const timeFormat = new Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit'});

function parts(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {days: Math.floor(total / 86400), hours: Math.floor(total % 86400 / 3600), minutes: Math.floor(total % 3600 / 60), seconds: total % 60};
}

const soon = ms => {
  const {days, hours, minutes} = parts(ms);
  if (days) return `in ${days}d ${hours}h`;
  if (hours) return `in ${hours}h ${minutes}m`;
  return `in ${Math.max(1, minutes)}m`;
};

const when = date => {
  const today = new Date(), tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const day = date.toDateString() === today.toDateString() ? 'Today' : date.toDateString() === tomorrow.toDateString() ? 'Tomorrow' : dayFormat.format(date);
  return `${day} ${timeFormat.format(date)}`;
};

function Side({team, score}) {
  return <div className="clock-side">
    {team.logo ? <img src={team.logo} alt=""/> : <i/>}
    <b>{team.abbr}</b>
    {score !== undefined && <span className="clock-score">{score}</span>}
  </div>;
}

export default function GameClock({games: initial, favorites}) {
  const [games, setGames] = useState(initial), [now, setNow] = useState(() => Date.now());
  useEffect(() => { setGames(initial); }, [initial]);
  useEffect(() => { const tick = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(tick); }, []);
  /* Scores and "tipping off" status come from ESPN, so check again every minute. */
  useEffect(() => {
    const refresh = setInterval(() => upcomingGames(7, 8).then(setGames).catch(() => {}), 60000);
    return () => clearInterval(refresh);
  }, []);

  if (games === null) return <div className="game-clock loading" aria-busy="true"><span/><span/><span/></div>;
  const mine = new Set(favorites.map(code => TEAMS[code].espn));
  const followed = game => mine.has(game.home.abbr?.toLowerCase()) || mine.has(game.away.abbr?.toLowerCase());
  const live = games.filter(game => game.state === 'in');
  const queue = games.filter(game => game.state !== 'in');
  const featured = live[0] ?? queue[0];
  if (!featured) return <div className="game-clock empty"><b>No games scheduled</b><span>Check back soon for the next tip-off.</span></div>;
  const rest = [...live.slice(1), ...queue.slice(featured === queue[0] ? 1 : 0)].slice(0, 3);
  const remaining = featured.date - now;
  const left = parts(remaining);
  const isLive = featured.state === 'in';

  return <div className="game-clock" role="region" aria-label="Next game">
    <div className="clock-label">
      {isLive ? <span className="clock-live"><i/> Live now</span> : <span>Next tip-off</span>}
      {followed(featured) && <em>Your team</em>}
    </div>
    <div className="clock-match">
      <Side team={featured.away} score={isLive ? featured.away.score : undefined}/>
      <span className="clock-at">{isLive ? featured.detail : '@'}</span>
      <Side team={featured.home} score={isLive ? featured.home.score : undefined}/>
    </div>
    {isLive
      ? <p className="clock-sub">{featured.away.name} at {featured.home.name}</p>
      : remaining > 0
        ? <div className="clock-count" aria-live="off">
          {left.days > 0 && <div><b>{left.days}</b><span>day{left.days === 1 ? '' : 's'}</span></div>}
          <div><b>{pad(left.hours)}</b><span>hrs</span></div>
          <div><b>{pad(left.minutes)}</b><span>min</span></div>
          <div><b>{pad(left.seconds)}</b><span>sec</span></div>
        </div>
        : <p className="clock-sub">Tipping off…</p>}
    {!isLive && <p className="clock-sub">{when(featured.date)} · {featured.away.name} at {featured.home.name}</p>}
    {rest.length > 0 && <ul className="clock-next">{rest.map(game => <li key={game.id} className={followed(game) ? 'mine' : ''}>
      <span>{game.away.abbr} @ {game.home.abbr}</span>
      <small>{game.state === 'in' ? 'Live' : date(game.date, now)}</small>
    </li>)}</ul>}
  </div>;
}

function date(value, now) {
  const ms = value - now;
  return ms < 24 * 3600 * 1000 ? soon(ms) : when(value);
}

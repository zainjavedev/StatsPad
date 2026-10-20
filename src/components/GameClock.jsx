import React, { useEffect, useState } from 'react';
import { upcomingGames } from '../lib/espn';
import { TEAMS } from '../lib/teams';

/* A slim bar above the hero: a live countdown to the next tip-off (or the score of a game
   in progress) and the games after it. Games a visitor follows come first. */

const pad = value => String(value).padStart(2, '0');
const dayFormat = new Intl.DateTimeFormat(undefined, {weekday: 'short'});
const timeFormat = new Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit'});

function parts(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {days: Math.floor(total / 86400), hours: Math.floor(total % 86400 / 3600), minutes: Math.floor(total % 3600 / 60), seconds: total % 60};
}

const soon = ms => {
  const {days, hours, minutes} = parts(ms);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
};

const when = date => {
  const today = new Date(), tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const day = date.toDateString() === today.toDateString() ? 'Today' : date.toDateString() === tomorrow.toDateString() ? 'Tomorrow' : dayFormat.format(date);
  return `${day} ${timeFormat.format(date)}`;
};

const Logo = ({team}) => team.logo ? <img src={team.logo} alt=""/> : <i/>;

export default function GameClock({games: initial, favorites}) {
  const [games, setGames] = useState(initial), [now, setNow] = useState(() => Date.now());
  useEffect(() => { setGames(initial); }, [initial]);
  useEffect(() => { const tick = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(tick); }, []);
  /* Scores and the switch from "starting" to live come from ESPN, so check again every minute. */
  useEffect(() => {
    const refresh = setInterval(() => upcomingGames(7, 8).then(setGames).catch(() => {}), 60000);
    return () => clearInterval(refresh);
  }, []);

  if (games === null) return <div className="clock-bar loading" aria-busy="true"/>;
  const mine = new Set(favorites.map(code => TEAMS[code].espn));
  const followed = game => mine.has(game.home.abbr?.toLowerCase()) || mine.has(game.away.abbr?.toLowerCase());
  const ordered = [...games.filter(game => game.state === 'in'), ...games.filter(game => game.state !== 'in')]
    .sort((a, b) => (b.state === 'in') - (a.state === 'in') || followed(b) - followed(a) || a.date - b.date);
  const featured = ordered[0];
  if (!featured) return null;
  const isLive = featured.state === 'in';
  const remaining = featured.date - now;
  const left = parts(remaining);
  const clock = `${left.days ? `${left.days}d ` : ''}${pad(left.hours)}:${pad(left.minutes)}:${pad(left.seconds)}`;

  return <div className="clock-bar" role="region" aria-label="Next game">
    <div className="clock-main">
      <span className={isLive ? 'clock-tag live' : 'clock-tag'}>{isLive ? <><i/> Live</> : followed(featured) ? 'Your team next' : 'Next tip-off'}</span>
      <span className="clock-teams">
        <Logo team={featured.away}/><b>{featured.away.abbr}</b>
        {isLive ? <strong>{featured.away.score} – {featured.home.score}</strong> : <em>@</em>}
        <b>{featured.home.abbr}</b><Logo team={featured.home}/>
      </span>
      {isLive
        ? <span className="clock-detail">{featured.detail}</span>
        : <span className="clock-digits" title={when(featured.date)}>{remaining > 0 ? clock : 'Starting…'}</span>}
      {!isLive && <span className="clock-detail">{when(featured.date)}</span>}
    </div>
    {ordered.length > 1 && <ul className="clock-chips" aria-label="More games">{ordered.slice(1, 7).map(game => <li key={game.id} className={followed(game) ? 'mine' : ''}>
      <Logo team={game.away}/><span>{game.away.abbr} @ {game.home.abbr}</span><Logo team={game.home}/>
      <small>{game.state === 'in' ? 'Live' : game.date - now < 36 * 3600 * 1000 ? soon(game.date - now) : when(game.date)}</small>
    </li>)}</ul>}
  </div>;
}

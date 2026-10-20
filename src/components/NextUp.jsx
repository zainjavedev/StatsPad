import React, { useEffect, useState } from 'react';
import { loadSchedule, upcoming } from '../lib/schedule';
import { TEAMS } from '../lib/teams';

/* The home page's lead card: a live countdown to the next tip-off (or the score of a game in
   progress). A game for a team the visitor follows comes first. */

const pad = value => String(value).padStart(2, '0');

const parts = ms => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {days: Math.floor(total / 86400), hours: Math.floor(total % 86400 / 3600), minutes: Math.floor(total % 3600 / 60), seconds: total % 60};
};

export const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === abbr?.toLowerCase());
export const followedGame = (game, favorites) => favorites.some(code => TEAMS[code].espn === game.home.abbr?.toLowerCase() || TEAMS[code].espn === game.away.abbr?.toLowerCase());

export function useGames(initial) {
  const [games, setGames] = useState(initial);
  useEffect(() => { setGames(initial); }, [initial]);
  /* Scores and the switch from "starting" to live come from ESPN, so check again every minute. */
  useEffect(() => {
    const refresh = setInterval(() => loadSchedule().then(all => setGames(upcoming(all, 12))).catch(() => {}), 60000);
    return () => clearInterval(refresh);
  }, []);
  return games;
}

const timeFormat = new Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit'});
const dayFormat = new Intl.DateTimeFormat(undefined, {weekday: 'short'});
const stamp = date => {
  const today = new Date(), tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const day = date.toDateString() === today.toDateString() ? '' : date.toDateString() === tomorrow.toDateString() ? 'Tmrw ' : `${dayFormat.format(date)} `;
  return `${day}${timeFormat.format(date)}`;
};

const Logo = ({team}) => team.logo ? <img src={team.logo} alt=""/> : <i/>;

/* A scrolling strip of every upcoming game, ESPN and SofaScore style. The first chip is the one
   to watch for: live if a game is on, otherwise the next tip-off (a followed team's game wins),
   with a ticking countdown. */
export default function GameTicker({games, favorites}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const tick = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(tick); }, []);
  if (games === null) return <div className="ticker loading" aria-busy="true"/>;
  const ordered = [...games].sort((a, b) => (b.state === 'in') - (a.state === 'in') || followedGame(b, favorites) - followedGame(a, favorites) || a.date - b.date);
  if (!ordered.length) return null;
  const [first, ...rest] = ordered;
  const live = first.state === 'in', remaining = first.date - now, left = parts(remaining);
  const clock = `${left.days ? `${left.days}d ` : ''}${pad(left.hours)}:${pad(left.minutes)}:${pad(left.seconds)}`;

  return <div className="ticker" role="region" aria-label="Games">
    <div className={`ticker-first${live ? ' live' : ''}`}>
      <span className="ticker-label">{live ? <><i/> Live</> : followedGame(first, favorites) ? 'Your team next' : 'Next up'}</span>
      <span className="ticker-teams"><Logo team={first.away}/><b>{first.away.abbr}</b>{live ? <strong>{first.away.score}–{first.home.score}</strong> : <em>@</em>}<b>{first.home.abbr}</b><Logo team={first.home}/></span>
      <span className="ticker-clock">{live ? first.detail : remaining > 0 ? clock : 'Starting…'}</span>
    </div>
    <ul className="ticker-list">{rest.map(game => <li key={game.id} className={followedGame(game, favorites) ? 'mine' : ''}>
      <span className="ticker-when">{game.state === 'in' ? <b className="ticker-live">Live</b> : stamp(game.date)}</span>
      <span className="ticker-teams"><Logo team={game.away}/><b>{game.away.abbr}</b>{game.state === 'in' ? <strong>{game.away.score}–{game.home.score}</strong> : <em>@</em>}<b>{game.home.abbr}</b><Logo team={game.home}/></span>
    </li>)}</ul>
  </div>;
}

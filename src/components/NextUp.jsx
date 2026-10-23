import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { loadSchedule, upcoming } from '../lib/schedule';
import { TEAMS } from '../lib/teams';
import { revealGame, useSpoilers } from '../lib/spoilers';
import { Hidden } from './SpoilerToggle';

/* The home page's lead card: the next tip-off (or the score of a game in progress). A game for a team the visitor follows comes first. */

export const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === abbr?.toLowerCase());
export const followedGame = (game, favorites) => favorites.some(code => TEAMS[code].espn === game.home.abbr?.toLowerCase() || TEAMS[code].espn === game.away.abbr?.toLowerCase());

export function useGames(initial) {
  const [games, setGames] = useState(initial);
  useEffect(() => { setGames(initial); }, [initial]);
  /* Scores and the switch from "starting" to live come from ESPN, so check again every minute. */
  useEffect(() => {
    const refresh = setInterval(() => loadSchedule().then(all => setGames(upcoming(all.filter(game => !game.preseason), 12))).catch(() => {}), 60000);
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

const dayShort = new Intl.DateTimeFormat(undefined, {weekday: 'short'});
const played = date => {
  const today = new Date(), yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  return date.toDateString() === today.toDateString() ? 'Today' : date.toDateString() === yesterday.toDateString() ? 'Yday' : dayShort.format(date);
};

/* One short timeline: the last few finished games , then the game to watch
   for (live, or the next tip-off with a ticking countdown), then everything coming up. */
export default function GameTicker({games, results, favorites}) {
  const scroller = useRef(null), nextRef = useRef(null), spoilers = useSpoilers();
  const [edge, setEdge] = useState({start: true, end: false});
  const check = useCallback(() => {
    const node = scroller.current;
    if (node) setEdge({start: node.scrollLeft <= 2, end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 2});
  }, []);
  const scrollBy = direction => scroller.current?.scrollBy({left: direction * Math.max(240, scroller.current.clientWidth * .7), behavior: 'smooth'});
  const ready = games !== null && results !== null;
  /* Open with the next game in the middle, finished games on its left and upcoming ones on its right. */
  useEffect(() => {
    const node = scroller.current, next = nextRef.current;
    if (ready && node && next) node.scrollLeft = Math.max(0, next.offsetLeft - node.offsetLeft - (node.clientWidth - next.offsetWidth) / 2);
    check();
  }, [ready, check]);
  if (!ready) return <div className="ticker loading" aria-busy="true"/>;
  const ordered = [...games].sort((a, b) => (b.state === 'in') - (a.state === 'in') || a.date - b.date);
  const before = [...results].slice(0, 6).reverse();
  if (!ordered.length && !before.length) return null;
  const [first, ...rest] = ordered;
  const live = first?.state === 'in';
  const mine = game => (followedGame(game, favorites) ? ' mine' : '');

  return <div className="ticker" role="region" aria-label="Games">
    <button type="button" className="ticker-arrow" aria-label="Earlier games" disabled={edge.start} onClick={() => scrollBy(-1)}><ChevronLeft size={18}/></button>
    <div className="ticker-scroll" ref={scroller} onScroll={check}>
      {before.map(game => {
        const open = spoilers.revealed(game.id, game.date), away = Number(game.away.score), home = Number(game.home.score);
        return <a key={game.id} href={`/games/${game.id}`} className={`tk done${mine(game)}`}>
          <small>{played(game.date)}{game.preseason ? ' · Pre' : ''}</small>
          <span className="tk-teams">
            <Logo team={game.away}/><b className={open && away > home ? 'won' : ''}>{game.away.abbr}</b>
            {open ? <strong>{game.away.score}–{game.home.score}</strong> : <Hidden id={game.id} onReveal={revealGame}/>}
            <b className={open && home > away ? 'won' : ''}>{game.home.abbr}</b><Logo team={game.home}/>
          </span>
        </a>;
      })}
      {first && <a href={`/games/${first.id}`} ref={nextRef} className={`tk next${live ? ' live' : ''}${mine(first)}`}>
        <small>{live ? <><i/> Live · {first.detail}</> : `Next up · ${stamp(first.date)}`}</small>
        <span className="tk-teams">
          <Logo team={first.away}/><b>{first.away.abbr}</b>
          {live ? <strong>{first.away.score}–{first.home.score}</strong> : <em>@</em>}
          <b>{first.home.abbr}</b><Logo team={first.home}/>
        </span>
      </a>}
      {rest.map(game => <a key={game.id} href={`/games/${game.id}`} className={`tk${mine(game)}`}>
        <small>{game.state === 'in' ? <b className="ticker-live">Live</b> : stamp(game.date)}</small>
        <span className="tk-teams"><Logo team={game.away}/><b>{game.away.abbr}</b>{game.state === 'in' ? <strong>{game.away.score}–{game.home.score}</strong> : <em>@</em>}<b>{game.home.abbr}</b><Logo team={game.home}/></span>
      </a>)}
    </div>
    <button type="button" className="ticker-arrow" aria-label="Later games" disabled={edge.end} onClick={() => scrollBy(1)}><ChevronRight size={18}/></button>
  </div>;
}

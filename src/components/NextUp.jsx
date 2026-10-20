import React, { useEffect, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { upcomingGames } from '../lib/espn';
import { toggleFavorite } from '../lib/favorites';
import { TEAMS } from '../lib/teams';

/* The home page's lead card: a live countdown to the next tip-off (or the score of a game in
   progress). A game for a team the visitor follows comes first. */

const pad = value => String(value).padStart(2, '0');
const fullFormat = new Intl.DateTimeFormat(undefined, {weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'});

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
    const refresh = setInterval(() => upcomingGames(7, 12).then(setGames).catch(() => {}), 60000);
    return () => clearInterval(refresh);
  }, []);
  return games;
}

export default function NextUp({games, favorites}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const tick = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(tick); }, []);

  if (games === null) return <div className="nextup loading" aria-busy="true"/>;
  const ordered = [...games].sort((a, b) => (b.state === 'in') - (a.state === 'in') || followedGame(b, favorites) - followedGame(a, favorites) || a.date - b.date);
  const game = ordered[0];
  if (!game) return <div className="nextup empty"><b>No games scheduled</b><span>Check back soon for the next tip-off.</span></div>;

  const live = game.state === 'in';
  const remaining = game.date - now, left = parts(remaining);
  const tiles = [...(left.days ? [[left.days, left.days === 1 ? 'day' : 'days']] : []), [pad(left.hours), 'hrs'], [pad(left.minutes), 'min'], [pad(left.seconds), 'sec']];
  const mine = [game.away, game.home].map(team => codeOf(team.abbr)).filter(code => code && favorites.includes(code));
  const pick = codeOf(game.home.abbr) ?? codeOf(game.away.abbr);

  return <section className="nextup" aria-label="Next game" style={{'--a': TEAMS[codeOf(game.away.abbr)]?.color || '#3b3b45', '--b': TEAMS[codeOf(game.home.abbr)]?.color || '#3b3b45'}}>
    <p className="nextup-label">{live ? <span className="nextup-live"><i/> Live now</span> : 'Next up'}</p>
    <div className="nextup-match">
      {[game.away, game.home].map((team, index) => <React.Fragment key={team.abbr}>
        {index === 1 && <span className="nextup-at">{live ? `${game.away.score} – ${game.home.score}` : '@'}</span>}
        <div className="nextup-team">{team.logo && <img src={team.logo} alt=""/>}<b>{team.name}</b></div>
      </React.Fragment>)}
    </div>
    <p className="nextup-when">{live ? game.detail : fullFormat.format(game.date)}</p>
    {!live && (remaining > 0
      ? <div className="nextup-tiles">{tiles.map(([value, label]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}</div>
      : <p className="nextup-when">Tipping off…</p>)}
    <div className="nextup-foot">
      {mine.length
        ? <span className="nextup-chip on"><BellRing size={14}/> You follow {TEAMS[mine[0]].name}</span>
        : pick && <button className="nextup-chip" onClick={() => toggleFavorite(pick)}><Bell size={14}/> Follow {TEAMS[pick].name}</button>}
      {game.venue && <span className="nextup-venue">{game.venue}</span>}
    </div>
  </section>;
}

import React, { useEffect, useState } from 'react';
import { espnLogoUrl, nickname } from '../lib/teams';
import { gameUrl, playerUrl, teamUrl } from '../lib/routes';
import { loadSchedule } from '../lib/schedule';
import InjuryMark from './InjuryMark';

/* The expected starting fives for the next game day's games, one card per game. The lineups are each team's
   most recent starters (public/lineups.json), not announcements, and the card says so. */

const ET = {timeZone: 'America/New_York'};
const dayOf = date => date.toLocaleDateString('en-CA', ET);

function useTonight() {
  const [tonight, setTonight] = useState(null);
  useEffect(() => {
    let active = true;
    loadSchedule().then(all => {
      const open = all.filter(game => game.state !== 'post' && game.date.getTime() >= Date.now() - 3 * 3600 * 1000);
      const pool = (open.some(game => !game.preseason) ? open.filter(game => !game.preseason) : open).sort((a, b) => a.date - b.date);
      if (!active) return;
      if (!pool.length) return setTonight(false);
      const day = dayOf(pool[0].date);
      setTonight({
        today: day === dayOf(new Date()),
        label: pool[0].date.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', ...ET}),
        games: pool.filter(game => dayOf(game.date) === day).slice(0, 16),
      });
    }).catch(() => active && setTonight(false));
    return () => { active = false; };
  }, []);
  return tonight;
}

function Five({code, fives}) {
  const five = fives[code] ?? [];
  return <div className="tn-team">
    <a className="tn-teamlink" href={teamUrl(code)}><b><img src={espnLogoUrl(code)} alt="" width="22" height="22" loading="lazy"/>{nickname(code)}</b></a>
    {five.length ? <ol>{five.map(([slot, name]) => <li key={slot + name}><i>{slot}</i><a href={playerUrl(name)}>{name}</a><InjuryMark name={name}/></li>)}</ol> : <p>To be announced</p>}
  </div>;
}

export default function TonightLineups({fives}) {
  const tonight = useTonight();
  if (tonight === false) return null;
  if (tonight === null) return <section className="tonight" aria-busy="true" aria-label="Loading today's lineups"><div className="sk sk-title"/><div className="tn-grid">{[0, 1, 2].map(index => <div key={index} className="sk tn-card-sk"/>)}</div></section>;
  return <section className="tonight" aria-label="Starting lineups for the next games">
    <h2>{tonight.today ? 'Today’s' : 'Next'} NBA starting lineups <small>{tonight.label}</small></h2>
    <p className="tn-note">Each team&rsquo;s most recent starting five, not an official announcement. Check for late injury news before tip-off.</p>
    <div className="tn-grid">{tonight.games.map(game => <article key={game.id} className="tn-card">
      <a className="tn-head" href={gameUrl(game.away.code, game.home.code, game.id)}>
        <span>{game.away.abbr} @ {game.home.abbr}</span>
        <small>{game.date.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}</small>
      </a>
      <div className="tn-cols"><Five code={game.away.code} fives={fives}/><Five code={game.home.code} fives={fives}/></div>
    </article>)}</div>
  </section>;
}

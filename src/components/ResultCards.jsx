import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import { TEAMS } from '../lib/teams';
import { followedGame, codeOf } from './NextUp';
import SpoilerToggle from './SpoilerToggle';
import { revealGame, useSpoilers } from '../lib/spoilers';

/* Finished games as score cards: both clubs stacked with the winner in bold, tinted with the two
   teams' colours. Scores stay as ** until revealed. */

const SHOWN = 6;
const dayFormat = new Intl.DateTimeFormat(undefined, {weekday: 'short', month: 'short', day: 'numeric'});
const when = date => {
  const today = new Date(), yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  return date.toDateString() === today.toDateString() ? 'Today' : date.toDateString() === yesterday.toDateString() ? 'Yesterday' : dayFormat.format(date);
};

const Side = ({team, score, won, open}) => <div className={`rc-side${open && won ? ' won' : ''}`}>
  {team.logo ? <img src={team.logo} alt=""/> : <i/>}
  <b>{team.abbr}</b>
  <strong>{open ? score : '**'}</strong>
</div>;

export default function ResultCards({games, favorites, onOpen, empty}) {
  const spoilers = useSpoilers(), [all, setAll] = useState(false);
  if (games === null) return <div className="rc-grid" aria-busy="true">{[0, 1, 2, 3].map(index => <div key={index} className="rc skeleton"/>)}</div>;
  if (!games.length) return <p className="feed-empty">{empty}</p>;
  const list = all ? games : games.slice(0, SHOWN);
  return <div className="rc-wrap">
    <div className="rc-tools"><SpoilerToggle/></div>
    <div className="rc-grid">{list.map(game => {
      const open = spoilers.revealed(game.id), away = Number(game.away.score), home = Number(game.home.score);
      return <div key={game.id} className={`rc${followedGame(game, favorites) ? ' mine' : ''}`} role="button" tabIndex={0} onClick={() => onOpen(game)} onKeyDown={event => { if (event.key === 'Enter') onOpen(game); }}
        style={{'--away': TEAMS[codeOf(game.away.abbr)]?.color, '--home': TEAMS[codeOf(game.home.abbr)]?.color}}>
        <Side team={game.away} score={game.away.score} won={away > home} open={open}/>
        <Side team={game.home} score={game.home.score} won={home > away} open={open}/>
        <div className="rc-foot"><span>Final · {when(game.date)}{game.preseason ? ' · Pre' : ''}</span>
          {!open && <button type="button" className="rc-eye" aria-label="Show score" onClick={event => { event.stopPropagation(); revealGame(game.id); }}><Eye size={14}/></button>}
        </div>
      </div>;
    })}</div>
    {games.length > SHOWN && <button className="tl-more" onClick={() => setAll(value => !value)}>{all ? 'Show fewer' : `Show all ${games.length} games`}</button>}
  </div>;
}

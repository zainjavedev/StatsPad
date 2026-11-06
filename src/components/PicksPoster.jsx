import React, { forwardRef } from 'react';
import { TEAMS, espnLogoUrl, nickname } from '../lib/teams';
import { onDark } from '../lib/share';

/* The Fixtures picks as a 16:9 picture made for X (800x450, saved at 1600x900, which X shows uncropped in the timeline).
   Built to read at phone size: big logos, the picked one in a team-colour ring with a tick (green once right, a red cross once
   wrong), only the picked team named. The date and record sit on the left, the address on the bottom.
   games: [{away, home, pick, note, result?}] */
const PicksPoster = forwardRef(function PicksPoster({title, date, games, record}, ref) {
  const shown = games.slice(0, games.length > 12 ? 11 : 12), more = games.length - shown.length;
  const slots = shown.length + (more > 0 ? 1 : 0), cols = slots <= 3 ? slots : slots === 4 ? 2 : slots <= 9 ? 3 : 4;
  const accent = onDark(TEAMS[shown[0]?.pick]?.color);
  return <div className={`px px-n${Math.ceil(slots / cols)} px-c${cols}`} ref={ref} style={{'--accent': accent, '--cols': cols}}>
    <div className="px-side">
      <span className="px-brand">StatsPads</span>
      <span className="px-eyebrow">{title}</span>
      <b className="px-date">{date}</b>
      <span className="px-count">{games.length} {games.length === 1 ? 'pick' : 'picks'}, locked before tip-off</span>
      {record && <span className="px-record"><b>{record.won}–{record.lost}</b> so far</span>}
      <span className="px-ask">Who do you have?</span>
    </div>
    <div className="px-grid">
      {shown.map(game => {
        const color = onDark(TEAMS[game.pick]?.color);
        return <div key={`${game.away}-${game.home}`} className={`px-game ${game.result || ''}`} style={{'--c': color}}>
          <div className="px-logos">
            {[game.away, game.home].map((code, index) => <React.Fragment key={code}>
              {index === 1 && <i className="px-at">@</i>}
              <span className={`px-logo${code === game.pick ? ' on' : ''}`}>
                <img src={espnLogoUrl(code)} alt="" crossOrigin="anonymous"/>
                {code === game.pick && <em>{game.result === 'wrong' ? '✕' : '✓'}</em>}
              </span>
            </React.Fragment>)}
          </div>
          <b className="px-pick">{nickname(game.pick)}</b>
          <small className="px-note">{game.note}</small>
        </div>;
      })}
      {more > 0 && <div className="px-game px-more"><b>+{more}</b><small>more picks</small></div>}
    </div>
    <div className="px-foot"><b>statspads.com/fixtures</b><span>Make your picks</span></div>
  </div>;
});

export default PicksPoster;

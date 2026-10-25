import React from 'react';
import { useFeed } from '../lib/useFeed';
import { CURRENT } from '../lib/season';
import { navigate } from '../lib/nav';
import { playerUrl } from '../lib/routes';
import { TEAMS, espnLogoUrl } from '../lib/teams';

/* The MVP and rookie ladders: the six best players on per-game score, each with how far he moved since the night
   before (scripts/build-regular-box-stats.mjs ranks the league as of every game day). */

const loadLadders = () => fetch(`/data/${CURRENT}/ladders.json`).then(response => (response.ok ? response.json() : null)).catch(() => null);
const photo = id => `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`;
const day = new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric'});

/* How far a player moved since the night before: an arrow and the places, or NEW, or a dash. */
function Move({value}) {
  if (value === undefined) return null;
  if (value === null) return <span className="ld-move new">New</span>;
  if (value === 0) return <span className="ld-move flat" title="No change">–</span>;
  const up = value > 0, places = Math.abs(value);
  return <span className={`ld-move ${up ? 'up' : 'down'}`} title={`${up ? 'Up' : 'Down'} ${places} ${places === 1 ? 'place' : 'places'}`}>{up ? '▲' : '▼'} {places}</span>;
}

function Ladder({title, note, rows}) {
  return <section className="front-panel ladder" aria-label={title}>
    <div className="front-panel-head"><h2>{title}</h2><small className="ld-note">{note}</small></div>
    <ol className="ld-list">
      {rows.map(row => <li key={row.playerId} style={{'--tc': TEAMS[row.team]?.color || '#8a8a8a'}}>
        <button className="ld-row" onClick={() => navigate(playerUrl(row.name))}>
          <b className="ld-rank">{row.rank}</b>
          <span className="ld-face"><img src={photo(row.espnId)} alt="" loading="lazy"/>{TEAMS[row.team] && <img className="ld-team" src={espnLogoUrl(row.team)} alt=""/>}</span>
          <span className="ld-main">
            <span className="ld-name">{row.name}</span>
            <span className="ld-line">{row.pts} pts · {row.reb} reb · {row.ast} ast</span>
          </span>
          <Move value={row.move}/>
        </button>
      </li>)}
    </ol>
  </section>;
}

export default function Ladders() {
  const data = useFeed(loadLadders);
  if (!data || !data.mvp?.length) return null;
  const through = data.through ? day.format(new Date(`${data.through}T12:00:00`)) : '';
  const note = `Through ${through}`;
  return <div className="ladder-pair">
    <Ladder title="MVP ladder" note={note} rows={data.mvp}/>
    {data.rookie?.length > 0 && <Ladder title="Rookie ladder" note={note} rows={data.rookie}/>}
  </div>;
}

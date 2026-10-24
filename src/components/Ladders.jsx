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

function Move({value}) {
  if (value === undefined) return null;
  if (value === null) return <span className="ld-move new">NEW</span>;
  if (value === 0) return <span className="ld-move flat" title="No change">–</span>;
  return <span className={`ld-move ${value > 0 ? 'up' : 'down'}`} title={`${value > 0 ? 'Up' : 'Down'} ${Math.abs(value)} ${Math.abs(value) === 1 ? 'place' : 'places'}`}><i>{value > 0 ? '▲' : '▼'}</i>{Math.abs(value)}</span>;
}

function Ladder({title, note, rows}) {
  return <section className="front-panel ladder" aria-label={title}>
    <div className="front-panel-head"><h2>{title}</h2><small className="ld-note">{note}</small></div>
    <ol className="ld-list">
      {rows.map(row => <li key={row.playerId}>
        <button className="ld-row" onClick={() => navigate(playerUrl(row.name))}>
          <b className="ld-rank">{row.rank}</b>
          <span className="ld-face"><img src={photo(row.espnId)} alt="" loading="lazy"/>{TEAMS[row.team] && <img className="ld-team" src={espnLogoUrl(row.team)} alt=""/>}</span>
          <span className="ld-main">
            <span className="ld-name">{row.name}</span>
            <span className="rp-trio"><span><b>{row.pts}</b>pts</span><span><b>{row.reb}</b>reb</span><span><b>{row.ast}</b>ast</span></span>
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
  const note = `Per-game averages · through ${through}`;
  return <div className="ladder-pair">
    <Ladder title="MVP ladder" note={note} rows={data.mvp}/>
    {data.rookie?.length > 0 && <Ladder title="Rookie ladder" note={note} rows={data.rookie}/>}
  </div>;
}

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useFeed } from '../lib/useFeed';
import { CURRENT } from '../lib/season';
import { navigate } from '../lib/nav';
import { playerUrl } from '../lib/routes';
import { TEAMS, espnLogoUrl } from '../lib/teams';

/* The MVP and rookie ladders, as performance-style cards with per-game averages: the six best players on per-game score, each with how far he moved since the night
   before (scripts/build-regular-box-stats.mjs ranks the league as of every game day). */

const loadLadders = () => fetch(`/data/${CURRENT}/ladders.json`).then(response => (response.ok ? response.json() : null)).catch(() => null);
const photo = id => `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`;
const day = new Intl.DateTimeFormat(undefined, {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'});

/* How far a player moved since the night before: an arrow and the places, or NEW, or a dash. */
function Move({value}) {
  if (value === undefined) return null;
  if (value === null) return <span className="ld-move new">New</span>;
  if (value === 0) return <span className="ld-move flat" title="No change">–</span>;
  const up = value > 0, places = Math.abs(value);
  return <span className={`ld-move ${up ? 'up' : 'down'}`} title={`${up ? 'Up' : 'Down'} ${places} ${places === 1 ? 'place' : 'places'}`}>{up ? '▲' : '▼'} {places}</span>;
}

function Ladder({title, note, rows, href}) {
  return <section className="front-panel ladder" aria-label={title}>
    <div className="front-panel-head"><h2>{title}</h2><small className="ld-note">{note}</small><a className="front-more" href={href}>Full ladder <ArrowRight size={14}/></a></div>
    <ol className="ld-list">
      {rows.filter(row => row.qualified !== false).slice(0, 6).map((row, index) => <li key={row.playerId} className={index < 3 ? 'top3' : undefined} style={{'--tc': TEAMS[row.team]?.color || '#8a8a8a'}}>
        <button className="ld-row ldc" onClick={() => navigate(playerUrl(row.name))}>
          <b className="ld-rank">{row.rank}</b>
          <span className="rp-face"><img src={photo(row.espnId)} alt="" loading="lazy"/>{TEAMS[row.team] && <img className="rp-team" src={espnLogoUrl(row.team)} alt=""/>}</span>
          <span className="rp-main">
            <span className="rp-top"><b>{row.name}</b><small> · {row.team} · avg</small></span>
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
  const note = `Through ${through}`;
  return <div className="ladder-pair">
    <Ladder title="MVP ladder" note={note} rows={data.mvp} href="/ladders/mvp"/>
    {data.rookie?.length > 0 && <Ladder title="ROTY ladder" note={note} rows={data.rookie} href="/ladders/roty"/>}
  </div>;
}

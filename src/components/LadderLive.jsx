'use client';
import React, { useEffect, useState } from 'react';
import { CURRENT } from '../lib/season';
import { useLiveLadders } from '../lib/liveLadder';
import { TEAMS, espnLogoUrl, espnHeadshotUrl } from '../lib/teams';

/* How far a player moved: an arrow and the places, or NEW, or a dash. Against the night before normally, against the
   official ladder while it is live. */
export function Move({value}) {
  if (value === undefined) return null;
  if (value === null) return <span className="ld-move new">New</span>;
  if (value === 0) return <span className="ld-move flat" title="No change">–</span>;
  const up = value > 0, places = Math.abs(value);
  return <span className={`ld-move ${up ? 'up' : 'down'}`} title={`${up ? 'Up' : 'Down'} ${places} ${places === 1 ? 'place' : 'places'}`}>{up ? '▲' : '▼'} {places}</span>;
}

/* "Live: 31 pts" (or "Tonight" once his game is over) beside the name of anyone with a line tonight. */
export const Tonight = ({line}) => line ? <span className={`ld-tonight${line.live ? ' is-live' : ''}`}>{line.live ? 'Live' : 'Tonight'} <b>{line.pts}</b> pts</span> : null;

/* The badge beside the ladder's title while it is re-ranked live. */
export const LiveBadge = ({live}) => live ? <span className={`ld-live${live.playing ? ' is-on' : ''}`} title="Ranked as if tonight's games ended now">{live.playing ? 'Live' : 'Tonight'}</span> : null;

const loadLadders = () => fetch(`/data/${CURRENT}/ladders.json`).then(response => (response.ok ? response.json() : null)).catch(() => null);

/* The full ladder page's list: the server's ranking in the HTML, re-ranked live in the browser while games are on. */
export default function LadderLive({rows: official, ladderKey}) {
  const [data, setData] = useState(null);
  useEffect(() => { loadLadders().then(setData); }, []);
  const live = useLiveLadders(data);
  const urls = new Map(official.map(row => [String(row.espnId), row.url]));
  const rows = (ladderKey === 'mvp' ? live?.mvp : live?.rookie) ?? official;
  return <>
    {live && (ladderKey === 'mvp' ? live.mvp : live.rookie) && <p className="ldp-live"><LiveBadge live={live}/> Ranked as if tonight&apos;s games ended now. Arrows show the move from the official ladder.</p>}
    <ol className="ld-list">
      {rows.map((row, index) => <li key={row.playerId} className={index < 3 ? 'top3' : undefined} style={{'--tc': TEAMS[row.team]?.color || '#8a8a8a'}}>
        {(() => {
          const url = row.url ?? urls.get(String(row.espnId));
          const body = <>
            <b className="ld-rank">{row.rank}</b>
            <span className="rp-face"><img src={espnHeadshotUrl(row.espnId)} alt="" width="64" height="64" loading="lazy"/>{TEAMS[row.team] && <img className="rp-team" src={espnLogoUrl(row.team)} alt="" width="24" height="24"/>}</span>
            <span className="rp-main">
              <span className="rp-top"><b>{row.name}</b><small> · {row.team}<span className="ldp-gp"> · {row.games} {row.games === 1 ? 'game' : 'games'}</span> · avg</small><Tonight line={row.tonight}/></span>
              <span className="rp-trio"><span><b>{row.pts}</b>pts</span><span><b>{row.reb}</b>reb</span><span><b>{row.ast}</b>ast</span></span>
            </span>
            <span className="ldp-right"><span className="ldp-score" title="Per-game game score, pulled toward the pool average for players with few games"><b>{row.score}</b><small>game score</small></span><Move value={row.move}/></span>
          </>;
          return url ? <a className="ld-row ldc" href={url}>{body}</a> : <div className="ld-row ldc">{body}</div>;
        })()}
      </li>)}
    </ol>
  </>;
}

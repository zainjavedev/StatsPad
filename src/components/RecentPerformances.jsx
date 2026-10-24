import React, { useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';
import { bestOfNight, newestFirst } from '../lib/performances';
import { fps, rating } from '../lib/playerGame';
import { trio } from '../lib/trio';
import PerfShare from './PerfShare';
import { TEAMS, espnLogoUrl } from '../lib/teams';

/* Recent individual lines in the stat-app mould: face with team badge, "T. Jerome · 64.4 fps · Oct 21",
   three big numbers and a grade. Each opens that player's game report and can be shared. */
const num = value => Number(String(value ?? '').replace('+', '')) || 0;
const day = new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric'});
const short = name => name.replace(/^(\S)\S*\s+/, '$1. ');
const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());

/* One performance card; used on Home and beside a player's game report. */
export function PerfCard({line, onPick, showDate = true}) {
  const [sharing, setSharing] = useState(false);
  const s = line.player.stats, code = codeOf(line.team), oppCode = codeOf(line.opp);
  const row = {PTS: num(s.PTS), REB: num(s.REB), AST: num(s.AST), STL: num(s.STL), BLK: num(s.BLK), TO: num(s.TO)};
  return <>
    <a className="rp-card" href={`/games/${line.gameId}?player=${line.player.id}`} onClick={onPick ? event => { event.preventDefault(); onPick(line.player.id); } : undefined}>
      <span className="rp-face">{line.player.photo ? <img src={line.player.photo} alt="" loading="lazy"/> : <i/>}{code && <img className="rp-team" src={espnLogoUrl(code)} alt=""/>}</span>
      <span className="rp-main">
        <span className="rp-top"><b>{short(line.player.name)}</b><small> · {fps(row)} fps{showDate && line.date ? ` · ${day.format(line.date)}` : ''}</small></span>
        <span className="rp-trio">{trio(s).map(([value, label]) => <span key={label}><b>{value}</b>{label}</span>)}</span>
        <small className="rp-game">{code && <img src={espnLogoUrl(code)} alt={line.team}/>}<b className={line.won ? 'win' : ''}>{line.score.split('–')[0]}</b>–<b className={line.won ? '' : 'win'}>{line.score.split('–')[1]}</b>{oppCode && <img src={espnLogoUrl(oppCode)} alt={line.opp}/>}</small>
      </span>
      <span className="rp-grade">{rating(s).toFixed(1)}</span>
    </a>
    <button type="button" className="rp-share" onClick={() => setSharing(true)} aria-label={`Share ${line.player.name}'s night as an image`} title="Share as an image"><Share2 size={14}/></button>
    {sharing && <PerfShare line={line} onClose={() => setSharing(false)}/>}
  </>;
}

const LIMIT = 6;

/* The lines worked out for each results list, so a return visit shows them without reading the box scores again. */
const worked = new WeakMap();

export default function RecentPerformances({results}) {
  const [lines, setLines] = useState(() => (results ? worked.get(results) ?? null : null));
  useEffect(() => {
    if (!results?.length) return undefined;
    let live = true;
    bestOfNight(results, 400).then(found => {
      const seen = new Set();
      const unique = newestFirst(found).filter(line => (seen.has(line.gameId) ? false : seen.add(line.gameId)));
      worked.set(results, unique.slice(0, LIMIT));
      if (live) setLines(unique.slice(0, LIMIT));
    });
    return () => { live = false; };
  }, [results]);
  return <section className="front-panel recent-perf">
    <div className="front-panel-head"><h2>Recent performances</h2></div>
    {lines === null ? <ul className="rp-list loading">{[0, 1, 2].map(index => <li key={index}/>)}</ul> : <ul className="rp-list">{lines.map(line => {
      return <li key={`${line.gameId}-${line.player.id}`}><PerfCard line={line}/></li>;
    })}</ul>}
  </section>;
}

import React, { useEffect, useState } from 'react';
import { bestOfNight, newestFirst } from '../lib/performances';
import { fps, rating } from '../lib/playerGame';
import { TEAMS, espnLogoUrl } from '../lib/teams';

/* Recent individual lines in the stat-app mould: face with team badge, "T. Jerome · 64.4 fps · Oct 21",
   three big numbers and a grade. Each opens that player's game report and can be shared. */
const num = value => Number(String(value ?? '').replace('+', '')) || 0;
const day = new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric'});
const short = name => name.replace(/^(\S)\S*\s+/, '$1. ');
const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());

/* His three best numbers of the night: each stat is scored against a good night in that category, and the top three show,
   shown in the usual order (points, rebounds, assists...). Shooting only counts with enough attempts. */
export function trio(stats) {
  const [fgm, fga] = String(stats.FG ?? '0-0').split('-').map(Number), three = Number(String(stats['3PT'] ?? '0-0').split('-')[0]);
  const all = [
    [num(stats.PTS), 'pts', num(stats.PTS) / 20], [num(stats.REB), 'reb', num(stats.REB) / 8], [num(stats.AST), 'ast', num(stats.AST) / 6],
    [num(stats.STL), 'stl', num(stats.STL) / 2], [num(stats.BLK), 'blk', num(stats.BLK) / 2], [three, '3pm', three / 3],
  ];
  if (fga >= 6) all.push([`${Math.round(fgm / fga * 100)}%`, 'fg', Math.round(fgm / fga * 100) / 55]);
  const best = all.filter(item => item[2] > 0).sort((a, b) => b[2] - a[2]).slice(0, 3);
  for (const fallback of all.slice(0, 3)) if (best.length < 3 && !best.includes(fallback)) best.push(fallback);
  return best.sort((a, b) => all.indexOf(a) - all.indexOf(b)).map(([value, label]) => [value, label]);
}

/* One performance card; used on Home and beside a player's game report. */
export function PerfCard({line, onPick, showDate = true}) {
  const s = line.player.stats, code = codeOf(line.team), oppCode = codeOf(line.opp);
  const row = {PTS: num(s.PTS), REB: num(s.REB), AST: num(s.AST), STL: num(s.STL), BLK: num(s.BLK), TO: num(s.TO)};
  return <>
    <a className="rp-card" href={`/games/${line.gameId}?player=${line.player.id}`} onClick={onPick ? event => { event.preventDefault(); onPick(line.player.id); } : undefined}>
      <span className="rp-face">{line.player.photo ? <img src={line.player.photo} alt="" loading="lazy"/> : <i/>}{code && <img className="rp-team" src={espnLogoUrl(code)} alt=""/>}</span>
      <span className="rp-main">
        <span className="rp-top"><b>{short(line.player.name)}</b><small> · {fps(row)} fps{showDate && line.date ? ` · ${day.format(line.date)}` : ''}</small></span>
        <span className="rp-trio">{trio(s).map(([value, label]) => <span key={label}><b>{value}</b>{label}</span>)}</span>
        <small className="rp-game">{code && <img src={espnLogoUrl(code)} alt={line.team}/>}{line.won ? 'W' : 'L'} {line.score}{oppCode && <img src={espnLogoUrl(oppCode)} alt={line.opp}/>}</small>
      </span>
      <span className="rp-grade">{rating(s).toFixed(1)}</span>
    </a>
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

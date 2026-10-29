import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Share2 } from 'lucide-react';
import { bestOfNight, newestFirst } from '../lib/performances';
import { fps, rating } from '../lib/playerGame';
import { trio } from '../lib/trio';
import PerfShare from './PerfShare';
import { TEAMS, espnLogoUrl } from '../lib/teams';
import { CURRENT } from '../lib/season';

/* Recent individual lines in the stat-app mould: face with team badge, "T. Jerome · 64.4 fps · Oct 21",
   three big numbers and a grade. Each opens that player's game report and can be shared. */
const num = value => Number(String(value ?? '').replace('+', '')) || 0;
const day = new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric'});
const short = name => name.replace(/^(\S)\S*\s+/, '$1. ');
const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());

/* One performance card; used on Home and beside a player's game report. */
/* Design rule: the photo is exactly as tall as the text beside it. The text block is measured and the face follows it,
   so a card with a wrapped name or a bigger font gets a bigger face instead of a gap. */
const useFaceSize = () => {
  const main = useRef(null), [size, setSize] = useState(null);
  useLayoutEffect(() => {
    const node = main.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => setSize(Math.round(node.getBoundingClientRect().height));
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(node);
    return () => watch.disconnect();
  }, []);
  return [main, size];
};

export function PerfCard({line, onPick, showDate = true}) {
  const [sharing, setSharing] = useState(false), [main, face] = useFaceSize();
  const s = line.player.stats, code = codeOf(line.team), oppCode = codeOf(line.opp);
  const row = {PTS: num(s.PTS), REB: num(s.REB), AST: num(s.AST), STL: num(s.STL), BLK: num(s.BLK), TO: num(s.TO)};
  return <>
    <a className="rp-card" style={face ? {'--face': `${face}px`} : undefined} href={`/games/${line.gameId}?player=${line.player.id}`} onClick={onPick ? event => { event.preventDefault(); onPick(line.player.id); } : undefined}>
      <span className="rp-face">{line.player.photo ? <img src={line.player.photo} alt="" loading="lazy"/> : <i/>}{code && <img className="rp-team" src={espnLogoUrl(code)} alt=""/>}</span>
      <span className="rp-main" ref={main}>
        <span className="rp-top"><b>{short(line.player.name)}</b><small> · {fps(row)} fps{showDate && line.date ? ` · ${day.format(line.date)}` : ''}</small></span>
        <span className="rp-trio">{trio(s).map(([value, label]) => <span key={label}><b>{value}</b>{label}</span>)}</span>
        {/* His own team is already on the face badge, so the game line is just the score (winner in bold) and the opponent. */}
        <small className="rp-game">{line.live && <i className="rp-wl live">Live</i>}<b className={line.won ? 'win' : ''}>{line.score.split('–')[0]}</b>–<b className={line.won ? '' : 'win'}>{line.score.split('–')[1]}</b><span className="rp-vs">{line.home ? 'vs' : '@'}</span>{oppCode && <img src={espnLogoUrl(oppCode)} alt={line.opp}/>}</small>
      </span>
      <span className="rp-grade">{rating(s).toFixed(1)}</span>
    </a>
    <button type="button" className="rp-share" onClick={() => setSharing(true)} aria-label={`Share ${line.player.name}'s night as an image`} title="Share as an image"><Share2 size={14}/></button>
    {sharing && <PerfShare line={line} onClose={() => setSharing(false)}/>}
  </>;
}

/* Placeholder rows built from the card's own markup, so each page gets a skeleton the size of its cards. */
export function PerfSkeleton({count = 3}) {
  return <ul className="rp-list rp-skeleton" aria-hidden="true">{Array.from({length: count}, (_, index) => <li key={index}><div className="rp-card">
    <span className="rp-face"><i/></span>
    <span className="rp-main"><span className="rp-top"><b>Player Name</b></span><span className="rp-trio"><b>00</b><b>00</b><b>00</b></span><small className="rp-game">000–000</small></span>
    <span className="rp-grade">0.0</span>
  </div></li>)}</ul>;
}

const LIMIT = 6;

/* The lines worked out for each results list, so a return visit shows them without reading the box scores again. */
const worked = new WeakMap();

/* Each game's best line, written by scripts/build-regular-box-stats.mjs every refresh: one small file instead of a box score from ESPN
   for every recent game (the slow way, which is still the fallback). */
const loadSaved = () => fetch(`/data/${CURRENT}/recent-performances.json`).then(response => (response.ok ? response.json() : null)).catch(() => null);
const pick = found => { const seen = new Set(); return newestFirst(found).filter(line => (seen.has(line.gameId) ? false : seen.add(line.gameId))).slice(0, LIMIT); };

export default function RecentPerformances({results}) {
  const [lines, setLines] = useState(() => (results ? worked.get(results) ?? null : null));
  useEffect(() => {
    let live = true;
    (async () => {
      const saved = await loadSaved();
      const known = (saved?.lines ?? []).map(line => ({...line, date: new Date(line.date)}));
      if (known.length && live) setLines(pick(known));
      if (!results) return;
      /* Games that finished since the file was written are the only box scores read from ESPN. */
      const have = new Set(known.map(line => line.gameId));
      const since = known.length ? Math.min(...known.map(line => line.date.getTime())) - 12 * 3600 * 1000 : 0;
      const missing = known.length ? results.filter(game => !have.has(String(game.id)) && (game.date?.getTime?.() ?? 0) >= since).slice(0, 8) : results;
      if (!missing.length) { if (!known.length && live) setLines([]); worked.set(results, pick(known)); return; }
      const found = await bestOfNight(missing, 400).catch(() => []);
      const next = pick([...known, ...found]);
      worked.set(results, next);
      if (live) setLines(next);
    })().catch(() => { if (live) setLines(previous => previous ?? []); });
    return () => { live = false; };
  }, [results]);
  return <section className="front-panel recent-perf">
    <div className="front-panel-head"><h2>Recent performances</h2><a className="front-more" href="/top-performances">All performances <ArrowRight size={14}/></a></div>
    {lines === null ? <PerfSkeleton count={LIMIT}/> : lines.length === 0 ? <p className="rp-empty">No finished games yet. Performances show up here once games end.</p> : <ul className="rp-list">{lines.map(line => {
      return <li key={`${line.gameId}-${line.player.id}`}><PerfCard line={line}/></li>;
    })}</ul>}
  </section>;
}

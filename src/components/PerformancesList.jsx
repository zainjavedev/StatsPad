'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { PerfCard, PerfSkeleton } from './RecentPerformances';
import { bestOfNight } from '../lib/performances';
import { finished, loadSchedule } from '../lib/schedule';
import { fps, rating } from '../lib/playerGame';
import { TEAMS } from '../lib/teams';

/* Every line from the last few game nights, sortable on any stat. A night picker narrows it to one night; the sort chips
   order it (tap the chosen one again to flip lowest first). Read from the box scores of the latest finals, so a game that
   ended minutes ago is already here. Cards sit in a grid that uses the width of a wide screen. */
/* The rule behind a sort, said under the chips so nobody wonders why a line is missing or how a number is made. */
const NOTE = {
  grade: 'game grade out of 10, from the whole box score',
  '3pm': 'threes made',
  fg: 'only players with 8+ shots, so a 6-for-6 night is left out',
  pm: 'team points minus opponent points while he was on the floor',
  fps: 'fantasy points: points + 1.2 × rebounds + 1.5 × assists + 3 × steals + 3 × blocks − turnovers',
};
/* Sorts whose stat the card can show among its three numbers. */
const FOCUS = {reb: 'reb', ast: 'ast', stl: 'stl', blk: 'blk', '3pm': '3pm', fg: 'fg'};
const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());
const NIGHTS = 3, PER_NIGHT = 80, SHOWN = 30;
const dayLabel = date => date.toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'});
const num = value => Number(String(value ?? '').replace('+', '')) || 0;
const made = (value, part) => Number(String(value ?? '0-0').split('-')[part]) || 0;

/* Each sort: its label and the value it ranks on. Shooting needs enough tries. The cards are the home page's (ranked, the
   best three in team colour), and a stat sort makes sure that stat is one of the card's three numbers. */
const SORTS = [
  ['grade', 'Grade', s => rating(s)],
  ['pts', 'Points', s => num(s.PTS)],
  ['reb', 'Rebounds', s => num(s.REB)],
  ['ast', 'Assists', s => num(s.AST)],
  ['stl', 'Steals', s => num(s.STL)],
  ['blk', 'Blocks', s => num(s.BLK)],
  ['3pm', 'Threes', s => made(s['3PT'], 0)],
  ['fg', 'FG%', s => (made(s.FG, 1) >= 8 ? made(s.FG, 0) / made(s.FG, 1) * 100 : null)],
  ['pm', '+/-', s => num(s['+/-'])],
  ['fps', 'Fantasy', s => fps({PTS: num(s.PTS), REB: num(s.REB), AST: num(s.AST), STL: num(s.STL), BLK: num(s.BLK), TO: num(s.TO)})],
];

export default function PerformancesList() {
  const [nights, setNights] = useState(null), [night, setNight] = useState(null), [sort, setSort] = useState({key: 'grade', dir: 'down'}), [count, setCount] = useState(SHOWN);
  useEffect(() => {
    let live = true;
    loadSchedule().then(all => {
      const finals = finished(all.filter(game => !game.preseason), 60);
      const days = [...new Set(finals.map(game => game.date.toDateString()))].slice(0, NIGHTS);
      return Promise.all(days.map(day => bestOfNight(finals.filter(game => game.date.toDateString() === day), PER_NIGHT).then(lines => ({day, lines}))));
    }).then(found => {
      if (!live) return;
      const kept = found.filter(entry => entry.lines.length);
      /* Opens on the latest night, best grade first; "All nights" is one tap away. */
      setNights(kept); setNight(current => current ?? kept[0]?.day ?? 'all');
    }).catch(() => { if (live) setNights([]); });
    return () => { live = false; };
  }, []);
  useEffect(() => setCount(SHOWN), [night, sort]);

  const [, , valueOf] = SORTS.find(([key]) => key === sort.key);
  const lines = useMemo(() => {
    if (!nights) return [];
    const pool = nights.filter(entry => night === 'all' || entry.day === night).flatMap(entry => entry.lines);
    return pool.map(line => ({line, value: valueOf(line.player.stats)})).filter(entry => entry.value !== null)
      .sort((a, b) => (sort.dir === 'down' ? b.value - a.value : a.value - b.value) || b.line.rating - a.line.rating);
  }, [nights, night, sort, valueOf]);

  if (nights === null) return <PerfSkeleton count={8}/>;
  if (!nights.length) return <p className="rp-empty">No finished games yet. Performances show up here once games end.</p>;
  const pick = key => setSort(now => (now.key === key ? {key, dir: now.dir === 'down' ? 'up' : 'down'} : {key, dir: 'down'}));
  return <>
    <div className="pfl-controls">
      <div className="front-tabs" role="group" aria-label="Night">
        <button type="button" className={night === 'all' ? 'active' : ''} onClick={() => setNight('all')}>All nights</button>
        {nights.map(entry => <button key={entry.day} type="button" className={night === entry.day ? 'active' : ''} onClick={() => setNight(entry.day)}>{dayLabel(new Date(entry.day))}</button>)}
      </div>
      <div className="pfl-sorts" role="group" aria-label="Sort by">
        {SORTS.map(([key, label]) => <button key={key} type="button" className={sort.key === key ? 'on' : ''} aria-pressed={sort.key === key} onClick={() => pick(key)}>
          {label}{sort.key === key && (sort.dir === 'down' ? <ArrowDown size={13}/> : <ArrowUp size={13}/>)}
        </button>)}
      </div>
    </div>
    <p className="pfl-count">{lines.length} lines · {sort.dir === 'down' ? 'highest' : 'lowest'} first{NOTE[sort.key] ? ` · ${NOTE[sort.key]}` : ''}</p>
    <ul key={`${night}-${sort.key}-${sort.dir}`} className="rp-list rp-ranked pfl-grid list-in">{lines.slice(0, count).map(({line}, index) => <li key={`${line.gameId}-${line.player.id}`} className={index < 3 ? 'top3' : undefined} style={{'--tc': TEAMS[codeOf(line.team)]?.color || '#8a8a8a'}}>
      <PerfCard line={line} rank={index + 1} focus={FOCUS[sort.key]}/>
    </li>)}</ul>
    {lines.length > count && <button type="button" className="tl-more" onClick={() => setCount(now => now + SHOWN)}>Show {Math.min(SHOWN, lines.length - count)} more</button>}
  </>;
}

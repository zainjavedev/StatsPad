'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react';
import { PerfCard, PerfSkeleton } from './RecentPerformances';
import { bestOfNight } from '../lib/performances';
import { finished, loadSchedule } from '../lib/schedule';
import { fps, rating } from '../lib/playerGame';
import { TEAMS } from '../lib/teams';

/* Every line from the last few game nights, sortable on any box-score stat, best or worst first: who scored the most,
   and who turned it over the most. A night picker narrows it to one night. The everyday stats are chips; the rest sit in a
   "More stats" panel grouped by kind, so the controls stay one row. Tap the chosen stat again, or the direction button, to
   flip lowest first. Read from the box scores of the latest finals, so a game that ended minutes ago is already here. */
const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());
const NIGHTS = 3, PER_NIGHT = 80, SHOWN = 30;
const dayLabel = date => date.toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'});
const num = value => Number(String(value ?? '').replace('+', '')) || 0;
const made = (value, part) => Number(String(value ?? '0-0').split('-')[part]) || 0;
const rate = (value, least) => (made(value, 1) >= least ? made(value, 0) / made(value, 1) * 100 : null);

/* Each sort: key, label, the value it ranks on (null leaves a line out), the label the card shows it under (focus), and
   the rule behind it, said under the controls so nobody wonders why a line is missing or how a number is made. */
const sort = (key, label, value, focus, note) => ({key, label, value, focus, note});
const MAIN = [
  sort('grade', 'Grade', s => rating(s), null, 'game grade out of 10, from the whole box score'),
  sort('pts', 'Points', s => num(s.PTS)),
  sort('reb', 'Rebounds', s => num(s.REB), 'reb'),
  sort('ast', 'Assists', s => num(s.AST), 'ast'),
  sort('3pm', 'Threes', s => made(s['3PT'], 0), '3pm', 'threes made'),
  sort('fps', 'Fantasy', s => fps({PTS: num(s.PTS), REB: num(s.REB), AST: num(s.AST), STL: num(s.STL), BLK: num(s.BLK), TO: num(s.TO)}), null, 'fantasy points: points + 1.2 × rebounds + 1.5 × assists + 3 × steals + 3 × blocks − turnovers'),
];
const GROUPS = [
  ['Shooting', [
    sort('fgm', 'FG made', s => made(s.FG, 0), 'fgm'), sort('fga', 'FG attempts', s => made(s.FG, 1), 'fga'),
    sort('fg', 'FG%', s => rate(s.FG, 8), 'fg', 'only players with 8+ shots, so a 6-for-6 night is left out'),
    sort('3pa', '3PT attempts', s => made(s['3PT'], 1), '3pa'), sort('3p', '3P%', s => rate(s['3PT'], 4), '3p', 'only players with 4+ three-point tries'),
    sort('ftm', 'FT made', s => made(s.FT, 0), 'ftm'), sort('fta', 'FT attempts', s => made(s.FT, 1), 'fta'),
    sort('ft', 'FT%', s => rate(s.FT, 4), 'ft', 'only players with 4+ free throws'),
  ]],
  ['Boards & defense', [
    sort('oreb', 'Off. rebounds', s => num(s.OREB), 'oreb'), sort('dreb', 'Def. rebounds', s => num(s.DREB), 'dreb'),
    sort('stl', 'Steals', s => num(s.STL), 'stl'), sort('blk', 'Blocks', s => num(s.BLK), 'blk'),
  ]],
  ['Mistakes & more', [
    sort('to', 'Turnovers', s => num(s.TO), 'to', 'turnovers: highest first is the sloppiest night'), sort('pf', 'Fouls', s => num(s.PF), 'pf'),
    sort('pm', '+/-', s => num(s['+/-']), null, 'team points minus opponent points while he was on the floor'),
    sort('min', 'Minutes', s => num(s.MIN), 'min'),
  ]],
];
const SORTS = [...MAIN, ...GROUPS.flatMap(([, list]) => list)];

export default function PerformancesList() {
  const [nights, setNights] = useState(null), [night, setNight] = useState(null), [order, setOrder] = useState({key: 'grade', dir: 'down'}), [count, setCount] = useState(SHOWN), [more, setMore] = useState(false);
  const panel = useRef(null);
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
  useEffect(() => setCount(SHOWN), [night, order]);
  /* The More stats panel closes on a tap outside it or Escape. */
  useEffect(() => {
    if (!more) return undefined;
    const away = event => { if (!panel.current?.contains(event.target)) setMore(false); };
    const key = event => { if (event.key === 'Escape') setMore(false); };
    addEventListener('pointerdown', away); addEventListener('keydown', key);
    return () => { removeEventListener('pointerdown', away); removeEventListener('keydown', key); };
  }, [more]);

  const chosen = SORTS.find(item => item.key === order.key), valueOf = chosen.value, extraPicked = !MAIN.includes(chosen);
  const lines = useMemo(() => {
    if (!nights) return [];
    const pool = nights.filter(entry => night === 'all' || entry.day === night).flatMap(entry => entry.lines);
    return pool.map(line => ({line, value: valueOf(line.player.stats)})).filter(entry => entry.value !== null)
      .sort((a, b) => (order.dir === 'down' ? b.value - a.value : a.value - b.value) || b.line.rating - a.line.rating);
  }, [nights, night, order, valueOf]);

  if (nights === null) return <PerfSkeleton count={8}/>;
  if (!nights.length) return <p className="rp-empty">No finished games yet. Performances show up here once games end.</p>;
  const pick = key => { setOrder(now => (now.key === key ? {key, dir: now.dir === 'down' ? 'up' : 'down'} : {key, dir: 'down'})); setMore(false); };
  const chip = item => <button key={item.key} type="button" className={order.key === item.key ? 'on' : ''} aria-pressed={order.key === item.key} onClick={() => pick(item.key)}>{item.label}</button>;
  return <>
    <div className="pfl-controls">
      <div className="front-tabs" role="group" aria-label="Night">
        <button type="button" className={night === 'all' ? 'active' : ''} onClick={() => setNight('all')}>All nights</button>
        {nights.map(entry => <button key={entry.day} type="button" className={night === entry.day ? 'active' : ''} onClick={() => setNight(entry.day)}>{dayLabel(new Date(entry.day))}</button>)}
      </div>
      <button type="button" className="pfl-dir" onClick={() => setOrder(now => ({...now, dir: now.dir === 'down' ? 'up' : 'down'}))} aria-label={order.dir === 'down' ? 'Highest first, tap for lowest first' : 'Lowest first, tap for highest first'}>
        {order.dir === 'down' ? <><ArrowDown size={14}/> Highest first</> : <><ArrowUp size={14}/> Lowest first</>}
      </button>
    </div>
    <div className="pfl-bar" ref={panel}>
      <div className="pfl-sorts" role="group" aria-label="Sort by">
        {MAIN.map(chip)}
        <button type="button" className={`pfl-more${extraPicked ? ' on' : ''}`} aria-expanded={more} onClick={() => setMore(open => !open)}>
          {extraPicked ? chosen.label : 'More stats'} <ChevronDown size={14}/>
        </button>
      </div>
      {more && <div className="pfl-panel" role="group" aria-label="More stats">{GROUPS.map(([name, list]) => <div key={name}><span>{name}</span><div className="pfl-sorts">{list.map(chip)}</div></div>)}</div>}
    </div>
    <p className="pfl-count">{lines.length} lines · {chosen.label} · {order.dir === 'down' ? 'highest' : 'lowest'} first{chosen.note ? ` · ${chosen.note}` : ''}</p>
    <ul key={`${night}-${order.key}-${order.dir}`} className="rp-list rp-ranked pfl-grid list-in">{lines.slice(0, count).map(({line}, index) => <li key={`${line.gameId}-${line.player.id}`} className={index < 3 ? 'top3' : undefined} style={{'--tc': TEAMS[codeOf(line.team)]?.color || '#8a8a8a'}}>
      <PerfCard line={line} rank={index + 1} focus={chosen.focus}/>
    </li>)}</ul>
    {lines.length > count && <button type="button" className="tl-more" onClick={() => setCount(now => now + SHOWN)}>Show {Math.min(SHOWN, lines.length - count)} more</button>}
  </>;
}

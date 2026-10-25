import React, { useEffect, useState } from 'react';
import {PerfCard, PerfSkeleton} from './RecentPerformances';
import { bestOfNight, newestFirst } from '../lib/performances';
import { finished, loadSchedule } from '../lib/schedule';

/* The best line from every recent game, grouped by night: newest night first, the best lines first within it. */

const GAMES = 60;
const dayKey = date => (date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : 'unknown');
const heading = new Intl.DateTimeFormat(undefined, {weekday: 'long', month: 'long', day: 'numeric'});
const label = date => {
  if (!date) return 'Earlier';
  const today = new Date(), yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const name = heading.format(date);
  return date.toDateString() === today.toDateString() ? `Today · ${name}` : date.toDateString() === yesterday.toDateString() ? `Yesterday · ${name}` : name;
};

function nights(lines) {
  const groups = new Map();
  for (const line of lines) {
    const key = dayKey(line.date);
    if (!groups.has(key)) groups.set(key, {key, date: line.date, lines: []});
    groups.get(key).lines.push(line);
  }
  return [...groups.values()];
}

/* The last list shown, so coming back to the page is instant while it refreshes. */
let last = null;

export default function PerformancesPage() {
  const [lines, setLines] = useState(last);
  useEffect(() => {
    let live = true;
    loadSchedule().then(all => finished(all.filter(game => !game.preseason), GAMES)).then(finals => bestOfNight(finals, 400)).then(found => {
      const seen = new Set();
      last = newestFirst(found).filter(line => (seen.has(line.gameId) ? false : seen.add(line.gameId)));
      if (live) setLines(last);
    }).catch(() => { if (live) setLines([]); });
    return () => { live = false; };
  }, []);
  return <section className="perfs-page">
    <h1>Top performances</h1>
    <p>The best line from every game, night by night</p>
    {lines === null ? <PerfSkeleton count={4}/>
      : lines.length === 0 ? <p className="perfs-empty">No finished games yet.</p>
        : nights(lines).map(night => <section key={night.key} className="perfs-night">
          <h2>{label(night.date)}<small>{night.lines.length} {night.lines.length === 1 ? 'game' : 'games'}</small></h2>
          <ul className="rp-list">{night.lines.map(line => <li key={`${line.gameId}-${line.player.id}`}><PerfCard line={line} showDate={false}/></li>)}</ul>
        </section>)}
  </section>;
}

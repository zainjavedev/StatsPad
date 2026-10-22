import React, { useEffect, useState } from 'react';
import { PerfCard } from './RecentPerformances';
import { bestOfNight } from '../lib/performances';
import { finished, loadSchedule } from '../lib/schedule';

/* The best individual lines from the last few nights, one small card each. */

const SHOWN = 20;

export default function PerformancesPage() {
  const [lines, setLines] = useState(null);
  useEffect(() => {
    let live = true;
    loadSchedule().then(all => finished(all.filter(game => !game.preseason), 14)).then(finals => bestOfNight(finals, 400)).then(found => {
      const seen = new Set();
      if (live) setLines(found.filter(line => (seen.has(line.player.name) ? false : seen.add(line.player.name))).slice(0, SHOWN));
    }).catch(() => { if (live) setLines([]); });
    return () => { live = false; };
  }, []);
  return <section className="perfs-page">
    <h1>Top performances</h1>
    <p>The best lines from the last few nights</p>
    {lines === null ? <ul className="rp-list loading">{[0, 1, 2, 3].map(index => <li key={index}/>)}</ul>
      : lines.length === 0 ? <p className="perfs-empty">No finished games yet.</p>
        : <ul className="rp-list">{lines.map(line => <li key={`${line.gameId}-${line.player.id}`}><PerfCard line={line}/></li>)}</ul>}
  </section>;
}

'use client';
import React, { useEffect, useState } from 'react';
import { PerfCard, PerfSkeleton } from './RecentPerformances';
import { bestOfNight } from '../lib/performances';
import { finished, loadSchedule } from '../lib/schedule';

/* Every standout line from the last few game nights, best first within each night. Read from the box scores of the
   latest finals, so a game that ended minutes ago is already here. */
const NIGHTS = 3, PER_NIGHT = 15;
const dayLabel = date => date.toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'});

export default function PerformancesList() {
  const [nights, setNights] = useState(null);
  useEffect(() => {
    let live = true;
    loadSchedule().then(all => {
      const finals = finished(all.filter(game => !game.preseason), 60);
      const days = [...new Set(finals.map(game => game.date.toDateString()))].slice(0, NIGHTS);
      return Promise.all(days.map(day => bestOfNight(finals.filter(game => game.date.toDateString() === day), PER_NIGHT).then(lines => ({day, lines}))));
    }).then(found => { if (live) setNights(found.filter(night => night.lines.length)); }).catch(() => { if (live) setNights([]); });
    return () => { live = false; };
  }, []);
  if (nights === null) return <PerfSkeleton count={8}/>;
  if (!nights.length) return <p className="rp-empty">No finished games yet. Performances show up here once games end.</p>;
  return nights.map(night => <section key={night.day} className="sc-day">
    <h2>{dayLabel(new Date(night.day))}</h2>
    <ul className="rp-list">{night.lines.map(line => <li key={`${line.gameId}-${line.player.id}`}><PerfCard line={line}/></li>)}</ul>
  </section>);
}

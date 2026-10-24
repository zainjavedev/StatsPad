'use client';
import { useEffect } from 'react';

/* Quietly gets the app ready while someone reads a page: its code, and the data files it opens with. The files come
   back with a short cache lifetime (see next.config.mjs), so by the time they tap Home or Teams everything is already
   in the browser. */
const FILES = ['/data/2026-27/regular-season.json', '/data/2026-27/teams-regular-season.json', '/data/2026-27/schedule.json', '/data/2026-27/ladders.json', '/data/player-ids.json', '/data/espn-ids.json'];

export default function Warm() {
  useEffect(() => {
    const run = () => { import('../Home').catch(() => {}); FILES.forEach(file => fetch(file).catch(() => {})); };
    const handle = 'requestIdleCallback' in window ? window.requestIdleCallback(run, {timeout: 4000}) : setTimeout(run, 1500);
    return () => ('cancelIdleCallback' in window ? window.cancelIdleCallback(handle) : clearTimeout(handle));
  }, []);
  return null;
}

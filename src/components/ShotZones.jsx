import React, { useEffect, useMemo, useState } from 'react';
import { Court } from './ShotChart';
import { WING, zonesOf } from '../lib/shotZones';

/* Shot zones on a player's profile: every shot of his season from the play-by-play, grouped into ten zones on a half court and
   with each zone's share on it (of his shots, or of his points). The hot zone, the biggest share, is in full red; the rest are
   faded toward the floor by their share. Just the chart. */

const HOOP = [25, 36.75];
/* A wedge of the floor seen from the basket, from angle a to b (degrees, 0 straight up the floor, negative to the left). */
const wedge = (a, b) => {
  const points = [HOOP];
  const at = angle => [HOOP[0] + 80 * Math.sin(angle * Math.PI / 180), HOOP[1] - 80 * Math.cos(angle * Math.PI / 180)];
  for (let angle = a; angle < b; angle += 4) points.push(at(angle));
  points.push(at(b));
  return `M${points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`;
};
const INSIDE = 'M3 42V27.8A23.75 23.75 0 0 1 47 27.8V42Z';
const OUTSIDE = 'M0 0H50V42H47V27.8A23.75 23.75 0 0 0 3 27.8V42H0Z';
const SHAPES = {
  'w3-left': {d: wedge(-180, -WING), clip: 'out'}, top3: {d: wedge(-WING, WING), clip: 'out'}, 'w3-right': {d: wedge(WING, 180), clip: 'out'},
  'c3-left': {d: 'M0 27.8H3V42H0Z'}, 'c3-right': {d: 'M47 27.8H50V42H47Z'},
  'mid-left': {d: wedge(-180, -WING), clip: 'in'}, 'mid-center': {d: wedge(-WING, WING), clip: 'in'}, 'mid-right': {d: wedge(WING, 180), clip: 'in'},
  paint: {d: 'M17 23H33V42H17Z'}, ra: {d: 'M21 36.75a4 4 0 0 1 8 0a4 4 0 0 1-8 0Z'},
};
/* Where each zone's number sits. */
const LABEL = {
  'w3-left': [7, 15], top3: [25, 6.5], 'w3-right': [43, 15], 'c3-left': [1.5, 35.5], 'c3-right': [48.5, 35.5],
  'mid-left': [9.5, 33], 'mid-center': [25, 18.2], 'mid-right': [40.5, 33], paint: [25, 28.6], ra: [25, 36.75],
};

/* The hot zone full red; every other zone a faded red, stronger the bigger its share. Solid colours (the zones overlap). */
const mix = (from, to, t) => `#${from.match(/\w\w/g).map((hex, index) => Math.round(parseInt(hex, 16) + (parseInt(to.match(/\w\w/g)[index], 16) - parseInt(hex, 16)) * t).toString(16).padStart(2, '0')).join('')}`;
const FLOOR = '16171b', RED = 'f0524d';
const heat = (t, hot) => (hot ? `#${RED}` : t <= 0 ? `#${FLOOR}` : mix(FLOOR, RED, .1 + .32 * t));
const pct = value => `${Math.round(value * 100)}%`;

const cache = new Map();
const loadShots = id => {
  if (!cache.has(id)) cache.set(id, fetch(`/api/player-shots?id=${id}`).then(response => (response.ok ? response.json() : null)).catch(() => null));
  return cache.get(id);
};

export default function ShotZones({espnId, firstName}) {
  const [data, setData] = useState(undefined), [mode, setMode] = useState('shots');
  useEffect(() => {
    if (!espnId) { setData(null); return undefined; }
    let live = true;
    setData(undefined);
    loadShots(espnId).then(found => { if (live) setData(found); });
    return () => { live = false; };
  }, [espnId]);
  const zones = useMemo(() => (data?.shots ? zonesOf(data.shots, data.pts) : []), [data]);

  if (data === null || (data && data.shots.length < 10)) return null;
  const by = mode === 'shots' ? 'share' : 'ptsShare';
  const top = Math.max(...zones.map(zone => zone[by]), 0.0001);
  const hot = [...zones].sort((a, b) => b[by] - a[by] || b.fga - a.fga)[0];

  return <section className="pp-card sz" aria-label={`${firstName}'s shot zones`}>
    <div className="pp-head sz-head"><h2>{firstName}&apos;s hot zones</h2>
      <div className="pp-tabs sz-tabs" role="group" aria-label="Shade the zones by">
        {[['shots', 'Shots'], ['points', 'Points']].map(([key, label]) => <button key={key} type="button" className={mode === key ? 'active' : ''} aria-pressed={mode === key} onClick={() => setMode(key)}>{label}</button>)}
      </div>
    </div>
    {data === undefined ? <div className="sk" style={{height: 300, borderRadius: 12}}/> : <>
      <div className="sz-court">
        <svg viewBox="0 0 50 42" role="img" aria-label={`${firstName}'s ${mode === 'shots' ? 'shots' : 'points'} by zone`}>
          <defs>
            <clipPath id="sz-in"><path d={INSIDE}/></clipPath>
            <clipPath id="sz-out"><path d={OUTSIDE}/></clipPath>
            <clipPath id="sz-court"><rect width="50" height="42" rx="1.2"/></clipPath>
          </defs>
          <g clipPath="url(#sz-court)">
            <rect width="50" height="42" fill="#121317"/>
            {/* Outer zones first, inner ones over them: the paint covers the middle midrange, the rim area covers the paint. */}
            {['w3-left', 'top3', 'w3-right', 'c3-left', 'c3-right', 'mid-left', 'mid-center', 'mid-right', 'paint', 'ra'].map(key => {
              const zone = zones.find(item => item.key === key), shape = SHAPES[key];
              return <path key={key} d={shape.d} clipPath={shape.clip ? `url(#sz-${shape.clip})` : undefined} fill={heat(zone[by] / top, zone.key === hot.key)} stroke="#0b0c0f" strokeWidth=".35"><title>{`${zone.long}: ${zone.fgm} of ${zone.fga}, ${pct(zone.ptsShare)} of his points`}</title></path>;
            })}
          </g>
          <Court bare/>
          {/* Free throws on the free-throw line: made of attempted under Shots, their share of his points under Points. */}
          {data.fta > 0 && <g transform="translate(25 23)">
            <rect x="-5.2" y="-1.35" width="10.4" height="2.7" rx="1.35" fill="#0b0c0f" stroke="#fff" strokeOpacity=".35" strokeWidth=".2"><title>{`Free throws: ${data.ftm} of ${data.fta}, ${pct(data.ftm / Math.max(1, data.pts))} of his points`}</title></rect>
            <text textAnchor="middle" dominantBaseline="central" className="sz-num" fontSize="1.6">FT {mode === 'shots' ? `${data.ftm}/${data.fta}` : pct(data.ftm / Math.max(1, data.pts))}</text>
          </g>}
          {zones.map(zone => {
            const [x, y] = LABEL[zone.key], corner = zone.key.startsWith('c3');
            return <text key={zone.key} x={x} y={y} textAnchor="middle" dominantBaseline="central" className={`sz-num${zone.key === hot.key ? ' hot' : ''}`} fontSize={corner ? 1.5 : zone.key === 'ra' ? 2 : 2.2} transform={corner ? `rotate(-90 ${x} ${y})` : undefined}>{zone.fga ? pct(zone[by]) : ''}</text>;
          })}
        </svg>
      </div>
    </>}
  </section>;
}

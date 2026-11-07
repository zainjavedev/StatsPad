import React, { useEffect, useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import { Court } from './ShotChart';
import { WING, zonesOf } from '../lib/shotZones';

/* Shot zones on a player's profile: every shot of his season from the play-by-play, grouped into ten zones on a half court and
   shaded by how often he shoots from each (or how much of his scoring each one gives). His hot zone, where he shoots most, is
   spelled out: its share of his shots, of his points and his percentage there. */

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
  'mid-left': [9.5, 33], 'mid-center': [25, 18.2], 'mid-right': [40.5, 33], paint: [25, 28.4], ra: [25, 34.3],
};

/* From the court's dark floor to a hot orange, by how big a zone's share is next to the biggest. */
const mix = (from, to, t) => `#${from.match(/\w\w/g).map((hex, index) => Math.round(parseInt(hex, 16) + (parseInt(to.match(/\w\w/g)[index], 16) - parseInt(hex, 16)) * t).toString(16).padStart(2, '0')).join('')}`;
const heat = t => (t <= 0 ? '#1a1b20' : t < .5 ? mix('2a2420', 'a8452a', t / .5) : mix('a8452a', 'ff6a3d', (t - .5) / .5));
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
  const hot = [...zones].sort((a, b) => b.fga - a.fga || b.pts - a.pts)[0];
  const ranked = zones.filter(zone => zone.fga > 0).sort((a, b) => b[by] - a[by]);

  return <section className="pp-card sz" aria-label={`${firstName}'s shot zones`}>
    <div className="pp-head"><h2>{firstName}&apos;s hot zones</h2></div>
    {data === undefined ? <div className="sk" style={{height: 300, borderRadius: 12}}/> : <>
      <div className="sz-hot">
        <span className="sz-flame" aria-hidden="true"><Flame size={18}/></span>
        <div><small>Hot zone</small><b>{hot.name}</b></div>
        <dl>
          <div><dt>of his shots</dt><dd>{pct(hot.share)}</dd></div>
          <div><dt>of his points</dt><dd>{pct(hot.ptsShare)}</dd></div>
          <div><dt>FG</dt><dd>{hot.pct === null ? '–' : pct(hot.pct)}</dd></div>
        </dl>
      </div>
      <div className="pp-tabs sz-tabs" role="group" aria-label="Shade the zones by">
        {[['shots', 'Shots'], ['points', 'Points']].map(([key, label]) => <button key={key} type="button" className={mode === key ? 'active' : ''} aria-pressed={mode === key} onClick={() => setMode(key)}>{label}</button>)}
      </div>
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
              return <path key={key} d={shape.d} clipPath={shape.clip ? `url(#sz-${shape.clip})` : undefined} fill={heat(zone[by] / top)} stroke="#0b0c0f" strokeWidth=".35"><title>{`${zone.long}: ${zone.fgm} of ${zone.fga}, ${pct(zone.ptsShare)} of his points`}</title></path>;
            })}
          </g>
          <Court/>
          {zones.map(zone => {
            const [x, y] = LABEL[zone.key], corner = zone.key.startsWith('c3');
            return <text key={zone.key} x={x} y={y} textAnchor="middle" dominantBaseline="central" className={`sz-num${zone.key === hot.key ? ' hot' : ''}`} fontSize={corner ? 1.5 : 2.2} transform={corner ? `rotate(-90 ${x} ${y})` : undefined}>{zone.fga ? pct(zone[by]) : ''}</text>;
          })}
        </svg>
      </div>
      <ol className="sz-list">
        {ranked.map(zone => <li key={zone.key} className={zone.key === hot.key ? 'hot' : ''}>
          <span className="sz-name">{zone.name}</span>
          <span className="sz-bar"><i style={{width: pct(zone[by] / top), background: heat(zone[by] / top)}}/></span>
          <span className="sz-val"><b>{pct(zone[by])}</b><small>{zone.fgm}/{zone.fga}</small></span>
        </li>)}
      </ol>
      <p className="pp-note">{data.shots.length} shots in {data.games} {data.games === 1 ? 'game' : 'games'} this regular season. {mode === 'shots' ? 'Share of his field-goal attempts from each zone.' : 'Share of all his points, free throws included, from each zone.'} Left and right as drawn, basket at the bottom.</p>
    </>}
  </section>;
}

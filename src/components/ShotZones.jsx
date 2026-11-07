import React, { useEffect, useId, useMemo, useState } from 'react';
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

/* A player's season shots (undefined while loading, null when there are none to show). */
export function useShots(espnId) {
  const [data, setData] = useState(undefined);
  useEffect(() => {
    if (!espnId) { setData(null); return undefined; }
    let live = true;
    setData(undefined);
    loadShots(espnId).then(found => { if (live) setData(found && found.shots.length >= 10 ? found : null); });
    return () => { live = false; };
  }, [espnId]);
  return data;
}

/* The zone court itself: each zone's share on it, the biggest in full red, the rest faded; free throws in the free-throw circle when on. */
export function ZoneCourt({data, mode, showFt, label}) {
  const uid = useId().replace(/:/g, '');
  const zones = useMemo(() => zonesOf(data.shots, data.pts), [data]);
  const by = mode === 'shots' ? 'share' : 'ptsShare';
  const top = Math.max(...zones.map(zone => zone[by]), 0.0001);
  const hot = [...zones].sort((a, b) => b[by] - a[by] || b.fga - a.fga)[0];
  const ft = showFt && data.fta > 0 ? {pct: data.ftm / data.fta, share: data.ftm / Math.max(1, data.pts)} : null;
  return <svg viewBox="0 0 50 42" role="img" aria-label={label}>
    <defs>
      <clipPath id={`${uid}in`}><path d={INSIDE}/></clipPath>
      <clipPath id={`${uid}out`}><path d={OUTSIDE}/></clipPath>
      <clipPath id={`${uid}court`}><rect width="50" height="42" rx="1.2"/></clipPath>
    </defs>
    <g clipPath={`url(#${uid}court)`}>
      <rect width="50" height="42" fill="#121317"/>
      {/* Outer zones first, inner ones over them: the paint covers the middle midrange, the rim area covers the paint. */}
      {['w3-left', 'top3', 'w3-right', 'c3-left', 'c3-right', 'mid-left', 'mid-center', 'mid-right', 'paint', 'ra'].map(key => {
        const zone = zones.find(item => item.key === key), shape = SHAPES[key];
        return <path key={key} d={shape.d} clipPath={shape.clip ? `url(#${uid}${shape.clip})` : undefined} fill={heat(zone[by] / top, zone.key === hot.key)} stroke="#0b0c0f" strokeWidth=".35"><title>{`${zone.long}: ${zone.fgm} of ${zone.fga}, ${pct(zone.ptsShare)} of his points`}</title></path>;
      })}
    </g>
    <Court bare/>
    {/* Free throws (when switched on): the top half of the free-throw circle shaded as its own zone, its number inside.
        FT% under Shots, their share of his points under Points. Middle midrange's number moves up to make room. */}
    {ft && <g>
      <path d="M19 23a6 6 0 0 1 12 0Z" fill={mode === 'shots' ? mix(FLOOR, RED, .45) : heat(ft.share / top, ft.share >= top)} stroke="#0b0c0f" strokeWidth=".35"><title>{`Free throws: ${data.ftm} of ${data.fta}, ${pct(ft.share)} of his points`}</title></path>
      <path d="M19 23a6 6 0 0 1 12 0" fill="none" stroke="#fff" strokeWidth=".28" opacity=".55"/>
      <text x="25" y="21" textAnchor="middle" dominantBaseline="central" className="sz-num" fontSize="1.7">FT {mode === 'shots' ? pct(ft.pct) : pct(ft.share)}</text>
    </g>}
    {zones.map(zone => {
      const [x, y] = ft && zone.key === 'mid-center' ? [25, 15.2] : LABEL[zone.key], corner = zone.key.startsWith('c3');
      return <text key={zone.key} x={x} y={y} textAnchor="middle" dominantBaseline="central" className="sz-num" fontSize={corner ? 1.5 : zone.key === 'ra' || (ft && zone.key === 'mid-center') ? 2 : 2.2} transform={corner ? `rotate(-90 ${x} ${y})` : undefined}>{zone.fga ? pct(zone[by]) : ''}</text>;
    })}
  </svg>;
}

/* Shots / Points and the FT switch, shared by the profile card and the comparison. */
export function ZoneTabs({mode, setMode, showFt, setShowFt, withFt}) {
  return <div className="pp-tabs sz-tabs" role="group" aria-label="Shade the zones by">
    {[['shots', 'Shots'], ['points', 'Points']].map(([key, label]) => <button key={key} type="button" className={mode === key ? 'active' : ''} aria-pressed={mode === key} onClick={() => setMode(key)}>{label}</button>)}
    {/* Free throws are off the floor, so they only show when asked for. */}
    {withFt && <button type="button" className={`sz-ft${showFt ? ' active' : ''}`} aria-pressed={showFt} onClick={() => setShowFt(value => !value)}>FT</button>}
  </div>;
}

export default function ShotZones({espnId, firstName}) {
  const data = useShots(espnId), [mode, setMode] = useState('shots'), [showFt, setShowFt] = useState(false);
  if (data === null) return null;
  return <section className="pp-card sz" aria-label={`${firstName}'s shot zones`}>
    <div className="pp-head sz-head"><h2>{firstName}&apos;s hot zones</h2>
      <ZoneTabs mode={mode} setMode={setMode} showFt={showFt} setShowFt={setShowFt} withFt={data?.fta > 0}/>
    </div>
    {data === undefined ? <div className="sk" style={{height: 300, borderRadius: 12}}/>
      : <div className="sz-court"><ZoneCourt data={data} mode={mode} showFt={showFt} label={`${firstName}'s ${mode === 'shots' ? 'shots' : 'points'} by zone`}/></div>}
  </section>;
}

/* Two players' hot zones side by side on the comparison page, with one set of switches for both. */
export function CompareZones({players}) {
  const ids = players.map(player => /^espn-(\d+)$/.exec(player.playerId ?? '')?.[1]);
  const a = useShots(ids[0]), b = useShots(ids[1]), [mode, setMode] = useState('shots'), [showFt, setShowFt] = useState(false);
  if (a === null && b === null) return null;
  return <div className="sz-compare">
    <div className="sz-compare-head"><div className="vs-section">Hot zones</div>
      <ZoneTabs mode={mode} setMode={setMode} showFt={showFt} setShowFt={setShowFt} withFt={(a?.fta || 0) + (b?.fta || 0) > 0}/>
    </div>
    <div className="sz-compare-grid">
      {[a, b].map((data, index) => <figure key={players[index].playerName} className="sz-compare-one">
        <figcaption>{players[index].playerName}</figcaption>
        {data === undefined ? <div className="sk" style={{aspectRatio: '50 / 42', borderRadius: 12}}/>
          : data === null ? <p className="sz-none">Not enough shots yet this season.</p>
          : <div className="sz-court"><ZoneCourt data={data} mode={mode} showFt={showFt} label={`${players[index].playerName}'s ${mode === 'shots' ? 'shots' : 'points'} by zone`}/></div>}
      </figure>)}
    </div>
  </div>;
}
